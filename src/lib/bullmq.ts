import { Queue, Worker, type Job, type ConnectionOptions } from "bullmq";
import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export const BYPASS_REDIS = process.env.BYPASS_REDIS === "true";

let connection: Redis | undefined;

if (!BYPASS_REDIS) {
  connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

export const redisConnection = connection;

// Define Queues
export const workflowQueue = connection 
  ? new Queue("workflow-execution", { connection }) 
  : null;

export const calcQueue = connection 
  ? new Queue("calc-execution", { connection }) 
  : null;

/**
 * Helper to add jobs to queue with bypass check
 */
export async function addJob(queue: Queue | null, name: string, data: any, opts?: any) {
  if (BYPASS_REDIS || !queue) {
    console.warn(`Bypassing background job: ${name}`);
    return null;
  }
  return queue.add(name, data, opts);
}
