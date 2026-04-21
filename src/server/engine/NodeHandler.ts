// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/NodeHandler.ts
//
//  The contract every node handler must satisfy.
//
//  Handlers are stateless — they receive everything they need via
//  ExecutionContext and return a NodeOutcome. They never:
//    - touch the database directly (use ctx.variables for state, return outcome for logging)
//    - emit events (the executor does that based on the outcome)
//    - throw for control flow (return { kind: "errored" } instead)
//
//  Handlers MAY:
//    - read/write ctx.variables
//    - call ctx.db for registry resolution (FormulaHandler, LookupTableHandler, etc.)
//    - perform I/O if they're an ASYNC_NODE_TYPE (ApiCallHandler, etc.)
// ═══════════════════════════════════════════════════════════════════════════

import type { CalcNodeType } from "@/generated/prisma";
import type { ExecutionContext, NodeOutcome } from "./types";

export interface NodeHandler {
    /** The node type this handler is registered for. */
    readonly type: CalcNodeType;

    /**
     * Optional per-handler timeout in ms. The executor enforces this by racing
     * execute() against a timer. Defaults to no timeout (handler runs as long
     * as it wants — appropriate for sync handlers that are bounded by mathjs
     * complexity limits anyway).
     *
     * Async handlers (ApiCallHandler, PdfReportHandler) MUST set this.
     */
    readonly timeoutMs?: number;

    /**
     * Execute the node. See class doc above for what's allowed.
     *
     * Implementations should be pure with respect to anything outside
     * ctx — no captured closures over module-level state.
     */
    execute(ctx: ExecutionContext): Promise<NodeOutcome>;
}

/**
 * Helper for handlers that need to wrap an unknown thrown error into an
 * "errored" outcome with a useful message. Most handlers shouldn't throw,
 * but some operations (mathjs, fetch) can throw natively.
 */
export function toErroredOutcome(err: unknown): NodeOutcome {
    if (err instanceof Error) return { kind: "errored", error: err };
    return { kind: "errored", error: new Error(String(err)) };
}

/**
 * Classify an error message into a stable error type string.
 * Used in node:errored events and stored on CalcNodeExecution.errorType.
 */
export function classifyError(err: Error): string {
    const msg = err.message.toLowerCase();
    if (msg.includes("not found in variables") || msg.includes("hasn't been computed")) return "missing_variable";
    if (msg.includes("no matching row")) return "lookup_miss";
    if (msg.includes("circular") || msg.includes("cycle")) return "circular_dependency";
    if (msg.includes("timeout") || msg.includes("timed out")) return "timeout";
    if (msg.includes("validation")) return "validation";
    if (msg.includes("undefined symbol")) return "missing_variable";
    if (msg.includes("size limit") || msg.includes("too large")) return "size_limit";
    return "computation";
}