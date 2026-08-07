// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/nodes/theme.ts
//  Design tokens for all workflow nodes
// ═══════════════════════════════════════════════════════════════════════════

// ─── Handle / Socket Data Types ──────────────────────────────────────────
// Each data type gets a distinct color so users can visually match
// which outputs connect to which inputs.

export type HandleDataType =
  | "number" // Most common — discharge, area, coefficients
  | "string"
  | "boolean"
  | "table" // Lookup table data
  | "curve" // Interpolation curve data
  | "dataset" // Array of rows (batch)
  | "any" // Accepts anything
  | "trigger"; // Execution flow (no data)

export const HANDLE_COLORS: Record<
  HandleDataType,
  { bg: string; border: string; ring: string }
> = {
  number: { bg: "#3b82f6", border: "#2563eb", ring: "rgba(59,130,246,0.2)" }, // Blue
  string: { bg: "#22c55e", border: "#16a34a", ring: "rgba(34,197,94,0.2)" }, // Green
  boolean: { bg: "#f59e0b", border: "#d97706", ring: "rgba(245,158,11,0.2)" }, // Amber
  table: { bg: "#a855f7", border: "#9333ea", ring: "rgba(168,85,247,0.2)" }, // Purple
  curve: { bg: "#ec4899", border: "#db2777", ring: "rgba(236,72,153,0.2)" }, // Pink
  dataset: { bg: "#14b8a6", border: "#0d9488", ring: "rgba(20,184,166,0.2)" }, // Teal
  any: { bg: "#6b7280", border: "#4b5563", ring: "rgba(107,114,128,0.2)" }, // Gray
  trigger: { bg: "#94a3b8", border: "#64748b", ring: "rgba(148,163,184,0.2)" }, // Slate
};

// ─── Node Type Accent Colors ─────────────────────────────────────────────
// Each node type gets a left-border accent color and matching icon tint.

export const NODE_ACCENTS = {
  INPUT: {
    accent: "#3b82f6",
    bg: "#eff6ff",
    label: "Input",
    icon: "TextCursorInput",
  },
  FORMULA: {
    accent: "#059669",
    bg: "#ecfdf5",
    label: "Formula",
    icon: "Sigma",
  },
  LOOKUP_TABLE: {
    accent: "#7c3aed",
    bg: "#f5f3ff",
    label: "Lookup Table",
    icon: "Table2",
  },
  GRAPH_INTERPOLATION: {
    accent: "#db2777",
    bg: "#fdf2f8",
    label: "Interpolation",
    icon: "TrendingUp",
  },
  DECISION: {
    accent: "#ea580c",
    bg: "#fff7ed",
    label: "Decision",
    icon: "GitBranch",
  },
  DISPLAY: {
    accent: "#0284c7",
    bg: "#f0f9ff",
    label: "Display",
    icon: "BarChart3",
  },
  COMMENT: {
    accent: "#9ca3af",
    bg: "#f9fafb",
    label: "Comment",
    icon: "MessageSquare",
  },
  MULTI_FORMULA: {
    accent: "#059669",
    bg: "#ecfdf5",
    label: "Multi Formula",
    icon: "Braces",
  },
  LOOP: { accent: "#0d9488", bg: "#f0fdfa", label: "Loop", icon: "Repeat" },
  SUBWORKFLOW: {
    accent: "#6366f1",
    bg: "#eef2ff",
    label: "Subworkflow",
    icon: "Workflow",
  },
  UNIT_CONVERSION: {
    accent: "#0891b2",
    bg: "#ecfeff",
    label: "Unit Conversion",
    icon: "ArrowLeftRight",
  },
  VALIDATION: {
    accent: "#dc2626",
    bg: "#fef2f2",
    label: "Validation",
    icon: "ShieldCheck",
  },
  API_CALL: {
    accent: "#7c3aed",
    bg: "#f5f3ff",
    label: "API Call",
    icon: "Globe",
  },
  CHART: {
    accent: "#2563eb",
    bg: "#eff6ff",
    label: "Chart",
    icon: "LineChart",
  },
  TABLE_BUILDER: {
    accent: "#7c3aed",
    bg: "#f5f3ff",
    label: "Table Builder",
    icon: "TableProperties",
  },
  PDF_REPORT: {
    accent: "#dc2626",
    bg: "#fef2f2",
    label: "PDF Report",
    icon: "FileText",
  },
  GROUP: {
    accent: "#6b7280",
    bg: "transparent",
    label: "Group",
    icon: "Group",
  },
  PARALLEL: {
    accent: "#0d9488",
    bg: "#f0fdfa",
    label: "Parallel",
    icon: "Columns3",
  },
  CUSTOM_CODE: {
    accent: "#1e293b",
    bg: "#f8fafc",
    label: "Custom Code",
    icon: "Code2",
  },
  REFERENCE_IMAGE: {
    accent: "#9ca3af",
    bg: "#f9fafb",
    label: "Reference",
    icon: "Image",
  },
} as const;

export type NodeTypeKey = keyof typeof NODE_ACCENTS;

// ─── Handle Definitions Per Node Type ────────────────────────────────────
// Defines what handles each node type exposes and their data types.

export interface HandleDef {
  id: string;
  label: string;
  dataType: HandleDataType;
  position: "left" | "right" | "top" | "bottom";
  required?: boolean;
}

export const NODE_HANDLES: Record<
  NodeTypeKey,
  { inputs: HandleDef[]; outputs: HandleDef[] }
> = {
  INPUT: {
    inputs: [],
    outputs: [
      { id: "output", label: "Values", dataType: "number", position: "bottom" },
    ],
  },
  FORMULA: {
    inputs: [
      {
        id: "input",
        label: "Variables",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "output", label: "Result", dataType: "number", position: "bottom" },
    ],
  },
  LOOKUP_TABLE: {
    inputs: [
      {
        id: "input",
        label: "Lookup Key",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "output", label: "Value", dataType: "number", position: "bottom" },
    ],
  },
  GRAPH_INTERPOLATION: {
    inputs: [
      {
        id: "input",
        label: "X Value",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "output", label: "Y Value", dataType: "number", position: "bottom" },
    ],
  },
  DECISION: {
    inputs: [
      {
        id: "input",
        label: "Variables",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "true", label: "True", dataType: "trigger", position: "bottom" },
      { id: "false", label: "False", dataType: "trigger", position: "bottom" },
    ],
  },
  DISPLAY: {
    inputs: [
      {
        id: "input",
        label: "Values",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Selected",
        dataType: "number",
        position: "bottom",
      },
    ],
  },
  COMMENT: { inputs: [], outputs: [] },
  MULTI_FORMULA: {
    inputs: [
      {
        id: "input",
        label: "Variables",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "output", label: "Results", dataType: "number", position: "bottom" },
    ],
  },
  LOOP: {
    inputs: [
      {
        id: "dataset",
        label: "Dataset",
        dataType: "dataset",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      {
        id: "row",
        label: "Current Row",
        dataType: "number",
        position: "bottom",
      },
      {
        id: "results",
        label: "All Results",
        dataType: "dataset",
        position: "bottom",
      },
    ],
  },
  SUBWORKFLOW: {
    inputs: [
      {
        id: "input",
        label: "Input Mapping",
        dataType: "any",
        position: "top",
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Output Mapping",
        dataType: "any",
        position: "bottom",
      },
    ],
  },
  UNIT_CONVERSION: {
    inputs: [
      {
        id: "input",
        label: "Value",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      {
        id: "output",
        label: "Converted",
        dataType: "number",
        position: "bottom",
      },
    ],
  },
  VALIDATION: {
    inputs: [
      {
        id: "input",
        label: "Variables",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "pass", label: "Pass", dataType: "trigger", position: "bottom" },
      { id: "fail", label: "Fail", dataType: "trigger", position: "bottom" },
    ],
  },
  API_CALL: {
    inputs: [
      { id: "input", label: "Params", dataType: "any", position: "top" },
    ],
    outputs: [
      { id: "output", label: "Response", dataType: "any", position: "bottom" },
    ],
  },
  CHART: {
    inputs: [
      {
        id: "input",
        label: "Data",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [],
  },
  TABLE_BUILDER: {
    inputs: [
      {
        id: "input",
        label: "Variables",
        dataType: "number",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "output", label: "Table", dataType: "table", position: "bottom" },
    ],
  },
  PDF_REPORT: {
    inputs: [
      {
        id: "input",
        label: "Data",
        dataType: "any",
        position: "top",
        required: true,
      },
    ],
    outputs: [],
  },
  GROUP: { inputs: [], outputs: [] },
  PARALLEL: {
    inputs: [
      { id: "input", label: "Trigger", dataType: "trigger", position: "top" },
    ],
    outputs: [
      {
        id: "output",
        label: "Complete",
        dataType: "trigger",
        position: "bottom",
      },
    ],
  },
  CUSTOM_CODE: {
    inputs: [
      {
        id: "input",
        label: "Variables",
        dataType: "any",
        position: "top",
        required: true,
      },
    ],
    outputs: [
      { id: "output", label: "Results", dataType: "any", position: "bottom" },
    ],
  },
  REFERENCE_IMAGE: { inputs: [], outputs: [] },
};

// ─── Layout Constants ────────────────────────────────────────────────────

export const NODE_DIMENSIONS = {
  minWidth: 240,
  maxWidth: 320,
  headerHeight: 40,
  fieldHeight: 32,
  padding: 12,
  handleSize: 10,
  handleOffset: 4, // Gap between handle edge and node edge
  borderRadius: 10,
  accentWidth: 3,
} as const;

export const NODE_LAYOUT = {
  minWidth: 240,
  maxWidth: 320,
  borderRadius: 10,
  accentWidth: 3,
  handleSize: 10,
} as const;
