# Engine Mental Model

> A complete map of every file, every data flow, every contract, and every
> known bug fix. Read this before touching any engine file.

---

## 1. The Big Picture — One Sentence Per File

```
types.ts                  — every shared type. if it's used in 2+ files, it lives here.
NodeHandler.ts            — the interface every node handler must implement (3 rules).
NodeHandlerRegistry.ts    — a Map<CalcNodeType, NodeHandler> with startup validation.
VariableStore.ts          — typed wrapper around the variable state. never a plain object.
ExecutionEventEmitter.ts  — typed event bus. executor emits, listeners react.
SessionRepository.ts      — every single Prisma call. executor never imports PrismaClient.
WorkflowExecutor.ts       — the loop. dispatch + switch(outcome.kind). zero DB, zero node logic.
bootstrap.ts              — one factory function. all registrations. call once at startup.
index.ts                  — public barrel. always import from here, never from internal files.
listeners/DatabaseListener.ts  — reacts to events → writes to DB (batch or live).
listeners/AuditListener.ts     — reacts to events → writes audit log.
handlers/FormulaHandler.ts         — FORMULA node logic.
handlers/MultiFormulaHandler.ts    — MULTI_FORMULA node logic.
handlers/InputHandler.ts           — INPUT node logic, pause when values missing.
handlers/LookupTableHandler.ts     — LOOKUP_TABLE node logic.
handlers/InterpolationHandler.ts   — GRAPH_INTERPOLATION node logic.
handlers/DecisionHandler.ts        — DECISION node logic, resolves which nodes to skip.
handlers/DisplayHandler.ts         — DISPLAY node logic, selection rules.
handlers/ValidationHandler.ts      — VALIDATION node logic, pause on error.
handlers/UnitConversionHandler.ts  — UNIT_CONVERSION node logic.
handlers/CustomCodeHandler.ts      — CUSTOM_CODE node logic.
```

---

## 2. Layered Architecture

```
  ┌─────────────────────────────────────────────┐
  │               API / tRPC layer              │
  │         createWorkflowExecutor(db)          │
  └────────────────────┬────────────────────────┘
                       │
  ┌────────────────────▼────────────────────────┐
  │           WorkflowExecutor                  │  ← thin loop only
  │   startExecution / resumeWithInput / cancel │
  │         continueExecution loop              │
  └──────┬──────────────┬───────────────────────┘
         │              │
  ┌──────▼──────┐ ┌─────▼──────────────────────┐
  │  Session    │ │   NodeHandlerRegistry       │
  │  Repository │ │   get(type) → NodeHandler   │
  │  (all DB)   │ └─────┬──────────────────────┘
  └─────────────┘       │
                 ┌──────▼──────────────────────┐
                 │  handler.execute(ctx)        │
                 │  returns NodeOutcome         │
                 └─────────────────────────────┘
                       │
  ┌────────────────────▼────────────────────────┐
  │         ExecutionEventEmitter               │
  │  emit(event) → all listeners run            │
  └────────────┬──────────────┬─────────────────┘
               │              │
  ┌────────────▼───┐  ┌───────▼──────┐
  │ DatabaseListener│  │AuditListener │
  │ (batch or live) │  │              │
  └─────────────────┘  └──────────────┘
```

---

## 3. Core Contract: NodeOutcome

Every handler returns exactly one of these. No throws for control flow.

```typescript
type NodeOutcome =
  | { kind: "completed"; outputs; result; sideEffects?: { skipNodes?: string[] } }
  | { kind: "paused";    reason; fields?; nodeLabel?; pauseMessage? }
  | { kind: "skipped" }
  | { kind: "errored";   error: Error }
```

The loop `switch`es on `outcome.kind`:

```
completed → apply sideEffects.skipNodes to skipSet → emit node:completed
paused    → flush batch log → emit node:waiting → emit session:paused → return PAUSED
skipped   → emit node:skipped
errored   → emit node:errored → repo.errorSession → emit session:errored → return ERRORED
```

**Why no throws?** Throwing for control flow (pause, skip) means the loop needs
try/catch around every dispatch. With a discriminated union the loop stays clean
and all outcomes are explicit at the type level.

---

## 4. VariableStore — the variable lifecycle

```
                  ┌──────────────────────────────┐
                  │       DefaultVariableStore    │
                  │                              │
  workflow        │  store: VariableContext       │
  defaults  ────► │    beam_width: 300            │
  +               │    load: 500                  │
  initialValues   │    $nodes: { ... }            │
                  │    $results: { ... }          │
                  └──────┬───────────────────────┘
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
   .get() │       .set() │    .snapshot()   │
   .has() │       .merge()│   returns a     │
          │              │   CLONED copy    │
          │              │   ($nodes and    │
          │              │   $results also  │
          │              │   cloned)        │
          ▼              ▼                  ▼
     read value     write value       safe for DB write
                                      (no shared refs)
```

**Critical rule:** `snapshot()` clones `$nodes` and `$results` too (Bug 7 fix).
Without this, mutations after the snapshot retroactively change the already-captured
inputVars that was passed to the DB listener.

---

## 5. liveUpdates Mode vs Batch Mode

This is controlled entirely by `DatabaseListener`. The executor doesn't branch on it.

### Batch mode (default — `liveUpdates: false`)

```
Session start:
  - NO PENDING rows created upfront
  - nodeLog = [] in DatabaseListener

Per node:
  - node:started  → no-op
  - node:completed → push to nodeLog (in memory)
  - node:skipped  → push to nodeLog (in memory)

At pause/error:
  - flush() → createMany(nodeLog) → one DB round trip for all nodes so far
  - WAITING row written immediately (resume must find it)

At completion:
  - flush() → createMany(remaining nodeLog)
  - completeSession()
```

### liveUpdates mode (`liveUpdates: true`)

```
Session start:
  - createMany PENDING rows for ALL nodes upfront
  - canvas can render every node as "queued" immediately

Per node:
  - node:started   → updateMany → RUNNING (canvas shows active node)
  - node:completed → updateMany → COMPLETED
  - node:skipped   → updateMany → SKIPPED
  - node:waiting   → upsert (PENDING row already exists) → WAITING

No batch accumulation — every write is immediate.
```

### Why batch is 10–60× faster

A 30-node workflow in liveUpdates mode = ~90 DB round trips (start + complete + progress per node).
In batch mode = ~3 DB round trips (createSession + createMany at end + updateSession).

---

## 6. skipSet — the Decision Branch lifecycle

```
DECISION node runs
  │
  ├── conditionResult = true
  │     branchTaken = "true"
  │     branchNotTaken = "false"
  │     resolveSkipNodes("false" edges) → [nodeD, nodeE, nodeF]
  │     return { sideEffects: { skipNodes: [nodeD, nodeE, nodeF] } }
  │
  └── loop receives outcome.sideEffects.skipNodes
        → skipSet.add("nodeD"), skipSet.add("nodeE"), skipSet.add("nodeF")

Later in loop:
  nodeD encountered → skipSet.has("nodeD") === true → emit node:skipped → continue
```

### skipSet survives pause+resume (Bug 11 fix)

Without persistence, resuming a session after a pause creates a fresh empty skipSet,
and all decision-skipped nodes execute anyway.

```
Fix flow:
  1. DECISION runs → skipSet = {D, E, F}
  2. INPUT node pauses → emit session:paused with skippedNodes: ["D","E","F"]
  3. DatabaseListener.onSessionPaused → repo.pauseSession → metadata: { skippedNodes: ["D","E","F"] }
  4. On resume → continueExecution loads session
  5. const persistedSkips = session.metadata?.skippedNodes  → ["D","E","F"]
  6. skipSet = new Set(["D","E","F"])  ← restored correctly
```

---

## 7. Execution Event Flow (complete trace)

```
executor.continueExecution()
  │
  ├─ emitter.on(dbListener.handle)
  ├─ emitter.on(auditListener.handle)
  │
  └─ while loop:
       │
       ├─ emit("node:started")
       │    └─ dbListener: liveUpdates? updateNodeRunning : no-op
       │
       ├─ handler.execute(ctx) → outcome
       │
       ├─ outcome.kind === "completed"
       │    ├─ emit("node:completed")
       │    │    └─ dbListener: liveUpdates? updateNodeCompleted : push to nodeLog
       │    └─ (liveUpdates) updateSessionVariables
       │
       ├─ outcome.kind === "paused"
       │    ├─ dbListener.flush()        ← writes nodeLog to DB before WAITING row
       │    ├─ emit("node:waiting")
       │    │    └─ dbListener: upsert WAITING row (works in both modes)
       │    ├─ emit("session:paused")
       │    │    └─ dbListener: pauseSession (stores skippedNodes in metadata)
       │    └─ return ExecutionResult{status: PAUSED}
       │
       ├─ outcome.kind === "errored"
       │    ├─ emit("node:errored")
       │    │    └─ dbListener: liveUpdates? updateNodeErrored
       │    │                 : push to nodeLog + flush() immediately
       │    ├─ repo.errorSession()
       │    ├─ emit("session:errored")
       │    │    └─ auditListener: log WORKFLOW_RUN_ERRORED
       │    └─ return ExecutionResult{status: ERRORED}
       │
       └─ all nodes done:
            ├─ dbListener.flush()       ← final flush of remaining nodeLog
            ├─ repo.completeSession()
            ├─ emit("session:completed")
            │    └─ auditListener: log WORKFLOW_RUN_COMPLETED
            └─ return ExecutionResult{status: COMPLETED}
```

---

## 8. Resume Flow (full trace)

```
resumeWithInput(sessionId, nodeId, userInput)
  │
  ├─ getSession() — verify status === PAUSED and currentNodeId === nodeId
  │
  ├─ [Bug 8 guard] executionOrder.indexOf(nodeId)
  │    → throws if -1 (workflow modified after session started)
  │
  ├─ variables = session.variables + userInput (merged)
  │
  ├─ resolveNodeWaiting() — mark WAITING row as COMPLETED with userInput
  │
  ├─ resumeSession() — status: RUNNING, currentIndex: idx+1
  │
  └─ continueExecution(sessionId)
       └─ loads session fresh from DB
            ├─ restores variables (now includes userInput)
            ├─ restores skipSet from metadata.skippedNodes
            └─ continues from currentIndex (node AFTER the INPUT node)
```

---

## 9. All Known Bug Fixes (with locations)

| # | Severity | Bug | Fix Location |
|---|----------|-----|-------------|
| 1 | High | `updateNodeCompleted` matches WAITING rows too — no status guard | `SessionRepository.updateNodeCompleted` → added `status: "RUNNING"` |
| 2 | Medium | Double flush on error path — executor pre-flushed, listener also flushed | `WorkflowExecutor` → removed redundant pre-flush |
| 3 | Low | `updateNodeSkipped` set misleading `startedAt` on never-started nodes | `SessionRepository.updateNodeSkipped` → removed `startedAt` |
| 4 | High | `skipDuplicates:true` silently drops skipped entries after pause+resume | `DatabaseListener` → `flushedNodeIds` Set tracks what's been written |
| 5 | Critical | `createNodeWaiting` crashes with unique constraint in liveUpdates mode | `SessionRepository.createNodeWaiting` → changed to `upsert` |
| 6 | Critical | `ctx.emit` was `void` — async DB errors silently swallowed | `types.ts` → emit typed as `Promise<void>`, `WorkflowExecutor` → proper return |
| 7 | High | `snapshot()` shallow clone — `$nodes`/`$results` were shared references | `VariableStore.snapshot()` → clones nested objects too |
| 8 | High | `indexOf` returns -1 silently restarts workflow from beginning | `WorkflowExecutor.resumeWithInput` → throws on -1 |
| 9 | High | `Math.min/max([])` returns `±Infinity`, corrupts downstream calculations | `DisplayHandler` → guards on empty array, throws descriptive error |
| 10 | Low | `updateNodeErrored` missing status guard — could overwrite WAITING row | `SessionRepository.updateNodeErrored` → added `status: "RUNNING"` |
| 11 | Critical | `skipSet` not persisted — DECISION branch skips lost after pause+resume | `types.ts` event + `DatabaseListener` + `SessionRepository.pauseSession` → stored in `metadata.skippedNodes`, restored in `continueExecution` |
| 12 | Medium | One failing listener blocked all subsequent listeners | `ExecutionEventEmitter.emit` → collect errors, run all listeners, rethrow first |

---

## 10. How to Add a New Node Type (exact steps)

```
1. Create: src/server/engine/handlers/YourHandler.ts

   export class YourHandler implements NodeHandler {
       readonly type = "YOUR_TYPE" as const;   ← must match CalcNodeType enum

       async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
           // read:  ctx.variables.get("key")
           // write: ctx.variables.set("key", value)
           // track: ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs)
           // eval:  ctx.evaluate(expr, ctx.variables.snapshot())
           // emit:  await ctx.emit({ type: "node:started", ... })  ← if needed

           return { kind: "completed", outputs: { ... }, result: { ... } };
       }
   }

2. Open bootstrap.ts:
   - import { YourHandler } from "./handlers/YourHandler";
   - registry.register(new YourHandler())          ← one line
   - Add "YOUR_TYPE" to EXPECTED_NODE_TYPES array  ← startup validation catches missing handlers

3. Done. Nothing else changes.
```

---

## 11. How to Add a New Side-Effect (e.g. Slack notification, webhook)

```
1. Create: src/server/engine/listeners/SlackListener.ts

   export class SlackListener {
       async handle(event: ExecutionEvent): Promise<void> {
           if (event.type === "session:completed") {
               await slack.post(`Workflow done: ${event.sessionId}`);
           }
       }
   }

2. Wire it up in WorkflowExecutor.continueExecution():
   const slackListener = new SlackListener(slackClient);
   emitter.on((e) => slackListener.handle(e));

3. Done. Zero changes to executor, handlers, or other listeners.
```

---

## 12. Data Flow: variables through a workflow

```
startExecution()
  │
  ├─ workflow.variables (DB defaults) → varStore
  ├─ initialValues (caller-provided) → varStore.merge()
  │
  └─ while loop:
       │
       INPUT node:
         fields = [{ key: "beam_width" }, { key: "load" }]
         allProvided? → yes (from initialValues) → collect → completed
         allProvided? → no → paused(awaiting_user_input)
         On resume → userInput merged into session.variables → varStore on next load
       │
       FORMULA node:
         evalScope = varStore.snapshot()     ← reads current state
         result = math.evaluate(expr, scope)
         varStore.set("moment", 42.3)        ← writes back
         varStore.trackNodeOutput(...)       ← updates $nodes/$results
       │
       DECISION node:
         condition evaluated against varStore.snapshot()
         branchTaken variables → varStore.merge()
         skipNodeIds → returned in sideEffects.skipNodes
         loop applies to skipSet
       │
       completeSession:
         varStore.snapshot() → stored in session.variables (DB)
         returned in ExecutionResult.variables (to caller)
```

---

## 13. Session State Machine

```
          startExecution()
                │
                ▼
           ┌─────────┐
           │ RUNNING │◄──────────────────────┐
           └────┬────┘                       │
                │                            │ resumeWithInput()
        ┌───────┼────────────┐               │
        ▼       ▼            ▼               │
   ┌────────┐ ┌──────┐ ┌──────────┐         │
   │ PAUSED │ │ERROR │ │COMPLETED │         │
   └────┬───┘ └──────┘ └──────────┘         │
        │                                   │
        ├───────────────────────────────────┘
        │
        └─► cancelExecution() → CANCELLED

Pause reasons:
  - awaiting_user_input    (INPUT node, fields not yet provided)
  - validation_error       (VALIDATION node with on_error: "pause")
  - background_transition  (API_CALL, PDF_REPORT etc. → handed to Inngest)
```

---

## 14. File Dependency Graph

```
bootstrap.ts
  └── imports all handlers + WorkflowExecutor + SessionRepository + NodeHandlerRegistry

WorkflowExecutor.ts
  ├── SessionRepository    (repo calls)
  ├── NodeHandlerRegistry  (handler dispatch)
  ├── ExecutionEventEmitter (event bus)
  ├── DatabaseListener     (wired as listener)
  ├── AuditListener        (wired as listener)
  ├── DefaultVariableStore (variable state)
  └── types.ts             (ExecutionContext, NodeOutcome, etc.)

Each handler:
  └── types.ts only (NodeHandler interface + ExecutionContext + NodeOutcome)
  └── optional: registry-resolver (Formula, LookupTable, Interpolation handlers)

DatabaseListener:
  └── SessionRepository + types.ts

AuditListener:
  └── audit-service + types.ts

SessionRepository:
  └── PrismaClient + types.ts (VariableContext, NodeExecutionLogEntry)

types.ts:
  └── @/generated/prisma (CalcNodeType, SessionStatus, Prisma namespace)
```

---

## 16. Step Mode — Node-by-Node Execution (n8n-style)

### What it does

Pauses after every successfully completed node and waits for an explicit
`stepForward()` call. Lets the caller inspect outputs and variables after
each node before advancing.

### New public methods

```
startExecution(id, actor, inputs, { stepMode: true })
  └─ runs first node → returns PAUSED(step_complete) + stepOutput

stepForward(sessionId)
  └─ advances one node → returns PAUSED(step_complete) or PAUSED(input needed)
     or COMPLETED or ERRORED

stepBack(sessionId, targetNodeId)
  └─ rewinds to a prior node → re-runs from there in stepMode
```

### State stored in session.metadata

```typescript
{
  stepPauseReason: "step_complete" | "awaiting_user_input" | ...,
  skippedNodes: string[]   // always present (Bug 11 fix)
}
```

`stepForward()` reads `stepPauseReason` to validate it won't advance past an
`awaiting_user_input` pause (which needs `resumeWithInput()` instead).

### Distinguishing pause types in the UI

`result.pauseReason` tells the frontend what to render:

```
"step_complete"         → show "Next ▶" button + stepOutput inspection panel
"awaiting_user_input"   → show input form (result.pausedNode.fields)
"validation_error"      → show validation errors + fix form
"background_transition" → show spinner (Inngest running)
```

### stepOutput shape

```typescript
stepOutput: {
    nodeId: string
    nodeLabel: string
    nodeType: string          // "FORMULA" | "DECISION" etc
    outputs: Record<string, unknown>   // what this node wrote to variables
    result: unknown           // full computation details
    durationMs: number
    stepNumber: number        // 0-based index in execution order
    totalSteps: number        // executionOrder.length
}
```

### Full step-through flow

```
startExecution(wfId, actor, inputs, { stepMode: true, liveUpdates: true })
  │
  ▼  FORMULA node runs
  PAUSED(step_complete)
  stepOutput: { nodeId: "f1", outputs: { moment: 42.3 }, stepNumber: 0, totalSteps: 8 }
  │
  stepForward(sessionId)
  │
  ▼  LOOKUP_TABLE node runs
  PAUSED(step_complete)
  stepOutput: { nodeId: "lt1", outputs: { factor: 1.2 }, stepNumber: 1 }
  │
  stepForward(sessionId)
  │
  ▼  INPUT node — fields not provided
  PAUSED(awaiting_user_input)
  pausedNode: { fields: [{ key: "load", label: "Applied Load" }] }
  │
  resumeWithInput(sessionId, "input-node-id", { load: 500 })
  │  ← note: NOT stepForward — INPUT needs data
  ▼
  PAUSED(step_complete)   ← INPUT node completed, stepMode kicks in again
  ...continues...
  │
  ▼
  COMPLETED
```

### stepBack flow

```
Currently paused at node index 5 (DISPLAY node)
User wants to re-run from FORMULA at index 2

stepBack(sessionId, "formula-node-id")
  │
  ├─ validates targetIdx (2) < currentIdx (5)
  ├─ repo.resetSessionToNode → status: RUNNING, currentIndex: 2, skipSet: []
  └─ continueExecution(sessionId, { stepMode: true })
       └─ runs FORMULA → PAUSED(step_complete) at index 2
```

**Note on stepBack + DECISION:** When stepping back past a DECISION node,
`skipSet` is intentionally cleared (reset to `[]`). The DECISION node
re-executes and re-populates `skipSet` via `sideEffects.skipNodes`.
This means previously-skipped nodes will be skipped again correctly
without needing to manually restore the old skip state.

### Combining stepMode with liveUpdates

```typescript
// Recommended for canvas debugging — every node highlights as it runs
const result = await executor.startExecution(wfId, actor, inputs, {
    stepMode: true,
    liveUpdates: true,
});
```

In this combination:

- Canvas shows RUNNING → COMPLETED highlight per node (liveUpdates)
- After each node the loop pauses and returns to the caller (stepMode)
- The caller decides when to advance — no auto-run

### What does NOT pause in stepMode

- **SKIPPED nodes** — decision branch skips pass through without pause
- **Structural nodes** (COMMENT, GROUP, REFERENCE_IMAGE) — always skipped silently
- **Nodes with no handler** — skipped silently

Only nodes that reach `case "completed"` in the switch trigger a stepMode pause.

| Question | Answer |
|----------|--------|
| Where are all DB calls? | `SessionRepository.ts` exclusively |
| Where is batch vs live branching? | `DatabaseListener.ts` exclusively |
| Where is audit logging? | `AuditListener.ts` exclusively |
| Where are node type registrations? | `bootstrap.ts` exclusively |
| Where does skipSet get populated? | `WorkflowExecutor` (reads `sideEffects.skipNodes` from `DecisionHandler`) |
| Where does skipSet get persisted? | `DatabaseListener.onSessionPaused` → `SessionRepository.pauseSession` → `metadata.skippedNodes` |
| Where does skipSet get restored? | `WorkflowExecutor.continueExecution` reads `session.metadata.skippedNodes` |
| Where is `$nodes` / `$results` populated? | `VariableStore.trackNodeOutput` — called by every handler |
| Where is `evaluateSafe` defined? | `WorkflowExecutor.ts` (standalone function, injected into ctx) |
| Where are handler-level errors caught? | `WorkflowExecutor` loop (try/catch around `handler.execute`) |
| Where are listener-level errors caught? | `ExecutionEventEmitter.emit` (runs all listeners, rethrows first error) |
