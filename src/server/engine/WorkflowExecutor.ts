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
    if (idempotencyKey) {
      const existing = await this.deps.repo.findByIdempotencyKey(
        calcWorkflowId,
        idempotencyKey,
      );
      if (existing) return this.continueExecution(existing.id, options);
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
    });

    if (options.liveUpdates) {
      await this.deps.repo.createPendingNodeExecutions(
        session.id,
        executionOrder,
      );
    }

    await this.deps.emitter.emit({
      type: "session:started",
      sessionId: session.id,
      workflowId: calcWorkflowId,
      actorId,
      nodeCount: executionOrder.length,
      executionOrder,
    });

    return this.continueExecution(session.id, options);
  }

  async resumeWithInput(
    sessionId: string,
    nodeId: string,
    userInput: Record<string, unknown>,
    options: ExecutionOptions = {},
  ): Promise<ExecutionResult> {
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

    await this.deps.repo.updateNodeCompleted({
      sessionId,
      nodeId,
      outputs: userInput as VariableMap,
      result: {
        userInput,
        providedAt: this.deps.clock.nowDate().toISOString(),
      },
      durationMs: 0,
    });

    await this.deps.repo.resumeSession({
      sessionId,
      userInput,
      nextIndex: currentIdx + 1,
      variables,
    });

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

    // Clear the pause and bump index past the node that just completed
    await this.deps.repo.resumeSession({
      sessionId,
      userInput: {},
      nextIndex: session.currentIndex + 1,
      variables: session.variables,
    });

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

    while (currentIndex < session.executionOrder.length) {
      // Cancel-mid-execution check
      const liveStatus = await this.deps.repo.getStatus(sessionId);
      if (liveStatus === "CANCELLED") {
        return await this.buildResult(
          sessionId,
          "CANCELLED",
          variableStore.snapshot(),
        );
      }

      const nodeId = session.executionOrder[currentIndex];
      const node = nodeMap.get(nodeId);

      if (!node) {
        currentIndex++;
        continue;
      }

      if (skipSet.has(nodeId)) {
        await this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "decision_branch",
        });
        currentIndex++;
        continue;
      }

      if (isStructuralNodeType(node.type)) {
        await this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "structural",
        });
        currentIndex++;
        continue;
      }

      if (isAsyncNodeType(node.type) && !options.isBackgroundRun) {
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
        await this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "no_handler",
        });
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
      });

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
      };

      const outcome = await this.runHandlerWithTimeout(handler, ctx);
      const durationMs = this.deps.clock.now() - startTime;

      // ── errored ───────────────────────────────────────────────
      if (outcome.kind === "errored") {
        await this.deps.emitter.emit({
          type: "node:errored",
          sessionId,
          nodeId,
          nodeLabel: node.label,
          error: outcome.error,
          errorType: classifyError(outcome.error),
          durationMs,
        });
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
        await this.deps.emitter.emit({
          type: "node:skipped",
          sessionId,
          nodeId,
          reason: "no_handler",
        });
        currentIndex++;
        continue;
      }

      // ── paused (awaiting input / validation error) ───────────
      if (outcome.kind === "paused") {
        await this.deps.emitter.emit({
          type: "node:waiting",
          sessionId,
          nodeId,
          nodeLabel: node.label,
          pauseReason: outcome.reason,
        });
        await this.deps.emitter.emit({
          type: "session:paused",
          sessionId,
          workflowId: session.calcWorkflowId,
          nodeId,
          pauseReason: outcome.reason,
          skippedNodes: [...skipSet],
          stepMode,
        });
        await this.deps.repo.pauseSession({
          sessionId,
          nodeId,
          currentIndex,
          variables: variableStore.snapshot(),
          pauseReason: outcome.reason,
          skippedNodes: [...skipSet],
          stepMode,
        });

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
      });

      await this.deps.repo.updateProgress(
        sessionId,
        variableStore.snapshot(),
        currentIndex + 1,
      );

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

        await this.deps.emitter.emit({
          type: "session:paused",
          sessionId,
          workflowId: session.calcWorkflowId,
          nodeId,
          pauseReason: "step_complete",
          skippedNodes: [...skipSet],
          stepMode: true,
        });
        await this.deps.repo.pauseSession({
          sessionId,
          nodeId,
          currentIndex,
          variables: variableStore.snapshot(),
          pauseReason: "step_complete",
          skippedNodes: [...skipSet],
          stepMode: true,
        });

        const execs = await this.deps.db.calcNodeExecution.findMany({
          where: { sessionId },
          select: { calcNodeId: true, status: true },
        });

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
    const finalSnapshot = variableStore.snapshot();
    const { durationMs } = await this.deps.repo.completeSession({
      sessionId,
      variables: finalSnapshot,
    });

    await this.deps.emitter.emit({
      type: "session:completed",
      sessionId,
      workflowId: session.calcWorkflowId,
      actorId: session.actorId,
      durationMs,
      finalVariables: Object.keys(finalSnapshot).filter(
        (k) => k !== "$nodes" && k !== "$results",
      ),
    });

    return await this.buildResult(
      sessionId,
      "COMPLETED",
      finalSnapshot,
      durationMs,
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
    await this.deps.repo.errorSession({
      sessionId,
      nodeId: node.id,
      nodeLabel: node.label,
      message: error.message,
      errorType,
      variables: store.snapshot(),
    });
    await this.deps.emitter.emit({
      type: "session:errored",
      sessionId,
      workflowId: wf.workflow.id,
      actorId: session.actorId,
      nodeId: node.id,
      error: error.message,
    });
    const execs = await this.deps.db.calcNodeExecution.findMany({
      where: { sessionId },
      select: { calcNodeId: true, status: true },
    });

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
    const execs = await this.deps.db.calcNodeExecution.findMany({
      where: { sessionId },
      select: { calcNodeId: true, status: true },
    });

    return {
      sessionId,
      status,
      variables,
      completedAt: this.deps.clock.nowDate().toISOString(),
      nodeExecutions: execs as any[],
    };
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
