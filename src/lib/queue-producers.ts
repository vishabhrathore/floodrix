import type { Prisma } from "@prisma/client";

/**
 * ============================================================================
 * TYPE DEFINITIONS FOR QUEUE PAYLOADS
 * Strict typing prevents payload mismatches between producer and worker.
 * ============================================================================
 */

export interface CalcResumePayload {
  sessionId: string;
  reason: string;
  type: "calc/session.resume";
}

export interface CalcStartBackgroundPayload {
  sessionId: string;
  reason?: string;
  type: "calc/session.start-background";
}

export interface WorkflowExecutionPayload {
  workflowId: string;
  initialData?: Record<string, any>;
}

export interface BatchProcessPayload {
  batchJobId: string;
}

/**
 * ============================================================================
 * PRODUCER SERVICE (FACADE) - OUTBOX PATTERN
 * Exposes strictly typed methods. Consumers do not directly access BullMQ.
 * Instead, they MUST provide a Prisma Transaction to guarantee atomicity.
 * ============================================================================
 */

export const QueueProducer = {
  /**
   * Resumes a paused calculation session in the background
   */
  async dispatchCalcResume(
    tx: Prisma.TransactionClient,
    payload: Omit<CalcResumePayload, "type">
  ) {
    return tx.outboxJob.create({
      data: {
        queueName: "calc-execution",
        jobName: "resume",
        payload: { ...payload, type: "calc/session.resume" } as any,
      },
    });
  },

  /**
   * Starts a new background calculation session
   */
  async dispatchCalcStartBackground(
    tx: Prisma.TransactionClient,
    payload: Omit<CalcStartBackgroundPayload, "type">
  ) {
    return tx.outboxJob.create({
      data: {
        queueName: "calc-execution",
        jobName: "start-background",
        payload: { ...payload, type: "calc/session.start-background" } as any,
      },
    });
  },

  /**
   * Triggers a workflow execution graph
   */
  async dispatchWorkflowExecution(
    tx: Prisma.TransactionClient,
    payload: WorkflowExecutionPayload
  ) {
    return tx.outboxJob.create({
      data: {
        queueName: "workflow-execution",
        jobName: "execute-workflow",
        payload: payload as any,
      },
    });
  },

  /**
   * Dispatches a bulk batch job to the batch-process worker
   */
  async dispatchBatchExecution(
    tx: Prisma.TransactionClient,
    payload: BatchProcessPayload
  ) {
    return tx.outboxJob.create({
      data: {
        queueName: "batch-process",
        jobName: "process",
        payload: payload as any,
      },
    });
  },
};

