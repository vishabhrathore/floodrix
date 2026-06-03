import { type Queue } from "bullmq";
import prisma from "@/lib/db";
import { calcQueue, workflowQueue, batchQueue } from "@/lib/bullmq";
import { logger } from "@/server/engine/logger";

// ============================================================
// CONFIGURATION
// ============================================================

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 20;               // After this, permanently mark FAILED
const POLL_INTERVAL_MS = 1000;         // Base idle poll delay
const WATCHDOG_INTERVAL_MS = 60_000;   // 1 minute watchdog

/**
 * Exponential backoff delay for retries (capped at 5 minutes).
 * attempt 1 →  2s, attempt 2 →  4s, attempt 3 →  8s ... attempt 8+ → 300s
 */
function retryDelay(attemptCount: number): number {
  return Math.min(2 ** attemptCount * 1000, 5 * 60 * 1000);
}

// ============================================================
// STATE
// ============================================================

let isRunning = true;
let pollTimeout: NodeJS.Timeout | null = null;
let watchdogInterval: NodeJS.Timeout | null = null;

// Map queue names to their respective BullMQ Queue instances
const queueMap: Record<string, Queue | null> = {
  "calc-execution": calcQueue,
  "workflow-execution": workflowQueue,
  "batch-process": batchQueue,
};

// ============================================================
// CORE BATCH PROCESSOR
// ============================================================

/**
 * Claims a batch of PENDING jobs (whose nextRetryAt is in the past or null)
 * and dispatches them to BullMQ. Uses FOR UPDATE SKIP LOCKED for safe
 * horizontal scaling — multiple relayer instances can run concurrently.
 */
async function processOutboxBatch(): Promise<number> {
  try {
    // Claim PENDING jobs that are ready to be dispatched:
    // - nextRetryAt IS NULL  (first attempt, never been tried)
    // - nextRetryAt <= NOW() (retry window has passed)
    const claimedJobs: Array<{
      id: string;
      queueName: string;
      jobName: string;
      payload: any;
      attemptCount: number;
    }> = await prisma.$queryRaw`
      WITH claimed AS (
        SELECT id FROM "OutboxJob"
        WHERE status = 'PENDING'
          AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW())
        ORDER BY "createdAt" ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "OutboxJob"
      SET status = 'PROCESSING', "updatedAt" = NOW()
      WHERE id IN (SELECT id FROM claimed)
      RETURNING id, "queueName", "jobName", payload, "attemptCount";
    `;

    if (!claimedJobs || claimedJobs.length === 0) {
      return 0;
    }

    logger.info({ jobCount: claimedJobs.length }, "[OutboxRelayer] Claimed jobs to dispatch");

    for (const job of claimedJobs) {
      try {
        const queue = queueMap[job.queueName];

        if (!queue) {
          throw new Error(`Queue "${job.queueName}" is not registered or Redis is bypassed.`);
        }

        // Dispatch to BullMQ using OutboxJob.id as the Redis jobId.
        // This guarantees idempotency: if the relayer crashes after pushing to
        // Redis but before updating Postgres, the watchdog will retry, and
        // BullMQ will safely ignore the duplicate.
        const redisJob = await queue.add(job.jobName, job.payload, {
          jobId: job.id,
        });

        // Mark as successfully dispatched
        await prisma.outboxJob.update({
          where: { id: job.id },
          data: {
            status: "ENQUEUED",
            redisJobId: redisJob?.id ?? "bypassed",
            enqueuedAt: new Date(),
            lastError: null,
          },
        });
      } catch (err: any) {
        const newAttemptCount = job.attemptCount + 1;
        const isPermanentlyFailed = newAttemptCount >= MAX_ATTEMPTS;

        logger.error(
          { jobId: job.id, attempt: newAttemptCount, maxAttempts: MAX_ATTEMPTS, err },
          "[OutboxRelayer] Dispatch failed for job"
        );

        if (isPermanentlyFailed) {
          // Exceeded retry threshold — this job needs human intervention
          logger.error(
            { jobId: job.id, maxAttempts: MAX_ATTEMPTS },
            "[OutboxRelayer] ❌ Job permanently FAILED"
          );
          await prisma.$transaction([
            prisma.outboxJob.update({
              where: { id: job.id },
              data: {
                status: "FAILED",
                attemptCount: newAttemptCount,
                lastError: err.message || String(err),
              },
            }),
            prisma.deadLetterJob.create({
              data: {
                outboxJobId: job.id,
                queueName: job.queueName,
                jobName: job.jobName,
                payload: job.payload,
                error: err.message || String(err),
                stackTrace: err.stack || null,
                attemptCount: newAttemptCount,
              },
            }),
          ]);
        } else {
          // Transient failure (e.g. Redis outage) — reset to PENDING with
          // an exponential backoff nextRetryAt so the relayer re-picks it up
          // automatically once the window passes.
          const nextRetryAt = new Date(Date.now() + retryDelay(newAttemptCount));
          await prisma.outboxJob.update({
            where: { id: job.id },
            data: {
              status: "PENDING",
              attemptCount: newAttemptCount,
              lastError: err.message || String(err),
              nextRetryAt,
            },
          });
          logger.warn(
            { jobId: job.id, nextRetryAt: nextRetryAt.toISOString() },
            "[OutboxRelayer] Job will retry"
          );
        }
      }
    }

    return claimedJobs.length;
  } catch (error) {
    logger.error(error, "[OutboxRelayer] Error in batch processing loop");
    return 0;
  }
}

// ============================================================
// WATCHDOG — recovers jobs stuck in PROCESSING
// ============================================================

/**
 * If the relayer crashes mid-flight, rows stay stuck in PROCESSING.
 * This watchdog resets them to PENDING so they can be retried.
 * Note: BullMQ idempotency (jobId = outboxJob.id) prevents double-execution
 * even if the job had already been dispatched to Redis before the crash.
 */
async function runWatchdogRecovery() {
  try {
    const recovered: number = await prisma.$executeRaw`
      UPDATE "OutboxJob"
      SET status = 'PENDING', "updatedAt" = NOW()
      WHERE status = 'PROCESSING'
        AND "updatedAt" < NOW() - INTERVAL '5 minutes'
    `;
    if (recovered > 0) {
      logger.info(
        { recoveredCount: recovered },
        "[OutboxRelayer Watchdog] Recovered stuck PROCESSING job(s) → PENDING"
      );
    }
  } catch (error) {
    logger.error(error, "[OutboxRelayer Watchdog] Recovery query failed");
  }
}

// ============================================================
// POLLING LOOP
// ============================================================

async function startPolling() {
  if (!isRunning) return;

  const processedCount = await processOutboxBatch();

  // Adaptive backoff: if work was found, loop back quickly; otherwise wait
  const nextDelay = processedCount > 0 ? 50 : POLL_INTERVAL_MS;
  pollTimeout = setTimeout(startPolling, nextDelay);
}

// ============================================================
// LIFECYCLE
// ============================================================

export function startOutboxRelayer() {
  logger.info("🚀 Outbox Relayer started — polling PostgreSQL for pending jobs...");

  // Run watchdog immediately on startup to recover any jobs stuck from
  // a previous crash before the poll loop begins.
  runWatchdogRecovery().catch((err) => logger.error(err, "[OutboxRelayer Watchdog] Startup recovery failed"));

  startPolling();
  watchdogInterval = setInterval(runWatchdogRecovery, WATCHDOG_INTERVAL_MS);
}

export function stopOutboxRelayer() {
  logger.info("🛑 Outbox Relayer stopping gracefully...");
  isRunning = false;
  if (pollTimeout) clearTimeout(pollTimeout);
  if (watchdogInterval) clearInterval(watchdogInterval);
}

// Auto-start when module is imported (triggered by init-workers.ts require())
if (require.main !== module) {
  startOutboxRelayer();
}
