// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/SessionRepository.ts
//
//  CHUNK 2.5 CHANGES vs Chunk 1:
//    1. findByIdempotencyKey now queries the dedicated column instead of
//       JSON path (faster, indexed)
//    2. createSession writes to the column AND keeps the metadata copy
//       (metadata copy is convenient for clients reading session state;
//        the column is what the lookup uses)
// ═══════════════════════════════════════════════════════════════════════════
import {
  type CalcEdge,
  type CalcNode,
  type CalcVariable,
  type CalcWorkflow,
  type NodeExecutionStatus,
  Prisma,
  type PrismaClient,
  type SessionStatus,
} from "@/generated/prisma";

import type {
  Clock,
  PauseReason,
  SessionMetadata,
  VariableMap,
  VariableSnapshot,
} from "./types";
import { METADATA_VERSION, RunStrategy, emptySessionMetadata } from "./types";
import { redisConnection } from "@/lib/bullmq";

// ─── Result types ─────────────────────────────────────────────────────────

export interface LoadedWorkflow {
  workflow: Pick<CalcWorkflow, "id" | "name" | "organizationId" | "metadata">;
  nodes: Pick<
    CalcNode,
    "id" | "type" | "label" | "description" | "config" | "sortOrder"
  >[];
  edges: Pick<
    CalcEdge,
    | "id"
    | "sourceNodeId"
    | "targetNodeId"
    | "sourceHandle"
    | "targetHandle"
    | "condition"
  >[];
  variables: Pick<
    CalcVariable,
    "contextKey" | "defaultValue" | "unit" | "dataType"
  >[];
}

export interface LoadedSession {
  id: string;
  calcWorkflowId: string;
  actorId: string;
  status: SessionStatus;
  variables: VariableSnapshot;
  executionOrder: string[];
  currentIndex: number;
  currentNodeId: string | null;
  pauseReason: string | null;
  startedAt: Date | null;
  metadata: SessionMetadata;
  inputSnapshot: Record<string, unknown> | null;
  idempotencyKey: string | null;
  lockVersion: number;
}

// ─── Repository ───────────────────────────────────────────────────────────

export class SessionRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly clock: Clock,
  ) {}

  private async cacheStatus(sessionId: string, status: SessionStatus): Promise<void> {
    if (redisConnection) {
      try {
        await redisConnection.setex(`session:${sessionId}:status`, 3600, status);
      } catch (err) {
        console.warn(`[REDIS] Failed to write status for session ${sessionId}:`, err);
      }
    }
  }

  // ── Workflow loading ──────────────────────────────────────────────────

  async loadWorkflow(workflowId: string): Promise<LoadedWorkflow> {
    const cacheKey = `wf:${workflowId}:loaded-workflow`;
    if (redisConnection) {
      try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    const workflow = await this.db.calcWorkflow.findUniqueOrThrow({
      where: { id: workflowId },
      select: {
        id: true,
        name: true,
        organizationId: true,
        metadata: true,
        nodes: {
          where: { deletedAt: null },
          select: {
            id: true,
            type: true,
            label: true,
            description: true,
            config: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: "asc" },
        },
        edges: {
          where: { deletedAt: null },
          select: {
            id: true,
            sourceNodeId: true,
            targetNodeId: true,
            sourceHandle: true,
            targetHandle: true,
            condition: true,
          },
        },
        variables: {
          where: { deletedAt: null },
          select: {
            contextKey: true,
            defaultValue: true,
            unit: true,
            dataType: true,
          },
        },
      },
    });

    const result = {
      workflow: {
        id: workflow.id,
        name: workflow.name,
        organizationId: workflow.organizationId,
        metadata: workflow.metadata,
      },
      nodes: workflow.nodes,
      edges: workflow.edges,
      variables: workflow.variables,
    };

    if (redisConnection) {
      try {
        await redisConnection.setex(cacheKey, 3600, JSON.stringify(result));
      } catch {}
    }

    return result;
  }

  // ── Session lifecycle ─────────────────────────────────────────────────

  /**
   * CHUNK 2.5: queries the dedicated `idempotencyKey` column.
   * Uses the @@unique([calcWorkflowId, idempotencyKey]) constraint —
   * one indexed lookup, no JSON path scan.
   */
  async findByIdempotencyKey(
    workflowId: string,
    idempotencyKey: string,
  ): Promise<LoadedSession | null> {
    const row = await this.db.calcSession.findUnique({
      where: {
        calcWorkflowId_idempotencyKey: {
          calcWorkflowId: workflowId,
          idempotencyKey,
        },
      },
    });
    if (!row) return null;
    return this.hydrateSession(row);
  }

  async createSession(input: {
    calcWorkflowId: string;
    actorId: string;
    executionOrder: string[];
    initialVariables: VariableMap;
    stepMode: boolean;
    idempotencyKey?: string;
    parentSessionId?: string;
    ancestorWorkflowChain?: string[];
    liveUpdates?: boolean;
    runStrategy?: RunStrategy;
  }): Promise<LoadedSession> {
    const metadata: SessionMetadata = {
      ...emptySessionMetadata(),
      stepMode: input.stepMode,
      idempotencyKey: input.idempotencyKey,
      parentSessionId: input.parentSessionId,
      ancestorWorkflowChain: input.ancestorWorkflowChain,
      runStrategy: input.runStrategy,
    };

    return await this.db.$transaction(async (tx) => {
      const row = await tx.calcSession.create({
        data: {
          calcWorkflowId: input.calcWorkflowId,
          actorId: input.actorId,
          status: "PENDING",
          variables: input.initialVariables as Prisma.InputJsonValue,
          executionOrder: input.executionOrder as Prisma.InputJsonValue,
          currentIndex: 0,
          startedAt: this.clock.nowDate(),
          runMode: "SINGLE",
          metadata: metadata as unknown as Prisma.InputJsonValue,
          idempotencyKey: input.idempotencyKey ?? null,
        },
      });

      if (input.liveUpdates && input.executionOrder.length > 0) {
        await tx.calcNodeExecution.createMany({
          data: input.executionOrder.map((nodeId, idx) => ({
            sessionId: row.id,
            calcNodeId: nodeId,
            stepNumber: idx,
            status: "PENDING" as const,
          })),
          skipDuplicates: true,
        });
      }

      await this.cacheStatus(row.id, "PENDING");

      const wf = await this.loadWorkflow(input.calcWorkflowId);
      if (redisConnection && wf.workflow.organizationId) {
        try {
          await redisConnection.setex(`map:session:${row.id}:orgId`, 3600, wf.workflow.organizationId);
        } catch {}
      }

      return this.hydrateSession(row);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }

  async loadSession(sessionId: string): Promise<LoadedSession> {
    const cacheKey = `sess:${sessionId}:loaded`;
    if (redisConnection) {
      try {
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
          if (parsed.completedAt) parsed.completedAt = new Date(parsed.completedAt);
          return parsed;
        }
      } catch {}
    }

    const row = await this.db.calcSession.findUniqueOrThrow({
      where: { id: sessionId },
    });
    const result = this.hydrateSession(row);

    if (redisConnection) {
      try {
        await redisConnection.setex(cacheKey, 3600, JSON.stringify(result));
      } catch {}
    }
    return result;
  }

  private async invalidateSessionCache(sessionId: string): Promise<void> {
    if (redisConnection) {
      try {
        await Promise.all([
          redisConnection.del(`sess:${sessionId}:loaded`),
          redisConnection.del(`res:session:${sessionId}`),
        ]);
      } catch {}
    }
  }

  async updateProgress(
    sessionId: string,
    variables: VariableSnapshot,
    currentIndex: number,
  ): Promise<void> {
    const res = await this.db.calcSession.updateMany({
      where: { id: sessionId, status: "RUNNING" },
      data: {
        variables: variables as unknown as Prisma.InputJsonValue,
        currentIndex,
      },
    });

    if (res.count === 0) return;

    if (redisConnection) {
      try {
        const cacheKey = `sess:${sessionId}:loaded`;
        const resKey = `res:session:${sessionId}`;
        const cached = await redisConnection.get(cacheKey);
        if (cached) {
          const session = JSON.parse(cached) as LoadedSession;
          session.variables = variables;
          session.currentIndex = currentIndex;
          await Promise.all([
            redisConnection.setex(cacheKey, 3600, JSON.stringify(session)),
            redisConnection.setex(resKey, 3600, JSON.stringify(session)),
          ]);
        } else {
          await this.invalidateSessionCache(sessionId);
        }
      } catch {
        await this.invalidateSessionCache(sessionId);
      }
    }
  }

  async pauseSession(input: {
    sessionId: string;
    nodeId: string;
    currentIndex: number;
    variables: VariableSnapshot;
    pauseReason: PauseReason;
    skippedNodes: string[];
    stepMode: boolean;
  }): Promise<void> {
    const existing = await this.loadSession(input.sessionId);
    const metadata: SessionMetadata = {
      ...existing.metadata,
      metadataVersion: METADATA_VERSION,
      stepPauseReason: input.pauseReason,
      skippedNodes: input.skippedNodes,
      stepMode: input.stepMode,
      currentIndex: input.currentIndex,
    };

    const res = await this.db.calcSession.updateMany({
      where: { id: input.sessionId, status: "RUNNING" },
      data: {
        status: "PAUSED",
        currentNodeId: input.nodeId,
        currentIndex: input.currentIndex,
        variables: input.variables as unknown as Prisma.InputJsonValue,
        pausedAt: this.clock.nowDate(),
        pauseReason: input.pauseReason,
        metadata: metadata as unknown as Prisma.InputJsonValue,
        lockVersion: { increment: 1 },
      },
    });

    if (res.count === 0) return;

    await this.upsertNodeWaiting({
      sessionId: input.sessionId,
      nodeId: input.nodeId,
      stepNumber: input.currentIndex,
    });

    await this.cacheStatus(input.sessionId, "PAUSED");
    await this.invalidateSessionCache(input.sessionId);
  }

  async resumeSession(input: {
    sessionId: string;
    userInput: Record<string, unknown>;
    nextIndex: number;
    variables: VariableSnapshot;
  }): Promise<void> {
    const existing = await this.loadSession(input.sessionId);
    const inputSnapshot = existing.inputSnapshot
      ? { ...existing.inputSnapshot, ...input.userInput }
      : input.userInput;

    const res = await this.db.calcSession.updateMany({
      where: { id: input.sessionId, status: "PAUSED" },
      data: {
        status: "PENDING",
        variables: input.variables as unknown as Prisma.InputJsonValue,
        currentNodeId: null,
        currentIndex: input.nextIndex,
        pausedAt: null,
        pauseReason: null,
        inputSnapshot: inputSnapshot as Prisma.InputJsonValue,
        lockVersion: { increment: 1 },
      },
    });

    if (res.count === 0) return;

    await this.cacheStatus(input.sessionId, "PENDING");
    await this.invalidateSessionCache(input.sessionId);
  }

  async completeSession(input: {
    sessionId: string;
    variables: VariableSnapshot;
  }): Promise<{ durationMs: number }> {
    const existing = await this.loadSession(input.sessionId);
    const completedAt = this.clock.nowDate();
    const durationMs = existing.startedAt
      ? completedAt.getTime() - existing.startedAt.getTime()
      : 0;

    const res = await this.db.calcSession.updateMany({
      where: { id: input.sessionId, status: { in: ["RUNNING", "PAUSED"] } },
      data: {
        status: "COMPLETED",
        variables: input.variables as unknown as Prisma.InputJsonValue,
        currentNodeId: null,
        completedAt,
        duration: durationMs,
        lockVersion: { increment: 1 },
      },
    });

    if (res.count === 0) return { durationMs };

    await this.cacheStatus(input.sessionId, "COMPLETED");
    await this.invalidateSessionCache(input.sessionId);

    return { durationMs };
  }

  async errorSession(input: {
    sessionId: string;
    nodeId: string;
    nodeLabel: string;
    message: string;
    errorType: string;
    variables: VariableSnapshot;
  }): Promise<void> {
    const existing = await this.loadSession(input.sessionId);
    const completedAt = this.clock.nowDate();
    const duration = existing.startedAt
      ? completedAt.getTime() - existing.startedAt.getTime()
      : 0;

    const res = await this.db.calcSession.updateMany({
      where: { id: input.sessionId, status: { in: ["RUNNING", "PAUSED"] } },
      data: {
        status: "ERRORED",
        variables: input.variables as unknown as Prisma.InputJsonValue,
        currentNodeId: input.nodeId,
        completedAt,
        duration,
        error: {
          nodeId: input.nodeId,
          nodeLabel: input.nodeLabel,
          message: input.message,
          type: input.errorType,
        } as Prisma.InputJsonValue,
        lockVersion: { increment: 1 },
      },
    });

    if (res.count === 0) return;

    await this.cacheStatus(input.sessionId, "ERRORED");
    await this.invalidateSessionCache(input.sessionId);
  }

  async cancelSession(sessionId: string): Promise<void> {
    const existing = await this.loadSession(sessionId);
    const completedAt = this.clock.nowDate();
    const duration = existing.startedAt
      ? completedAt.getTime() - existing.startedAt.getTime()
      : 0;

    const res = await this.db.calcSession.updateMany({
      where: { id: sessionId, status: { in: ["RUNNING", "PAUSED"] } },
      data: { 
        status: "CANCELLED", 
        completedAt, 
        duration,
        lockVersion: { increment: 1 },
      },
    });

    if (res.count === 0) return;

    await this.db.calcNodeExecution.updateMany({
      where: { sessionId, status: { in: ["PENDING", "WAITING", "RUNNING"] } },
      data: { status: "SKIPPED", completedAt },
    });

    await this.cacheStatus(sessionId, "CANCELLED");
    await this.invalidateSessionCache(sessionId);
  }

  async acquireExecutionLock(sessionId: string, currentVersion: number): Promise<boolean> {
    const res = await this.db.calcSession.updateMany({
      where: {
        id: sessionId,
        lockVersion: currentVersion,
        status: { in: ["PENDING", "PAUSED"] },
      },
      data: {
        status: "RUNNING",
        lockVersion: { increment: 1 },
        updatedAt: this.clock.nowDate(),
      },
    });
    const success = res.count > 0;
    if (success) {
      await this.cacheStatus(sessionId, "RUNNING");
    }
    return success;
  }

  async recoverStuckSessions(maxExecutionDurationMs = 300000): Promise<number> {
    const threshold = new Date(Date.now() - maxExecutionDurationMs);

    // 1. Identify stuck sessions
    const stuckSessions = await this.db.calcSession.findMany({
      where: {
        status: "RUNNING",
        updatedAt: { lt: threshold },
      },
      select: { id: true },
    });

    if (stuckSessions.length === 0) return 0;
    const sessionIds = stuckSessions.map((s) => s.id);

    await this.db.$transaction(async (tx) => {
      // 2. Reset sessions back to PAUSED and increment lockVersion
      await tx.calcSession.updateMany({
        where: { id: { in: sessionIds } },
        data: {
          status: "PAUSED",
          pauseReason: "stuck_execution_timeout",
          lockVersion: { increment: 1 },
        },
      });

      // 3. Reset any node executions stuck in RUNNING to PENDING
      await tx.calcNodeExecution.updateMany({
        where: {
          sessionId: { in: sessionIds },
          status: "RUNNING",
        },
        data: {
          status: "PENDING",
        },
      });
    });

    // 4. Evict caches for these sessions to clear cached RUNNING statuses
    for (const sessionId of sessionIds) {
      await this.cacheStatus(sessionId, "PAUSED");
      await this.invalidateSessionCache(sessionId);
    }

    return sessionIds.length;
  }

  async getStatus(sessionId: string): Promise<SessionStatus> {
    if (redisConnection) {
      try {
        const cached = await redisConnection.get(`session:${sessionId}:status`);
        if (cached) {
          return cached as SessionStatus;
        }
      } catch (err) {
        console.warn(`[REDIS] Failed to read status for session ${sessionId}:`, err);
      }
    }

    const row = await this.db.calcSession.findUniqueOrThrow({
      where: { id: sessionId },
      select: { status: true },
    });

    if (redisConnection) {
      try {
        await redisConnection.setex(`session:${sessionId}:status`, 3600, row.status);
      } catch (err) {
        /* noop */
      }
    }

    return row.status;
  }

  // ── Node execution rows ───────────────────────────────────────────────

  async noopCreateNodeExecutions(): Promise<void> {
    // Intentionally empty.
  }

  async createPendingNodeExecutions(
    sessionId: string,
    executionOrder: string[],
  ): Promise<void> {
    await this.db.calcNodeExecution.createMany({
      data: executionOrder.map((nodeId, idx) => ({
        sessionId,
        calcNodeId: nodeId,
        stepNumber: idx,
        status: "PENDING" as const,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * Bug 1 fix from mental model: only match PENDING rows (not WAITING).
   *
   * NOTE: in batch mode (the default) there are NO PENDING rows pre-created.
   * This method is only called by DatabaseListener when liveUpdates: true.
   * If you call it in batch mode it will silently match zero rows, which is
   * correct behavior — the buffered log captures the same info.
   */
  async updateNodeRunning(
    sessionId: string,
    nodeId: string,
    inputVars: VariableMap,
  ): Promise<void> {
    await this.db.calcNodeExecution.updateMany({
      where: { sessionId, calcNodeId: nodeId, status: "PENDING" },
      data: {
        status: "RUNNING",
        startedAt: this.clock.nowDate(),
        inputVars: inputVars as Prisma.InputJsonValue,
      },
    });
  }

  async updateNodeCompleted(input: {
    sessionId: string;
    nodeId: string;
    outputs: VariableMap;
    result: Record<string, unknown>;
    durationMs: number;
  }): Promise<void> {
    await this.db.calcNodeExecution.updateMany({
      where: {
        sessionId: input.sessionId,
        calcNodeId: input.nodeId,
        status: { in: ["RUNNING", "WAITING"] },
      },
      data: {
        status: "COMPLETED",
        outputVars: input.outputs as Prisma.InputJsonValue,
        result: input.result as Prisma.InputJsonValue,
        completedAt: this.clock.nowDate(),
        durationMs: input.durationMs,
      },
    });
  }

  async updateNodeSkipped(sessionId: string, nodeId: string): Promise<void> {
    // Bug 3 fix: don't set startedAt — skipped nodes never started
    await this.db.calcNodeExecution.updateMany({
      where: {
        sessionId,
        calcNodeId: nodeId,
        status: { in: ["PENDING", "RUNNING"] },
      },
      data: {
        status: "SKIPPED",
        completedAt: this.clock.nowDate(),
      },
    });
  }

  async resetNodeExecutions(sessionId: string, nodeIds: string[]): Promise<void> {
    await this.db.calcNodeExecution.updateMany({
      where: {
        sessionId,
        calcNodeId: { in: nodeIds },
      },
      data: {
        status: "PENDING",
        startedAt: null,
        completedAt: null,
        durationMs: null,
        error: null,
        errorType: null,
        inputVars: Prisma.DbNull,
        outputVars: Prisma.DbNull,
        result: Prisma.DbNull,
      },
    });
  }

  async updateNodeErrored(input: {
    sessionId: string;
    nodeId: string;
    message: string;
    errorType: string;
    durationMs: number;
  }): Promise<void> {
    // Bug 10 fix: status guard
    await this.db.calcNodeExecution.updateMany({
      where: {
        sessionId: input.sessionId,
        calcNodeId: input.nodeId,
        status: "RUNNING",
      },
      data: {
        status: "ERRORED",
        error: input.message,
        errorType: input.errorType,
        completedAt: this.clock.nowDate(),
        durationMs: input.durationMs,
      },
    });
  }

  /**
   * Bug 5 fix: upsert via the new @@unique([sessionId, calcNodeId]) constraint
   * (added in chunk 2.5 schema migration).
   */
  async upsertNodeWaiting(input: {
    sessionId: string;
    nodeId: string;
    stepNumber: number;
  }): Promise<void> {
    await this.db.calcNodeExecution.upsert({
      where: {
        sessionId_calcNodeId: {
          sessionId: input.sessionId,
          calcNodeId: input.nodeId,
        },
      },
      create: {
        sessionId: input.sessionId,
        calcNodeId: input.nodeId,
        stepNumber: input.stepNumber,
        status: "WAITING",
        startedAt: this.clock.nowDate(),
      },
      update: {
        status: "WAITING",
      },
    });
  }

  async insertNodeExecutionLog(
    sessionId: string,
    entries: {
      calcNodeId: string;
      stepNumber: number;
      status: NodeExecutionStatus;
      inputVars?: VariableMap;
      outputVars?: VariableMap;
      result?: Record<string, unknown>;
      error?: string;
      errorType?: string;
      startedAt?: Date;
      completedAt?: Date;
      durationMs?: number;
    }[],
  ): Promise<void> {
    if (entries.length === 0) return;
    await this.db.calcNodeExecution.createMany({
      data: entries.map((e) => ({
        sessionId,
        calcNodeId: e.calcNodeId,
        stepNumber: e.stepNumber,
        status: e.status,
        inputVars: e.inputVars
          ? (e.inputVars as Prisma.InputJsonValue)
          : undefined,
        outputVars: e.outputVars
          ? (e.outputVars as Prisma.InputJsonValue)
          : undefined,
        result: e.result ? (e.result as Prisma.InputJsonValue) : undefined,
        error: e.error,
        errorType: e.errorType,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
        durationMs: e.durationMs,
      })),
      skipDuplicates: true,
    });
  }

  async findStaleSessions(input: {
    status: SessionStatus;
    olderThan: Date;
    limit: number;
  }): Promise<{ id: string; calcWorkflowId: string; actorId: string }[]> {
    return this.db.calcSession.findMany({
      where: {
        status: input.status,
        updatedAt: { lt: input.olderThan },
      },
      take: input.limit,
      select: { id: true, calcWorkflowId: true, actorId: true },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  /**
   * CHUNK 2.5: hydrates from the new schema shape (with idempotencyKey column).
   * Falls back to metadata.idempotencyKey for old rows that pre-date the column.
   */
  private hydrateSession(row: {
    id: string;
    calcWorkflowId: string;
    actorId: string;
    status: SessionStatus;
    variables: unknown;
    executionOrder: unknown;
    currentIndex: number;
    currentNodeId: string | null;
    pauseReason: string | null;
    startedAt: Date | null;
    metadata: unknown;
    inputSnapshot: unknown;
    idempotencyKey: string | null;
    lockVersion: number;
  }): LoadedSession {
    const metadata = hydrateMetadata(row.metadata);
    return {
      id: row.id,
      calcWorkflowId: row.calcWorkflowId,
      actorId: row.actorId,
      status: row.status,
      variables: (row.variables ?? {}) as VariableSnapshot,
      executionOrder: (row.executionOrder ?? []) as string[],
      currentIndex: row.currentIndex,
      currentNodeId: row.currentNodeId,
      pauseReason: row.pauseReason,
      startedAt: row.startedAt,
      metadata,
      inputSnapshot: (row.inputSnapshot ?? null) as Record<
        string,
        unknown
      > | null,
      // Column is source of truth; metadata copy is fallback for old rows.
      idempotencyKey: row.idempotencyKey ?? metadata.idempotencyKey ?? null,
      lockVersion: row.lockVersion,
    };
  }
}

function hydrateMetadata(raw: unknown): SessionMetadata {
  if (!raw || typeof raw !== "object") return emptySessionMetadata();
  const m = raw as Partial<SessionMetadata> & Record<string, unknown>;
  const version = (m.metadataVersion as number) ?? 0;

  if (version === METADATA_VERSION) {
    return {
      metadataVersion: METADATA_VERSION,
      stepPauseReason:
        (m.stepPauseReason as SessionMetadata["stepPauseReason"]) ?? null,
      skippedNodes: Array.isArray(m.skippedNodes)
        ? (m.skippedNodes as string[])
        : [],
      stepMode: !!m.stepMode,
      currentIndex: typeof m.currentIndex === "number" ? m.currentIndex : 0,
      idempotencyKey:
        typeof m.idempotencyKey === "string" ? m.idempotencyKey : undefined,
    };
  }

  return {
    ...emptySessionMetadata(),
    skippedNodes: Array.isArray(m.skippedNodes)
      ? (m.skippedNodes as string[])
      : [],
    stepMode: !!m.stepMode,
  };
}
