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
import { addJob, calcQueue, workflowQueue } from "@/lib/bullmq";

import { RunStrategyResolver } from "./RunStrategyResolver";
import { SessionRepository } from "./SessionRepository";
import { WorkflowExecutor } from "./WorkflowExecutor";
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

    // ─── 4. Branch on strategy ────────────────────────────────────
    switch (effectiveStrategy) {
      case RunStrategy.INLINE_SYNC:
        return this.runInlineSync(input, reason);

      case RunStrategy.INLINE_ASYNC:
        return this.runInlineAsync(input, reason);

      case RunStrategy.BACKGROUND_BATCH:
        return this.runBackgroundBatch(input, reason);

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
      },
      input.idempotencyKey,
    );
  }

  /**
   * Run the sync prefix inline. If we hit an async node, the executor
   * pauses with background_transition. We then emit an Inngest event
   * to pick it up and return asyncPending so the client polls.
   */
  private async runInlineAsync(
    input: StartRunInput,
    reason: string,
  ): Promise<ExecutionResult> {
    // Start the run with inlineAsync flag set so the executor knows to
    // bail on the first async node it encounters.
    const result = await this.deps.executor.startExecution(
      input.calcWorkflowId,
      input.actorId,
      input.initialValues ?? {},
      {
        stepMode: false,
        liveUpdates: true, // INLINE_ASYNC always live — client polls
        inlineAsync: true,
      },
      input.idempotencyKey,
    );

    // If we paused for background_transition, hand off to Inngest
    if (
      result.status === "PAUSED" &&
      result.pauseReason === "background_transition"
    ) {
      await addJob(calcQueue, "resume", {
        sessionId: result.sessionId,
        reason: "async_node_hit",
        type: "calc/session.resume",
      });

      return {
        ...result,
        asyncPending: {
          pollUrl: this.buildPollUrl(result.sessionId),
          pollIntervalMs: 1000,
          strategy: RunStrategy.INLINE_ASYNC,
        },
      };
    }

    // Otherwise it completed / errored / paused-for-user inline — return as-is
    return result;
  }

  /**
   * Create the session, emit start-background event, and return asyncPending
   * immediately. The client polls from step 0. Used for large batches where
   * running even the sync prefix in-request would eat too much time.
   */
  private async runBackgroundBatch(
    input: StartRunInput,
    reason: string,
  ): Promise<ExecutionResult> {
    // We don't actually call the executor here — we just create the
    // session shell so the client has an id to poll. Inngest does
    // all the work.
    const wf = await this.deps.repo.loadWorkflow(input.calcWorkflowId);

    // Build initial variables from workflow defaults + caller input
    const variables: VariableMap = {};
    for (const v of wf.variables) {
      if (v.defaultValue !== null)
        variables[v.contextKey] = v.defaultValue as never;
    }
    Object.assign(variables, input.initialValues ?? {});

    // We need the executor's topological sort, but we don't want to
    // actually execute anything. Reach into startExecution and then
    // immediately send the start-background event. This does trigger
    // an unnecessary "session:started" emit but nothing actually runs
    // because the executor pauses on first async (which BACKGROUND_BATCH
    // is guaranteed to have, by construction at batchSize >= threshold
    // — OR we force it via inlineAsync=false isBackgroundRun).
    //
    // Simpler approach: just use executor.startExecution with isBackgroundRun
    // and it handles everything. The background flag prevents it from
    // treating async nodes as errors.
    const result = await this.deps.executor.startExecution(
      input.calcWorkflowId,
      input.actorId,
      input.initialValues ?? {},
      {
        stepMode: false,
        liveUpdates: true,
        isBackgroundRun: false, // We want it to pause at first async, not execute through
        inlineAsync: true,
      },
      input.idempotencyKey,
    );

    // Always hand off to Inngest for background batch
    await addJob(calcQueue, "start-background", {
      sessionId: result.sessionId,
      type: "calc/session.start-background",
    });

    return {
      ...result,
      status: "RUNNING", // Force RUNNING so the UI polls
      asyncPending: {
        pollUrl: this.buildPollUrl(result.sessionId),
        pollIntervalMs: 1000,
        strategy: RunStrategy.BACKGROUND_BATCH,
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
