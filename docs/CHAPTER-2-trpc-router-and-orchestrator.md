# Chapter 2 — tRPC Router & Run Orchestrator

> **Picks up from:** User clicked "Run All" and `useExecution.startRun()` fired a tRPC mutation.
> **Ends when:** The `WorkflowExecutor` begins the node loop (Chapter 3).

---

## 2.1 The tRPC Execution Router

**File:** `src/features/workflow-canvas/server/execution-router.ts`
**Export:** `calcExecutionRouter`

This is the server-side API gateway. It is a standard tRPC router with these procedures:

| Procedure | Type | Purpose |
|---|---|---|
| `startRun` | mutation | Start a new workflow execution |
| `poll` | query | Fallback polling — fetch current session state |
| `submitInput` | mutation | Resume a paused INPUT node with user values |
| `stepForward` | mutation | Advance one node in step mode |
| `stepBack` | mutation | Rewind to a previous node and re-run from there |
| `cancelRun` | mutation | Cancel an active session |
| `getSession` | query | Full session snapshot including all node executions |
| `getHistory` | query | List past sessions for a workflow |
| `rerun` | mutation | Restart a completed/failed session |
| `subscribeProgress` | subscription | Real-time Redis PubSub stream |

---

## 2.2 `startRun` — The Entry Point

```ts
// execution-router.ts, line 72
startRun: protectedProcedure
  .input(z.object({
    workflowId:     z.string(),
    initialValues:  z.record(z.string(), z.unknown()).optional(),
    stepMode:       z.boolean().optional(),
    liveUpdates:    z.boolean().optional(),
    idempotencyKey: z.string().optional(),
    batchSize:      z.number().int().min(1).optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Step 1: Load request context (org, actor, workflow permissions)
    const reqCtx = await loadContext(prisma, ctx.userId, { workflowId: input.workflowId });
    assertCanRunWorkflow(reqCtx);   // throws FORBIDDEN if not allowed

    // Step 2: Create CalcContext (dependency container)
    const calcCtx = new CalcContext(prisma, actorId, orgId);

    // Step 3: Create orchestrator and start
    const orchestrator = createRunOrchestrator(calcCtx, { liveUpdates: input.stepMode ?? false });
    return orchestrator.start({
      calcWorkflowId: input.workflowId,
      actorId,
      initialValues:  input.initialValues ?? {},
      stepMode:       input.stepMode ?? false,
      idempotencyKey: input.idempotencyKey,
      batchSize:      input.batchSize ?? 1,
    });
  })
```

### TimeTracker (telemetry)
Every procedure is wrapped with a `TimeTracker` that logs step durations:
```ts
const tracker = new TimeTracker("startRun");
await tracker.track("loadContext", () => loadContext(...));
await tracker.track("orchestrator.start", () => orchestrator.start(...));
tracker.end(); // logs full summary
```

---

## 2.3 Context Loading — `loadContext`

**File:** `src/server/context/context.loader.ts`

`loadContext` resolves the full request context in one call:
- Who is the user (`userId` from auth JWT)?
- Which organization do they belong to?
- Which `CalcActor` record maps to them?
- Does the requested workflow / session belong to their org?
- Do they have the `CAN_RUN_CALC_WORKFLOW` permission?

Result is a `RequestContext` object passed to guard functions like `assertCanRunWorkflow`.

---

## 2.4 CalcContext — Dependency Container

**File:** `src/server/engine/calc-context.ts`

```ts
class CalcContext {
  constructor(
    public readonly db: PrismaClient,
    public readonly actorId: string,
    public readonly orgId: string,
  ) {}
}
```

A thin container that bundles the three things every engine component needs. It is passed to factory functions (`createRunOrchestrator`, `createWorkflowExecutor`, `createSessionPoller`) which wire up all real dependencies.

---

## 2.5 RunOrchestrator — The Strategy Decider

**File:** `src/server/engine/RunOrchestrator.ts`

The `RunOrchestrator` sits between the router and the executor. It is the **only place that decides HOW to run a workflow**.

### `orchestrator.start(input)` flow

```
start(input)
  │
  ├── 1. Idempotency check
  │       If input.idempotencyKey exists → check DB for existing session
  │       If found → return existing session state (no duplicate run)
  │
  ├── 2. Load workflow node types
  │       repo.loadWorkflow(calcWorkflowId)
  │       nodeTypes = wf.nodes.map(n => n.type)
  │
  ├── 3. Resolve strategy
  │       resolver.resolve({ nodeTypes, batchSize, forceStrategy })
  │       → returns { strategy: INLINE_SYNC | BACKGROUND, reason }
  │
  ├── 4. stepMode override
  │       if input.stepMode === true → force INLINE_SYNC
  │       (step debugging makes no sense over async boundary)
  │
  └── 5. Branch
        INLINE_SYNC → runInlineSync(input)
        BACKGROUND  → runBackground(input)
```

---

## 2.6 RunStrategyResolver — How the Strategy Is Chosen

**File:** `src/server/engine/RunStrategyResolver.ts`

```ts
resolve({ nodeTypes, batchSize, forceStrategy }) {
  // 0. Admin override wins
  if (forceStrategy) return { strategy: forceStrategy, ... };

  // 1. Batch runs always go to background queue
  if (batchSize > 1) return { strategy: BACKGROUND, reason: "batch" };

  // 2. Any async node type → background
  const firstAsyncIndex = nodeTypes.findIndex(isAsyncNodeType);
  if (firstAsyncIndex !== -1) return { strategy: BACKGROUND, reason: `async node at ${firstAsyncIndex}` };

  // 3. Pure sync math → inline
  return { strategy: INLINE_SYNC, reason: "single sync run" };
}
```

**Async node types** (currently): `API_CALL`, `PDF_REPORT`, `SEND_EMAIL`, `WEBHOOK`.
These require background queue because they involve external HTTP calls or file generation that cannot block the request thread.

**FORMULA, LOOKUP, INTERPOLATION, DECISION, INPUT, DISPLAY, CHART, UNIT_CONVERSION, VALIDATION** → all sync → `INLINE_SYNC`.

---

## 2.7 Strategy: INLINE_SYNC

```ts
private async runInlineSync(input): Promise<ExecutionResult> {
  return this.deps.executor.startExecution(
    input.calcWorkflowId,
    input.actorId,
    input.initialValues ?? {},
    {
      stepMode:    input.stepMode ?? false,
      liveUpdates: input.stepMode ?? false,
      runStrategy: RunStrategy.INLINE_SYNC,
    },
    input.idempotencyKey,
  );
}
```

- Runs **synchronously inside the current HTTP request thread**.
- The tRPC mutation waits for the full executor response before returning.
- For a workflow with all INPUT+FORMULA nodes (most engineering workflows), this is the path taken.
- Chapter 3 covers what `executor.startExecution` does.

---

## 2.8 Strategy: BACKGROUND

```ts
private async runBackground(input): Promise<ExecutionResult> {
  // 1. Load topology
  const wf = await this.deps.repo.loadWorkflow(input.calcWorkflowId);
  const executionOrder = resolveExecutionOrder(wf);

  // 2. Create session in DB (status = PENDING)
  const session = await this.deps.repo.createSession({
    calcWorkflowId: input.calcWorkflowId,
    actorId: input.actorId,
    executionOrder,
    initialVariables: variables,
    stepMode: false,
    runStrategy: RunStrategy.BACKGROUND,
  });

  // 3. Dispatch to BullMQ via Transactional Outbox
  await this.deps.db.$transaction(async (tx) => {
    await QueueProducer.dispatchCalcStartBackground(tx, { sessionId: session.id });
  });

  // 4. Return immediately — client will poll
  return {
    sessionId: session.id,
    status: "RUNNING",
    asyncPending: {
      pollUrl: this.buildPollUrl(session.id),
      pollIntervalMs: 1000,
      strategy: RunStrategy.BACKGROUND,
    },
  };
}
```

The client receives `asyncPending` and immediately starts polling `calcExecution.poll` every second.

---

## 2.9 Other Key Router Procedures

### `submitInput` (line 154)
Called when user fills in an INPUT node form and clicks "Continue":
1. Loads session → checks it is `PAUSED`
2. Self-healing: if session is stuck in `RUNNING` for >2 min → auto-repair to `PAUSED`
3. Creates `WorkflowExecutor` with `liveUpdates: isStepMode`
4. Calls `executor.resumeWithInput(sessionId, currentNodeId, values, options)`

### `stepForward` (line 251)
Called when user clicks "Next" in step mode:
1. Loads session → verifies `PAUSED` with reason `step_complete`
2. Creates executor with `liveUpdates: true`
3. Calls `executor.stepForward(sessionId)`

### `stepBack` (line 281)
Called to rewind to a previous node:
1. Loads session
2. Calls `executor.stepBack(sessionId, targetNodeId)`
3. Engine resets all node executions from `targetNodeId` onwards to `PENDING`

### `subscribeProgress` (line 528)
The real-time event stream via tRPC subscription:
```ts
subscribeProgress: protectedProcedure
  .input(z.object({ executionId: z.string() }))
  .subscription(async function* (opts) {
    const subscriber = redisCacheClient.duplicate(); // new Redis connection per subscriber
    const channel = `workflow:${input.executionId}`;
    await subscriber.subscribe(channel);

    // Event queue with promise-based backpressure
    while (!isClosed) {
      if (eventQueue.length > 0) {
        yield eventQueue.shift();    // send buffered event
      } else {
        const next = await new Promise(resolve => { resolveNext = resolve; });
        if (next.done) break;
        yield next.value;
      }
    }
  })
```

This is a **server-sent event generator** that subscribes to a Redis PubSub channel named `workflow:<sessionId>` and yields each message to the tRPC client as it arrives.

---

## 2.10 The `poll` Procedure (fallback)

```ts
poll: protectedProcedure
  .input(z.object({ sessionId: z.string() }))
  .query(async ({ ctx, input }) => {
    const poller = createSessionPoller(calcCtx);
    return poller.poll(input.sessionId);
  })
```

`SessionPoller` reads current session state from Redis (fast) or falls back to Postgres. Returns the same shape as `getSession` but optimized for high-frequency polling.

---

## Summary

| Step | What happens | File |
|---|---|---|
| 1 | tRPC `startRun` mutation arrives | `execution-router.ts` |
| 2 | Auth + permission check | `context.loader.ts` |
| 3 | `CalcContext` created | `calc-context.ts` |
| 4 | `RunOrchestrator.start()` called | `RunOrchestrator.ts` |
| 5 | Strategy resolved (INLINE_SYNC vs BACKGROUND) | `RunStrategyResolver.ts` |
| 6a | INLINE_SYNC → `executor.startExecution()` called inline | `WorkflowExecutor.ts` |
| 6b | BACKGROUND → session created, BullMQ job queued | `QueueProducer.ts` |
| 7 | Client subscribes to `subscribeProgress` for live events | `execution-router.ts` |

➡️ **Next: [Chapter 3 — Workflow Executor Core Loop](./CHAPTER-3-workflow-executor-core-loop.md)**
