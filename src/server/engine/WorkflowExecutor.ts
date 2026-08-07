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
import { logger } from "./logger";

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
  type VariableValue,
  isAsyncNodeType,
  isStructuralNodeType,
} from "./types";
import { AppCache } from "@/lib/cache";

export class WriteSerializer {
  private static queues = new Map<string, Promise<any>>();

  static enqueue<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
    const existing = this.queues.get(sessionId) || Promise.resolve();
    const next = existing.then(task).catch((err) => {
      logger.error({ sessionId, err }, `[WriteSerializer] Task failed for session`);
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

  static async awaitPending(sessionId: string): Promise<void> {
    const pending = this.queues.get(sessionId);
    if (pending) {
      await pending;
    }
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

export class WriteBufferManager {
  private static buffer = new Map<
    string,
    {
      variables: any;
      currentIndex: number;
      pendingCount: number;
      lastFlushTime: number;
    }
  >();

  static register(sessionId: string, initialIndex: number, initialVars: any) {
    this.buffer.set(sessionId, {
      variables: initialVars,
      currentIndex: initialIndex,
      pendingCount: 0,
      lastFlushTime: Date.now(),
    });
  }

  static update(sessionId: string, variables: any, currentIndex: number) {
    let entry = this.buffer.get(sessionId);
    if (!entry) {
      entry = {
        variables,
        currentIndex,
        pendingCount: 0,
        lastFlushTime: Date.now(),
      };
      this.buffer.set(sessionId, entry);
    }
    entry.variables = variables;
    entry.currentIndex = currentIndex;
    entry.pendingCount += 1;
  }

  static shouldFlush(sessionId: string, batchSize = 10, intervalMs = 500): boolean {
    const entry = this.buffer.get(sessionId);
    if (!entry || entry.pendingCount === 0) return false;
    return entry.pendingCount >= batchSize || (Date.now() - entry.lastFlushTime) >= intervalMs;
  }

  static get(sessionId: string) {
    return this.buffer.get(sessionId);
  }

  static markFlushed(sessionId: string) {
    const entry = this.buffer.get(sessionId);
    if (entry) {
      entry.pendingCount = 0;
      entry.lastFlushTime = Date.now();
    }
  }

  static remove(sessionId: string) {
    this.buffer.delete(sessionId);
  }

  static getAllPending() {
    return Array.from(this.buffer.entries()).filter(([_, entry]) => entry.pendingCount > 0);
  }
}

const GLOBAL_SHUTDOWN_KEY = Symbol.for("nodebase.shutdown_hook_registered");

function registerShutdownHook(repo: SessionRepository) {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, global signal interceptors that call process.exit()
    // interfere with Next.js's own signal handling and compilation worker reload mechanisms.
    return;
  }

  // Use Node.js global scope to persist the registration state across Next.js HMR reloads,
  // preventing memory leaks and duplicate process event listeners.
  if ((global as any)[GLOBAL_SHUTDOWN_KEY]) return;
  (global as any)[GLOBAL_SHUTDOWN_KEY] = true;

  const flushAll = async () => {
    const pending = WriteBufferManager.getAllPending();
    if (pending.length === 0) return;

    logger.info("[ShutdownHook] 🛑 Process received termination signal. Flushing pending buffered writes...");

    const promises = pending.map(([sessId, data]) => {
      logger.info({ sessId, currentIndex: data.currentIndex }, `[ShutdownHook] Flushing session`);
      return repo.updateProgress(sessId, data.variables, data.currentIndex)
        .catch((err) => logger.error({ sessId, err }, `[ShutdownHook] Failed to flush session`));
    });

    await Promise.all(promises);
    logger.info("[ShutdownHook] All pending buffered writes flushed successfully.");
  };

  process.on("SIGTERM", async () => {
    try {
      await Promise.race([
        flushAll(),
        new Promise((resolve) => setTimeout(resolve, 20000)), // 20 seconds timeout
      ]);
    } finally {
      process.exit(0);
    }
  });

  process.on("SIGINT", async () => {
    try {
      await Promise.race([
        flushAll(),
        new Promise((resolve) => setTimeout(resolve, 5000)), // 5 seconds timeout
      ]);
    } finally {
      process.exit(0);
    }
  });
}

export class WorkflowExecutor {
  constructor(private readonly deps: WorkflowExecutorDeps) {
    registerShutdownHook(this.deps.repo);
  }

  get emitter(): ExecutionEventEmitter {
    return this.deps.emitter;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  PUBLIC ENTRY POINTS
  // ══════════════════════════════════════════════════════════════════════

  async startExecution(
    calcWorkflowIdOrWf: string | LoadedWorkflow,
    actorId: string,
    initialValues: VariableMap = {},
    options: ExecutionOptions = {},
    idempotencyKey?: string,
  ): Promise<ExecutionResult> {
    const wf = typeof calcWorkflowIdOrWf === "string"
      ? await this.deps.repo.loadWorkflow(calcWorkflowIdOrWf)
      : calcWorkflowIdOrWf;
    const calcWorkflowId = wf.workflow.id;
    logger.info(
      { calcWorkflowId, actorId, stepMode: options.stepMode ?? false, idempotencyKey: idempotencyKey ?? "none" },
      `[WorkflowExecutor.startExecution] 🌐 Triggered execution`
    );
    if (idempotencyKey) {
      const cachedSessionId = await AppCache.getString(AppCache.keys.idempotencyKey(`${calcWorkflowId}:${idempotencyKey}`));
      if (cachedSessionId) {
        return this.continueExecution(cachedSessionId, options);
      }
      const existing = await this.deps.repo.findByIdempotencyKey(
        calcWorkflowId,
        idempotencyKey,
      );
      if (existing) {
        await AppCache.setString(AppCache.keys.idempotencyKey(`${calcWorkflowId}:${idempotencyKey}`), existing.id, 3600);
        return this._continueExecutionWithSession(existing, options);
      }
    }

    const executionOrder = resolveExecutionOrder(wf);

    const variables: VariableMap = {};
    for (const v of wf.variables) {
      if (v.defaultValue !== null && v.sourceType !== "USER_INPUT")
        variables[v.contextKey] = v.defaultValue as never;
    }
    Object.assign(variables, initialValues);

    const stepMode = options.stepMode ?? false;
    const liveUpdates = options.liveUpdates || stepMode;

    const session = await this.deps.repo.createSession({
      calcWorkflowId,
      actorId,
      executionOrder,
      initialVariables: variables,
      stepMode,
      idempotencyKey,
      parentSessionId: options.parentSessionId,
      ancestorWorkflowChain: options.ancestorWorkflowChain,
      liveUpdates,
      runStrategy: options.runStrategy,
    });

    if (idempotencyKey) {
      await AppCache.setString(AppCache.keys.idempotencyKey(`${calcWorkflowId}:${idempotencyKey}`), session.id, 3600);
    }

    // Emit session:started and await to ensure listener is fully ready
    await this.deps.emitter.emit({
      type: "session:started",
      sessionId: session.id,
      workflowId: calcWorkflowId,
      actorId,
      nodeCount: executionOrder.length,
      executionOrder,
    }).catch(() => { });

    return this._continueExecutionWithSession(session, { ...options, liveUpdates, stepMode });
  }

  async resumeWithInput(
    sessionId: string,
    nodeId: string,
    userInput: Record<string, unknown>,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
    logger.info(
      { sessionId, nodeId, inputKeys: Object.keys(userInput) },
      `[WorkflowExecutor.resumeWithInput] ⚡ Resuming session`
    );
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

    const currentIdx = session.executionOrder.indexOf(nodeId);
    if (currentIdx === -1) {
      throw new Error(
        `Session ${sessionId}: paused node ${nodeId} not found in execution order. ` +
        `Workflow may have been edited while session was paused.`,
      );
    }

    const wf = await this.deps.repo.loadWorkflow(session.calcWorkflowId);
    const node = wf.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }

    const handler = this.deps.registry.get(node.type);
    if (!handler) {
      throw new Error(`No handler found for node type ${node.type}`);
    }

    const variableStore = new DefaultVariableStore(session.variables);
    for (const [k, v] of Object.entries(userInput)) {
      variableStore.set(k, v as VariableValue);
    }

    const stepMode = session.metadata.stepMode || (options.stepMode ?? false);
    const liveUpdates = options.liveUpdates || stepMode;

    const registry: RegistryResolver = createRegistryResolver();
    try {
      await registry.prefetchForWorkflow(this.deps.db, session.calcWorkflowId);
    } catch {
      /* prefetch is optional */
    }

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
      liveUpdates,
    };

    const outcome = await this.runHandlerWithTimeout(handler, ctx);
    if (outcome.kind !== "completed") {
      if (outcome.kind === "errored") {
        throw outcome.error;
      }
      throw new Error(`Node ${nodeId} failed to complete during resume (kind: ${outcome.kind})`);
    }

    const variables = variableStore.snapshot();
    const nodeOutputs = outcome.outputs;

    this.enrichOutcomeWithMarkdown(node, outcome, variables);

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
    await AppCache.setSessionState(sessionId, updatedSession);
    await AppCache.setSessionStatus(sessionId, "RUNNING");

    let nodeExecs = await AppCache.getSessionExecutions(sessionId) || [];
    const idx = nodeExecs.findIndex((n: any) => n.calcNodeId === nodeId);
    if (idx !== -1) nodeExecs[idx].status = "COMPLETED";
    else nodeExecs.push({ calcNodeId: nodeId, status: "COMPLETED" });
    await AppCache.setSessionExecutions(sessionId, nodeExecs);

    await this.deps.emitter.emit({
      type: "node:completed",
      sessionId,
      nodeId,
      nodeLabel: node.label,
      nodeType: node.type,
      stepNumber: currentIdx,
      outputs: nodeOutputs,
      result: outcome.result,
      durationMs: 0,
      cpuUserMs: 0,
      cpuSystemMs: 0,
    }).catch(() => { });

    // Run slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      Promise.all([
        this.deps.repo.updateNodeCompleted({
          sessionId,
          nodeId,
          outputs: nodeOutputs,
          result: outcome.result,
          durationMs: 0,
        }),
        this.deps.repo.resumeSession({
          sessionId,
          userInput,
          nextIndex: currentIdx + 1,
          variables,
        }),
      ])
    ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] resumeWithInput failed`));

    return this._continueExecutionWithSession(updatedSession, { ...options, liveUpdates, stepMode, bypassLock: true });
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
    logger.info({ sessionId }, `[WorkflowExecutor.stepForward] ➡️ Advancing session`);
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

    const updatedSession: LoadedSession = {
      ...session,
      status: "RUNNING",
      currentNodeId: null,
      currentIndex: session.currentIndex + 1,
      variables: session.variables,
      pauseReason: null,
    };
    await AppCache.setSessionState(sessionId, updatedSession);
    await AppCache.setSessionStatus(sessionId, "RUNNING");

    // Run slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      this.deps.repo.resumeSession({
        sessionId,
        userInput: {},
        nextIndex: session.currentIndex + 1,
        variables: session.variables,
      })
    ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] stepForward failed`));

    return this._continueExecutionWithSession(updatedSession, { ...options, stepMode: true, bypassLock: true });
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
    logger.info({ sessionId, targetNodeId }, `[WorkflowExecutor.stepBack] ↩️ Rewinding session`);
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

    // Reset all node executions from target onwards back to PENDING.
    const nodesToReset = session.executionOrder.slice(targetIndex);

    // Synchronize the node executions cache in Redis to keep the UI in sync immediately
    const currentExecs = await AppCache.getSessionExecutions(sessionId);
    if (currentExecs) {
      for (const e of currentExecs) {
        if (nodesToReset.includes(e.calcNodeId)) {
          e.status = "PENDING";
        }
      }
      await AppCache.setSessionExecutions(sessionId, currentExecs);
    }

    const updatedSession: LoadedSession = {
      ...session,
      status: "RUNNING",
      currentNodeId: null,
      currentIndex: targetIndex,
      variables: session.variables,
      pauseReason: null,
    };
    await AppCache.setSessionState(sessionId, updatedSession);
    await AppCache.setSessionStatus(sessionId, "RUNNING");

    // Run slow database updates fully asynchronously in the background
    WriteSerializer.enqueue(sessionId, () =>
      Promise.all([
        this.deps.repo.resetNodeExecutions(sessionId, nodesToReset),
        this.deps.repo.resumeSession({
          sessionId,
          userInput: {},
          nextIndex: targetIndex,
          variables: session.variables,
        }),
      ])
    ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] stepBack failed`));

    return this._continueExecutionWithSession(updatedSession, { stepMode: true, bypassLock: true });
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
    const session = await this.deps.repo.loadSession(sessionId);
    return this._continueExecutionWithSession(session, options);
  }

  private async _continueExecutionWithSession(
    session: LoadedSession,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
    const sessionId = session.id;
    const sessionStartCpu = process.cpuUsage();
    if (!options.bypassLock) {
      const locked = await this.deps.repo.acquireExecutionLock(session.id, session.lockVersion);
      if (!locked) {
        throw new Error(
          `Concurrency Lock Conflict: Session ${session.id} is already being executed by another process.`
        );
      }
    }

    const stepMode = session.metadata.stepMode || (options.stepMode ?? false);
    const liveUpdates = options.liveUpdates || stepMode;

    if (liveUpdates) {
      WriteBufferManager.register(sessionId, session.currentIndex, session.variables);
    }

    try {
      const wf = await this.deps.repo.loadWorkflow(session.calcWorkflowId);

      // Immutability protection (shallow freeze on core structures)
      Object.freeze(wf);
      Object.freeze(wf.nodes);
      wf.nodes.forEach((n) => Object.freeze(n));

      const skipSet = new Set(session.metadata.skippedNodes);

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
      let nodeExecs = await AppCache.getSessionExecutions(sessionId) || [];

      const syncNodeExecsToRedis = async () => {
        await AppCache.setSessionExecutions(sessionId, nodeExecs);
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
          logger.info(
            { sessionId, nodeId, type: node.type, label: node.label, currentIndex, totalSteps },
            `[WorkflowExecutor.continueExecution] 📝 Evaluating node`
          );
        }

        if (!node) {
          currentIndex++;
          continue;
        }

        if (skipSet.has(nodeId)) {
          const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
          if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
          else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

          await this.deps.emitter.emit({
            type: "node:skipped",
            sessionId,
            nodeId,
            reason: "decision_branch",
          }).catch(() => { });

          if (liveUpdates) {
            await this.deps.repo.updateNodeSkipped(sessionId, nodeId);
          }

          currentIndex++;
          continue;
        }

        if (isStructuralNodeType(node.type)) {
          const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
          if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
          else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

          await this.deps.emitter.emit({
            type: "node:skipped",
            sessionId,
            nodeId,
            reason: "structural",
          }).catch(() => { });

          if (liveUpdates) {
            await this.deps.repo.updateNodeSkipped(sessionId, nodeId);
          }

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
              `Async node type ${node.type} requires background queue (BullMQ) to execute`,
            ),
            options,
          );
        }

        const handler = this.deps.registry.get(node.type);
        if (!handler) {
          const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
          if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
          else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

          await this.deps.emitter.emit({
            type: "node:skipped",
            sessionId,
            nodeId,
            reason: "no_handler",
          }).catch(() => { });

          if (liveUpdates) {
            await this.deps.repo.updateNodeSkipped(sessionId, nodeId);
          }

          currentIndex++;
          continue;
        }

        const startTime = this.deps.clock.now();

        await this.deps.emitter.emit({
          type: "node:started",
          sessionId,
          nodeId,
          nodeLabel: node.label,
          nodeType: node.type,
          stepNumber: currentIndex,
        }).catch(() => { });

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
          liveUpdates,
        };

        const startCpu = process.cpuUsage();
        const outcome = await this.runHandlerWithTimeout(handler, ctx);
        const diffCpu = process.cpuUsage(startCpu);
        const cpuUserMs = (outcome.kind === "completed" && outcome.cpuUserMs !== undefined)
          ? outcome.cpuUserMs
          : Math.round(diffCpu.user / 1000);
        const cpuSystemMs = (outcome.kind === "completed" && outcome.cpuSystemMs !== undefined)
          ? outcome.cpuSystemMs
          : Math.round(diffCpu.system / 1000);
        const durationMs = this.deps.clock.now() - startTime;

        // ── errored ───────────────────────────────────────────────
        if (outcome.kind === "errored") {
          logger.error(
            { sessionId, nodeId, nodeType: node.type, nodeLabel: node.label, err: outcome.error },
            `[WorkflowExecutor.continueExecution] ❌ Node failed`
          );
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
            outcome.error,
            options,
            durationMs,
          );
        }

        if (outcome.kind === "skipped") {
          const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
          if (idx !== -1) nodeExecs[idx].status = "SKIPPED";
          else nodeExecs.push({ calcNodeId: nodeId, status: "SKIPPED" });

          await this.deps.emitter.emit({
            type: "node:skipped",
            sessionId,
            nodeId,
            reason: "no_handler",
          }).catch(() => { });

          if (liveUpdates) {
            await this.deps.repo.updateNodeSkipped(sessionId, nodeId);
          }

          currentIndex++;
          continue;
        }

        // ── paused (awaiting input / validation error) ───────────
        if (outcome.kind === "paused") {
          logger.info(
            { sessionId, nodeId, type: node.type, label: node.label, reason: outcome.reason },
            `[WorkflowExecutor.continueExecution] ⏸️ Session paused`
          );
          const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
          if (idx !== -1) nodeExecs[idx].status = "WAITING";
          else nodeExecs.push({ calcNodeId: nodeId, status: "WAITING" });

          await syncNodeExecsToRedis();

          const updatedSession: LoadedSession = {
            ...session,
            status: "PAUSED",
            currentNodeId: nodeId,
            currentIndex,
            variables: variableStore.snapshot(),
            pauseReason: outcome.reason,
          };
          await AppCache.setSessionState(sessionId, updatedSession);
          await AppCache.setSessionStatus(sessionId, "PAUSED");

          // Schedule slow database updates and await them to prevent race conditions
          WriteSerializer.enqueue(sessionId, () =>
            Promise.all([
              this.deps.emitter.emit({
                type: "node:waiting",
                sessionId,
                nodeId,
                nodeLabel: node.label,
                pauseReason: outcome.reason,
                stepNumber: currentIndex,
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
          ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] paused handler failed`));

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

        await this.deps.emitter.emit({
          type: "node:completed",
          sessionId,
          nodeId,
          nodeLabel: node.label,
          nodeType: node.type,
          stepNumber: currentIndex,
          outputs: outcome.outputs,
          result: outcome.result,
          durationMs,
          cpuUserMs,
          cpuSystemMs,
        }).catch(() => { });

        const idx = nodeExecs.findIndex((n) => n.calcNodeId === nodeId);
        if (idx !== -1) nodeExecs[idx].status = "COMPLETED";
        else nodeExecs.push({ calcNodeId: nodeId, status: "COMPLETED" });

        if (liveUpdates) {
          await this.deps.repo.updateNodeCompleted({
            sessionId,
            nodeId,
            outputs: outcome.outputs,
            result: outcome.result,
            durationMs,
          });
          WriteBufferManager.update(sessionId, variableStore.snapshot(), currentIndex + 1);
          if (WriteBufferManager.shouldFlush(sessionId)) {
            const buffered = WriteBufferManager.get(sessionId);
            if (buffered) {
              await this.deps.repo.updateProgress(sessionId, buffered.variables, buffered.currentIndex);
              WriteBufferManager.markFlushed(sessionId);
            }
          }
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

          logger.info(
            { sessionId, nodeId, type: node.type, label: node.label, stepNumber: currentIndex },
            `[WorkflowExecutor.continueExecution] ⏸️ stepMode Pause`
          );
          await syncNodeExecsToRedis();

          const updatedSession: LoadedSession = {
            ...session,
            status: "PAUSED",
            currentNodeId: nodeId,
            currentIndex,
            variables: variableStore.snapshot(),
            pauseReason: "step_complete",
          };
          await AppCache.setSessionState(sessionId, updatedSession);
          await AppCache.setSessionStatus(sessionId, "PAUSED");

          // Schedule slow database updates and await them to prevent race conditions
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
          ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] stepMode paused failed`));

          let execs = await AppCache.getSessionExecutions(sessionId) || [];
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
      logger.info({ sessionId, status: "COMPLETED" }, `[WorkflowExecutor.continueExecution] 🎉 Session Completed`);
      const finalSnapshot = variableStore.snapshot();
      const approxDuration = session.startedAt
        ? this.deps.clock.nowDate().getTime() - session.startedAt.getTime()
        : 0;

      await syncNodeExecsToRedis();

      const updatedSession: LoadedSession = {
        ...session,
        status: "COMPLETED",
        currentNodeId: null,
        variables: finalSnapshot,
      };
      await AppCache.setSessionState(sessionId, updatedSession);
      await AppCache.setSessionStatus(sessionId, "COMPLETED");

      // Schedule slow database updates and await them to prevent race conditions
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
            cpuUserMs: Math.round(process.cpuUsage(sessionStartCpu).user / 1000),
            cpuSystemMs: Math.round(process.cpuUsage(sessionStartCpu).system / 1000),
          }),
        ])
      ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] completion failed`));

      return await this.buildResult(
        sessionId,
        "COMPLETED",
        finalSnapshot,
        approxDuration,
      );
    } finally {
      const finalData = WriteBufferManager.get(sessionId);
      if (finalData && finalData.pendingCount > 0) {
        await this.deps.repo.updateProgress(sessionId, finalData.variables, finalData.currentIndex)
          .catch((err) => logger.error({ sessionId, err }, `[WriteBuffer] Final flush failed`));
      }
      WriteBufferManager.remove(sessionId);

      // Await any pending background writes to ensure transactional consistency in worker threads/processes
      await WriteSerializer.awaitPending(sessionId);
    }
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
    options?: ExecutionOptions,
    durationMs: number = 0,
  ): Promise<ExecutionResult> {
    const errorType = classifyError(error);

    // Emit node:errored event so that listeners (like DatabaseListener) can process it
    await this.deps.emitter.emit({
      type: "node:errored",
      sessionId,
      nodeId: node.id,
      nodeLabel: node.label,
      error,
      errorType,
      durationMs,
    }).catch(() => { });

    const updatedSession: LoadedSession = {
      ...session,
      status: "ERRORED",
      currentNodeId: node.id,
      variables: store.snapshot(),
    };
    await AppCache.setSessionState(sessionId, updatedSession);
    await AppCache.setSessionStatus(sessionId, "ERRORED");

    // Schedule slow database updates and await them to prevent race conditions
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
        options?.liveUpdates
          ? this.deps.repo.updateNodeErrored({
            sessionId,
            nodeId: node.id,
            message: error.message,
            errorType,
            durationMs,
          })
          : Promise.resolve(),
        this.deps.emitter.emit({
          type: "session:errored",
          sessionId,
          workflowId: wf.workflow.id,
          actorId: session.actorId,
          nodeId: node.id,
          error: error.message,
        }),
      ])
    ).catch((err) => logger.error({ sessionId, err }, `[BACKGROUND_WRITE] errorSession failed`));

    let execs = await AppCache.getSessionExecutions(sessionId) || [];
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
    const cachedExecs = await AppCache.getSessionExecutions(sessionId);
    if (cachedExecs) {
      return {
        sessionId,
        status,
        variables,
        completedAt: this.deps.clock.nowDate().toISOString(),
        nodeExecutions: cachedExecs,
      };
    }

    const execs = await this.deps.db.calcNodeExecution.findMany({
      where: { sessionId },
      select: { calcNodeId: true, status: true },
    });

    if (execs.length > 0) {
      await AppCache.setSessionExecutions(sessionId, execs);
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
        outputs.displayExpression = outcome.result.displayExpression ?? outcome.result.expression;
        outputs.value = outcome.result.value;
        outputs.outputKey = outcome.result.outputKey;
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

export function resolveExecutionOrder(wf: LoadedWorkflow): string[] {
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
