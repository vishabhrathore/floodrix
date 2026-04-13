// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/store/workflow-canvas-store.ts
//  Zustand store for the calculation workflow React Flow canvas
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { create } from "zustand";
import {
    type Node,
    type Edge,
    type OnNodesChange,
    type OnEdgesChange,
    type OnConnect,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
} from "@xyflow/react";
import { createId } from "@paralleldrive/cuid2";
import type { NodeTypeKey } from "@/theme/calc-theme";

// ─── Types ────────────────────────────────────────────────────────────────

/** A snapshot of nodes+edges pushed onto the undo stack */
interface CanvasSnapshot {
    nodes: Node[];
    edges: Edge[];
}

interface WorkflowCanvasState {
    workflowId: string | null;
    nodes: Node[];
    edges: Edge[];

    // Dirty tracking — split so auto-save can use different debounce timers
    isDirty: boolean;
    isPositionOnlyDirty: boolean;
    isSaving: boolean;
    _saveTimer: ReturnType<typeof setTimeout> | null;

    // Selection
    selectedNodeId: string | null;

    // Undo / redo stacks
    _past: CanvasSnapshot[];
    _future: CanvasSnapshot[];
    canUndo: boolean;
    canRedo: boolean;

    // ── Lifecycle ─────────────────────────────────────────────────────────
    initialize: (workflowId: string, nodes: Node[], edges: Edge[]) => void;

    // ── React Flow event handlers ─────────────────────────────────────────
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;

    // ── Node mutations ────────────────────────────────────────────────────
    addNode: (type: NodeTypeKey, position: { x: number; y: number }, config?: Record<string, unknown>) => string;
    updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
    updateNodeLabel: (nodeId: string, label: string) => void;
    deleteNode: (nodeId: string) => void;
    deleteSelectedNode: () => void;
    duplicateNode: (nodeId: string) => void;

    // ── Selection ─────────────────────────────────────────────────────────
    selectNode: (nodeId: string | null) => void;

    // ── Undo / redo ───────────────────────────────────────────────────────
    undo: () => void;
    redo: () => void;

    // ── Save / dirty ──────────────────────────────────────────────────────
    markDirty: (positionOnly?: boolean) => void;
    flush: () => Promise<void>;
    _scheduleSave: (positionOnly?: boolean) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function createDefaultNodeData(type: NodeTypeKey): { label: string; config: Record<string, unknown> } {
    const defaults: Partial<Record<NodeTypeKey, { label: string; config: Record<string, unknown> }>> = {
        INPUT: { label: "Input Parameters", config: { fields: [], pause_execution: true } },
        FORMULA: { label: "Formula", config: { source: "inline", expression: "", result_variable: "", result_unit: "" } },
        LOOKUP_TABLE: { label: "Lookup Table", config: { source: "inline", lookup_key: "", result_variable: "", match_mode: "range", rows: [] } },
        GRAPH_INTERPOLATION: { label: "Interpolation", config: { source: "inline", input_variable: "", result_variable: "", data_points: [], interpolation_method: "linear" } },
        DECISION: { label: "Decision", config: { condition: "", branches: { true: { label: "", set_variables: {} }, false: { label: "", set_variables: {} } } } },
        DISPLAY: { label: "Display", config: { mode: "comparison", compare_variables: [], selection_rule: "max", result_variable: "" } },
        COMMENT: { label: "Note", config: { text: "", color: "#fef3c7" } },
        MULTI_FORMULA: { label: "Multi Formula", config: { formulas: [] } },
        VALIDATION: { label: "Validation", config: { checks: [], on_error: "pause" } },
        UNIT_CONVERSION: { label: "Unit Conversion", config: { input_variable: "", input_unit: "", output_variable: "", output_unit: "" } },
        CUSTOM_CODE: { label: "Custom Code", config: { code: "", output_variables: [] } },
        LOOP: { label: "Loop", config: { source: "uploaded_dataset", iterator_variable: "row", child_nodes: [] } },
        SUBWORKFLOW: { label: "Subworkflow", config: { workflow_id: null, input_mapping: {}, output_mapping: {} } },
        CHART: { label: "Chart", config: { chart_type: "line", title: "" } },
        REFERENCE_IMAGE: { label: "Reference", config: { image_url: null, caption: "" } },
    };
    return defaults[type] ?? { label: type, config: {} };
}

const MAX_HISTORY = 50;
const SAVE_DEBOUNCE_MS = 2000;
const POSITION_SAVE_DEBOUNCE_MS = 3000;

/** Push current state onto the undo stack before a mutation */
function pushHistory(state: WorkflowCanvasState): Pick<WorkflowCanvasState, "_past" | "_future" | "canUndo" | "canRedo"> {
    const snapshot: CanvasSnapshot = {
        nodes: state.nodes,
        edges: state.edges,
    };
    const _past = [...state._past, snapshot].slice(-MAX_HISTORY);
    return { _past, _future: [], canUndo: true, canRedo: false };
}

// ─── Store ────────────────────────────────────────────────────────────────

export const useWorkflowCanvasStore = create<WorkflowCanvasState>((set, get) => ({
    workflowId: null,
    nodes: [],
    edges: [],
    isDirty: false,
    isPositionOnlyDirty: false,
    isSaving: false,
    _saveTimer: null,
    selectedNodeId: null,
    _past: [],
    _future: [],
    canUndo: false,
    canRedo: false,

    // ── Lifecycle ──────────────────────────────────────────────────────────
    initialize(workflowId, nodes, edges) {
        set({
            workflowId,
            nodes,
            edges,
            isDirty: false,
            isPositionOnlyDirty: false,
            selectedNodeId: null,
            _past: [],
            _future: [],
            canUndo: false,
            canRedo: false,
        });
    },

    // ── React Flow event handlers ──────────────────────────────────────────
    onNodesChange(changes) {
        // Determine if this is position-only (drag) or a structural change
        const isPositionOnly = changes.every(
            (c) => c.type === "position" || c.type === "select" || c.type === "dimensions"
        );
        const hasRealChange = changes.some(
            (c) => c.type !== "select" && c.type !== "dimensions"
        );

        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));

        if (!hasRealChange) return;

        if (isPositionOnly) {
            set({ isPositionOnlyDirty: true });
            get()._scheduleSave(true);
        } else {
            set((s) => ({
                ...pushHistory(s),
                isDirty: true,
                isPositionOnlyDirty: false,
            }));
            get()._scheduleSave(false);
        }

        // Update selectedNodeId from selection changes
        const selectChange = changes.find((c) => c.type === "select");
        if (selectChange && "selected" in selectChange && selectChange.selected) {
            set({ selectedNodeId: selectChange.id });
        }
    },

    onEdgesChange(changes) {
        set((s) => ({
            ...pushHistory(s),
            edges: applyEdgeChanges(changes, s.edges),
            isDirty: true,
        }));
        get()._scheduleSave(false);
    },

    onConnect(connection) {
        set((s) => ({
            ...pushHistory(s),
            edges: addEdge({ ...connection, id: createId(), type: "default" }, s.edges),
            isDirty: true,
        }));
        get()._scheduleSave(false);
    },

    // ── Node mutations ─────────────────────────────────────────────────────
    addNode(type, position, extraConfig) {
        const id = createId();
        const defaults = createDefaultNodeData(type);

        const newNode: Node = {
            id,
            type,
            position,
            data: {
                label: defaults.label,
                config: { ...defaults.config, ...extraConfig },
            },
        };

        set((s) => ({
            ...pushHistory(s),
            nodes: [...s.nodes, newNode],
            isDirty: true,
            selectedNodeId: id,
        }));
        get()._scheduleSave(false);
        return id;
    },

    updateNodeConfig(nodeId, config) {
        set((s) => ({
            ...pushHistory(s),
            nodes: s.nodes.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, config: { ...(n.data.config as Record<string, unknown>), ...config } } }
                    : n
            ),
            isDirty: true,
        }));
        get()._scheduleSave(false);
    },

    updateNodeLabel(nodeId, label) {
        set((s) => ({
            ...pushHistory(s),
            nodes: s.nodes.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
            ),
            isDirty: true,
        }));
        get()._scheduleSave(false);
    },

    deleteNode(nodeId) {
        set((s) => ({
            ...pushHistory(s),
            nodes: s.nodes.filter((n) => n.id !== nodeId),
            edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            isDirty: true,
            selectedNodeId: s.selectedNodeId === nodeId ? null : s.selectedNodeId,
        }));
        get()._scheduleSave(false);
    },

    deleteSelectedNode() {
        const { selectedNodeId, deleteNode } = get();
        if (selectedNodeId) deleteNode(selectedNodeId);
    },

    duplicateNode(nodeId) {
        const node = get().nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const newId = createId();
        const newNode: Node = {
            ...structuredClone(node),
            id: newId,
            position: { x: node.position.x + 40, y: node.position.y + 40 },
            selected: false,
        };

        set((s) => ({
            ...pushHistory(s),
            nodes: [...s.nodes, newNode],
            isDirty: true,
            selectedNodeId: newId,
        }));
        get()._scheduleSave(false);
    },

    // ── Selection ──────────────────────────────────────────────────────────
    selectNode(nodeId) {
        set({ selectedNodeId: nodeId });
    },

    // ── Undo / redo ────────────────────────────────────────────────────────
    undo() {
        const { _past, nodes, edges, _future } = get();
        if (_past.length === 0) return;

        const previous = _past[_past.length - 1];
        const newPast = _past.slice(0, -1);
        const newFuture: CanvasSnapshot[] = [{ nodes, edges }, ..._future].slice(0, MAX_HISTORY);

        set({
            nodes: previous.nodes,
            edges: previous.edges,
            _past: newPast,
            _future: newFuture,
            canUndo: newPast.length > 0,
            canRedo: true,
            isDirty: true,
        });
        get()._scheduleSave(false);
    },

    redo() {
        const { _past, nodes, edges, _future } = get();
        if (_future.length === 0) return;

        const next = _future[0];
        const newFuture = _future.slice(1);
        const newPast: CanvasSnapshot[] = [..._past, { nodes, edges }].slice(-MAX_HISTORY);

        set({
            nodes: next.nodes,
            edges: next.edges,
            _past: newPast,
            _future: newFuture,
            canUndo: true,
            canRedo: newFuture.length > 0,
            isDirty: true,
        });
        get()._scheduleSave(false);
    },

    // ── Save / dirty ───────────────────────────────────────────────────────
    markDirty(positionOnly = false) {
        if (positionOnly) {
            set({ isPositionOnlyDirty: true });
        } else {
            set({ isDirty: true, isPositionOnlyDirty: false });
        }
        get()._scheduleSave(positionOnly);
    },

    _scheduleSave(positionOnly = false) {
        const timer = get()._saveTimer;
        if (timer) clearTimeout(timer);
        const delay = positionOnly ? POSITION_SAVE_DEBOUNCE_MS : SAVE_DEBOUNCE_MS;
        set({
            _saveTimer: setTimeout(() => get().flush(), delay),
        });
    },

    async flush() {
        const { isDirty, isPositionOnlyDirty, isSaving, workflowId, nodes, edges } = get();
        if ((!isDirty && !isPositionOnlyDirty) || isSaving || !workflowId) return;

        set({ isSaving: true });

        try {
            // TODO: wire tRPC call here once TRPCProvider is available outside React tree.
            // The canvas component (workflow-canvas.tsx) should call:
            //   const saveCanvas = useMutation(trpc.workflow.saveCanvas.mutationOptions(...))
            // and then call store.flush() which triggers the mutation via a ref.
            //
            // For now this just clears dirty flags (dry-run mode):
            // await trpcClient.workflow.saveCanvas.mutate({ workflowId, nodes, edges });

            set({ isDirty: false, isPositionOnlyDirty: false, isSaving: false });
        } catch (err) {
            console.error("Canvas save failed:", err);
            set({ isSaving: false });
        }
    },
}));

// ─── Backwards-compatible alias ───────────────────────────────────────────
// The original canvas.tsx imports `useWorkflowCanvas` — keep that working.
export const useWorkflowCanvas = useWorkflowCanvasStore;