import { workflowWorker } from "../workers/workflowWorker";
import { calcWorker } from "../workers/calcWorker";
import { batchWorker } from "../workers/batchWorker";
import { sweeperWorker } from "../workers/sweeperWorker";
import { stopOutboxRelayer } from "../workers/outboxRelayer";
import { getWorkflowPiscinaPool } from "../workers/piscinaWorkerPool";
import { closeAllRedisClients } from "./redis";
import prisma from "./db";
import { logger } from "@/server/engine/logger";

let isShuttingDown = false;

export async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("🛑 Starting graceful shutdown sequence...");

  // 1. Stop fetching new jobs from BullMQ Workers
  logger.info("⏸️ Pausing and closing BullMQ workers...");
  const workers = [workflowWorker, calcWorker, batchWorker, sweeperWorker];
  await Promise.all(
    workers.map(async (worker) => {
      if (worker) {
        try {
          await worker.close();
          logger.info(`✓ Worker "${worker.name}" closed.`);
        } catch (err) {
          logger.error(err, `Error closing worker`);
        }
      }
    })
  );

  // 2. Stop Outbox Relayer polling
  logger.info("⏸️ Stopping Outbox Relayer...");
  try {
    stopOutboxRelayer();
    logger.info("✓ Outbox Relayer stopped.");
  } catch (err) {
    logger.error(err, "Error stopping outbox relayer");
  }

  // 3. Destroy Piscina thread pool
  logger.info("⏸️ Destroying Piscina thread pool...");
  try {
    const pool = getWorkflowPiscinaPool();
    await pool.destroy();
    logger.info("✓ Piscina thread pool destroyed.");
  } catch (err) {
    logger.error(err, "Error destroying Piscina pool");
  }

  // 4. Close Redis Clients
  logger.info("⏸️ Closing Redis connection clients...");
  try {
    await closeAllRedisClients();
    logger.info("✓ Redis clients closed.");
  } catch (err) {
    logger.error(err, "Error closing Redis clients");
  }

  // 5. Disconnect Prisma DB
  logger.info("⏸️ Disconnecting Prisma DB...");
  try {
    await prisma.$disconnect();
    logger.info("✓ Prisma disconnected.");
  } catch (err) {
    logger.error(err, "Error disconnecting Prisma");
  }

  logger.info("👋 Graceful shutdown complete. Exiting process.");
  process.exit(0);
}

export function registerShutdownHooks() {
  if (process.env.NODE_ENV !== "production") {
    // In development mode, Next.js handles process signals and HMR restarts.
    // Registering global process exit hooks here will prematurely terminate the Next.js dev server.
    return;
  }

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM.");
    gracefulShutdown().catch(() => process.exit(1));
  });

  process.on("SIGINT", () => {
    logger.info("Received SIGINT.");
    gracefulShutdown().catch(() => process.exit(1));
  });
}
