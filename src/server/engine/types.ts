// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/types.ts
//
//  CHUNK 4 ADDITIONS (on top of the Chunk 3 version):
//    - RunStrategy enum
//    - AsyncPendingInfo on ExecutionResult (already there, unchanged)
//    - PollResult type for SessionPoller responses
//    - AsyncNodeTransition for the `background_transition` pause path
//
//  Nothing else in this file changes from Chunk 3. If you're applying this
//  via copy-and-replace, the only new exports at the bottom are:
//    RunStrategy, PollResult, AsyncNodeTransition
// ═══════════════════════════════════════════════════════════════════════════
import type { RegistryResolver } from "@/features/workflow-canvas/engine/registry-resolver";
import type {
  CalcEdge,
  CalcNode,
  CalcNodeType,
  NodeExecutionStatus,
  SessionStatus,
} from "@/generated/prisma";

// ─── Variables ────────────────────────────────────────────────────────────

export type VariableValue =
  | number
  | string
  | boolean
  | number[]
  | Record<string, unknown>
  | Record<string, Record<string, any>>
  | Record<string, any>
  | null;
export type VariableMap = Record<string, VariableValue>;

export type VariableSnapshot = VariableMap & {
  $nodes?: Record<string, VariableMap>;
  $results?: Record<string, VariableMap>;
};

export interface VariableStore {
  get(key: string): VariableValue | undefined;
  set(key: string, value: VariableValue): void;
  has(key: string): boolean;
  merge(values: VariableMap): void;
  snapshot(): VariableSnapshot;
  trackNodeOutput(
    nodeId: string,
    nodeLabel: string,
    outputs: VariableMap,
  ): void;
  sizeBytes(): number;
}

// ─── Node Outcome ─────────────────────────────────────────────────────────

export type PauseReason =
  | "awaiting_user_input"
  | "validation_error"
  | "step_complete"
  | "background_transition";

export type NodeOutcome =
  | {
      kind: "completed";
      outputs: VariableMap;
      result: Record<string, unknown>;
      sideEffects?: { skipNodes?: string[] };
    }
  | {
      kind: "paused";
      reason: PauseReason;
      fields?: InputFieldDef[];
      nodeLabel?: string;
      pauseMessage?: string;
    }
  | { kind: "skipped" }
  | { kind: "errored"; error: Error };

// ─── Input Field Definition ───────────────────────────────────────────────

export interface InputFieldDef {
  key: string;
  label: string;
  data_type?: "number" | "string" | "boolean" | "select";
  unit?: string;
  default?: number | string | boolean;
  hint?: string;
  required?: boolean;
  constraints?: { min?: number; max?: number; step?: number };
  validation_expr?: string;
  options?: string[];
}

// ─── Execution Context ────────────────────────────────────────────────────

export interface ExecutionContext {
  node: Pick<CalcNode, "id" | "type" | "label" | "config" | "description">;
  edges: Pick<CalcEdge, "sourceNodeId" | "targetNodeId" | "sourceHandle">[];
  variables: VariableStore;
  db: import("@/generated/prisma").PrismaClient;
  registry: RegistryResolver;
  sessionId: string;
  workflowId: string;
  actorId: string;
  isBackgroundRun: boolean;
  liveUpdates?: boolean;
}

// ─── Execution Events ─────────────────────────────────────────────────────

export type ExecutionEvent =
  | {
      type: "session:started";
      sessionId: string;
      workflowId: string;
      actorId: string;
      nodeCount: number;
      executionOrder: string[];
    }
  | {
      type: "node:started";
      sessionId: string;
      nodeId: string;
      nodeLabel: string;
      nodeType: CalcNodeType;
      stepNumber: number;
    }
  | {
      type: "node:completed";
      sessionId: string;
      nodeId: string;
      nodeLabel: string;
      nodeType: CalcNodeType;
      stepNumber: number;
      outputs: VariableMap;
      result: Record<string, unknown>;
      durationMs: number;
    }
  | {
      type: "node:skipped";
      sessionId: string;
      nodeId: string;
      reason: "decision_branch" | "structural" | "no_handler";
    }
  | {
      type: "node:errored";
      sessionId: string;
      nodeId: string;
      nodeLabel: string;
      error: Error;
      errorType: string;
      durationMs: number;
    }
  | {
      type: "node:waiting";
      sessionId: string;
      nodeId: string;
      nodeLabel: string;
      pauseReason: PauseReason;
      stepNumber: number;
    }
  | {
      type: "session:paused";
      sessionId: string;
      workflowId: string;
      nodeId: string;
      pauseReason: PauseReason;
      skippedNodes: string[];
      stepMode: boolean;
    }
  | {
      type: "session:completed";
      sessionId: string;
      workflowId: string;
      actorId: string;
      durationMs: number;
      finalVariables: string[];
    }
  | {
      type: "session:errored";
      sessionId: string;
      workflowId: string;
      actorId: string;
      nodeId: string;
      error: string;
    }
  | {
      type: "session:cancelled";
      sessionId: string;
      workflowId: string;
      actorId: string;
    };

// ─── Run Options & Result ─────────────────────────────────────────────────

export interface ExecutionOptions {
  stepMode?: boolean;
  liveUpdates?: boolean;
  inlineAsync?: boolean;
  asyncPollBaseUrl?: string;
  isBackgroundRun?: boolean;
  parentSessionId?: string;
  ancestorWorkflowChain?: string[];
  runStrategy?: RunStrategy;
  bypassLock?: boolean;
}

export interface StepOutput {
  nodeId: string;
  nodeLabel: string;
  nodeType: CalcNodeType;
  outputs: VariableMap;
  result: Record<string, unknown>;
  durationMs: number;
  stepNumber: number;
  totalSteps: number;
}

export interface ExecutionResult {
  sessionId: string;
  status: SessionStatus;
  variables: VariableSnapshot;
  pauseReason?: PauseReason;
  pausedNode?: {
    nodeId: string;
    nodeLabel: string;
    fields: InputFieldDef[];
    message?: string;
  } | null;
  stepOutput?: StepOutput;
  asyncPending?: {
    pollUrl: string;
    pollIntervalMs: number;
    strategy: RunStrategy;
  };
  completedAt?: string | null;
  error?: { nodeId: string; nodeLabel: string; message: string; type: string };
  nodeExecutions?: { calcNodeId: string | null; status: NodeExecutionStatus }[];
}

// ─── Session Metadata ─────────────────────────────────────────────────────

export const METADATA_VERSION = 1;

export interface SessionMetadata {
  metadataVersion: number;
  stepPauseReason?: PauseReason | null;
  skippedNodes: string[];
  stepMode: boolean;
  currentIndex: number;
  idempotencyKey?: string;
  parentSessionId?: string;
  ancestorWorkflowChain?: string[];
  /** CHUNK 4: which strategy was picked for this session's background runs. */
  runStrategy?: RunStrategy;
}

export function emptySessionMetadata(): SessionMetadata {
  return {
    metadataVersion: METADATA_VERSION,
    stepPauseReason: null,
    skippedNodes: [],
    stepMode: false,
    currentIndex: 0,
  };
}

// ─── Node Type Classification ─────────────────────────────────────────────

export const SYNC_NODE_TYPES = [
  "INPUT",
  "FORMULA",
  "MULTI_FORMULA",
  "LOOKUP_TABLE",
  "GRAPH_INTERPOLATION",
  "DECISION",
  "DISPLAY",
  "VALIDATION",
  "UNIT_CONVERSION",
  "CUSTOM_CODE",
] as const satisfies readonly CalcNodeType[];

export const ASYNC_NODE_TYPES = [
  "API_CALL",
  "PDF_REPORT",
  "PARALLEL",
  "SUBWORKFLOW",
  "LOOP",
] as const satisfies readonly CalcNodeType[];

export const STRUCTURAL_NODE_TYPES = [
  "COMMENT",
  "GROUP",
  "REFERENCE_IMAGE",
] as const satisfies readonly CalcNodeType[];

export type SyncNodeType = (typeof SYNC_NODE_TYPES)[number];
export type AsyncNodeType = (typeof ASYNC_NODE_TYPES)[number];
export type StructuralNodeType = (typeof STRUCTURAL_NODE_TYPES)[number];

export function isAsyncNodeType(type: CalcNodeType): type is AsyncNodeType {
  return (ASYNC_NODE_TYPES as readonly CalcNodeType[]).includes(type);
}

export function isStructuralNodeType(
  type: CalcNodeType,
): type is StructuralNodeType {
  return (STRUCTURAL_NODE_TYPES as readonly CalcNodeType[]).includes(type);
}

// ─── Variable Store Limits ────────────────────────────────────────────────

export const MAX_VARIABLE_BYTES = 5 * 1024 * 1024;
export const MAX_STORE_BYTES = 20 * 1024 * 1024;

// ─── Clock ────────────────────────────────────────────────────────────────

export interface Clock {
  now(): number;
  nowDate(): Date;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CHUNK 4 NEW TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * How a run is being executed.
 *
 * INLINE_SYNC   — Entire workflow is sync-only; runs in the request path.
 *                 Returns the final result to the client in one response.
 *
 * INLINE_ASYNC  — Run sync prefix inline; when we hit an async node, pause
 *                 the session, emit an Inngest event, and return
 *                 asyncPending to the client so it starts polling. Inngest
 *                 picks up and continues the run.
 *
 * BACKGROUND_BATCH — For large batch jobs (100+ rows). Creates the session
 *                 and immediately hands off to Inngest; client polls from
 *                 the start. Used by batch-executor.ts path, not single runs.
 */
export enum RunStrategy {
  INLINE_SYNC = "INLINE_SYNC",
  INLINE_ASYNC = "INLINE_ASYNC",
  BACKGROUND_BATCH = "BACKGROUND_BATCH",
}

/**
 * Info returned from an async-transition outcome. The executor writes this
 * to the session when it hits an async node, and the orchestrator reads it
 * to build the asyncPending response.
 */
export interface AsyncNodeTransition {
  nodeId: string;
  nodeLabel: string;
  nodeType: AsyncNodeType;
  /** The resume event Inngest needs, so the orchestrator can send it. */
  resumeEventName: string;
  resumeEventPayload: Record<string, unknown>;
}

/**
 * What SessionPoller returns to the client on each poll request.
 *
 * When status is still RUNNING or PAUSED with background_transition, the
 * client keeps polling. When it's COMPLETED/ERRORED/CANCELLED, the client
 * stops and renders the final result.
 */
export interface PollResult {
  sessionId: string;
  status: SessionStatus;
  /** The original pause reason — useful to distinguish "waiting on Inngest" vs "waiting on user" */
  pauseReason?: PauseReason | null;
  variables: VariableSnapshot;
  /** Current position in executionOrder, for progress UI. */
  currentIndex: number;
  totalSteps: number;
  /** When next to poll (ms). Server tells client what backoff to use. */
  nextPollIntervalMs: number;
  /** Terminal error, if status is ERRORED. */
  error?: { nodeId: string; nodeLabel: string; message: string; type: string };
  completedAt?: string | null;
  nodeExecutions?: { calcNodeId: string | null; status: NodeExecutionStatus }[];
}
