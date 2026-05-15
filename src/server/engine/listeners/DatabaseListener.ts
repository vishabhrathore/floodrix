// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/listeners/DatabaseListener.ts
//
//  Reacts to ExecutionEvents and writes node-execution + session state to DB.
//
//  This file is the ONLY place that decides between liveUpdates and batch
//  mode. The executor doesn't branch on it. That keeps the executor focused
//  on dispatch and lets us tune DB write patterns in one spot.
//
//  Two modes:
//
//   liveUpdates: false (default — fast path)
//     - On session:started: nothing (no PENDING rows)
//     - On node:completed/skipped/errored: push to in-memory log
//     - On session:paused/completed/errored OR node:waiting: flush log
//     - Bug 4 fix: track flushedNodeIds so a paused-then-resumed session
//       doesn't try to re-insert already-logged rows
//
//   liveUpdates: true (canvas debug — slower but real-time)
//     - On session:started: createMany PENDING rows
//     - On node:started: PENDING → RUNNING update
//     - On node:completed: RUNNING → COMPLETED update
//     - On node:skipped/errored/waiting: corresponding update
//     - Frontend can poll and see real-time canvas highlights
// ═══════════════════════════════════════════════════════════════════════════
import type { NodeExecutionStatus } from "@/generated/prisma";

import type { SessionRepository } from "../SessionRepository";
import type { ExecutionEvent, VariableMap } from "../types";

interface BufferedEntry {
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
}

export class DatabaseListener {
  /** In-memory log per session id. Only used in batch mode. */
  private buffers = new Map<string, BufferedEntry[]>();
  /** Bug 4 fix: ids already flushed for this session — never re-insert. */
  private flushedNodeIds = new Map<string, Set<string>>();

  constructor(
    private readonly repo: SessionRepository,
    private readonly liveUpdates: boolean,
  ) {}

  async handle(event: ExecutionEvent): Promise<void> {
    switch (event.type) {
      case "session:started":
        if (this.liveUpdates) {
          // PENDING rows for the entire workflow up front
          // (executor passes node ids via the order it sets up)
          // We don't have executionOrder in this event yet —
          // bootstrap supplies it via repo.createPendingNodeExecutions
          // BEFORE emitting session:started. See WorkflowExecutor.
        }
        this.buffers.set(event.sessionId, []);
        this.flushedNodeIds.set(event.sessionId, new Set());
        return;

      case "node:started":
        if (this.liveUpdates) {
          await this.repo.updateNodeRunning(event.sessionId, event.nodeId, {});
        }
        return;

      case "node:completed": {
        if (this.liveUpdates) {
          await this.repo.updateNodeCompleted({
            sessionId: event.sessionId,
            nodeId: event.nodeId,
            outputs: event.outputs,
            result: event.result,
            durationMs: event.durationMs,
          });
        } else {
          this.bufferAppend(event.sessionId, {
            calcNodeId: event.nodeId,
            stepNumber: event.stepNumber,
            status: "COMPLETED",
            outputVars: event.outputs,
            result: event.result,
            completedAt: new Date(),
            durationMs: event.durationMs,
          });
        }
        return;
      }

      case "node:skipped":
        if (this.liveUpdates) {
          await this.repo.updateNodeSkipped(event.sessionId, event.nodeId);
        } else {
          this.bufferAppend(event.sessionId, {
            calcNodeId: event.nodeId,
            stepNumber: -1, // unknown step number for skipped — repo accepts
            status: "SKIPPED",
            completedAt: new Date(),
          });
        }
        return;

      case "node:errored": {
        // Errors flush immediately in batch mode too — we want the error
        // visible even if the executor never gets to call session:errored.
        if (this.liveUpdates) {
          await this.repo.updateNodeErrored({
            sessionId: event.sessionId,
            nodeId: event.nodeId,
            message: event.error.message,
            errorType: event.errorType,
            durationMs: event.durationMs,
          });
        } else {
          this.bufferAppend(event.sessionId, {
            calcNodeId: event.nodeId,
            stepNumber: -1,
            status: "ERRORED",
            error: event.error.message,
            errorType: event.errorType,
            completedAt: new Date(),
            durationMs: event.durationMs,
          });
          await this.flushBuffer(event.sessionId);
        }
        return;
      }

      case "node:waiting": {
        // Always flush before pausing — we want the partial log visible
        // while the user thinks about input.
        if (!this.liveUpdates) {
          await this.flushBuffer(event.sessionId);
        }
        // Always upsert the WAITING row (Bug 5 fix uses upsert internally)
        await this.repo.upsertNodeWaiting({
          sessionId: event.sessionId,
          nodeId: event.nodeId,
          stepNumber: -1, // we don't track step here; row may already exist with the right number
        });
        return;
      }

      case "session:paused":
        // Bug 11 fix: skipSet persisted via repo.pauseSession (executor does that
        // call directly through repo). DatabaseListener doesn't need to do anything
        // beyond ensure the buffer is flushed (handled by node:waiting above).
        return;

      case "session:completed":
      case "session:errored":
        if (!this.liveUpdates) {
          await this.flushBuffer(event.sessionId);
        }
        this.buffers.delete(event.sessionId);
        this.flushedNodeIds.delete(event.sessionId);
        return;

      case "session:cancelled":
        this.buffers.delete(event.sessionId);
        this.flushedNodeIds.delete(event.sessionId);
        return;
    }
  }

  // ─── Buffer management ────────────────────────────────────────────────

  private bufferAppend(sessionId: string, entry: BufferedEntry): void {
    let buf = this.buffers.get(sessionId);
    if (!buf) {
      buf = [];
      this.buffers.set(sessionId, buf);
    }
    buf.push(entry);
  }

  private async flushBuffer(sessionId: string): Promise<void> {
    const buf = this.buffers.get(sessionId);
    if (!buf || buf.length === 0) return;

    // Bug 4 fix: filter out already-flushed nodes
    let flushedIds = this.flushedNodeIds.get(sessionId);
    if (!flushedIds) {
      flushedIds = new Set();
      this.flushedNodeIds.set(sessionId, flushedIds);
    }

    const fresh = buf.filter((e) => !flushedIds!.has(e.calcNodeId));
    if (fresh.length === 0) {
      this.buffers.set(sessionId, []);
      return;
    }

    await this.repo.insertNodeExecutionLog(sessionId, fresh);

    for (const e of fresh) flushedIds.add(e.calcNodeId);
    this.buffers.set(sessionId, []);
  }
}
