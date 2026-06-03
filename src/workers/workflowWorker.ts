import { type Job, Worker } from "bullmq";
import { redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { getWorkflowPiscinaPool } from "./piscinaWorkerPool";
import { ExecutionStatus } from "@/generated/prisma";
import { logger } from "@/server/engine/logger";

export let workflowWorker: Worker | null = null;
if (redisConnection) {
  workflowWorker = new Worker(
    "workflow-execution",
    async (job: Job) => {
      const { workflowId, initialData } = job.data;
      const jobId = job.id;

      if (!workflowId) {
        throw new Error("Workflow ID is missing");
      }

      // 1. Create or Find existing Execution (idempotent setup)
      let execution = await prisma.execution.findUnique({
        where: { inngestEventId: jobId || "bullmq-" + Date.now() },
      });

      if (!execution) {
        execution = await prisma.execution.create({
          data: {
            workflowId,
            inngestEventId: jobId || "bullmq-" + Date.now(),
          },
        });
      }

      // If already marked successful, skip execution (effectively-once guarantee)
      if (execution.status === ExecutionStatus.SUCCESS) {
        return { workflowId, result: execution.output };
      }

      const pool = getWorkflowPiscinaPool();
      const controller = new AbortController();

      // Enforce 10 minute workflow timeout limit
      const workflowTimeoutMs = 10 * 60 * 1000;
      const timer = setTimeout(() => {
        controller.abort();
      }, workflowTimeoutMs);

      try {
        // Run execution in the isolated Piscina worker thread.
        // We pass BOTH AbortSignal (for shutdown cancellation) and timeout (for Piscina to terminate workers on timeout).
        const result = await pool.run(
          {
            type: "workflow",
            workflowId,
            executionId: execution.id,
            initialData,
          },
          { 
            signal: controller.signal,
          }
        );

        // Update Execution Success
        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.SUCCESS,
            completedAt: new Date(),
            output: result.result,
          },
        });

        return result;
      } catch (error: any) {
        const isAborted = controller.signal.aborted || error.name === "AbortError" || error.message?.includes("aborted") || error.message?.includes("task timed out");
        const errorMessage = isAborted ? `Workflow execution timed out after ${workflowTimeoutMs}ms.` : error.message;

        // Update Execution Failure (Guarantees: Workflow Failure !== Worker Failure)
        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.FAILED,
            error: errorMessage,
            errorStack: error.stack,
          },
        });
        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
    { connection: redisConnection, concurrency: 10 },
  );

  // Hook into the BullMQ global "failed" event to log permanently failed jobs to our DLQ
  workflowWorker.on("failed", async (job, err) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts || 1;
    if (job.attemptsMade >= maxAttempts) {
      logger.error(
        { jobId: job.id, maxAttempts, err },
        "[workflowWorker] ❌ Job exhausted all retries. Logging to DLQ..."
      );
      await prisma.deadLetterJob.upsert({
        where: { outboxJobId: job.id! },
        create: {
          outboxJobId: job.id!,
          queueName: job.queueName,
          jobName: job.name,
          payload: job.data as any,
          error: err.message || String(err),
          stackTrace: err.stack || null,
          attemptCount: job.attemptsMade,
        },
        update: {
          error: err.message || String(err),
          stackTrace: err.stack || null,
          attemptCount: job.attemptsMade,
        },
      }).catch((dlqErr) => {
        logger.error(dlqErr, "[workflowWorker] Failed to write to DLQ");
      });
    }
  });

  logger.info("🚀 Workflow Worker started");
}
