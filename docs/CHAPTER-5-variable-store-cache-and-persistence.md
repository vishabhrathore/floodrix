# Chapter 5 — Variable Store, Cache & Persistence

> **Covers:** How computed values are stored in memory, cached in Redis, and durably persisted to Postgres.

---

## 5.1 The Three-Layer Storage Model

Floodrix uses **three layers** of storage during execution:

```
Layer 1: VariableStore (in-memory)
  └── Lives inside WorkflowExecutor during a single request/job
  └── All formula reads/writes happen here
  └── Snapshot is taken and pushed to Layer 2 after each node

Layer 2: AppCache (Redis)
  └── Session state: status, currentIndex, currentNodeId, variables
  └── Node execution statuses (RUNNING/COMPLETED/SKIPPED/etc.)
  └── Fast reads for polling — no DB round-trip needed
  └── TTL-based — evicts after 24 hours

Layer 3: SessionRepository → Postgres (durable)
  └── CalcSession table: full session lifecycle
  └── CalcNodeExecution table: per-node inputs/outputs/timing
  └── Writes are intentionally deferred/batched for performance
```

---

## 5.2 DefaultVariableStore

**File:** `src/server/engine/VariableStore.ts`

The in-memory scope that all handlers read and write during execution.

### Internal structure
```ts
class DefaultVariableStore implements VariableStore {
  private vars: VariableMap;                          // top-level variables
  private nodeOutputs: Record<string, VariableMap>;   // indexed by node ID
  private labelOutputs: Record<string, VariableMap>;  // indexed by node label
  private cachedSizeBytes: number | null;             // lazy size cache
}
```

### Reading a variable
```ts
ctx.variables.get("catchment_area")
// → returns value or undefined
```

### Writing a variable
```ts
ctx.variables.set("Qp", 1250.45)
// → checks per-variable size limit (MAX_VARIABLE_BYTES = 5 MB)
// → checks total store size (MAX_STORE_BYTES = 20 MB)
// → writes to this.vars["Qp"]
```

### Size enforcement (guards against memory bombs)
```ts
// MAX_VARIABLE_BYTES = 5 MB — any single value
// MAX_STORE_BYTES = 20 MB — entire store combined

set(key: string, value: VariableValue): void {
  const valueBytes = estimateBytes(value);       // JSON.stringify(value).length * 2
  if (valueBytes > MAX_VARIABLE_BYTES) throw new Error("Variable exceeds 5 MB limit");

  const projectedTotal = this.sizeBytes() - existingBytes + valueBytes;
  if (projectedTotal > MAX_STORE_BYTES) throw new Error("Store would exceed 20 MB limit");

  this.vars[key] = value;
  this.cachedSizeBytes = null;  // invalidate size cache
}
```

If a node tries to write a 10 MB JSON blob → `set()` throws → executor catches it as `errored` outcome → session ends with error message. Prevents OOM crashes and giant DB write blobs.

### Snapshot (deep clone)
```ts
snapshot(): VariableSnapshot {
  return {
    ...deepClone(this.vars),
    $nodes: deepClone(this.nodeOutputs),     // { [nodeId]: { outputKey: value } }
    $results: deepClone(this.labelOutputs),  // { [nodeLabel]: { outputKey: value } }
  };
}
```

`deepClone` uses `structuredClone` (Node ≥ 17) or `JSON.parse(JSON.stringify(...))` fallback.  
**Critical:** Always returns a deep clone so callers can't corrupt the engine's internal state.

### Node output tracking
```ts
ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, { [outputKey]: value });
// → stores in nodeOutputs[nodeId] and labelOutputs[nodeLabel]
// → accessible as $nodes.nodeId.outputKey or $results.nodeLabel.outputKey
```

---

## 5.3 AppCache — Redis Cache Layer

**File:** `src/lib/cache.ts` (inferred from usage)

The `AppCache` is the fast-path layer. Before hitting Postgres, all reads go through Redis first.

### Key namespaces (Redis keys)
```
session:<sessionId>:state      → full LoadedSession object (JSON)
session:<sessionId>:status     → just the status string (RUNNING/PAUSED/etc.)
session:<sessionId>:executions → array of { calcNodeId, status } objects
idempotency:<workflowId>:<key> → sessionId string (TTL 1 hour)
```

### Key operations

| Method | What it does |
|---|---|
| `AppCache.setSessionState(id, session)` | Cache entire session object |
| `AppCache.getSessionState(id)` | Read session from cache (or null) |
| `AppCache.setSessionStatus(id, status)` | Update just the status string |
| `AppCache.getSessionStatus(id)` | Read status from cache |
| `AppCache.setSessionExecutions(id, execs)` | Cache node execution status array |
| `AppCache.getSessionExecutions(id)` | Read node executions from cache |
| `AppCache.invalidateSession(id)` | Delete session state from cache |
| `AppCache.setString(key, value, ttlSec)` | Generic string cache with TTL |
| `AppCache.getString(key)` | Generic string read |

### Redis DB allocation
The project uses multiple logical Redis databases:
- **DB 0** — BullMQ job queues (managed by BullMQ)
- **DB 1** — Application cache (`AppCache`)
- **DB 2** — Session PubSub (Redis pub/sub channels for live events)
- **DB 3** — Distributed locks (session execution lock keys)

---

## 5.4 Write Pattern — Fast Redis First, Postgres Async

For every completed node, the executor uses this pattern:

```
1. Write to AppCache (Redis) immediately  ← synchronous, ~0.5ms
   AppCache.setSessionState(...)
   AppCache.setSessionStatus(...)
   AppCache.setSessionExecutions(...)

2. Schedule slow Postgres write asynchronously via WriteSerializer
   WriteSerializer.enqueue(sessionId, () => repo.updateNodeCompleted(...))
   // Does NOT await — returns promise chain
```

This means:
- The UI polling/subscription sees updated state in **<1ms**
- Postgres write happens **in the background** without blocking the node loop
- If the process crashes before Postgres write completes → Redis state is lost, but Postgres has the last flushed state

---

## 5.5 WriteBufferManager — Batched Variable Flush

**File:** `src/server/engine/WorkflowExecutor.ts` (embedded class)

For workflows with many fast formula nodes, writing variables to Postgres after EVERY node creates excessive DB load.  
`WriteBufferManager` batches these writes.

### How it works
```ts
class WriteBufferManager {
  static buffer = new Map<string, {
    variables: any;
    currentIndex: number;
    pendingCount: number;    // how many updates since last flush
    lastFlushTime: number;   // ms timestamp of last flush
  }>();

  static shouldFlush(sessionId, batchSize = 10, intervalMs = 500): boolean {
    const entry = this.buffer.get(sessionId);
    return entry.pendingCount >= batchSize            // flush every 10 nodes
        || (Date.now() - entry.lastFlushTime) >= 500; // or every 500ms
  }
}
```

### In the executor loop
```ts
// After each completed node (liveUpdates mode):
WriteBufferManager.update(sessionId, variableStore.snapshot(), currentIndex + 1);

if (WriteBufferManager.shouldFlush(sessionId)) {
  const buffered = WriteBufferManager.get(sessionId);
  await this.deps.repo.updateProgress(sessionId, buffered.variables, buffered.currentIndex);
  WriteBufferManager.markFlushed(sessionId);
}
```

Instead of N Postgres writes for N nodes, we get N/10 writes (or one per 500ms).

### Shutdown safety
```ts
// Registered once at server startup
process.on("SIGTERM", async () => {
  const pending = WriteBufferManager.getAllPending();
  await Promise.all(pending.map(([sessId, data]) =>
    repo.updateProgress(sessId, data.variables, data.currentIndex)
  ));
  process.exit(0);
});
```

On graceful shutdown → flushes all pending buffers (20 second timeout) before process exits.

---

## 5.6 WriteSerializer — Sequential Background Writes

**File:** `src/server/engine/WorkflowExecutor.ts` (embedded class)

Problem: Multiple async DB writes for the same session could run in parallel and corrupt state.  
Solution: `WriteSerializer` chains all writes for the same session into a sequential promise queue.

```ts
class WriteSerializer {
  private static queues = new Map<string, Promise<any>>();

  static enqueue<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
    const existing = this.queues.get(sessionId) || Promise.resolve();
    const next = existing.then(task).catch(err => {
      logger.error({ sessionId, err }, "[WriteSerializer] Task failed");
    });
    this.queues.set(sessionId, next);

    // Auto-cleanup when settled
    next.finally(() => {
      if (this.queues.get(sessionId) === next) this.queues.delete(sessionId);
    });

    return next;
  }
}
```

Usage:
```ts
// These won't run in parallel — each waits for the previous to finish
WriteSerializer.enqueue(sessionId, () => repo.updateNodeCompleted(...));
WriteSerializer.enqueue(sessionId, () => repo.resumeSession(...));
WriteSerializer.enqueue(sessionId, () => repo.pauseSession(...));
```

---

## 5.7 SessionRepository — Postgres Persistence

**File:** `src/server/engine/SessionRepository.ts`

This is the **only place** that talks to Postgres for session state. All DB access from the engine goes through here.

### Key methods

**Creating a session:**
```ts
async createSession({
  calcWorkflowId, actorId, executionOrder, initialVariables,
  stepMode, idempotencyKey, liveUpdates, runStrategy, ...
}): Promise<LoadedSession>
// → INSERT into CalcSession
// → If liveUpdates: also INSERT PENDING CalcNodeExecution rows for all nodes
```

**Loading a session (with Redis cache):**
```ts
async loadSession(sessionId: string): Promise<LoadedSession>
// 1. Try AppCache.getSessionState(sessionId)  (Redis, fast)
// 2. If miss → query Prisma → CalcSession with metadata
// 3. Cache result in Redis for next read
```

**Completing a node:**
```ts
async updateNodeCompleted({ sessionId, nodeId, outputs, result, durationMs })
// → UPDATE CalcNodeExecution SET status=COMPLETED, outputVars=outputs, result=result, durationMs=...
// → WHERE sessionId=... AND calcNodeId=...
```

**Pausing a session:**
```ts
async pauseSession({ sessionId, nodeId, currentIndex, variables, pauseReason, skippedNodes, stepMode })
// → UPDATE CalcSession SET
//     status = "PAUSED",
//     currentNodeId = nodeId,
//     currentIndex = currentIndex,
//     variables = variables,
//     pauseReason = pauseReason,
//     metadata = { ...metadata, skippedNodes, stepMode }
```

**Completing a session:**
```ts
async completeSession(sessionId, finalVariables)
// → UPDATE CalcSession SET
//     status = "COMPLETED",
//     variables = finalVariables,
//     completedAt = NOW(),
//     duration = (completedAt - startedAt)
```

**Acquiring execution lock (optimistic):**
```ts
async acquireExecutionLock(sessionId: string, lockVersion: number): Promise<boolean>
// → UPDATE CalcSession SET lockVersion = lockVersion + 1
//   WHERE id = sessionId AND lockVersion = lockVersion AND status NOT IN (COMPLETED, ERRORED, CANCELLED)
// → Returns true if exactly 1 row updated (we got the lock)
// → Returns false if 0 rows (another process has it)
```

---

## 5.8 Postgres Schema Overview

Key tables involved in execution:

### `CalcSession`
```
id               String  (UUID)
calcWorkflowId   String  → FK to CalcWorkflow
actorId          String  → FK to CalcActor
status           Enum    PENDING | RUNNING | PAUSED | COMPLETED | ERRORED | CANCELLED
currentNodeId    String? → which node is currently executing/paused at
currentIndex     Int     → position in executionOrder array
executionOrder   Json    → String[] — node IDs in topological order
variables        Json    → VariableSnapshot — current variable state
inputSnapshot    Json    → original user inputs (for rerun)
metadata         Json    → { stepMode, runStrategy, skippedNodes, ... }
pauseReason      String? → "awaiting_user_input" | "step_complete" | "validation_error"
lockVersion      Int     → optimistic concurrency control
runMode          String  → "INLINE" | "BACKGROUND"
error            String? → error message if ERRORED
startedAt        DateTime
completedAt      DateTime?
duration         Int?    → milliseconds
idempotencyKey   String?
```

### `CalcNodeExecution`
```
id            String   (UUID)
sessionId     String   → FK to CalcSession
calcNodeId    String   → FK to CalcNode
status        Enum     PENDING | RUNNING | COMPLETED | SKIPPED | ERRORED | WAITING
stepNumber    Int      → position in executionOrder (0-indexed)
inputVars     Json?    → variable snapshot at time of execution
outputVars    Json?    → variables produced by this node { [key]: value }
result        Json?    → handler-specific result { expression, evalScope, value, markdown, ... }
error         String?  → error message
errorType     String?  → "formula_error" | "timeout" | "validation" | etc.
durationMs    Int?     → wall-clock execution time
cpuUserMs     Int?     → CPU user time (from process.cpuUsage())
cpuSystemMs   Int?     → CPU system time
startedAt     DateTime?
completedAt   DateTime?
```

---

## 5.9 The Poll Flow (Fallback)

When a client calls `calcExecution.poll({ sessionId })`:

```ts
// SessionPoller.poll(sessionId)

1. Check AppCache.getSessionState(sessionId)
   → If found → return cached state (fast path, <1ms)

2. If Redis miss → query Prisma:
   CalcSession with nodeExecutions included

3. If session is PAUSED → hydrate pausedNode or stepOutput
   (same logic as getSession in the router)

4. Return { sessionId, status, variables, currentNodeId, pauseReason,
            pausedNode, stepOutput, nodeExecutions }
```

The UI calls this every 1500ms while status is RUNNING or PENDING. Combined with the real-time subscription, this gives full resilience: subscription for speed, poll for recovery.

---

## Summary — Data Flow Per Node Completion

```
Handler returns { kind: "completed", outputs: { Qp: 1250.45 } }
  │
  ├── 1. enrichOutcomeWithMarkdown()   [in-memory]
  │
  ├── 2. ctx.variables.set("Qp", 1250.45)  [VariableStore in-memory]
  │
  ├── 3. emitter.emit({ type: "node:completed", ... })
  │        │
  │        ├── DatabaseListener.handle()
  │        │    ├── liveUpdates=true  → repo.updateNodeCompleted() [Postgres write]
  │        │    └── liveUpdates=false → buffer the entry
  │        │
  │        └── RedisPubSubListener.handle()
  │             └── redisCacheClient.publish("workflow:<sessionId>", NODE_COMPLETED)
  │                  → useExecution subscription receives it → React state updates
  │
  ├── 4. AppCache.setSessionExecutions(sessionId, [..., { calcNodeId, status: "COMPLETED" }])
  │        [Redis update — instant]
  │
  ├── 5. WriteBufferManager.update(sessionId, variables, currentIndex+1)
  │        [batched — only flush to Postgres every 10 nodes or 500ms]
  │
  └── 6. loop continues to next node
```

➡️ **Next: [Chapter 6 — Events, Real-Time Updates & Final Result](./CHAPTER-6-events-realtime-and-results.md)**
