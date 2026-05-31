# Redis and Background Workers Context

This document is a comprehensive guide to the architecture, flow, and integration of the Redis connection and background worker systems in this codebase.

---

## 🔌 1. The Modular Redis Architecture (`src/lib/redis.ts` & `src/lib/bullmq.ts`)

Redis is integrated via the **ioredis** client to handle asynchronous task queueing (via BullMQ), caching, rate limiting, and session management.

### How the Connection Works
To ensure maximum stability and separation of concerns, the application implements a centralized, modular Redis connection factory in `src/lib/redis.ts`. This ensures we do not mix cache data with background job queues.

```typescript
// Factory creating clients with exponential backoff & lifecycle logging
export const redisCacheClient = createRedisClient('cache', 0);
export const redisSessionClient = createRedisClient('session', 1);
export const redisQueueClient = createRedisClient('bullmq', 2, {
  maxRetriesPerRequest: null, // REQUIRED FOR BULLMQ
});
export const rateLimitRedisClient = createRedisClient('rate-limit', 3);
```

### Key Architectural Upgrades Achieved:
1. **Dedicated Database Isolation**: By assigning specific `db` indexes to specific clients, we prevent cache flushes from destroying critical user sessions or wiping out pending worker queues.
2. **Singleton Connection Pooling**: A `Map<number, Redis>` caches client instances, guaranteeing that we only ever spawn exactly one `ioredis` instance per logical database, preventing connection leaks.
3. **Smart Retry & Failover**: Built-in exponential backoff (`Math.min(times * 50, 2000)`) prevents DDoSing the Redis server during outages, and `reconnectOnError` safely catches `'READONLY'` errors to handle ElastiCache/Redis Cluster primary node failovers.
4. **BullMQ Safety Override**: BullMQ uses blocking Redis connection commands (`BRPOPLPUSH`, etc.) to poll for new jobs. By default, `ioredis` throws errors if these hang. Our factory allows overriding `maxRetriesPerRequest: null` *exclusively* for the DB 2 Queue Client, keeping it safe for BullMQ while maintaining strict retries for other databases.
5. **Seamless Queue Integration (`src/lib/bullmq.ts`)**: `bullmq.ts` strictly handles Queue definitions, importing `redisQueueClient` and re-exporting it as `redisConnection`. This preserves **100% backwards compatibility** with existing background workers, which automatically inherited the new robust DB 2 client without any required file modifications.
6. **Lifecycle Hooks**: We attached standard listeners (`connect`, `ready`, `error`, `reconnecting`) to output exact DB and connection statuses to the console, vastly improving production observability and providing functions (`testAllRedisClients`, `closeAllRedisClients`) for graceful startups and shutdowns.

---

## ⚙️ 2. The Background Worker Processes (`src/workers/`)

The application has four specialized workers that subscribe to the respective Redis queues. They are loaded in `src/lib/init-workers.ts` when the server starts.

### A. Workflow Queue Worker (`workflowWorker.ts`)
* **Queue Name**: `workflow-execution`
* **Trigger**: Enqueued when a workflow is triggered.
* **Process**:
  1. Creates an `Execution` entry in PostgreSQL with a `PENDING` status.
  2. Queries the database for the workflow nodes and connectors.
  3. Executes a **Topological Sort** (`topologicalSort`) to determine the exact order in which nodes must be executed so that all dependencies are resolved first.
  4. Runs each node through its matching node executor (`getExecutor(node.type)`), feeding in the variable context sequentially.
  5. Updates the database `Execution` record to `SUCCESS` with the finalized context, or `FAILED` with details of the thrown exception if any node errors out.

### B. Calculation Session Worker (`calcWorker.ts`)
* **Queue Name**: `calc-execution`
* **Trigger**: Enqueued when starting or resuming a multi-stage math calculation session.
* **Process**:
  1. Checks if the `CalcSession` in PostgreSQL is already in a terminal state (`COMPLETED`, `ERRORED`, etc.). If so, bails out.
  2. Spawns a `CalcContext` and a `WorkflowExecutor`.
  3. Evaluates calculations via `executor.continueExecution()`.
  4. **Chained Async Processing**: If the workflow hits a slow or asynchronous node during calculations, it pauses execution and **re-enqueues a new `calc/session.resume` job** back to the Redis queue, allowing processing to happen in distinct, non-blocking steps.

### C. Batch Processor Worker (`batchWorker.ts`)
* **Queue Name**: `batch-process`
* **Trigger**: Bulk calculations (e.g., executing a workflow over thousands of spreadsheet rows).
* **Process**:
  1. Sets the `BatchJob` status in Postgres to `PROCESSING`.
  2. Invokes `prefetchForWorkflow()` to cache formulas and variables, preventing database load.
  3. Fetches rows in **chunks of 50** at a time to prevent out-of-memory errors.
  4. Runs a `WorkflowExecutor` on each row, captures outputs, and commits them in a bulk database transaction (`prisma.$transaction`).
  5. Reports progress iteratively to the `BatchJob` table and posts audit trail logs.

### D. Sweeper TTL Clean-up Worker (`sweeperWorker.ts`)
* **Queue Name**: `sweeper-queue`
* **Trigger**: Repeatable Redis CRON pattern (`"0 * * * *"`, runs every hour).
* **Process**:
  1. Automatically transitions any `PAUSED` math sessions older than **30 days** to `TIMED_OUT`.
  2. Automatically transitions any `PENDING` math sessions older than **6 hours** to `TIMED_OUT`.
  3. Skips any outstanding/unresolved execution steps.

---

## 🧠 3. Isolated Computation Threads (`worker_threads`)

### What it is:
Aside from BullMQ background processes, the codebase uses Node's native `worker_threads` module in `WorkerPoolTimeout.ts` and `worker-mathjs-runner.js`.

### How it works:
* **The Problem**: MathJS evaluations are extremely CPU-intensive. An expression like `ones(10000, 10000)` or infinite loops will completely freeze Node's main thread and hang the whole web server.
* **The Solution**: 
  1. Spawns an isolated native Node OS thread running `worker-mathjs-runner.js`.
  2. Transmits the raw MathJS code and variable scope via `worker.postMessage()`.
  3. Registers a safety `setTimeout` on the main thread (e.g., 2 minutes).
  4. In `worker-mathjs-runner.js`, the code checks matrix dimensions before execution (checks if total elements exceed `MAX_ELEMENTS = 1,000,000` to prevent memory blowups) and lazy-loads MathJS.
  5. If the computation runs successfully, the result is sent back and the thread is closed.
  6. If the thread hangs, the main process calls `worker.terminate()`, instantly killing the CPU thread and preventing event loop starvation.

---

## 🔄 4. How the Systems Coordinate

```
                       [ USER WEB REQUEST ]
                                |
                   (Calculations / Executions)
                                |
             +------------------+------------------+
             |                                     |
    [ Synchronous Path ]                 [ Asynchronous Path ]
             |                                     |
   (Inline lightweight run)          (BullMQ enqueues job in Redis)
             |                                     |
    Prisma / Main Thread                   Redis Queue Storage
             |                                     |
             |                            Background Workers
             |                       (calcWorker / workflowWorker)
             |                                     |
             +------------------+------------------+
                                |
                  (Custom Code / MathJS formula)
                                |
                  [ Spawns Computational Thread ]
                     (worker-mathjs-runner.js)
                                |
                     - Sandboxed execution
                     - Under 1,000,000 matrix size
                     - Forced terminate on timeout
```

By separating **asynchronous state management & reliability** (handled by Redis + BullMQ) from **CPU computation isolation** (handled by Node `worker_threads`), the application remains highly resilient, scalable, and crash-proof.

---

## 🛡️ 5. Production-Grade Job Producers (Facade Pattern)

### The Problem with Direct BullMQ Calls
Previously, the codebase dispatched background jobs by directly importing the BullMQ queue (`calcQueue`, `workflowQueue`) and using a generic untyped helper:
```typescript
// Anti-pattern: Untyped, exposes internals, prone to typos
import { addJob, calcQueue } from "@/lib/bullmq";
await addJob(calcQueue, "resume", { sessionId: "123" });
```
This meant business logic (like `RunOrchestrator`) was tightly coupled to BullMQ's infrastructure, and payloads had zero type-safety.

### The Solution: `src/lib/queue-producers.ts`
To ensure maintainability and strict safety, we introduced the **Queue Producer Facade**.
This module acts as a strict firewall between business logic and the Redis queues.

1. **Strict Payload Typing**: We define exact TypeScript interfaces for every background job (e.g., `CalcResumePayload`). If a developer attempts to dispatch a job with missing or incorrectly named properties, the build fails.
2. **Encapsulation**: The rest of the application no longer imports `bullmq.ts`. Instead, consumers call strictly typed methods on the `QueueProducer` object.

```typescript
// Production-grade pattern:
import { QueueProducer } from "@/lib/queue-producers";

// Type-safe, abstracted, and auto-completed by IDEs
await QueueProducer.dispatchCalcResume({ 
  sessionId: "123", 
  reason: "user-action" 
});
```

By wrapping the job dispatchers in a Facade, we guarantee payload integrity across the stack and make it trivially easy to swap out the queueing technology in the future without touching the core business logic.
