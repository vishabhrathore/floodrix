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
import { NodeTypeKey } from "@/theme/calc-theme";

// ─── Types ───────────────────────────────────────────────────────────────

interface WorkflowCanvasState {
    workflowId: string | null;
    nodes: Node[];
    edges: Edge[];

    // Dirty tracking
    isDirty: boolean;
    isSaving: boolean;
    _saveTimer: ReturnType<typeof setTimeout> | null;

    // Actions
    initialize: (workflowId: string, nodes: Node[], edges: Edge[]) => void;
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: OnConnect;

    addNode: (type: NodeTypeKey, position: { x: number; y: number }, config?: Record<string, unknown>) => string;
    updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void;
    updateNodeLabel: (nodeId: string, label: string) => void;
    deleteNode: (nodeId: string) => void;
    duplicateNode: (nodeId: string) => void;

    _scheduleSave: () => void;
    flush: () => Promise<void>;
}

// ─── Default node data factory ───────────────────────────────────────────

function createDefaultNodeData(type: NodeTypeKey): { label: string; config: Record<string, unknown> } {
    const defaults: Record<string, { label: string; config: Record<string, unknown> }> = {
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
    return defaults[type] || { label: type, config: {} };
}

// ─── Store ───────────────────────────────────────────────────────────────

const SAVE_DEBOUNCE_MS = 2000;

export const useWorkflowCanvas = create<WorkflowCanvasState>((set, get) => ({
    workflowId: null,
    nodes: [],
    edges: [],
    isDirty: false,
    isSaving: false,
    _saveTimer: null,

    initialize(workflowId, nodes, edges) {
        set({ workflowId, nodes, edges, isDirty: false });
    },

    onNodesChange(changes) {
        set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) }));
        const hasRealChange = changes.some((c) => c.type !== "select" && c.type !== "dimensions");
        if (hasRealChange) {
            set({ isDirty: true });
            get()._scheduleSave();
        }
    },

    onEdgesChange(changes) {
        set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }));
        set({ isDirty: true });
        get()._scheduleSave();
    },

    onConnect(connection) {
        set((s) => ({ edges: addEdge({ ...connection, id: createId(), type: "default" }, s.edges) }));
        set({ isDirty: true });
        get()._scheduleSave();
    },

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

        set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }));
        get()._scheduleSave();
        return id;
    },

    updateNodeConfig(nodeId, config) {
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, config: { ...(n.data.config as Record<string, unknown>), ...config } } }
                    : n
            ),
            isDirty: true,
        }));
        get()._scheduleSave();
    },

    updateNodeLabel(nodeId, label) {
        set((s) => ({
            nodes: s.nodes.map((n) =>
                n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
            ),
            isDirty: true,
        }));
        get()._scheduleSave();
    },

    deleteNode(nodeId) {
        set((s) => ({
            nodes: s.nodes.filter((n) => n.id !== nodeId),
            edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
            isDirty: true,
        }));
        get()._scheduleSave();
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

        set((s) => ({ nodes: [...s.nodes, newNode], isDirty: true }));
        get()._scheduleSave();
    },

    _scheduleSave() {
        const timer = get()._saveTimer;
        if (timer) clearTimeout(timer);
        set({ _saveTimer: setTimeout(() => get().flush(), SAVE_DEBOUNCE_MS) });
    },

    async flush() {
        const { isDirty, isSaving, workflowId, nodes, edges } = get();
        if (!isDirty || isSaving || !workflowId) return;

        set({ isSaving: true });

        try {
            // Call tRPC saveCanvas mutation
            // await trpcClient.workflow.saveCanvas.mutate({ workflowId, nodes, edges });
            set({ isDirty: false, isSaving: false });
        } catch (err) {
            console.error("Save failed:", err);
            set({ isSaving: false });
        }
    },
}));