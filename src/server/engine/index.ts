// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/index.ts
//
//  CHUNK 2 CHANGE: WorkflowExecutor class is now exported (mostly for type
//  references). Use createWorkflowExecutor() in nearly all cases.
// ═══════════════════════════════════════════════════════════════════════════

// ── Factories ─────────────────────────────────────────────────────────────
export {
  createWorkflowExecutor,
  createRunOrchestrator,
  createSessionPoller,
} from "./bootstrap";
export type { BootstrapOptions, ExecutionOptions } from "./bootstrap";

// ── Executor & Context ─────────────────────────────────────────────────────
export { WorkflowExecutor } from "./WorkflowExecutor";
export { AuditLogger } from "./AuditLogger";
export { CalcContext } from "./calc-context";

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  VariableValue,
  VariableMap,
  VariableSnapshot,
  VariableStore,
  NodeOutcome,
  ExecutionContext,
  PauseReason,
  InputFieldDef,
  ExecutionEvent,
  StepOutput,
  ExecutionResult,
  SessionMetadata,
  SyncNodeType,
  AsyncNodeType,
  StructuralNodeType,
  Clock,
} from "./types";

export {
  SYNC_NODE_TYPES,
  ASYNC_NODE_TYPES,
  STRUCTURAL_NODE_TYPES,
  isAsyncNodeType,
  isStructuralNodeType,
  METADATA_VERSION,
  emptySessionMetadata,
  MAX_VARIABLE_BYTES,
  MAX_STORE_BYTES,
} from "./types";

// ── Handler interface ─────────────────────────────────────────────────────
export type { NodeHandler } from "./NodeHandler";
export { toErroredOutcome, classifyError } from "./NodeHandler";
