import { type Job, Queue, Worker } from "bullmq";

import { BYPASS_REDIS, redisQueueClient } from "./redis";

// Re-export for backwards compatibility with existing workers
export const redisConnection = redisQueueClient;
export { BYPASS_REDIS };

// Define Queues (using DB 2 for queues, configured in redis.ts)
export const workflowQueue = redisConnection
  ? new Queue("workflow-execution", { connection: redisConnection })
  : null;

export const calcQueue = redisConnection
  ? new Queue("calc-execution", { connection: redisConnection })
  : null;

export const batchQueue = redisConnection
  ? new Queue("batch-process", { connection: redisConnection })
  : null;

/**
 * Helper to add jobs to queue with bypass check
 */
export async function addJob(
  queue: Queue | null,
  name: string,
  data: any,
  opts?: any,
) {
  if (BYPASS_REDIS || !queue) {
    console.warn(`Bypassing background job: ${name}`);
    return null;
  }
  return queue.add(name, data, opts);
}
