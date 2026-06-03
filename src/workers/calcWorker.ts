import { type Job, Worker } from "bullmq";
import { redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { QueueProducer } from "@/lib/queue-producers";
import { getWorkflowPiscinaPool } from "./piscinaWorkerPool";
import { logger } from "@/server/engine/logger";

export let calcWorker: Worker | null = null;
if (redisConnection) {
  // Worker for "calc-execution" queue
  calcWorker = new Worker(
    "calc-execution",
    async (job: Job) => {
      const { sessionId, reason, type } = job.data;

      if (type === "calc/session.start-background") {
        logger.info({ sessionId }, `[calcWorker] 📬 Job: "calc/session.start-background" received`);
        await prisma.$transaction(async (tx) => {
          await QueueProducer.dispatchCalcResume(tx, {
            sessionId,
            reason: "background_batch",
          });
        });
        return { started: true };
      }

      if (type === "calc/session.resume") {
        logger.info(
          { sessionId, reason: reason ?? "unspecified" },
          `[calcWorker] 📬 Job: "calc/session.resume" received`
        );

        // Load session status
        const session = await prisma.calcSession.findUnique({
          where: { id: sessionId },
          select: {
            status: true,
            pauseReason: true,
          },
        });

        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        // Terminal statuses — nothing to do
        if (
          ["COMPLETED", "ERRORED", "CANCELLED", "TIMED_OUT"].includes(
            session.status,
          )
        ) {
          return { skipped: true, status: session.status };
        }

        // If paused for awaiting_user_input or validation_error, we're NOT
        // the ones who should resume — the user is. Bail gracefully.
        if (
          session.status === "PAUSED" &&
          session.pauseReason !== "background_transition" &&
          session.pauseReason !== "step_complete"
        ) {
          return { skipped: true, reason: session.pauseReason };
        }

        const pool = getWorkflowPiscinaPool();
        const controller = new AbortController();

        // 5-minute timeout for a calc session step
        const calcTimeoutMs = 5 * 60 * 1000;
        const timer = setTimeout(() => {
          controller.abort();
        }, calcTimeoutMs);

        try {
          const result = await pool.run(
            {
              type: "calc",
              sessionId,
              reason,
            },
            { 
              signal: controller.signal,
            }
          );

          // If we hit ANOTHER async node, re-enqueue via Outbox Pattern
          if (
            result.status === "PAUSED" &&
            result.pauseReason === "background_transition"
          ) {
            await prisma.$transaction(async (tx) => {
              await QueueProducer.dispatchCalcResume(tx, {
                sessionId,
                reason: "chained_async",
              });
            });
            return { status: "PAUSED", chainedToNextAsync: true };
          }

          return result;
        } catch (error: any) {
          const isAborted = controller.signal.aborted || error.name === "AbortError" || error.message?.includes("aborted") || error.message?.includes("task timed out");
          const errorMessage = isAborted ? `Calculation execution timed out after ${calcTimeoutMs}ms.` : error.message;

          await prisma.calcSession.update({
            where: { id: sessionId },
            data: {
              status: "ERRORED",
              error: { message: errorMessage } as any,
            },
          }).catch(() => {});

          throw error;
        } finally {
          clearTimeout(timer);
        }
      }
    },
    { connection: redisConnection },
  );

  // Hook into the BullMQ global "failed" event to log permanently failed jobs to our DLQ
  calcWorker.on("failed", async (job, err) => {
    if (!job) return;
    const maxAttempts = job.opts.attempts || 1;
    if (job.attemptsMade >= maxAttempts) {
      logger.error(
        { jobId: job.id, maxAttempts, err },
        "[calcWorker] ❌ Job exhausted all retries. Logging to DLQ..."
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
        logger.error(dlqErr, "[calcWorker] Failed to write to DLQ");
      });
    }
  });

  logger.info("🚀 Calc Worker started");
}
