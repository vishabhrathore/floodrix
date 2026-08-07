# Chapter 3 — WorkflowExecutor Core Loop

> **Picks up from:** `executor.startExecution()` is called by the orchestrator.
> **Ends when:** All nodes complete (or session pauses/errors) and `ExecutionResult` is returned.

---

## 3.1 What WorkflowExecutor Does

**File:** `src/server/engine/WorkflowExecutor.ts`

The `WorkflowExecutor` is the **heart of the system**. It:

1. Resolves topological execution order of nodes (DAG sort)
2. Creates and manages a `CalcSession` in the database
3. Runs each node through its typed handler sequentially
4. Manages variable scope (reading/writing to `VariableStore`)
5. Handles three types of outcomes per node: `completed`, `paused`, `errored`
6. Writes progress to Redis cache for fast reads + Postgres for durability
7. Emits typed `ExecutionEvent`s for listeners (DB writes, Redis PubSub)

---

## 3.2 Topological Execution Order

Before the loop starts, nodes are sorted into a valid execution order using `resolveExecutionOrder`:

```ts
export function resolveExecutionOrder(wf: LoadedWorkflow): string[] {
  // Uses `toposort` library on the workflow edges
  // Returns an array of node IDs in dependency order
  // e.g. ["input_node_1", "formula_node_2", "formula_node_3", "display_node_4"]
}
```

- Based on the **directed edges** between nodes on the canvas
- Guarantees a node's dependencies always execute before it
- This order is stored in `CalcSession.executionOrder` (Postgres column, JSON array)

---

## 3.3 `startExecution()` — Entry Point

```ts
async startExecution(
  calcWorkflowIdOrWf: string | LoadedWorkflow,
  actorId: string,
  initialValues: VariableMap = {},
  options: ExecutionOptions = {},
  idempotencyKey?: string,
): Promise<ExecutionResult>
```

**Step-by-step:**

```
1. Load workflow (nodes, edges, variables) from DB (or accept pre-loaded)

2. Idempotency check
   └── Check AppCache (Redis) for idempotencyKey first (fast)
   └── Fallback to DB lookup (slower)
   └── If found → return existing session result (no duplicate)

3. Resolve topological execution order
   resolveExecutionOrder(wf) → string[]

4. Build initial variable map
   - Start with workflow-level default variables (from CalcWorkflowVariable table)
   - Override with caller's initialValues
   variables = { ...workflowDefaults, ...initialValues }

5. Create CalcSession in DB via repo.createSession(...)
   - status = "PENDING" initially
   - Stores: executionOrder, initialVariables, stepMode, liveUpdates, runStrategy

6. Cache idempotency key in Redis (TTL 1 hour) for fast future lookups

7. Emit session:started event
   - DatabaseListener: creates buffer for this session
   - RedisPubSubListener: publishes WORKFLOW_STARTED to Redis channel

8. Call _continueExecutionWithSession(session, options)
   → This is the core loop
```

---

## 3.4 `_continueExecutionWithSession()` — The Core Loop

```ts
private async _continueExecutionWithSession(
  session: LoadedSession,
  options: ExecutionOptions,
): Promise<ExecutionResult>
```

This is the most important function in the entire codebase.

### Concurrency Lock (line 602)
```ts
if (!options.bypassLock) {
  const locked = await this.deps.repo.acquireExecutionLock(session.id, session.lockVersion);
  if (!locked) throw new Error("Concurrency Lock Conflict: Session already executing");
}
```
Uses **optimistic locking** (`lockVersion` field on `CalcSession`) to prevent two concurrent requests from running the same session simultaneously.

### WriteBufferManager Registration (line 614)
```ts
if (liveUpdates) {
  WriteBufferManager.register(sessionId, session.currentIndex, session.variables);
}
```
Registers this session for **batched variable flush** to Postgres (see Chapter 5).

### Load Workflow + Variable Store
```ts
const wf = await this.deps.repo.loadWorkflow(session.calcWorkflowId);
const variableStore = new DefaultVariableStore(session.variables);
const registry = createRegistryResolver();
await registry.prefetchForWorkflow(this.deps.db, session.calcWorkflowId);
```

---

## 3.5 The `while` Loop — Per-Node Execution

```ts
let currentIndex = session.currentIndex; // resume from where we left off

while (currentIndex < session.executionOrder.length) {

  // ── 1. Cancel-mid-execution check ──────────────────────────────
  const liveStatus = await this.deps.repo.getStatus(sessionId);
  if (liveStatus === "CANCELLED") {
    return buildResult(sessionId, "CANCELLED", variableStore.snapshot());
  }

  const nodeId = session.executionOrder[currentIndex];
  const node = nodeMap.get(nodeId);

  // ── 2. Skip checks ─────────────────────────────────────────────
  if (skipSet.has(nodeId))           { /* DECISION branch skip */ currentIndex++; continue; }
  if (isStructuralNodeType(node.type)) { /* e.g. GROUP nodes */   currentIndex++; continue; }
  if (isAsyncNodeType(node.type) && !options.isBackgroundRun) {
    return errorOut(..., new Error("Async node requires BullMQ queue"));
  }

  // ── 3. Get handler ─────────────────────────────────────────────
  const handler = this.deps.registry.get(node.type);
  // FormulaHandler | InputHandler | LookupHandler | etc.

  // ── 4. Emit node:started ───────────────────────────────────────
  await this.deps.emitter.emit({
    type: "node:started",
    sessionId, nodeId, nodeLabel: node.label, nodeType: node.type, stepNumber: currentIndex,
  });
  // → RedisPubSubListener publishes NODE_STARTED to Redis channel
  // → useExecution hook receives it via subscribeProgress → updates currentNodeId

  // ── 5. Build ExecutionContext ───────────────────────────────────
  const ctx: ExecutionContext = {
    node,
    edges: wf.edges,
    variables: variableStore,  // shared mutable scope
    db: this.deps.db,
    registry,
    sessionId, workflowId, actorId,
    isBackgroundRun: options.isBackgroundRun ?? false,
    liveUpdates,
  };

  // ── 6. Run handler with timeout ────────────────────────────────
  const outcome = await this.runHandlerWithTimeout(handler, ctx);
  // outcome.kind = "completed" | "paused" | "errored" | "skipped"

  // ── 7. Handle outcome ──────────────────────────────────────────
  // See sections 3.6, 3.7, 3.8 below
}
```

---

## 3.6 Outcome: `completed`

This is the normal path for FORMULA, LOOKUP, INTERPOLATION, CHART, DISPLAY, UNIT_CONVERSION nodes.

```ts
if (outcome.kind === "completed") {
  // Enrich with markdown rendering
  this.enrichOutcomeWithMarkdown(node, outcome, variableStore.snapshot());

  // Handle DECISION skip sets
  if (outcome.sideEffects?.skipNodes) {
    for (const id of outcome.sideEffects.skipNodes) skipSet.add(id);
  }

  // Emit node:completed
  await this.deps.emitter.emit({
    type: "node:completed",
    sessionId, nodeId, nodeLabel: node.label, nodeType: node.type,
    stepNumber: currentIndex,
    outputs: outcome.outputs,   // { [outputKey]: value }
    result: outcome.result,     // { expression, evalScope, value, ... }
    durationMs, cpuUserMs, cpuSystemMs,
  });
  // → DatabaseListener: upserts CalcNodeExecution row (if liveUpdates)
  //                     OR buffers it (if batch mode)
  // → RedisPubSubListener: publishes NODE_COMPLETED to Redis channel
  // → useExecution: adds to nodeOutputs, updates variables, re-renders card

  // If liveUpdates: write node to Postgres immediately
  if (liveUpdates) {
    await this.deps.repo.updateNodeCompleted({ sessionId, nodeId, outputs, result, durationMs });
    // Buffered variable write to Postgres
    WriteBufferManager.update(sessionId, variableStore.snapshot(), currentIndex + 1);
    if (WriteBufferManager.shouldFlush(sessionId)) {
      await this.deps.repo.updateProgress(sessionId, variables, currentIndex);
      WriteBufferManager.markFlushed(sessionId);
    }
  }

  // ── STEP MODE CHECK ───────────────────────────────────────────
  if (stepMode) {
    // Pause after EVERY completed node so user can inspect output
    await AppCache.setSessionStatus(sessionId, "PAUSED");
    await AppCache.setSessionState(sessionId, { ...session, status: "PAUSED",
      currentNodeId: nodeId, pauseReason: "step_complete" });
    // Background write to Postgres
    WriteSerializer.enqueue(sessionId, () => repo.pauseSession({ ... }));

    return {
      sessionId,
      status: "PAUSED",
      pauseReason: "step_complete",
      stepOutput: { nodeId, nodeLabel, nodeType, outputs, result, durationMs, stepNumber, totalSteps },
    };
  }

  currentIndex++;
  continue; // → next node in the loop
}
```

---

## 3.7 Outcome: `paused`

This happens when an **INPUT node** needs user data, or a **VALIDATION node** fails.

```ts
if (outcome.kind === "paused") {
  // reason = "awaiting_user_input" | "validation_error"

  // Update Redis immediately (fast for UI polling)
  await AppCache.setSessionState(sessionId, {
    ...session, status: "PAUSED",
    currentNodeId: nodeId, currentIndex,
    pauseReason: outcome.reason,
  });
  await AppCache.setSessionStatus(sessionId, "PAUSED");

  // Background DB writes via WriteSerializer (non-blocking)
  WriteSerializer.enqueue(sessionId, () => Promise.all([
    repo.pauseSession({ sessionId, nodeId, currentIndex, variables, pauseReason }),
    emitter.emit({ type: "node:waiting", ... }),
    emitter.emit({ type: "session:paused", ... }),
  ]));

  return {
    sessionId, status: "PAUSED",
    pauseReason: outcome.reason,
    pausedNode: outcome.fields ? {
      nodeId, nodeLabel: node.label,
      fields: outcome.fields,    // INPUT node field configs for rendering <InputForm>
      message: outcome.pauseMessage,
    } : null,
  };
}
```

The `ExecutionResult` is returned immediately. The UI receives `status: "PAUSED"` + `pausedNode` fields → `<InputForm>` is rendered. When user submits → `submitInput` mutation → `executor.resumeWithInput()`.

---

## 3.8 Outcome: `errored`

```ts
if (outcome.kind === "errored") {
  return this.errorOut(sessionId, session, wf, node, currentIndex, variableStore, outcome.error, options, durationMs);
}
```

`errorOut` does:
1. Emit `node:errored` event → DB + Redis
2. Emit `session:errored` event
3. Update session status to `ERRORED` in Redis + schedule Postgres write
4. Return `ExecutionResult` with `status: "ERRORED"` + `error` message

---

## 3.9 Loop Completion — Session Finalization

After the `while` loop exits normally (all nodes completed):

```ts
// All nodes done
await this.deps.emitter.emit({
  type: "session:completed",
  sessionId, workflowId, actorId,
  variables: variableStore.snapshot(),
  duration: Date.now() - sessionStartTime,
});
// → DatabaseListener: flushes buffer → inserts all CalcNodeExecution rows
// → RedisPubSubListener: publishes WORKFLOW_COMPLETED to Redis channel
// → useExecution: sets status = "COMPLETED", renders final outcome hero banner

// Final Postgres write
await this.deps.repo.completeSession(sessionId, variableStore.snapshot());

// Clean up WriteBuffer
WriteBufferManager.remove(sessionId);

return buildResult(sessionId, "COMPLETED", variableStore.snapshot());
```

---

## 3.10 `runHandlerWithTimeout()` — Handler Dispatch

```ts
private async runHandlerWithTimeout(
  handler: NodeHandler,
  ctx: ExecutionContext,
): Promise<NodeOutcome> {
  const timeoutMs = handler.timeoutMs ?? 30_000;

  return Promise.race([
    handler.execute(ctx),
    new Promise<NodeOutcome>((_, reject) =>
      setTimeout(() => reject(new Error(`Node timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}
```

Each handler has its own `timeoutMs`. `FormulaHandler` sets 120,000ms (2 min). The race prevents runaway expressions from hanging the server.

---

## 3.11 Step Mode Deep Dive

Step mode is controlled by `session.metadata.stepMode` (stored in Postgres on session creation).

```
User clicks "Step Run"
  │
  ▼
startRun({ stepMode: true })
  │
  ▼
RunOrchestrator → forces INLINE_SYNC strategy
  │
  ▼
executor.startExecution(... { stepMode: true })
  │
  ▼
_continueExecutionWithSession(session, { stepMode: true })
  │
  ▼
Loop starts at currentIndex = 0
  │
  ├── Node 0 executes → COMPLETED
  │     stepMode is true → PAUSE with reason "step_complete"
  │     return { status: "PAUSED", stepOutput: { node 0 result } }
  │
  ▼
UI shows <StepPauseForm> with node 0 output
User clicks "Next"
  │
  ▼
stepForward() mutation
  │
  ▼
executor.stepForward(sessionId)
  │
  ├── Load session from Redis cache
  ├── Verify: status === "PAUSED" && pauseReason === "step_complete"
  ├── Set currentIndex = currentIndex + 1
  ├── Update Redis: status = "RUNNING"
  ├── Background Postgres write
  └── _continueExecutionWithSession(session, { stepMode: true, bypassLock: true })

  └── Node 1 executes → COMPLETED
        stepMode is true → PAUSE again
        return { status: "PAUSED", stepOutput: { node 1 result } }
```

This cycle continues until all nodes are done.

---

## 3.12 `stepBack()` — Rewinding

```ts
async stepBack(sessionId: string, targetNodeId: string): Promise<ExecutionResult> {
  // 1. Load session, verify PAUSED
  // 2. Find targetNodeId in executionOrder → get targetIndex
  // 3. Safety: scan nodes between targetIndex and currentIndex
  //    If any node is in IRREVERSIBLE_NODE_TYPES (API_CALL, PDF_REPORT) → throw
  // 4. Reset node executions from targetIndex onwards to PENDING
  //    (in Redis cache immediately, in Postgres via WriteSerializer)
  // 5. Set currentIndex = targetIndex in Redis
  // 6. Re-enter _continueExecutionWithSession from targetIndex
}
```

⚠️ **Known limitation:** Variables set by the skipped-over nodes are NOT rolled back. They keep their stale values until the re-run overwrites them. Full variable rollback would require snapshotting on every node completion.

---

## 3.13 WriteSerializer — Ordered Background DB Writes

```ts
class WriteSerializer {
  private static queues = new Map<string, Promise<any>>();

  static enqueue<T>(sessionId: string, task: () => Promise<T>): Promise<T> {
    // Chain tasks for the same session sequentially
    // Prevents race conditions where two parallel writes corrupt the session
    const existing = this.queues.get(sessionId) || Promise.resolve();
    const next = existing.then(task);
    this.queues.set(sessionId, next);
    return next;
  }
}
```

All slow DB writes are scheduled through `WriteSerializer`. For the same `sessionId`, writes are always sequential (chained promises). This prevents partial writes and race conditions.

---

## Summary — The Node Loop State Machine

```
                     ┌─────────────────────────────────┐
                     │  _continueExecutionWithSession   │
                     └─────────────────────────────────┘
                                    │
                          currentIndex < executionOrder.length?
                                   YES
                                    │
                          ┌─────────▼──────────┐
                          │  Get next node      │
                          └─────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                 skipped?       handler           cancelled?
                    │           execute()            │
                    ▼               │               ▼
                currentIndex++     │           return CANCELLED
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
           paused              completed             errored
              │                    │                    │
     return PAUSED         stepMode?              return ERRORED
     (input/validation)         │
                           YES   NO
                            │     │
                     return PAUSED  currentIndex++
                     (step_complete)  continue loop
                                          │
                             All nodes done?  YES → return COMPLETED
```

➡️ **Next: [Chapter 4 — Node Handlers & Math Worker](./CHAPTER-4-node-handlers-and-math-worker.md)**
