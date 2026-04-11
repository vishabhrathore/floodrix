// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/nodes/index.ts
//  Node registry — maps database NodeType to React Flow components
//
//  This is the single file you pass to <ReactFlow nodeTypes={...} />
//  Adding a new node type = add component + add one line here
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeTypes } from "@xyflow/react";

// Core nodes (P0)
import {
    InputNode,
    FormulaNode,
    LookupTableNode,
    GraphInterpolationNode,
    DecisionNode,
    DisplayNode,
} from "./core-nodes";

// Extended nodes (P1 + P2)
import {
    MultiFormulaNode,
    ValidationNode,
    UnitConversionNode,
    CustomCodeNode,
    LoopNode,
    SubworkflowNode,
    CommentNode,
    ChartNode,
    ReferenceImageNode,
} from "./extended-nodes";

// ─── The Registry ────────────────────────────────────────────────────────
//
// Keys match the database NodeType enum values.
// React Flow uses these to render the correct component for each node.
//
// Usage:
//   import { nodeTypes } from "@/features/workflow-canvas/nodes";
//   <ReactFlow nodeTypes={nodeTypes} ... />

export const nodeTypes: NodeTypes = {
    // Core
    INPUT: InputNode,
    FORMULA: FormulaNode,
    LOOKUP_TABLE: LookupTableNode,
    GRAPH_INTERPOLATION: GraphInterpolationNode,
    DECISION: DecisionNode,
    DISPLAY: DisplayNode,
    COMMENT: CommentNode,

    // Extended
    MULTI_FORMULA: MultiFormulaNode,
    LOOP: LoopNode,
    SUBWORKFLOW: SubworkflowNode,
    UNIT_CONVERSION: UnitConversionNode,
    VALIDATION: ValidationNode,
    CUSTOM_CODE: CustomCodeNode,
    CHART: ChartNode,
    REFERENCE_IMAGE: ReferenceImageNode,

    // Stubs — render as base node with empty state until implemented
    // API_CALL:         ApiCallNode,
    // TABLE_BUILDER:    TableBuilderNode,
    // PDF_REPORT:       PdfReportNode,
    // GROUP:            GroupNode,
    // PARALLEL:         ParallelNode,
};

// ─── Re-exports for convenience ──────────────────────────────────────────

