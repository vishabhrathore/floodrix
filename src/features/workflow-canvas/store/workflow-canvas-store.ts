// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/store/workflow-canvas-store.ts
//  MobX store for the calculation workflow React Flow canvas
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { createId } from "@paralleldrive/cuid2";
import {
  type Edge,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import { makeAutoObservable, runInAction, toJS } from "mobx";

import { NodeExecutionStatus } from "@/generated/prisma";
import type { NodeTypeKey } from "@/theme/calc-theme";

// ─── Types ────────────────────────────────────────────────────────────────
export interface ExecutionHighlightSlice {
  nodeExecutionStatus: Record<string, NodeExecutionStatus>;
  activeExecutionNodeId: string | null;

  setNodeExecutionStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  setActiveExecutionNode: (nodeId: string | null) => void;
  clearExecutionHighlights: () => void;
  syncExecutionHighlights: (
    executions: { calcNodeId: string | null; status: NodeExecutionStatus }[],
  ) => void;
}

/** A snapshot of nodes+edges pushed onto the undo stack */
interface CanvasSnapshot {
  nodes: Node[];
  edges: Edge[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function createDefaultNodeData(type: NodeTypeKey): {
  label: string;
  config: Record<string, unknown>;
} {
  const defaults: Partial<
    Record<NodeTypeKey, { label: string; config: Record<string, unknown> }>
  > = {
    INPUT: {
      label: "Input Parameters",
      config: { fields: [], pause_execution: true },
    },
    FORMULA: {
      label: "Formula",
      config: {
        source: "inline",
        expression: "",
        result_variable: "",
        result_unit: "",
      },
    },
    LOOKUP_TABLE: {
      label: "Lookup Table",
      config: {
        source: "inline",
        lookup_key: "",
        result_variable: "",
        match_mode: "range",
        rows: [],
      },
    },
    GRAPH_INTERPOLATION: {
      label: "Interpolation",
      config: {
        source: "inline",
        input_variable: "",
        result_variable: "",
        data_points: [],
        interpolation_method: "linear",
      },
    },
    DECISION: {
      label: "Decision",
      config: {
        condition: "",
        branches: {
          true: { label: "", set_variables: {} },
          false: { label: "", set_variables: {} },
        },
      },
    },
    DISPLAY: {
      label: "Display",
      config: {
        mode: "comparison",
        compare_variables: [],
        selection_rule: "max",
        result_variable: "",
      },
    },
    COMMENT: { label: "Note", config: { text: "", color: "#fef3c7" } },
    MULTI_FORMULA: { label: "Multi Formula", config: { formulas: [] } },
    VALIDATION: {
      label: "Validation",
      config: { checks: [], on_error: "pause" },
    },
    UNIT_CONVERSION: {
      label: "Unit Conversion",
      config: {
        input_variable: "",
        input_unit: "",
        output_variable: "",
        output_unit: "",
      },
    },
    CUSTOM_CODE: {
      label: "Custom Code",
      config: { code: "", output_variables: [] },
    },
    LOOP: {
      label: "Loop",
      config: {
        source: "uploaded_dataset",
        iterator_variable: "row",
        child_nodes: [],
      },
    },
    SUBWORKFLOW: {
      label: "Subworkflow",
      config: { workflow_id: null, input_mapping: {}, output_mapping: {} },
    },
    CHART: { label: "Chart", config: { chart_type: "line", title: "" } },
    REFERENCE_IMAGE: {
      label: "Reference",
      config: { image_url: null, caption: "" },
    },
  };
  return defaults[type] ?? { label: type, config: {} };
}

const MAX_HISTORY = 50;
const SAVE_DEBOUNCE_MS = 2000;
const POSITION_SAVE_DEBOUNCE_MS = 3000;

// ─── History Tracker Class (Single Responsibility) ─────────────────────────

class CanvasHistory {
  private store: WorkflowCanvasStore;
  _past: CanvasSnapshot[] = [];
  _future: CanvasSnapshot[] = [];
  canUndo = false;
  canRedo = false;

  constructor(store: WorkflowCanvasStore) {
    this.store = store;
    makeAutoObservable(this, {}, { autoBind: true });
  }

  clear() {
    this._past = [];
    this._future = [];
    this.canUndo = false;
    this.canRedo = false;
  }

  pushHistory() {
    const snapshot: CanvasSnapshot = {
      nodes: toJS(this.store.nodes),
      edges: toJS(this.store.edges),
    };
    this._past.push(snapshot);
    if (this._past.length > MAX_HISTORY) {
      this._past.shift();
    }
    this._future = [];
    this.canUndo = this._past.length > 0;
    this.canRedo = false;
  }

  undo() {
    if (this._past.length === 0) return;

    const previous = this._past[this._past.length - 1];
    const newPast = this._past.slice(0, -1);
    const newFuture: CanvasSnapshot[] = [
      {
        nodes: toJS(this.store.nodes),
        edges: toJS(this.store.edges),
      },
      ...this._future,
    ].slice(0, MAX_HISTORY);

    runInAction(() => {
      this.store.nodes = previous.nodes;
      this.store.edges = previous.edges;
      this._past = newPast;
      this._future = newFuture;
      this.canUndo = newPast.length > 0;
      this.canRedo = true;
      this.store.isDirty = true;
      this.store.scheduleSave(false);
    });
  }

  redo() {
    if (this._future.length === 0) return;

    const next = this._future[0];
    const newFuture = this._future.slice(1);
    const newPast: CanvasSnapshot[] = [
      ...this._past,
      {
        nodes: toJS(this.store.nodes),
        edges: toJS(this.store.edges),
      },
    ].slice(-MAX_HISTORY);

    runInAction(() => {
      this.store.nodes = next.nodes;
      this.store.edges = next.edges;
      this._past = newPast;
      this._future = newFuture;
      this.canUndo = true;
      this.canRedo = newFuture.length > 0;
      this.store.isDirty = true;
      this.store.scheduleSave(false);
    });
  }
}

// ─── Workflow Canvas Store ─────────────────────────────────────────────────

class WorkflowCanvasStore {
  workflowId: string | null = null;
  nodes: Node[] = [];
  edges: Edge[] = [];

  // Dirty tracking — split so auto-save can use different debounce timers
  isDirty = false;
  isPositionOnlyDirty = false;
  isSaving = false;
  _saveTimer: ReturnType<typeof setTimeout> | null = null;

  // Selection
  selectedNodeId: string | null = null;

  // Encapsulated single-responsibility canvas history tracker
  history = new CanvasHistory(this);

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  initialize(workflowId: string, nodes: Node[], edges: Edge[]) {
    this.workflowId = workflowId;
    this.nodes = nodes;
    this.edges = edges;
    this.isDirty = false;
    this.isPositionOnlyDirty = false;
    this.selectedNodeId = null;
    this.history.clear();
  }

  // ── React Flow event handlers ────────────────────────────────────────────
  onNodesChange(changes: any[]) {
    // Determine if this is position-only (drag) or a structural change
    const isPositionOnly = changes.every(
      (c) =>
        c.type === "position" || c.type === "select" || c.type === "dimensions",
    );
    const hasRealChange = changes.some(
      (c) => c.type !== "select" && c.type !== "dimensions",
    );

    this.nodes = applyNodeChanges(changes, this.nodes);

    if (!hasRealChange) return;

    if (isPositionOnly) {
      this.isPositionOnlyDirty = true;
      this.scheduleSave(true);
    } else {
      this.history.pushHistory();
      this.isDirty = true;
      this.isPositionOnlyDirty = false;
      this.scheduleSave(false);
    }

    // Update selectedNodeId from selection changes
    const selectChange = changes.find((c) => c.type === "select");
    if (selectChange && "selected" in selectChange && selectChange.selected) {
      this.selectedNodeId = selectChange.id;
    }
  }

  onEdgesChange(changes: any[]) {
    this.history.pushHistory();
    this.edges = applyEdgeChanges(changes, this.edges);
    this.isDirty = true;
    this.scheduleSave(false);
  }

  onConnect(connection: any) {
    this.history.pushHistory();
    this.edges = addEdge(
      { ...connection, id: createId(), type: "default" },
      this.edges,
    );
    this.isDirty = true;
    this.scheduleSave(false);
  }

  // ── Node mutations ───────────────────────────────────────────────────────
  addNode(
    type: NodeTypeKey,
    position: { x: number; y: number },
    extraConfig?: Record<string, unknown>,
  ) {
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

    this.history.pushHistory();
    this.nodes.push(newNode);
    this.isDirty = true;
    this.selectedNodeId = id;
    this.scheduleSave(false);
    return id;
  }

  updateNodeConfig(nodeId: string, config: Record<string, unknown>) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      this.history.pushHistory();
      node.data = {
        ...node.data,
        config: {
          ...(node.data.config as Record<string, unknown>),
          ...config,
        },
      };
      this.isDirty = true;
      this.scheduleSave(false);
    }
  }

  updateNodeLabel(nodeId: string, label: string) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (node) {
      this.history.pushHistory();
      node.data = {
        ...node.data,
        label,
      };
      this.isDirty = true;
      this.scheduleSave(false);
    }
  }

  deleteNode(nodeId: string) {
    this.history.pushHistory();
    this.nodes = this.nodes.filter((n) => n.id !== nodeId);
    this.edges = this.edges.filter(
      (e) => e.source !== nodeId && e.target !== nodeId,
    );
    this.isDirty = true;
    this.selectedNodeId =
      this.selectedNodeId === nodeId ? null : this.selectedNodeId;
    this.scheduleSave(false);
  }

  deleteSelectedNode() {
    if (this.selectedNodeId) {
      this.deleteNode(this.selectedNodeId);
    }
  }

  duplicateNode(nodeId: string) {
    const node = this.nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const newId = createId();
    const newNode: Node = {
      ...toJS(node),
      id: newId,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: false,
    };

    this.history.pushHistory();
    this.nodes.push(newNode);
    this.isDirty = true;
    this.selectedNodeId = newId;
    this.scheduleSave(false);
  }

  // ── Selection ────────────────────────────────────────────────────────────
  selectNode(nodeId: string | null) {
    this.selectedNodeId = nodeId;
  }

  // ── Save / dirty ─────────────────────────────────────────────────────────
  markDirty(positionOnly = false) {
    if (positionOnly) {
      this.isPositionOnlyDirty = true;
    } else {
      this.isDirty = true;
      this.isPositionOnlyDirty = false;
    }
    this.scheduleSave(positionOnly);
  }

  scheduleSave(positionOnly = false) {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    const delay = positionOnly ? POSITION_SAVE_DEBOUNCE_MS : SAVE_DEBOUNCE_MS;
    this._saveTimer = setTimeout(() => this.flush(), delay);
  }

  flushHandler: (() => Promise<void>) | null = null;

  async flush() {
    if (
      (!this.isDirty && !this.isPositionOnlyDirty) ||
      this.isSaving ||
      !this.workflowId
    )
      return;

    if (this.flushHandler) {
      await this.flushHandler();
      return;
    }

    runInAction(() => {
      this.isSaving = true;
    });

    try {
      runInAction(() => {
        this.isDirty = false;
        this.isPositionOnlyDirty = false;
        this.isSaving = false;
      });
    } catch (err) {
      console.error("Canvas save failed:", err);
      runInAction(() => {
        this.isSaving = false;
      });
    }
  }
}

export const workflowCanvasStore = new WorkflowCanvasStore();
export const useWorkflowCanvasStore = () => workflowCanvasStore;
export const useWorkflowCanvas = useWorkflowCanvasStore;

// ─── Real-Time Node Highlighting Store (Single Responsibility) ─────────────

class ExecutionHighlightStore {
  nodeExecutionStatus: Record<string, NodeExecutionStatus> = {};
  activeExecutionNodeId: string | null = null;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  setNodeExecutionStatus(nodeId: string, status: NodeExecutionStatus) {
    this.nodeExecutionStatus[nodeId] = status;
  }

  setActiveExecutionNode(nodeId: string | null) {
    this.activeExecutionNodeId = nodeId;
  }

  clearExecutionHighlights() {
    this.nodeExecutionStatus = {};
    this.activeExecutionNodeId = null;
  }

  syncExecutionHighlights(
    executions: { calcNodeId: string | null; status: NodeExecutionStatus }[],
  ) {
    for (const e of executions) {
      if (e.calcNodeId) {
        this.nodeExecutionStatus[e.calcNodeId] = e.status;
      }
    }
  }
}

export const executionHighlightStore = new ExecutionHighlightStore();
export const useExecutionHighlightStore = () => executionHighlightStore;
