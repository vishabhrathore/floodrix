import { Queue } from "bullmq";
import { redisQueueClient } from "../src/lib/redis";

async function main() {
  if (!redisQueueClient) {
    console.error("Redis queue client is not initialized.");
    return;
  }

  console.log("=== INSPECTING BULLMQ COMPLETED JOBS ===");
  const queue = new Queue("calc-execution", { connection: redisQueueClient });

  const completedJobs = await queue.getJobs(["completed"], 0, 20, true);
  console.log(`\nCompleted Jobs (Total: ${completedJobs.length}):`);
  for (const job of completedJobs) {
    console.log(`- JobId: ${job.id}`);
    console.log(`  Name: ${job.name}`);
    console.log(`  Data:`, JSON.stringify(job.data));
    console.log(`  Result:`, JSON.stringify(job.returnvalue));
    console.log("-----------------------------------------");
  }

  await queue.close();
}

main().catch(console.error);
