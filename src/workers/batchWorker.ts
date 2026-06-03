import { type Job, Worker } from "bullmq";
import { redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { getWorkflowPiscinaPool } from "./piscinaWorkerPool";
import { logger } from "@/server/engine/logger";

export let batchWorker: Worker | null = null;
if (redisConnection) {
  batchWorker = new Worker(
    "batch-process",
    async (job: Job) => {
      const { batchJobId } = job.data;
      logger.info({ batchJobId }, `[batchWorker] 📦 Batch job started`);

      const pool = getWorkflowPiscinaPool();
      const controller = new AbortController();

      // Enforce a 30-minute hard timeout limit for the entire batch
      const batchTimeoutMs = 30 * 60 * 1000;
      const timer = setTimeout(() => {
        controller.abort();
      }, batchTimeoutMs);

      try {
        const result = await pool.run(
          {
            type: "batch",
            batchJobId,
          },
          { 
            signal: controller.signal,
          }
        );

        return result;
      } catch (error: any) {
        const isAborted = controller.signal.aborted || error.name === "AbortError" || error.message?.includes("aborted") || error.message?.includes("task timed out");
        const errorMessage = isAborted ? `Batch execution timed out after ${batchTimeoutMs}ms.` : error.message;

        // Mark status as FAILED in DB if crashed or timed out
        await prisma.batchJob.update({
          where: { id: batchJobId },
          data: {
            status: "FAILED",
            errorSummary: errorMessage,
            completedAt: new Date(),
          },
        }).catch(() => {});

        throw error;
      } finally {
        clearTimeout(timer);
      }
    },
    { connection: redisConnection, concurrency: 10 },
  );

  // Hook into the BullMQ global "failed" event to log permanently failed jobs to our DLQ
  batchWorker.on("failed", async (job, err) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts || 1;
    if (job.attemptsMade >= maxAttempts) {
      logger.error(
        { jobId: job.id, maxAttempts, err },
        "[batchWorker] ❌ Job exhausted all retries. Logging to DLQ..."
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
        logger.error(dlqErr, "[batchWorker] Failed to write to DLQ");
      });
    }
  });

  logger.info("🚀 Batch Worker started");
}
