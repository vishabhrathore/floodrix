import { type Job, Queue, Worker } from "bullmq";

import { redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { logger } from "@/server/engine/logger";

const PAUSED_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PENDING_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const BATCH_LIMIT = 500;

export let sweeperWorker: Worker | null = null;
if (redisConnection) {
  sweeperWorker = new Worker(
    "sweeper-queue",
    async (job: Job) => {
      const now = Date.now();

      // Stage 1: sweep-paused
      const pausedCutoff = new Date(now - PAUSED_TTL_MS);
      const stalePaused = await prisma.calcSession.findMany({
        where: {
          status: "PAUSED",
          updatedAt: { lt: pausedCutoff },
        },
        select: { id: true },
        take: BATCH_LIMIT,
      });

      if (stalePaused.length > 0) {
        await prisma.calcSession.updateMany({
          where: { id: { in: stalePaused.map((s) => s.id) } },
          data: {
            status: "TIMED_OUT",
            completedAt: new Date(),
          },
        });

        await prisma.calcNodeExecution.updateMany({
          where: {
            sessionId: { in: stalePaused.map((s) => s.id) },
            status: { in: ["PENDING", "WAITING", "RUNNING"] },
          },
          data: { status: "SKIPPED", completedAt: new Date() },
        });
      }

      // Stage 2: sweep-pending
      const pendingCutoff = new Date(now - PENDING_TTL_MS);
      const stalePending = await prisma.calcSession.findMany({
        where: {
          status: "PENDING",
          updatedAt: { lt: pendingCutoff },
        },
        select: { id: true },
        take: BATCH_LIMIT,
      });

      if (stalePending.length > 0) {
        await prisma.calcSession.updateMany({
          where: { id: { in: stalePending.map((s) => s.id) } },
          data: {
            status: "TIMED_OUT",
            completedAt: new Date(),
          },
        });

        // Cascade: mark any dangling node executions as SKIPPED too
        await prisma.calcNodeExecution.updateMany({
          where: {
            sessionId: { in: stalePending.map((s) => s.id) },
            status: { in: ["PENDING", "WAITING", "RUNNING"] },
          },
          data: { status: "SKIPPED", completedAt: new Date() },
        });
      }

      logger.info(
        { pausedCount: stalePaused.length, pendingCount: stalePending.length },
        "TTL sweep done"
      );
    },
    { connection: redisConnection },
  );

  // Initialize the repeatable job
  const sweeperQueue = new Queue("sweeper-queue", {
    connection: redisConnection,
  });
  sweeperQueue
    .add(
      "hourly-sweep",
      {},
      {
        repeat: {
          pattern: "0 * * * *",
        },
      },
    )
    .catch((err) => logger.error(err, "Failed to add repeatable sweeper job"));

  logger.info("🚀 Sweeper Worker started");
}
