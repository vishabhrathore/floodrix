# Chapter 6 — Events, Real-Time Updates & Final Result

> **Covers:** How execution events flow from engine → Redis → UI in real time, and how the final result is displayed.

---

## 6.1 The Event System Architecture

The engine is fully **event-driven** internally. Every significant transition emits an `ExecutionEvent`. These events are the glue between the executor and the outside world (database, Redis, UI).

```
WorkflowExecutor
    │
    │  emitter.emit({ type: "node:completed", ... })
    ▼
ExecutionEventEmitter
    │
    │  (fan-out to all registered listeners in priority order)
    │
    ├──► DatabaseListener      (priority 50)  → Postgres writes
    ├──► RedisPubSubListener   (priority 75)  → Redis channel publish
    ├──► AuditListener         (priority 100) → Audit log writes
    └──► MetricsListener       (priority 200) → Performance metrics
```

---

## 6.2 ExecutionEventEmitter

**File:** `src/server/engine/ExecutionEventEmitter.ts`

A typed, priority-ordered event bus.

```ts
class ExecutionEventEmitter {
  private listeners: RegisteredListener[] = [];

  on(fn: ListenerFn, opts: { priority?: number; name?: string }): void {
    this.listeners.push({ fn, priority: opts.priority ?? 100, name: opts.name ?? "anonymous" });
    this.listeners.sort((a, b) => a.priority - b.priority); // sorted, deterministic order
  }

  async emit(event: ExecutionEvent): Promise<void> {
    const errors: Error[] = [];
    for (const listener of this.listeners) {
      try {
        await listener.fn(event); // sequential — each listener awaited before next
      } catch (err) {
        errors.push(err); // listener errors collected, not thrown immediately
      }
    }
    if (errors.length > 0) throw errors[0]; // rethrow first error after all ran
  }
}
```

**Key design:** If `DatabaseListener` throws (e.g. DB timeout), `AuditListener` still runs. All errors are collected; first error is rethrown after every listener completes. This prevents one bad listener from silently killing the others.

---

## 6.3 Event Types

All events implement the `ExecutionEvent` union type:

| Event Type | When fired | Payload |
|---|---|---|
| `session:started` | After `createSession()` succeeds | sessionId, workflowId, actorId, nodeCount, executionOrder |
| `node:started` | Before `handler.execute()` is called | sessionId, nodeId, nodeLabel, nodeType, stepNumber |
| `node:completed` | After handler returns `kind: "completed"` | sessionId, nodeId, outputs, result, durationMs, cpuUserMs |
| `node:skipped` | When a node is in skipSet or structural | sessionId, nodeId, reason |
| `node:errored` | After handler returns `kind: "errored"` | sessionId, nodeId, error, errorType, durationMs |
| `node:waiting` | When handler returns `kind: "paused"` | sessionId, nodeId, nodeLabel, pauseReason, stepNumber |
| `session:paused` | After session is written to PAUSED | sessionId, workflowId, nodeId, pauseReason, skippedNodes, stepMode |
| `session:completed` | After all nodes finish successfully | sessionId, workflowId, variables, duration |
| `session:errored` | After executor calls `errorOut()` | sessionId, workflowId, error |
| `session:cancelled` | After `cancelExecution()` is called | sessionId, workflowId, actorId |

---

## 6.4 RedisPubSubListener — Real-Time Broadcasting

**File:** `src/server/engine/listeners/RedisPubSubListener.ts`

This listener converts internal `ExecutionEvent`s into Redis PubSub messages on the channel `workflow:<sessionId>`.

### Mapping: Internal → External events

| Internal Event | Redis Message Type |
|---|---|
| `session:started` | `WORKFLOW_STARTED` |
| `node:started` | `NODE_STARTED` |
| `node:completed` | `NODE_COMPLETED` |
| `node:errored` | `NODE_FAILED` |
| `session:completed` | `WORKFLOW_COMPLETED` |
| `session:errored` | `WORKFLOW_FAILED` |
| `session:cancelled` | `WORKFLOW_CANCELLED` |
| All others | No-op (not published) |

### Example: NODE_COMPLETED message
```json
{
  "type": "NODE_COMPLETED",
  "executionId": "sess_abc123",
  "nodeId": "node_formula_qp",
  "nodeLabel": "Peak Flow Calculation",
  "nodeType": "FORMULA",
  "stepNumber": 4,
  "output": { "Qp": 1250.45 },
  "result": {
    "expression": "Qp = 2.08 * A / Tp",
    "evalScope": { "A": 125.5, "Tp": 0.208 },
    "value": 1250.45,
    "markdown": "## Peak Flow\n\n**Qp** = 1250.45 cumec"
  },
  "durationMs": 12,
  "timestamp": 1722900000000
}
```

Published to Redis channel → any subscriber on `workflow:sess_abc123` receives it instantly.

---

## 6.5 DatabaseListener — Persistence Mode

**File:** `src/server/engine/listeners/DatabaseListener.ts`

Handles all Postgres writes for execution state.

### Two write modes

**`liveUpdates: true`** (Step Mode / canvas debug)
- `node:started` → `UPDATE CalcNodeExecution SET status=RUNNING`
- `node:completed` → `UPDATE CalcNodeExecution SET status=COMPLETED, outputVars=..., result=...`
- Every update is immediate — user can watch the canvas node colors change in real time

**`liveUpdates: false`** (default — batch fast path)
- `node:completed` → **buffered in memory** (no DB write yet)
- `session:completed` → **flush buffer** → single `INSERT INTO CalcNodeExecution (createMany)` with all node results
- **Bug 4 fix:** Tracks `flushedNodeIds` per session — if session pauses and resumes, won't re-insert already-flushed rows

This means a 20-node workflow in batch mode makes only **1 bulk INSERT** instead of 20 individual inserts.

### Flush on pause
```ts
case "node:waiting": {
  // Always flush before pausing — we want partial results visible
  if (!this.liveUpdates) await this.flushBuffer(event.sessionId);
  await this.repo.upsertNodeWaiting({ sessionId, nodeId, stepNumber });
  return;
}
```

---

## 6.6 AuditListener

**File:** `src/server/engine/listeners/AuditListener.ts`

Writes to an `AuditLog` table for compliance/traceability. Records:
- Who ran the workflow (actorId)
- When nodes started/completed
- What inputs were provided to INPUT nodes

Does not affect execution behavior — runs at priority 100 (after DB writes).

---

## 6.7 MetricsListener

**File:** `src/server/engine/listeners/MetricsListener.ts`

Tracks performance metrics per session:
- Total execution time
- CPU time per node (from `cpuUserMs` + `cpuSystemMs`)
- Number of nodes completed/skipped/errored
- Identifies slow nodes (e.g. >100ms)

Used for the performance dashboard and internal optimization tracking.

---

## 6.8 subscribeProgress — The Live Stream to UI

**File:** `execution-router.ts`, line 528

```ts
subscribeProgress: protectedProcedure
  .input(z.object({ executionId: z.string() }))
  .subscription(async function* (opts) {
    // 1. Auth check
    const reqCtx = await loadContext(prisma, ctx.userId, { sessionId: input.executionId });
    assertSessionAccess(reqCtx);

    // 2. Open a NEW Redis subscriber connection (dedicated per client)
    const subscriber = redisCacheClient.duplicate();
    const channel = `workflow:${input.executionId}`;
    await subscriber.subscribe(channel);

    // 3. Event queue with promise-based backpressure
    const eventQueue: any[] = [];
    let resolveNext: ((value: any) => void) | null = null;
    let isClosed = false;

    // 4. On Redis message → either resolve waiting promise or queue it
    subscriber.on("message", (chan, message) => {
      if (chan === channel) {
        const event = JSON.parse(message);
        if (resolveNext) {
          resolveNext({ value: event, done: false });
          resolveNext = null;
        } else {
          eventQueue.push(event);
        }
      }
    });

    // 5. Cleanup on client disconnect
    opts.signal?.addEventListener("abort", () => {
      isClosed = true;
      subscriber.quit();
    });

    // 6. Yield loop — sends events to client as they arrive
    while (!isClosed) {
      if (eventQueue.length > 0) {
        yield eventQueue.shift();
      } else {
        const next = await new Promise(resolve => { resolveNext = resolve; });
        if (next.done) break;
        yield next.value;
      }
    }
  })
```

Each connected client gets its **own Redis subscriber connection**. No polling required — messages are pushed as soon as they arrive.

---

## 6.9 useExecution Subscription Handler

**File:** `src/features/workflow-canvas/hooks/use-execution.ts`, lines 193–298

```ts
useSubscription(
  trpc.calcExecution.subscribeProgress.subscriptionOptions(
    { executionId: state.sessionId! },
    {
      enabled: !!state.sessionId,
      onData(event: any) {
        switch (event.type) {

          case "NODE_STARTED":
            highlightStore.setNodeExecutionStatus(event.nodeId, "RUNNING");
            highlightStore.setActiveExecutionNode(event.nodeId);
            setState(s => ({ ...s, currentNodeId: event.nodeId, status: "RUNNING" }));
            break;

          case "NODE_COMPLETED":
            highlightStore.setNodeExecutionStatus(event.nodeId, "COMPLETED");
            highlightStore.setActiveExecutionNode(null);
            setState(s => {
              const stepOut: StepOutput = {
                nodeId: event.nodeId,
                nodeLabel: event.nodeLabel,
                nodeType: event.nodeType,
                outputs: event.output,     // { Qp: 1250.45 }
                result: event.result,      // { expression, evalScope, markdown, ... }
                durationMs: event.durationMs,
                stepNumber: event.stepNumber,
                totalSteps: 0,
              };
              return {
                ...s,
                currentNodeId: null,
                variables: { ...s.variables, ...event.output },
                stepOutput: stepOut,
                nodeOutputs: { ...s.nodeOutputs, [event.nodeId]: stepOut },
              };
            });
            break;

          case "WORKFLOW_COMPLETED":
            setState(s => ({ ...s, status: "COMPLETED", completedAt: new Date().toISOString() }));
            break;

          case "WORKFLOW_FAILED":
            setState(s => ({ ...s, status: "ERRORED", error: event.error }));
            break;

          case "WORKFLOW_CANCELLED":
            setState(s => ({ ...s, status: "CANCELLED" }));
            break;
        }
      }
    }
  )
);
```

---

## 6.10 Final Result Display — workflow-runner.tsx

When `exec.isComplete === true`, the component shows:

### 1. All completed node cards (expanded/collapsed)
Each node card shows:
```tsx
<DynamicVisualizer node={node} completedOutput={exec.nodeOutputs[node.id]} variables={exec.variables} />
```
`DynamicVisualizer` renders:
- Simple scalar values → monospace number
- Array values → table or mini chart
- Markdown result → `<MarkdownContent>` (renders math, tables, code blocks)
- Chart data → Recharts `<LineChart>` or `<BarChart>`

### 2. Outcome Hero Banner (bottom of panel)
```tsx
const getFinalOutcome = () => {
  const lastNode = sortedNodes[sortedNodes.length - 1];
  const output = exec.nodeOutputs[lastNode.id];
  // → finds first numeric key in output
  // → fallback: search exec.variables for "peak", "pmf_peak", "Qp", "max_flow"
  return { label, value, unit };
};

// Renders:
<div className="bg-neutral-900 rounded-lg p-5">
  <div className="text-2xl font-bold font-mono text-neutral-100">
    1,250.45 <span className="text-blue-400">cumec</span>
  </div>
</div>
```

### 3. Re-run Button
When complete, "Re-run" button calls:
```tsx
onClick={() => {
  exec.reset();       // clears all React state
  setAutoStarted(false);  // triggers useEffect to fire startRun again
}}
```

### 4. WorkflowReport
"Report" button opens `<WorkflowReport>` component that:
- Takes `exec.variables` + `exec.nodeOutputs`
- Renders a printable PDF-style report with all node results
- Includes markdown sections from DisplayHandler outputs

---

## 6.11 Background Worker Path (BullMQ)

For workflows with async nodes, execution happens in `src/workers/`:

```
piscinaWorker.ts     ← actual node computation (same handlers as inline)
calcWorker.ts        ← BullMQ job processor
outboxRelayer.ts     ← Transactional Outbox pattern

outboxRelayer.ts flow:
  1. Polls OutboxJob table (FOR UPDATE SKIP LOCKED) every 500ms
  2. Claims unclaimed jobs
  3. Dispatches to BullMQ queue
  4. Marks OutboxJob as processed

calcWorker.ts flow:
  1. BullMQ worker picks up "calc:start-background" job
  2. Loads session from DB
  3. Creates WorkflowExecutor with isBackgroundRun: true
  4. Calls executor.continueExecution(sessionId, { isBackgroundRun: true })
  5. Same _continueExecutionWithSession loop runs
  6. Events emitted → same Redis PubSub → same UI subscription receives them
```

The UI experience is **identical** whether the workflow runs inline or in background — same Redis events, same subscription, same React state updates.

---

## 6.12 Complete End-to-End Timeline

```
t=0ms    User clicks "Run All"
t=1ms    useExecution.startRun() fires tRPC mutation
t=2ms    execution-router.startRun receives request
t=5ms    loadContext + assertCanRunWorkflow
t=8ms    RunOrchestrator.start() → resolves INLINE_SYNC
t=10ms   WorkflowExecutor.startExecution()
t=12ms   resolveExecutionOrder() → topological sort
t=15ms   repo.createSession() → INSERT CalcSession (status=PENDING)
t=18ms   emitter.emit(session:started) → RedisPubSubListener publishes WORKFLOW_STARTED
t=18ms   UI subscription receives WORKFLOW_STARTED → setState({status:"RUNNING"})

t=20ms   Loop iteration 1: node_0 = INPUT node
t=21ms   emitter.emit(node:started) → Redis publishes NODE_STARTED
t=21ms   UI receives NODE_STARTED → highlights node_0 as active
t=22ms   InputHandler.execute() → returns { kind: "paused", reason: "awaiting_user_input" }
t=23ms   AppCache.setSessionStatus(PAUSED)
t=24ms   tRPC mutation returns { status: "PAUSED", pausedNode: { fields: [...] } }
t=24ms   UI ingest() runs → isInputPause=true → <InputForm> renders

...user fills in values and clicks "Continue"...

t=5000ms submitInput mutation fires → executor.resumeWithInput()
t=5002ms Variables written to VariableStore
t=5005ms InputHandler re-runs → all fields present → { kind: "completed" }
t=5007ms emitter.emit(node:completed) → Redis publishes NODE_COMPLETED
t=5007ms UI subscription → nodeOutputs updated → node_0 card shows ✓

t=5010ms Loop iteration 2: node_1 = FORMULA node
t=5011ms emitter.emit(node:started)
t=5011ms FormulaHandler.execute() called
t=5012ms WorkerPoolTimeout.runMathEvaluation() → sends to Piscina thread
t=5020ms Piscina thread evaluates "Qp = 2.08 * A / Tp" with scope {A: 125.5, Tp: 0.208}
t=5022ms Returns { outputs: { Qp: 1250.45 }, cpuUserMs: 2 }
t=5023ms ctx.variables.set("Qp", 1250.45)
t=5025ms emitter.emit(node:completed)
t=5025ms Redis publishes NODE_COMPLETED {output: {Qp: 1250.45}}
t=5025ms UI subscription → nodeOutputs[node_1] = {outputs:{Qp:1250.45}} → card renders value

...more nodes execute...

t=8000ms Last node completes
t=8002ms emitter.emit(session:completed)
t=8003ms Redis publishes WORKFLOW_COMPLETED
t=8003ms UI subscription → status="COMPLETED" → outcome hero banner shows "1,250.45 cumec"
t=8005ms repo.completeSession() → UPDATE CalcSession status=COMPLETED
t=8010ms DatabaseListener.flushBuffer() → bulk INSERT 20 CalcNodeExecution rows
```

---

## 6.13 Docs Staleness Assessment

After reading all existing docs against current code:

| Doc File | Status | Notes |
|---|---|---|
| `workflow-execution-trace.md` | ⚠️ **Partially outdated** | References `AppCache.ts` as separate file but it's in `lib/cache.ts`; `DatabaseListener` path is slightly wrong |
| `workflow-engine-spec.md` | ✅ Still accurate | Core concepts match |
| `node-execution-and-creation-flow.md` | ✅ Still accurate | Node lifecycle correct |
| `workflow-engine-architecture-memory.md` | ⚠️ **Outdated** | References Inngest (replaced by BullMQ) in some sections |
| `workflow-engine-handoff-memory.md` | ⚠️ **Outdated** | Historical handoff notes; some patterns have evolved |
| `redis-workers-context.md` | ✅ Mostly accurate | Redis DB partition correct |
| `outbox-bullmq-workers-memory.md` | ✅ Still accurate | Outbox pattern matches code |
| `worker-logic.md` | ✅ Still accurate | Worker logic correct |
| `server-and-engine-audit.md` | ⚠️ **Outdated** | Audit statuses reflect older implementation |
| `proposeProject.md` | ❌ **Deprecated** | Mentions Inngest as primary queue — replaced by BullMQ |
| `ERD.md` / `ERD_CLEAN.md` | ✅ Schema mostly current | Some new fields not reflected |

**These new CHAPTER docs supersede all existing docs as the ground truth.**

---

## Summary — The Complete Flow in One Diagram

```
[UI: workflow-runner.tsx]
  "Run All" button clicked
         │
         ▼
[Hook: use-execution.ts]
  startRun() → startMutation.mutate()
         │
         ▼ tRPC HTTP POST
[Router: execution-router.ts]
  startRun procedure
  → loadContext → assertCanRunWorkflow
  → new CalcContext
  → createRunOrchestrator()
  → orchestrator.start()
         │
         ▼
[RunOrchestrator.ts]
  → RunStrategyResolver.resolve() → INLINE_SYNC
  → executor.startExecution()
         │
         ▼
[WorkflowExecutor.ts]
  → resolveExecutionOrder()
  → repo.createSession()         → Postgres: INSERT CalcSession
  → emitter.emit(session:started) → Redis: WORKFLOW_STARTED
  → _continueExecutionWithSession()
         │
    ┌────▼──────────────────────────────────────────────────────┐
    │  while (currentIndex < executionOrder.length)             │
    │                                                           │
    │  emitter.emit(node:started) → Redis: NODE_STARTED         │
    │  handler.execute(ctx)                                     │
    │  ├── FormulaHandler → WorkerPoolTimeout → Piscina thread  │
    │  │   └── worker-mathjs-runner.js (math.js evaluate)       │
    │  │   └── returns { outputs, cpuUserMs }                   │
    │  │                                                        │
    │  ├── InputHandler → paused (awaiting_user_input)          │
    │  │   └── returns pausedNode fields to UI                  │
    │  │   └── user submits → resumeWithInput() → continues     │
    │  │                                                        │
    │  └── DecisionHandler → completed + skipNodes side-effect  │
    │                                                           │
    │  emitter.emit(node:completed)                             │
    │  ├── DatabaseListener → Postgres write (or buffer)        │
    │  └── RedisPubSubListener → Redis publish NODE_COMPLETED   │
    │                                                           │
    │  AppCache.setSessionState() → Redis (instant)             │
    │  WriteBufferManager.update() → batched Postgres flush     │
    │  currentIndex++                                           │
    └───────────────────────────────────────────────────────────┘
         │
    All nodes done
         ▼
  emitter.emit(session:completed)
  ├── DatabaseListener: flushBuffer() → bulk INSERT node executions
  └── RedisPubSubListener → Redis: WORKFLOW_COMPLETED

         │ Redis channel: workflow:<sessionId>
         ▼
[tRPC Subscription: subscribeProgress]
  subscriber.on("message") → yields to generator
         │
         ▼
[Hook: use-execution.ts]
  onData(event) → setState({status:"COMPLETED"})
         │
         ▼
[UI: workflow-runner.tsx]
  exec.isComplete = true
  → Outcome Hero Banner renders final value
  → All node cards show ✓ with outputs
  → Report button enabled
```

---

## Navigation Index

| Chapter | Topic | File |
|---|---|---|
| 1 | Overview & UI Trigger | [CHAPTER-1-overview-and-ui-trigger.md](./CHAPTER-1-overview-and-ui-trigger.md) |
| 2 | tRPC Router & Orchestrator | [CHAPTER-2-trpc-router-and-orchestrator.md](./CHAPTER-2-trpc-router-and-orchestrator.md) |
| 3 | Workflow Executor Core Loop | [CHAPTER-3-workflow-executor-core-loop.md](./CHAPTER-3-workflow-executor-core-loop.md) |
| 4 | Node Handlers & Math Worker | [CHAPTER-4-node-handlers-and-math-worker.md](./CHAPTER-4-node-handlers-and-math-worker.md) |
| 5 | Variable Store, Cache & Persistence | [CHAPTER-5-variable-store-cache-and-persistence.md](./CHAPTER-5-variable-store-cache-and-persistence.md) |
| 6 | Events, Real-Time & Final Result | **This file** |
