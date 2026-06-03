import { BYPASS_REDIS } from "./bullmq";
import { registerShutdownHooks } from "./shutdown-orchestrator";
import { logger } from "@/server/engine/logger";

export function initWorkers() {
  if (BYPASS_REDIS) {
    logger.info("⏭️ Bypassing background workers (BYPASS_REDIS=true)");
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.START_WORKERS) {
    logger.info(
      "⏭️ Skipping workers in production (set START_WORKERS=true to enable)"
    );
    return;
  }

  // Register OS lifecycle signal handlers (SIGTERM, SIGINT)
  registerShutdownHooks();

  // Import workers here so they start
  require("@/workers/workflowWorker");
  require("@/workers/calcWorker");
  require("@/workers/sweeperWorker");
  require("@/workers/batchWorker");
  require("@/workers/outboxRelayer");

  logger.info("✅ Background workers initialized");
}
