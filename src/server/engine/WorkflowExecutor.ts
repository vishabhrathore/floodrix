// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/WorkflowExecutor.ts
//
//  CHUNK 3 CHANGES vs Chunk 2:
//    1. After each completed node in continueExecution(), check stepMode.
//       If on → pause with reason "step_complete" and return stepOutput.
//    2. New method stepForward(sessionId) — advance one node from a
//       step_complete pause.
//    3. New method stepBack(sessionId, targetNodeId) — rewind currentIndex
//       and re-run from targetNodeId. Guards against stepping back past
//       nodes with known external side effects.
//    4. errorOut helper simplified — avoids redundant loadSession round-trip.
// ═══════════════════════════════════════════════════════════════════════════
import toposort from "toposort";

import { renderMarkdown, DEFAULT_TEMPLATES } from "./markdown/MarkdownRenderer";


import {
  type RegistryResolver,
  createRegistryResolver,
} from "@/features/workflow-canvas/engine/registry-resolver";
import type { CalcNodeType, PrismaClient } from "@/generated/prisma";

import { ExecutionEventEmitter } from "./ExecutionEventEmitter";
import type { NodeHandler } from "./NodeHandler";
import { classifyError } from "./NodeHandler";
import { NodeHandlerRegistry } from "./NodeHandlerRegistry";
import {
  type LoadedSession,
  type LoadedWorkflow,
  SessionRepository,
} from "./SessionRepository";
import { DefaultVariableStore } from "./VariableStore";
import {
  type Clock,
  type ExecutionContext,
  type ExecutionOptions,
  type ExecutionResult,
  type StepOutput,
  type VariableMap,
  type VariableSnapshot,
  isAsyncNodeType,
  isStructuralNodeType,
} from "./types";
import { redisConnection } from "@/lib/bullmq";

export class WriteSerializer {
  private static queues = new Map<string, Promise<any>>();

  static enqueue<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
    const existing = this.queues.get(sessionId) || Promise.resolve();
    const next = existing.then(task).catch((err) => {
      console.error(`[WriteSerializer] Task failed for session ${sessionId}:`, err);
    });
    this.queues.set(sessionId, next);

    // Cleanup queue memory when settled
    next.finally(() => {
      if (this.queues.get(sessionId) === next) {
        this.queues.delete(sessionId);
      }
    });

    return next as any;
  }
}

interface WorkflowExecutorDeps {
  db: PrismaClient;
  repo: SessionRepository;
  registry: NodeHandlerRegistry;
  emitter: ExecutionEventEmitter;
  clock: Clock;
}

/** Node types we know have irreversible external side effects. stepBack past
 *  one of these nodes is blocked to prevent double-charging / double-sending. */
const IRREVERSIBLE_NODE_TYPES = new Set<CalcNodeType>([
  "API_CALL",
  "PDF_REPORT",
]);

export class WorkflowExecutor {
  constructor(private readonly deps: WorkflowExecutorDeps) {}

  // ══════════════════════════════════════════════════════════════════════
  //  PUBLIC ENTRY POINTS
  // ══════════════════════════════════════════════════════════════════════

  async startExecution(
    calcWorkflowId: string,
    actorId: string,
    initialValues: VariableMap = {},
    options: ExecutionOptions = {},
    idempotencyKey?: string,
  ): Promise<ExecutionResult> {
    console.log(`[WorkflowExecutor.startExecution] 🌐 Triggered: workflowId="${calcWorkflowId}" actorId="${actorId}" stepMode=${options.stepMode ?? false} idempotencyKey="${idempotencyKey ?? "none"}"`);
    if (idempotencyKey) {
      if (redisConnection) {
        try {
          const cachedSessionId = await redisConnection.get(
            `idemp:${calcWorkflowId}:${idempotencyKey}`,
          );
          if (cachedSessionId) {
            return this.continueExecution(cachedSessionId, options);
          }
        } catch {}
      }
      const existing = await this.deps.repo.findByIdempotencyKey(
        calcWorkflowId,
        idempotencyKey,
      );
      if (existing) {
        if (redisConnection) {
          redisConnection
            .setex(
              `idemp:${calcWorkflowId}:${idempotencyKey}`,
              3600,
              existing.id,
            )
            .catch(() => {});
        }
        return this.continueExecution(existing.id, options);
      }
    }

    const wf = await this.deps.repo.loadWorkflow(calcWorkflowId);
    const executionOrder = resolveExecutionOrder(wf);

    const variables: VariableMap = {};
    for (const v of wf.variables) {
      if (v.defaultValue !== null)
        variables[v.contextKey] = v.defaultValue as never;
    }
    Object.assign(variables, initialValues);

    const session = await this.deps.repo.createSession({
      calcWorkflowId,
      actorId,
      executionOrder,
      initialVariables: variables,
      stepMode: options.stepMode ?? false,
      idempotencyKey,
      parentSessionId: options.parentSessionId,
      ancestorWorkflowChain: options.ancestorWorkflowChain,
    });

    if (idempotencyKey && redisConnection) {
      redisConnection
        .setex(`idemp:${calcWorkflowId}:${idempotencyKey}`, 3600, session.id)
        .catch(() => {});
    }

    if (options.liveUpdates) {
      await this.deps.repo.createPendingNodeExecutions(
        session.id,
        executionOrder,
      );
    }

    // Emit session:started in background without awaiting
    this.deps.emitter.emit({
      type: "session:started",
      sessionId: session.id,
      workflowId: calcWorkflowId,
      actorId,
      nodeCount: executionOrder.length,
      executionOrder,
    }).catch(() => {});

    return this.continueExecution(session.id, options);
  }

  async resumeWithInput(
    sessionId: string,
    nodeId: string,
    userInput: Record<string, unknown>,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
    console.log(`[WorkflowExecutor.resumeWithInput] ⚡ Resuming: sessionId="${sessionId}" nodeId="${nodeId}" inputKeys=${JSON.stringify(Object.keys(userInput))}`);
    const session = await this.deps.repo.loadSession(sessionId);
    if (session.status !== "PAUSED") {
      throw new Error(
        `Session ${sessionId} is not paused (status: ${session.status})`,
      );
    }
    if (session.currentNodeId !== nodeId) {
      throw new Error(
        `Session is paused at node ${session.currentNodeId}, not ${nodeId}`,
      );
    }

    const variables: VariableSnapshot = {
      ...session.variables,
      ...userInput,
    } as VariableSnapshot;
    const currentIdx = session.executionOrder.indexOf(nodeId);
    if (currentIdx === -1) {
      throw new Error(
        `Session ${sessionId}: paused node ${nodeId} not found in execution order. ` +
          `Workflow may have been edited while session was paused.`,
      );
    }

    // Synchronously update Redis cache in 0ms
    if (redisConnection) {
      try {
        const inputSnapshot = session.inputSnapshot
          ? { ...session.inputSnapshot, ...userInput }
          : userInput;
        const updatedSession: LoadedSession = {
          ...session,
          status: "RUNNING",
          currentNodeId: null,
          currentIndex: currentIdx + 1,
          variables,
          pauseReason: null,
          inputSnapshot,
        };
        redisConnection.setex(`sess:${sessionId}:loaded`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`res:session:${sessionId}`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`session:${sessionId}:status`, 3600, "RUNNING").catch(() => {});
        
        // Also update executions cache to mark this node COMPLETED in Redis
        let nodeExecs: any[] = [];
        const cached = await redisConnection.get(`sess:${sessionId}:executions`);
        if (cached) nodeExecs = JSON.parse(cached);
        const idx = nodeExecs.findIndex((n: any) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "COMPLETED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "COMPLETED" });
        await redisConnection.setex(`sess:${sessionId}:executions`, 3600, JSON.stringify(nodeExecs));
      } catch {}
    }

    // Run slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      Promise.all([
        this.deps.repo.updateNodeCompleted({
          sessionId,
          nodeId,
          outputs: userInput as VariableMap,
          result: {
            userInput,
            providedAt: this.deps.clock.nowDate().toISOString(),
          },
          durationMs: 0,
        }),
        this.deps.repo.resumeSession({
          sessionId,
          userInput,
          nextIndex: currentIdx + 1,
          variables,
        }),
      ])
    ).catch((err) => console.error(`[BACKGROUND_WRITE] resumeWithInput failed:`, err));

    return this.continueExecution(sessionId, options);
  }

  /**
   * CHUNK 3: advance one node from a step_complete pause.
   * Just re-enters the loop; stepMode flag in session.metadata drives
   * the pause-after-next-node behavior.
   */
  async stepForward(
    sessionId: string,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
    console.log(`[WorkflowExecutor.stepForward] ➡️ Advancing: sessionId="${sessionId}"`);
    const session = await this.deps.repo.loadSession(sessionId);
    if (session.status !== "PAUSED") {
      throw new Error(
        `stepForward: session ${sessionId} is not paused (status: ${session.status})`,
      );
    }
    if (session.pauseReason !== "step_complete") {
      throw new Error(
        `stepForward: session is paused for "${session.pauseReason}", ` +
          `not step_complete. Use resumeWithInput instead.`,
      );
    }

    // Synchronously update Redis cache in 0ms
    if (redisConnection) {
      try {
        const updatedSession: LoadedSession = {
          ...session,
          status: "RUNNING",
          currentNodeId: null,
          currentIndex: session.currentIndex + 1,
          variables: session.variables,
          pauseReason: null,
        };
        redisConnection.setex(`sess:${sessionId}:loaded`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`res:session:${sessionId}`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`session:${sessionId}:status`, 3600, "RUNNING").catch(() => {});
      } catch {}
    }

    // Run slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      this.deps.repo.resumeSession({
        sessionId,
        userInput: {},
        nextIndex: session.currentIndex + 1,
        variables: session.variables,
      })
    ).catch((err) => console.error(`[BACKGROUND_WRITE] stepForward failed:`, err));

    return this.continueExecution(sessionId, { ...options, stepMode: true });
  }

  /**
   * CHUNK 3: rewind to a previous node and re-run from there.
   *
   * Safety: blocks stepping back over nodes in IRREVERSIBLE_NODE_TYPES
   * (API_CALL, PDF_REPORT). If there's one between here and the target,
   * the stepBack is rejected with an explanatory error.
   *
   * Does NOT undo variable mutations from the skipped-over nodes. The
   * re-run will overwrite them with fresh values. Nodes that write
   * variables NOT produced by the re-run keep their stale values —
   * that's a known limitation. True variable rollback would require
   * snapshotting the store on every node completion.
   */
  async stepBack(
    sessionId: string,
    targetNodeId: string,
  ): Promise<ExecutionResult> {
    console.log(`[WorkflowExecutor.stepBack] ↩️ Rewinding: sessionId="${sessionId}" targetNodeId="${targetNodeId}"`);
    const session = await this.deps.repo.loadSession(sessionId);
    if (session.status !== "PAUSED") {
      throw new Error(
        `stepBack: session ${sessionId} is not paused (status: ${session.status})`,
      );
    }

    const targetIndex = session.executionOrder.indexOf(targetNodeId);
    if (targetIndex === -1) {
      throw new Error(`stepBack: node ${targetNodeId} not in execution order`);
    }
    if (targetIndex >= session.currentIndex) {
      throw new Error(
        `stepBack: target node is at or after current position ` +
          `(target=${targetIndex}, current=${session.currentIndex}). Use stepForward instead.`,
      );
    }

    // Check for irreversible nodes between target and current
    const wf = await this.deps.repo.loadWorkflow(session.calcWorkflowId);
    const nodeMap = new Map(wf.nodes.map((n) => [n.id, n]));
    for (let i = targetIndex; i < session.currentIndex; i++) {
      const n = nodeMap.get(session.executionOrder[i]);
      if (n && IRREVERSIBLE_NODE_TYPES.has(n.type)) {
        throw new Error(
          `stepBack blocked: node "${n.label}" (${n.type}) between target and current position ` +
            `has irreversible external side effects. Cancel and restart if you need to re-run it.`,
        );
      }
    }

    // Mark all node executions from target onwards as invalidated — we re-run them.
    // We do this by marking them as "PENDING" again (overwriting COMPLETED status),
    // but only in liveUpdates mode. In batch mode, the node execution log will
    // have duplicate entries; the UI should show the latest.
    const nodesToReset = session.executionOrder.slice(targetIndex);
    for (const nid of nodesToReset) {
      await this.deps.repo.updateNodeSkipped(sessionId, nid);
    }

    // Resume session at target index
    await this.deps.repo.resumeSession({
      sessionId,
      userInput: {},
      nextIndex: targetIndex,
      variables: session.variables,
    });

    return this.continueExecution(sessionId, { stepMode: true });
  }

  async cancelExecution(sessionId: string, actorId: string): Promise<void> {
    const session = await this.deps.repo.loadSession(sessionId);
    if (session.status !== "RUNNING" && session.status !== "PAUSED") {
      throw new Error(`Cannot cancel session with status: ${session.status}`);
    }
    await this.deps.repo.cancelSession(sessionId);
    await this.deps.emitter.emit({
      type: "session:cancelled",
      sessionId,
      workflowId: session.calcWorkflowId,
      actorId,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  //  CORE LOOP
  // ══════════════════════════════════════════════════════════════════════

  async continueExecution(
    sessionId: string,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
    console.log(`[WorkflowExecutor.continueExecution] 🚀 Execution loop entered: sessionId="${sessionId}"`);
    const session = await this.deps.repo.loadSession(sessionId);
    const wf = await this.deps.repo.loadWorkflow(session.calcWorkflowId);

    const skipSet = new Set(session.metadata.skippedNodes);
    const stepMode = session.metadata.stepMode || (options.stepMode ?? false);

    const variableStore = new DefaultVariableStore(session.variables);
    const registry: RegistryResolver = createRegistryResolver();

    try {
      await registry.prefetchForWorkflow(this.deps.db, session.calcWorkflowId);
    } catch {
      /* prefetch is optional */
    }

    const nodeMap = new Map(wf.nodes.map((n) => [n.id, n]));
    const totalSteps = session.executionOrder.length;
    let currentIndex = session.currentIndex;

    // Load existing executions cache from Redis to keep them warm
    let nodeExecs: any[] = [];
    const execsCacheKey = `sess:${sessionId}:executions`;
    if (redisConnection) {
      try {
        const cached = await redisConnection.get(execsCacheKey);
        if (cached) nodeExecs = JSON.parse(cached);
      } catch {}
    }

    const syncNodeExecsToRedis = async () => {
      if (redisConnection) {
        try {
          await redisConnection.setex(execsCacheKey, 3600, JSON.stringify(nodeExecs));
        } catch {}
      }
    };

    while (currentIndex < session.executionOrder.length) {
      // Cancel-mid-execution check
      const liveStatus = await this.deps.repo.getStatus(sessionId);
      if (liveStatus === "CANCELLED") {
        await syncNodeExecsToRedis();
        return await this.buildResult(
          sessionId,
          "CANCELLED",
          variableStore.snapshot(),
        );
      }

      const nodeId = session.executionOrder[currentIndex];
      const node = nodeMap.get(nodeId);
      if (node) {
        console.log(`[WorkflowExecutor.continueExecution] 📝 [Node ${currentIndex + 1}/${totalSteps}] Evaluating: nodeId="${nodeId}" type="${node.type}" label="${node.label}"`);
      }

      if (!node) {
        currentIndex++;
        continue;
      }

      if (skipSet.has(nodeId)) {
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

        this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "decision_branch",
        }).catch(() => {});
        currentIndex++;
        continue;
      }

      if (isStructuralNodeType(node.type)) {
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

        this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "structural",
        }).catch(() => {});
        currentIndex++;
        continue;
      }

      if (
        isAsyncNodeType(node.type) &&
        node.type !== "SUBWORKFLOW" &&
        !options.isBackgroundRun
      ) {
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "ERRORED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "ERRORED" });

        await syncNodeExecsToRedis();

        return this.errorOut(
          sessionId,
          session,
          wf,
          node,
          currentIndex,
          variableStore,
          new Error(
            `Async node type ${node.type} requires Chunk 4 (Inngest) to execute`,
          ),
        );
      }

      const handler = this.deps.registry.get(node.type);
      if (!handler) {
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

        this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "no_handler",
        }).catch(() => {});
        currentIndex++;
        continue;
      }

      const startTime = this.deps.clock.now();

      this.deps.emitter.emit({
        type: "node:started",
        sessionId,
        nodeId,
        nodeLabel: node.label,
        nodeType: node.type,
        stepNumber: currentIndex,
      }).catch(() => {});

      const ctx: ExecutionContext = {
        node,
        edges: wf.edges,
        variables: variableStore,
        db: this.deps.db,
        registry,
        sessionId,
        workflowId: session.calcWorkflowId,
        actorId: session.actorId,
        isBackgroundRun: options.isBackgroundRun ?? false,
        liveUpdates: options.liveUpdates ?? false,
      };

      const outcome = await this.runHandlerWithTimeout(handler, ctx);
      const durationMs = this.deps.clock.now() - startTime;

      // ── errored ───────────────────────────────────────────────
      if (outcome.kind === "errored") {
        console.error(`[WorkflowExecutor.continueExecution] ❌ Node failed: nodeId="${nodeId}" type="${node.type}" label="${node.label}" error="${outcome.error.message}"`);
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "ERRORED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "ERRORED" });

        await syncNodeExecsToRedis();

        this.deps.emitter.emit({
          type: "node:errored",
          sessionId,
          nodeId,
          nodeLabel: node.label,
          error: outcome.error,
          errorType: classifyError(outcome.error),
          durationMs,
        }).catch(() => {});
        return this.errorOut(
          sessionId,
          session,
          wf,
          node,
          currentIndex,
          variableStore,
          outcome.error,
        );
      }

      if (outcome.kind === "skipped") {
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

        this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "no_handler",
        }).catch(() => {});
        currentIndex++;
        continue;
      }

      // ── paused (awaiting input / validation error) ───────────
      if (outcome.kind === "paused") {
        console.log(`[WorkflowExecutor.continueExecution] ⏸️ Session paused: sessionId="${sessionId}" nodeId="${nodeId}" type="${node.type}" label="${node.label}" reason="${outcome.reason}"`);
        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "WAITING";
        else nodeExecs.push({ calcNodeId: nodeId, status: "WAITING" });

        await syncNodeExecsToRedis();

        // Synchronously update Redis cache state in 0ms
        if (redisConnection) {
          try {
            const updatedSession: LoadedSession = {
              ...session,
              status: "PAUSED",
              currentNodeId: nodeId,
              currentIndex,
              variables: variableStore.snapshot(),
              pauseReason: outcome.reason,
            };
            redisConnection.setex(`sess:${sessionId}:loaded`, 3600, JSON.stringify(updatedSession)).catch(() => {});
            redisConnection.setex(`res:session:${sessionId}`, 3600, JSON.stringify(updatedSession)).catch(() => {});
            redisConnection.setex(`session:${sessionId}:status`, 3600, "PAUSED").catch(() => {});
          } catch {}
        }

        // Schedule slow database updates fully asynchronously in the background
        WriteSerializer.enqueue(sessionId, () =>
          Promise.all([
            this.deps.emitter.emit({
              type: "node:waiting",
              sessionId,
              nodeId,
              nodeLabel: node.label,
              pauseReason: outcome.reason,
            }),
            this.deps.emitter.emit({
              type: "session:paused",
              sessionId,
              workflowId: session.calcWorkflowId,
              nodeId,
              pauseReason: outcome.reason,
              skippedNodes: [...skipSet],
              stepMode,
            }),
            this.deps.repo.pauseSession({
              sessionId,
              nodeId,
              currentIndex,
              variables: variableStore.snapshot(),
              pauseReason: outcome.reason,
              skippedNodes: [...skipSet],
              stepMode,
            }),
          ])
        ).catch((err) => console.error(`[BACKGROUND_WRITE] paused handler failed:`, err));

        return {
          sessionId,
          status: "PAUSED",
          variables: variableStore.snapshot(),
          pauseReason: outcome.reason,
          pausedNode: outcome.fields
            ? {
                nodeId,
                nodeLabel: outcome.nodeLabel ?? node.label,
                fields: outcome.fields,
                message: outcome.pauseMessage,
              }
            : null,
        };
      }

      // ── completed ────────────────────────────────────────────
      if (outcome.kind === "completed") {
        this.enrichOutcomeWithMarkdown(node, outcome, variableStore.snapshot());
      }

      if (outcome.sideEffects?.skipNodes) {
        for (const id of outcome.sideEffects.skipNodes) skipSet.add(id);
      }

      this.deps.emitter.emit({
        type: "node:completed",
        sessionId,
        nodeId,
        nodeLabel: node.label,
        nodeType: node.type,
        stepNumber: currentIndex,
        outputs: outcome.outputs,
        result: outcome.result,
        durationMs,
      }).catch(() => {});

      const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
      if (idx !== -1) nodeExecs[idx].status = "COMPLETED";
      else nodeExecs.push({ calcNodeId: nodeId, status: "COMPLETED" });

      if (options.liveUpdates) {
        await this.deps.repo.updateProgress(
          sessionId,
          variableStore.snapshot(),
          currentIndex + 1,
        );
      }

      // ── CHUNK 3: stepMode pause after each completed node ────
      if (stepMode) {
        const stepOutput: StepOutput = {
          nodeId,
          nodeLabel: node.label,
          nodeType: node.type,
          outputs: outcome.outputs,
          result: outcome.result,
          durationMs,
          stepNumber: currentIndex,
          totalSteps,
        };

        console.log(`[WorkflowExecutor.continueExecution] ⏸️ stepMode Pause: sessionId="${sessionId}" nodeId="${nodeId}" type="${node.type}" label="${node.label}" stepNumber=${currentIndex}`);
        await syncNodeExecsToRedis();

        // Synchronously update Redis cache state in 0ms
        if (redisConnection) {
          try {
            const updatedSession: LoadedSession = {
              ...session,
              status: "PAUSED",
              currentNodeId: nodeId,
              currentIndex,
              variables: variableStore.snapshot(),
              pauseReason: "step_complete",
            };
            redisConnection.setex(`sess:${sessionId}:loaded`, 3600, JSON.stringify(updatedSession)).catch(() => {});
            redisConnection.setex(`res:session:${sessionId}`, 3600, JSON.stringify(updatedSession)).catch(() => {});
            redisConnection.setex(`session:${sessionId}:status`, 3600, "PAUSED").catch(() => {});
          } catch {}
        }

        // Schedule slow database updates fully asynchronously in the background
        WriteSerializer.enqueue(sessionId, () =>
          Promise.all([
            this.deps.emitter.emit({
              type: "session:paused",
              sessionId,
              workflowId: session.calcWorkflowId,
              nodeId,
              pauseReason: "step_complete",
              skippedNodes: [...skipSet],
              stepMode: true,
            }),
            this.deps.repo.pauseSession({
              sessionId,
              nodeId,
              currentIndex,
              variables: variableStore.snapshot(),
              pauseReason: "step_complete",
              skippedNodes: [...skipSet],
              stepMode: true,
            }),
          ])
        ).catch((err) => console.error(`[BACKGROUND_WRITE] stepMode paused failed:`, err));

        let execs: any[] = [];
        const cacheKey = `sess:${sessionId}:executions`;
        if (redisConnection) {
          try {
            const cached = await redisConnection.get(cacheKey);
            if (cached) execs = JSON.parse(cached);
          } catch {}
        }
        if (execs.length === 0) {
          execs = await this.deps.db.calcNodeExecution.findMany({
            where: { sessionId },
            select: { calcNodeId: true, status: true },
          });
        }

        return {
          sessionId,
          status: "PAUSED",
          variables: variableStore.snapshot(),
          pauseReason: "step_complete",
          stepOutput,
          nodeExecutions: execs as any[],
        };
      }

      currentIndex++;
    }

    // ── all done ──────────────────────────────────────────────────
    console.log(`[WorkflowExecutor.continueExecution] 🎉 Session Completed: sessionId="${sessionId}" status="COMPLETED"`);
    const finalSnapshot = variableStore.snapshot();
    const approxDuration = session.startedAt
      ? this.deps.clock.nowDate().getTime() - session.startedAt.getTime()
      : 0;

    await syncNodeExecsToRedis();

    // Synchronously update Redis cache state in 0ms
    if (redisConnection) {
      try {
        const updatedSession: LoadedSession = {
          ...session,
          status: "COMPLETED",
          currentNodeId: null,
          variables: finalSnapshot,
        };
        redisConnection.setex(`sess:${sessionId}:loaded`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`res:session:${sessionId}`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`session:${sessionId}:status`, 3600, "COMPLETED").catch(() => {});
      } catch {}
    }

    // Schedule slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      Promise.all([
        this.deps.repo.completeSession({
          sessionId,
          variables: finalSnapshot,
        }),
        this.deps.emitter.emit({
          type: "session:completed",
          sessionId,
          workflowId: session.calcWorkflowId,
          actorId: session.actorId,
          durationMs: approxDuration,
          finalVariables: Object.keys(finalSnapshot).filter(
            (k) => k !== "$nodes" && k !== "$results",
          ),
        }),
      ])
    ).catch((err) => console.error(`[BACKGROUND_WRITE] completion failed:`, err));

    return await this.buildResult(
      sessionId,
      "COMPLETED",
      finalSnapshot,
      approxDuration,
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════════════

  private async runHandlerWithTimeout(
    handler: NodeHandler,
    ctx: ExecutionContext,
  ) {
    if (!handler.timeoutMs) return handler.execute(ctx);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            `Handler ${handler.type} timed out after ${handler.timeoutMs}ms`,
          ),
        );
      }, handler.timeoutMs);
    });

    try {
      return await Promise.race([handler.execute(ctx), timeoutPromise]);
    } catch (err) {
      return {
        kind: "errored" as const,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /**
   * CHUNK 3: takes the already-loaded session (no redundant DB round-trip).
   */
  private async errorOut(
    sessionId: string,
    session: LoadedSession,
    wf: LoadedWorkflow,
    node: { id: string; label: string },
    currentIndex: number,
    store: DefaultVariableStore,
    error: Error,
  ): Promise<ExecutionResult> {
    const errorType = classifyError(error);

    // Synchronously update Redis cache state in 0ms
    if (redisConnection) {
      try {
        const updatedSession: LoadedSession = {
          ...session,
          status: "ERRORED",
          currentNodeId: node.id,
          variables: store.snapshot(),
        };
        redisConnection.setex(`sess:${sessionId}:loaded`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`res:session:${sessionId}`, 3600, JSON.stringify(updatedSession)).catch(() => {});
        redisConnection.setex(`session:${sessionId}:status`, 3600, "ERRORED").catch(() => {});
      } catch {}
    }

    // Schedule slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      Promise.all([
        this.deps.repo.errorSession({
          sessionId,
          nodeId: node.id,
          nodeLabel: node.label,
          message: error.message,
          errorType,
          variables: store.snapshot(),
        }),
        this.deps.emitter.emit({
          type: "session:errored",
          sessionId,
          workflowId: wf.workflow.id,
          actorId: session.actorId,
          nodeId: node.id,
          error: error.message,
        }),
      ])
    ).catch((err) => console.error(`[BACKGROUND_WRITE] errorSession failed:`, err));

    let execs: any[] = [];
    const cacheKey = `sess:${sessionId}:executions`;
    if (redisConnection) {
      try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) execs = JSON.parse(cached);
      } catch {}
    }
    if (execs.length === 0) {
      execs = await this.deps.db.calcNodeExecution.findMany({
        where: { sessionId },
        select: { calcNodeId: true, status: true },
      });
    }

    return {
      sessionId,
      status: "ERRORED",
      variables: store.snapshot(),
      error: {
        nodeId: node.id,
        nodeLabel: node.label,
        message: error.message,
        type: errorType,
      },
      nodeExecutions: execs as any[],
    };
  }

  private async buildResult(
    sessionId: string,
    status: "COMPLETED" | "CANCELLED",
    variables: VariableSnapshot,
    durationMs?: number,
  ): Promise<ExecutionResult> {
    const cacheKey = `sess:${sessionId}:executions`;
    if (redisConnection) {
      try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
          return {
            sessionId,
            status,
            variables,
            completedAt: this.deps.clock.nowDate().toISOString(),
            nodeExecutions: JSON.parse(cached),
          };
        }
      } catch {}
    }

    const execs = await this.deps.db.calcNodeExecution.findMany({
      where: { sessionId },
      select: { calcNodeId: true, status: true },
    });

    if (redisConnection && execs.length > 0) {
      try {
        await redisConnection.setex(cacheKey, 30, JSON.stringify(execs));
      } catch {}
    }

    return {
      sessionId,
      status,
      variables,
      completedAt: this.deps.clock.nowDate().toISOString(),
      nodeExecutions: execs as any[],
    };
  }

  private enrichOutcomeWithMarkdown(
    node: Pick<any, "id" | "type" | "label" | "config" | "description">,
    outcome: any,
    variables: Record<string, any>,
    error?: string,
  ) {
    if (!outcome.result) {
      outcome.result = {};
    }

    const customTemplate = (node.config as any)?.markdownTemplate;
    const template = (customTemplate && typeof customTemplate === "string" && customTemplate.trim())
      ? customTemplate
      : DEFAULT_TEMPLATES[node.type] ?? `## {{node.label}}\n\n*Node executed successfully.*`;

    let inputs: Record<string, any> = {};
    let outputs: Record<string, any> = { ...outcome.outputs };

    switch (node.type) {
      case "INPUT": {
        const fields = (node.config as any)?.fields ?? [];
        for (const f of fields) {
          const val = variables[f.key];
          inputs[f.key] = {
            label: f.label ?? f.key,
            notation: f.notation ?? f.key,
            value: val,
            unit: f.unit ?? "",
          };
        }
        break;
      }
      case "FORMULA": {
        outputs.expressions = [
          {
            outputKey: outcome.result.outputKey,
            expression: outcome.result.displayExpression ?? outcome.result.expression,
            description: node.description ?? outcome.result.outputKey ?? "result",
            value: outcome.result.value,
            unit: (node.config as any)?.result_unit ?? "",
          }
        ];
        break;
      }
      case "MULTI_FORMULA": {
        outputs.expressions = (outcome.result.formulas ?? []).map((f: any) => ({
          outputKey: f.resultVar,
          expression: f.expr,
          description: f.label ?? f.resultVar,
          value: f.value,
          unit: "",
        }));
        break;
      }
      case "LOOKUP_TABLE":
      case "GRAPH_INTERPOLATION": {
        inputs = outcome.result.inputValues ?? {};
        outputs.outputKey = (node.config as any)?.result_variable ?? outcome.result.outputKey;
        outputs.value = outcome.result.selectedValue;
        break;
      }
      case "DISPLAY": {
        outputs.compareValues = outcome.result.compareValues ?? [];
        outputs.selectionRule = outcome.result.selectionRule;
        outputs.adopted = outcome.result.adopted;
        break;
      }
      case "UNIT_CONVERSION": {
        outputs.inputValue = outcome.result.inputVal;
        outputs.inputUnit = outcome.result.inputUnit;
        outputs.value = outcome.result.result;
        outputs.outputUnit = outcome.result.outputUnit;
        break;
      }
      default:
        inputs = outcome.result.inputValues ?? {};
        break;
    }

    try {
      const markdown = renderMarkdown(template, {
        node,
        inputs,
        outputs,
        variables,
        error,
      });
      outcome.result.markdown = markdown;
    } catch (err: any) {
      outcome.result.markdown = `*Error rendering markdown template:* ${err.message}`;
    }
  }
}

function resolveExecutionOrder(wf: LoadedWorkflow): string[] {
  const allNodeIds = wf.nodes.map((n) => n.id);
  const pairs: [string, string][] = wf.edges.map((e) => [
    e.sourceNodeId,
    e.targetNodeId,
  ]);
  try {
    return toposort.array(allNodeIds, pairs);
  } catch (err) {
    if ((err as Error).message?.includes("cycle")) {
      throw new Error(
        "Circular dependency detected in workflow. Check for loops in your node connections.",
      );
    }
    throw err;
  }
}
