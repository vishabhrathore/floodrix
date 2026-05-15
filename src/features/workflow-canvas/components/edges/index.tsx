import { ConditionalEdge } from "./conditional-edge";
import { DefaultEdge } from "./default-edge";

/**
 * Edge types registry — pass directly to <ReactFlow edgeTypes={edgeTypes} />
 *
 * "default"      — standard data-flow connection
 * "conditional"  — true/false branches from DECISION nodes; requires data.branch = "true"|"false"
 */
export const edgeTypes = {
  default: DefaultEdge,
  conditional: ConditionalEdge,
} as const;

export type EdgeTypeName = keyof typeof edgeTypes;

export { DefaultEdge } from "./default-edge";
export { ConditionalEdge } from "./conditional-edge";
