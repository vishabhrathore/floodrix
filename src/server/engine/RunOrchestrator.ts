// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/RunOrchestrator.ts
//
//  The public entry point for starting workflow runs. API routes call this
//  instead of calling the executor directly. The orchestrator:
//
//    1. Resolves idempotency (returns existing session if key matches)
//    2. Loads workflow node types
//    3. Picks a RunStrategy via RunStrategyResolver
//    4. Branches:
//       INLINE_SYNC       → run synchronously, return ExecutionResult
//       INLINE_ASYNC      → run sync prefix inline; if it hits an async
//                           node, pause, emit Inngest event, return
//                           asyncPending
//       BACKGROUND_BATCH  → create the session only, emit Inngest
//                           start-background event, return asyncPending
//                           immediately
//
//  The executor itself doesn't know about strategies or Inngest. That
//  concern lives entirely here. The executor just runs nodes and reports
//  outcomes.
//
//  Cancel + retry safety both flow naturally through the same paths:
//    - Cancel: executor checks session.status between nodes and bails
//    - Retry: Inngest retries from currentIndex, same as Chunk 3 semantics
// ═══════════════════════════════════════════════════════════════════════════
import type { PrismaClient } from "@/generated/prisma";
import { QueueProducer } from "@/lib/queue-producers";

import { RunStrategyResolver } from "./RunStrategyResolver";
import { SessionRepository } from "./SessionRepository";
import { WorkflowExecutor, resolveExecutionOrder } from "./WorkflowExecutor";
import type { Clock, ExecutionResult, VariableMap } from "./types";
import { RunStrategy } from "./types";

interface RunOrchestratorDeps {
  db: PrismaClient;
  repo: SessionRepository;
  executor: WorkflowExecutor;
  resolver: RunStrategyResolver;
  clock: Clock;
  /** Base URL for poll endpoints. Default /api/trpc/calcExecution.poll */
  pollUrlPrefix?: string;
}

export interface StartRunInput {
  calcWorkflowId: string;
  actorId: string;
  initialValues?: VariableMap;
  stepMode?: boolean;
  idempotencyKey?: string;
  batchSize?: number;
  forceStrategy?: RunStrategy;
}

export class RunOrchestrator {
  constructor(private readonly deps: RunOrchestratorDeps) {}

  async start(input: StartRunInput): Promise<ExecutionResult> {
    // ─── 1. Idempotency check ─────────────────────────────────────
    if (input.idempotencyKey) {
      const existing = await this.deps.repo.findByIdempotencyKey(
        input.calcWorkflowId,
        input.idempotencyKey,
      );
      if (existing) {
        // Duplicate request — return existing session's current state
        return this.buildExistingSessionResult(existing.id);
      }
    }

    // ─── 2. Load workflow to inspect node types ───────────────────
    const wf = await this.deps.repo.loadWorkflow(input.calcWorkflowId);
    const nodeTypes = wf.nodes.map((n) => n.type);

    // ─── 3. Pick strategy ─────────────────────────────────────────
    const { strategy, reason } = this.deps.resolver.resolve({
      nodeTypes,
      batchSize: input.batchSize ?? 1,
      forceStrategy: input.forceStrategy,
    });

    // stepMode always forces INLINE_SYNC semantics — step-by-step
    // debugging doesn't make sense over an async boundary.
    const effectiveStrategy = input.stepMode
      ? RunStrategy.INLINE_SYNC
      : strategy;

    switch (effectiveStrategy) {
      case RunStrategy.INLINE_SYNC:
        return this.runInlineSync(input, reason);

      case RunStrategy.BACKGROUND:
        return this.runBackground(input, reason);

      default:
        throw new Error(`Unknown run strategy: ${effectiveStrategy}`);
    }
  }

  // ─── Strategy handlers ────────────────────────────────────────────

  /** No async nodes — just run it inline and return the final result. */
  private async runInlineSync(
    input: StartRunInput,
    reason: string,
  ): Promise<ExecutionResult> {
    return this.deps.executor.startExecution(
      input.calcWorkflowId,
      input.actorId,
      input.initialValues ?? {},
      {
        stepMode: input.stepMode ?? false,
        liveUpdates: input.stepMode ?? false,
        runStrategy: RunStrategy.INLINE_SYNC,
      },
      input.idempotencyKey,
    );
  }

  /**
   * Create the session, emit start-background event, and return asyncPending
   * immediately. The client polls from step 0. Used for background runs (async nodes or batches).
   */
  private async runBackground(
    input: StartRunInput,
    reason: string,
  ): Promise<ExecutionResult> {
    // Load the workflow topology
    const wf = await this.deps.repo.loadWorkflow(input.calcWorkflowId);

    // Build initial variables from workflow defaults + caller input
    const variables: VariableMap = {};
    for (const v of wf.variables) {
      if (v.defaultValue !== null && v.sourceType !== "USER_INPUT")
        variables[v.contextKey] = v.defaultValue as never;
    }
    Object.assign(variables, input.initialValues ?? {});

    const executionOrder = resolveExecutionOrder(wf);

    // Create session completely bypassing executor for zero request-thread execution overhead
    const session = await this.deps.repo.createSession({
      calcWorkflowId: input.calcWorkflowId,
      actorId: input.actorId,
      executionOrder,
      initialVariables: variables,
      stepMode: false,
      idempotencyKey: input.idempotencyKey,
      liveUpdates: false,
      runStrategy: RunStrategy.BACKGROUND,
    });

    // Emit session:started and await to ensure listener is fully ready
    await this.deps.executor.emitter.emit({
      type: "session:started",
      sessionId: session.id,
      workflowId: input.calcWorkflowId,
      actorId: input.actorId,
      nodeCount: executionOrder.length,
      executionOrder,
    }).catch(() => {});

    // Always hand off to Inngest for background execution (Outbox Pattern)
    await this.deps.db.$transaction(async (tx) => {
      await QueueProducer.dispatchCalcStartBackground(tx, {
        sessionId: session.id,
      });
    });

    return {
      sessionId: session.id,
      status: "RUNNING", // Force RUNNING so the UI polls
      variables: session.variables,
      nodeExecutions: [],
      asyncPending: {
        pollUrl: this.buildPollUrl(session.id),
        pollIntervalMs: 1000,
        strategy: RunStrategy.BACKGROUND,
      },
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private async buildExistingSessionResult(
    sessionId: string,
  ): Promise<ExecutionResult> {
    const s = await this.deps.repo.loadSession(sessionId);
    // CHUNK 4: include nodeExecutions for the UI highlights
    const execs = await this.deps.db.calcNodeExecution.findMany({
      where: { sessionId },
      select: { calcNodeId: true, status: true },
    });

    const result: ExecutionResult = {
      sessionId: s.id,
      status: s.status,
      variables: s.variables,
      pauseReason: (s.metadata.stepPauseReason ??
        undefined) as ExecutionResult["pauseReason"],
      nodeExecutions: execs as any[],
      // If it's still running or paused, hand back asyncPending so the
      // client picks up the existing session's poll loop.
      asyncPending:
        s.status === "RUNNING" || s.status === "PAUSED"
          ? {
              pollUrl: this.buildPollUrl(s.id),
              pollIntervalMs: 1000,
              strategy: s.metadata.runStrategy ?? RunStrategy.INLINE_SYNC,
            }
          : undefined,
    };

    // Hydrate paused node info if needed
    if (s.status === "PAUSED" && s.currentNodeId) {
      const wf = await this.deps.repo.loadWorkflow(s.calcWorkflowId);
      const node = wf.nodes.find((n) => n.id === s.currentNodeId);
      if (node && node.type === "INPUT") {
        const config = (node.config ?? {}) as any;
        result.pausedNode = {
          nodeId: node.id,
          nodeLabel: node.label,
          fields: config.fields ?? [],
          message: config.description ?? "",
        };
      }
    }

    return result;
  }

  private buildPollUrl(sessionId: string): string {
    const prefix = this.deps.pollUrlPrefix ?? "/api/trpc/calcExecution.poll";
    return `${prefix}?input=${encodeURIComponent(JSON.stringify({ sessionId }))}`;
  }
}
