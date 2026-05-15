import { BYPASS_REDIS } from "./bullmq";

export function initWorkers() {
  if (BYPASS_REDIS) {
    console.log("⏭️ Bypassing background workers (BYPASS_REDIS=true)");
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.START_WORKERS) {
    console.log(
      "⏭️ Skipping workers in production (set START_WORKERS=true to enable)",
    );
    return;
  }

  // Import workers here so they start
  require("@/workers/workflowWorker");
  require("@/workers/calcWorker");
  require("@/workers/sweeperWorker");
  require("@/workers/batchWorker");

  console.log("✅ Background workers initialized");
}
