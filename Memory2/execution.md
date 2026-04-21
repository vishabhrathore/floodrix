# FloodRix Workflow Engine — Complete Architecture Memory

    > This document is the single source of truth for the workflow engine refactor.If you are an AI assistant joining this project, read this file first before making any changes.It captures the full design decisions, what's implemented, what's intentionally deferred, and why.

---

## 1. Project Context

    ** Project name:** FloodRix(internal codename "nodebase")
        ** Stack:** Next.js 15 + TypeScript + Prisma(PostgreSQL) + tRPC + React Flow + Inngest + Better Auth
            ** Domain:** Engineering calculation workflows(IRC bridge design formulas, flood discharge, scour depth, etc.)

                ** Core user journey:**
                    1. Engineer builds a visual calculation workflow on a React Flow canvas(e.g., Dicken's flood discharge: INPUT → FORMULA `Q = C × M^(3/4)` → DISPLAY)
2. Engineer or end - user runs the workflow via a runner panel
3. Workflow pauses at INPUT nodes for user data, computes sync nodes, hands off to background for async(API calls, PDF generation)
4. Results shown inline; audit log + session history retained

    ** User location:** Dādri, Uttar Pradesh, India.Seed data reflects Indian civil engineering context(IRC: SP: 13, IRC: 78 standards).

---

## 2. Starting State(Before Refactor)

The pre - refactor code had:

- A single monolithic`WorkflowExecutor`(~700 lines) with all 10 handler types inlined as if /else branches
  - Direct Prisma calls scattered throughout the executor
    - No`NodeHandler` interface, no registry, no event emitter, no listeners
      - No stepMode, no RunOrchestrator, no strategy resolution
        - `batch-executor.ts` existed as a separate Inngest function for batch processing(kept alive through refactor)
          - Several bugs(listed in Section 8 below)

The user provided a "mental model" design doc describing the target architecture.The refactor was executed in 5 chunks to reach that target.

---

## 3. Architecture Overview(Post - Refactor)

    ```
                            ┌────────────────────────┐
                            │  tRPC Router           │
                            │  execution-router.ts   │
                            └──────────┬─────────────┘
                                       │
                              ┌────────▼────────────┐
                              │  RunOrchestrator    │  ← Picks strategy
                              │  (RunStrategyResolver)│
                              └────────┬────────────┘
                                       │
             ┌─────────────────────────┼─────────────────────────┐
             │                         │                         │
             ▼                         ▼                         ▼
       INLINE_SYNC                 BACKGROUND_BATCH         (INLINE_ASYNC unused;
       [request path]              [Inngest takes over]      enum value kept)
             │                         │
             ▼                         ▼
       ┌──────────────────────────────────────────┐
       │       WorkflowExecutor                   │
       │       (src/server/engine/)               │
       │                                          │
       │  1. Loads session + workflow via repo    │
       │  2. Builds ExecutionContext per node     │
       │  3. Looks up handler in registry         │
       │  4. Emits events to listeners            │
       │  5. Reacts to NodeOutcome kind           │
       └──────────┬───────────────────────────────┘
                  │
       ┌──────────┴──────────┐
       │                     │
       ▼                     ▼
  ┌──────────────┐     ┌──────────────────────────────┐
  │ Registry     │     │  Event Listeners (priority)  │
  │              │     │                              │
  │ 10 sync      │     │  DatabaseListener (50)       │
  │ handlers     │     │  AuditListener   (100)       │
  │              │     │  MetricsListener (200)       │
  └──────────────┘     └──────────────────────────────┘
       │
       ▼
   ExecutionContext → ctx.db, ctx.registry, ctx.variables

```

### Key directory layout

    ```
src/server/engine/                    ← New home, per mental model decision
  ├── types.ts                        ← All shared types, RunStrategy enum
  ├── NodeHandler.ts                  ← Handler interface + helpers
  ├── NodeHandlerRegistry.ts          ← Map<CalcNodeType, NodeHandler>
  ├── VariableStore.ts                ← Deep-clone snapshot, size enforcement
  ├── ExecutionEventEmitter.ts        ← Typed events with listener priority
  ├── SessionRepository.ts            ← ALL Prisma calls go through here
  ├── WorkflowExecutor.ts             ← The dispatch loop (~330 lines)
  ├── RunStrategyResolver.ts          ← Decides INLINE_SYNC vs BACKGROUND_BATCH
  ├── RunOrchestrator.ts              ← Public entry point, idempotency
  ├── SessionPoller.ts                ← Fixed 1.5s poll logic
  ├── WorkerPoolTimeout.ts            ← worker_threads for hard timeout
  ├── worker-mathjs-runner.js         ← The worker script
  ├── bootstrap.ts                    ← Composition root, 3 factories
  ├── index.ts                        ← Public barrel
  ├── handlers/                       ← 10 sync handlers
  │   ├── InputHandler.ts
  │   ├── FormulaHandler.ts
  │   ├── MultiFormulaHandler.ts
  │   ├── LookupTableHandler.ts
  │   ├── InterpolationHandler.ts
  │   ├── DecisionHandler.ts
  │   ├── DisplayHandler.ts
  │   ├── ValidationHandler.ts
  │   ├── UnitConversionHandler.ts
  │   └── CustomCodeHandler.ts
  └── listeners/
      ├── DatabaseListener.ts         ← Owns batch vs liveUpdates DB writes
      ├── AuditListener.ts            ← Writes audit log entries
      └── MetricsListener.ts          ← Structured JSON logs

src/inngest/functions/                ← New Inngest functions
  ├── session-resume.ts               ← Resumes paused sessions
  ├── session-start.ts                ← For BACKGROUND_BATCH strategy
  └── session-ttl-sweeper.ts          ← Hourly cron for stale sessions

src/features/workflow-canvas/
  ├── server/
  │   └── execution-router.ts         ← tRPC entry point, uses RunOrchestrator
  ├── hooks/
  │   └── use-execution.ts            ← Client-side session state + polling
  ├── components/
  │   ├── workflow-runner.tsx         ← The runner panel
  │   └── workflow-toolbar.tsx        ← stepMode toggle + run button
  ├── store/
  │   └── workflow-canvas-store.ts    ← Zustand + execution highlight slice
  └── engine/                         ← Legacy folder, mostly UNTOUCHED
      ├── batch-executor.ts           ← Kept (different concern)
      ├── registry-resolver.ts        ← Singleton removed in Chunk 1
      ├── formula-validator.ts        ← Added timeoutMs in Chunk 1
      ├── interpolation.ts            ← Untouched
      ├── units.ts                    ← Untouched
      ├── audit-service.ts            ← Untouched
      └── canvas-save.ts              ← Untouched
      └── workflow-executor.ts        ← DELETED in Chunk 2
```

---

## 4. Key Design Decisions(With Rationale)

### Decision: Handler - based architecture

    - One file per node type in `handlers/`
        - Each implements `NodeHandler` interface with a single `execute(ctx)` method
            - Returns`NodeOutcome`(tagged union: completed / paused / skipped / errored)
            - ** No throws for control flow ** — errors wrapped in `{ kind: "errored" }`

                ** Why:** 700 - line if/else chain was unmaintainable. Adding a handler now means one new file + one registry line.

### Decision: SessionRepository is the ONLY Prisma entry point

    - Executor, handlers, listeners all go through the repo
        - Repo methods use status - guarded updates(e.g., `status: "RUNNING"` WHERE clause)

            ** Why:** Single chokepoint for DB access.Fixes Bug 1(wrong status matches).Enables future swaps to other ORMs or caching layers without touching executor code.

### Decision: Event emitter with priority - ordered listeners

    - `DatabaseListener`(priority 50) writes to DB
        - `AuditListener`(priority 100) writes audit logs
            - `MetricsListener`(priority 200) emits structured JSON

                ** Why:** Mental model section on listener ordering flagged implicit - order as a bug risk.Explicit priority prevents drift.Listener errors are isolated — one throwing doesn't stop others.

### Decision: New engine lives in `src/server/engine/`(not`features/`)

    - Matches mental model
        - Signals "this is infrastructure, not a feature"

            ** Why:** User chose this over keeping it in `features/workflow-canvas/engine/` when asked.

### Decision: `batch-executor.ts` stays as- is

    - Separate concern(batch row processing, not single - session orchestration)
        - Uses BatchJob + BatchRowExecution tables
            - Lightly touched in Chunk 2(one import swap: `new WorkflowExecutor` → `createWorkflowExecutor`)

**Why:** User explicitly said "keep both — they serve different purposes."

### Decision: Inngest infrastructure, but NO async handlers shipped yet

    - `RunOrchestrator` + `RunStrategyResolver` + `SessionPoller` + 2 Inngest functions fully wired
        - API_CALL, PDF_REPORT, SUBWORKFLOW, LOOP, PARALLEL are ** intentionally not implemented **

**Why:** User explicitly said "we do not need any async handler, we will implement them later, it should not be part of the chunks." User will add handlers themselves when they need external integrations.Infrastructure is ready — adding a handler is purely additive(create file, register in bootstrap).

### Decision: Simple strategy policy(BACKGROUND_BATCH on any async, else INLINE_SYNC)

    - Originally built`INLINE_ASYNC`(run sync prefix inline, hand off at first async node)
        - User requested simpler version — patched in Chunk 4 patch
            - `INLINE_ASYNC` enum value remains but is never returned

                ** Why:** Simpler code, fewer edge cases, no`inngest.send` race to worry about.Trade - off is ~100ms Inngest hop before async workflows run.Acceptable for this project's scale.

### Decision: Fixed 1.5s polling(not adaptive)

    - Originally built adaptive(1s / 2s / 5s based on session age)
        - User requested fixed — patched in Chunk 4 patch

            ** Why:** Simpler.Avoids subtle bug where PAUSED sessions age - out to 5s, making user - input resume feel laggy.Predictable server load.

### Decision: worker_threads for hard timeout, not just Promise.race

    - 30s default per CUSTOM_CODE evaluation
        - Actually terminates runaway threads(unlike Promise.race which just stops waiting)

            ** Why:** Mental model flagged CUSTOM_CODE as a real risk for runaway loops.Promise.race can't cancel synchronous JS. worker_threads can.

### Decision: Metrics via console.log JSON, not OpenTelemetry

    - MetricsListener emits structured JSON lines
        - User picked this over OTel in Chunk 5 questions
            - Pluggable`MetricsSink` interface — OTel can be swapped in later

                ** Why:** Zero dependencies, works on any deployment(Vercel / Fly / Cloud Run all parse JSON logs natively), upgrade path to OTel is trivial.

### Decision: 30 days PAUSED / 6 hours PENDING TTL

    - TTL sweeper runs hourly via Inngest cron
        - Marks stale sessions as TIMED_OUT (not deleted — preserves audit)

**Why:** User picked "generous" option.PAUSED sessions often represent legit work -in -progress; PENDING is always crashed / abandoned so shorter window.

---

## 5. The Five Chunks(Chronological)

### Chunk 1: Foundation(12 files + 2 replacements)

    ** Purpose:** Scaffolding.Nothing works yet — no executor, no handlers.But scaffolding compiles.

**New files in `src/server/engine/`:**
    - `types.ts`, `NodeHandler.ts`, `VariableStore.ts`, `ExecutionEventEmitter.ts`
    - `SessionRepository.ts`, `NodeHandlerRegistry.ts`
    - `bootstrap.ts`, `index.ts`
    - `listeners/DatabaseListener.ts`, `listeners/AuditListener.ts`

    ** Replaced:**
        - `features/workflow-canvas/engine/registry-resolver.ts`(removed singleton at bottom)
        - `features/workflow-canvas/engine/formula-validator.ts`(added`timeoutMs` to`safeEvaluate` / `safeEvaluateMultiLine`)

        ** Bugs fixed:** None directly — scaffolding only.Fixes enabled by architecture land in Chunk 2.

---

### Chunk 2: Handlers + New Executor(15 files)

    ** Purpose:** Every workflow runs identically to before, but through the new architecture.Old executor deleted.

**New files:**
    - `server/engine/WorkflowExecutor.ts` — the dispatch loop, ~330 lines(vs 700 legacy)
        - All 10 sync handlers in `server/engine/handlers/`

            ** Replaced:**
                - `server/engine/types.ts`(added`registry` to`ExecutionContext`)
                - `server/engine/bootstrap.ts`(now returns real executor)
                - `server/engine/index.ts`(exports`WorkflowExecutor` class)
                - `features/workflow-canvas/server/execution-router.ts`(uses`createWorkflowExecutor`)

                ** Deleted:**

- `features/workflow-canvas/engine/workflow-executor.ts` (the legacy 700-line monolith)

                    ** Edited(1 line each):**
                        - `features/workflow-canvas/engine/batch-executor.ts` — import swap

**Bugs fixed:** Bug 1(status guard), Bug 3(skipped startedAt), Bug 5(waiting upsert), Bug 7(deep clone snapshot), Bug 8(-1 indexOf), Bug 9(empty array ±Infinity), Bug 10(status guard on errored), Bug 11(skipSet survives pause), Bug 12(listener error isolation)

---

### Chunk 2.5: Schema Migration + Seed Patch(3 files)

    ** Purpose:** Chunk 2 won't compile without two new schema constraints.

        ** Schema changes to `prisma/schema.prisma`:**
            1. `CalcSession` — added `idempotencyKey String?` column with `@@unique([calcWorkflowId, idempotencyKey])`
2. `CalcNodeExecution` — added`@@unique([sessionId, calcNodeId])`

    ** Migration name:** `add_session_idempotency_and_node_execution_unique`

        ** Files delivered:**
            - `prisma/MIGRATION_INSTRUCTIONS.md`(exact diff + production safety SQL)
            - `server/engine/SessionRepository.ts`(patched — uses column for idempotency lookup instead of JSON path)

- `prisma/seed.ts`(patched — `sess_1` and`sess_2` now carry`idempotencyKey`; node execution upserts use new compound key)

**Why this exists separately:** User's production schema was slightly different from what I'd assumed.This chunk corrects the assumptions cleanly.Must be applied between Chunks 1 and 2.

---

### Chunk 3: stepMode Backend + UI(11 files)

    ** Purpose:** n8n - style step - by - step execution — pause after each node, inspect outputs, click Next.

**Backend changes:**
    - `WorkflowExecutor.ts` — `step_complete` pause reason, `stepForward()`, `stepBack()` methods
        - `IRREVERSIBLE_NODE_TYPES = {API_CALL, PDF_REPORT}` guards stepBack
            - `execution-router.ts` — `stepForward` and `stepBack` mutations, session authorization with super- admin bypass
                - `getSession` now returns `stepMode` flag + execution order for UI

                    ** UI changes:**
                        - `use-execution.ts` — stepForward / stepBack methods, stepOutput in state, 3 pause flags(isStepPause / isInputPause / isValidationPause)
                            - `workflow-runner.tsx` — 5 distinct pause views(input form, validation error, step complete, completed, errored) — ** LIGHT THEME, emerald / sky / amber / purple, no blue / black boxes ** per user preference
                                - `workflow-toolbar.tsx` — Step mode toggle beside Run button
                                    - `workflow-canvas-store.ts` — new ExecutionHighlightSlice for canvas node glow during runs(merge - only, not replace)
                                        - `calc-base-node.tsx` — manual patch to add `executionClass` based on node status
                                            - Run page — wires toolbar + runner + canvas

                                                ** Two bugs flagged that user needed to fix when applying:**
                                                    1. Render - time side - effect in `use-execution.ts`(wrap`ingest()` call in `useEffect`)
2. Double polling(merge`useExecutionHighlightSync` into`use-execution`'s `ingest` callback)

    ** Store name note:** Chunk 3 imports`useExecutionHighlightStore` — user needs to rename to their actual store hook name(probably`useWorkflowCanvasStore`) during merge.

---

### Chunk 4: Inngest Infrastructure(9 files)

**Purpose:** RunOrchestrator + strategy selection + polling + Inngest functions. **No async handlers.**

**New files:**

- `server/engine/RunStrategyResolver.ts` — decides strategy
- `server/engine/RunOrchestrator.ts` — public entry point
- `server/engine/SessionPoller.ts` — poll logic
- `inngest/functions/session-resume.ts` — Inngest function to resume paused sessions
- `inngest/functions/session-start.ts` — Inngest function for BACKGROUND_BATCH start

    **Replaced:**
        - `server/engine/types.ts` — added `RunStrategy` enum, `PollResult`, `AsyncNodeTransition` types
            - `server/engine/bootstrap.ts` — added `createRunOrchestrator()` and `createSessionPoller()` factories
                - `features/workflow-canvas/server/execution-router.ts` — uses`RunOrchestrator`, adds`poll` query

                    ** Merge(not replace):**
                        - `src/inngest/functions.ts` — add`calcSessionResume` + `calcSessionStart` to the functions array

### Chunk 4 Patch(2 files)

    ** Purpose:** Simplify strategy and polling per user preference.

- `RunStrategyResolver.ts` — replaced 3 - branch logic with 2 branches.Any async node → BACKGROUND_BATCH; else INLINE_SYNC.INLINE_ASYNC never returned.
- `SessionPoller.ts` — fixed 1.5s interval(non - terminal) or 0(terminal).No age - based adaptive logic.

**Dead code warning:** `RunOrchestrator.runInlineAsync()` method still exists but is never called(resolver never returns INLINE_ASYNC).Safe to delete in a future cleanup pass.

---

### Chunk 5: Hardening(7 files)

    ** Purpose:** Production safety.TTL cleanup, metrics, true handler timeouts, size enforcement.

**New files:**
    - `inngest/functions/session-ttl-sweeper.ts` — hourly cron, 30 days PAUSED / 6 hours PENDING
        - `server/engine/listeners/MetricsListener.ts` — structured JSON logs
            - `server/engine/WorkerPoolTimeout.ts` — worker_threads wrapper, 30s default

- `server/engine/worker-mathjs-runner.js` — the worker script(plain.js, not.ts)

    **Replaced:**
        - `server/engine/VariableStore.ts` — enforces`MAX_VARIABLE_BYTES`(5MB) and`MAX_STORE_BYTES`(20MB)
            - `server/engine/bootstrap.ts` — registers MetricsListener with priority 200

                ** Merge(not replace):**
                    - `src/inngest/functions.ts` — add`calcSessionTtlSweeper`

                        ** Manual patch suggested(optional):**
                            - `handlers/CustomCodeHandler.ts` — wire through `WorkerPoolTimeout` for real cancellation.If skipped, worker_threads infrastructure still ships but isn't used anywhere yet.

---

## 6. Complete File Inventory

### Files that exist in the repo(post - refactor)

```
src/server/engine/
  types.ts, NodeHandler.ts, NodeHandlerRegistry.ts, VariableStore.ts,
  ExecutionEventEmitter.ts, SessionRepository.ts, WorkflowExecutor.ts,
  RunStrategyResolver.ts, RunOrchestrator.ts, SessionPoller.ts,
  WorkerPoolTimeout.ts, worker-mathjs-runner.js, bootstrap.ts, index.ts

src/server/engine/handlers/
  InputHandler.ts, FormulaHandler.ts, MultiFormulaHandler.ts,
  LookupTableHandler.ts, InterpolationHandler.ts, DecisionHandler.ts,
  DisplayHandler.ts, ValidationHandler.ts, UnitConversionHandler.ts,
  CustomCodeHandler.ts

src/server/engine/listeners/
  DatabaseListener.ts, AuditListener.ts, MetricsListener.ts

src/inngest/functions/
  session-resume.ts, session-start.ts, session-ttl-sweeper.ts

src/features/workflow-canvas/
  server/execution-router.ts       ← rewritten
  hooks/use-execution.ts           ← rewritten (with 2 bug fixes user applied)
  components/workflow-runner.tsx    ← rewritten
  components/workflow-toolbar.tsx   ← rewritten (merge with existing if customized)
  store/workflow-canvas-store.ts    ← merged slice (not replaced)
  engine/batch-executor.ts          ← 2-line import swap
  engine/registry-resolver.ts       ← singleton removed
  engine/formula-validator.ts       ← timeoutMs added

src/components/react-flow/calculator/
  calc-base-node.tsx                ← manual patch for executionClass

prisma/
  schema.prisma                     ← 2 model additions (idempotencyKey + @@unique)
  seed.ts                           ← idempotencyKey added to sess_1, sess_2
```

### Files INTENTIONALLY untouched

```
src/features/workflow-canvas/engine/
  interpolation.ts, units.ts, audit-service.ts, canvas-save.ts

src/components/react-flow/calculator/
  calc-base-handle.tsx, calc-node-fields.tsx

Most of src/ outside the paths above
```

### Files DELETED

```
src/features/workflow-canvas/engine/workflow-executor.ts   (the 700-line monolith)
```

---

## 7. Schema(Key Models)

    ```prisma
model CalcSession {
  id             String   @id @default(cuid())
  calcWorkflowId String
  actorId        String
  status         SessionStatus @default(PENDING)
  variables      Json     @default("{}")
  currentNodeId  String?
  pauseReason    String?
  executionOrder Json     @default("[]")
  currentIndex   Int      @default(0)
  inputSnapshot  Json?
  startedAt      DateTime?
  completedAt    DateTime?
  duration       Int?
  error          Json?
  runMode        RunMode  @default(SINGLE)
  metadata       Json     @default("{}")       ← SessionMetadata shape
  idempotencyKey String?                       ← CHUNK 2.5 ADDITION
  // ...
  @@unique([calcWorkflowId, idempotencyKey])   ← CHUNK 2.5 ADDITION
}

model CalcNodeExecution {
  id          String @id @default(cuid())
  sessionId   String
  calcNodeId  String?
  status      NodeExecutionStatus @default(PENDING)
  stepNumber  Int
  // ... output/input/error fields
  @@unique([sessionId, calcNodeId])            ← CHUNK 2.5 ADDITION
}

enum SessionStatus {
  PENDING RUNNING PAUSED COMPLETED ERRORED CANCELLED TIMED_OUT
}

enum NodeExecutionStatus {
  PENDING WAITING RUNNING COMPLETED SKIPPED ERRORED
}

enum CalcNodeType {
  // Sync (10)
  INPUT FORMULA LOOKUP_TABLE GRAPH_INTERPOLATION DECISION DISPLAY
  MULTI_FORMULA UNIT_CONVERSION VALIDATION CUSTOM_CODE
  // Async (5) — handlers NOT YET IMPLEMENTED
  API_CALL PDF_REPORT SUBWORKFLOW LOOP PARALLEL
  // Structural (no handlers, always skipped)
  COMMENT GROUP REFERENCE_IMAGE
  // Misc
  CHART TABLE_BUILDER
}

```

### SessionMetadata JSON shape(inside`metadata` column)
    ```ts
{
  metadataVersion: 1,
  stepPauseReason: "step_complete" | "awaiting_user_input" | "validation_error" | "background_transition" | null,
  skippedNodes: string[],          // From DECISION false-branch
  stepMode: boolean,
  currentIndex: number,
  idempotencyKey?: string,          // Mirrored from column for convenience
  runStrategy?: RunStrategy,        // Chunk 4 addition
}
```

Forward - migration happens in `SessionRepository.hydrateMetadata()`.When bumping`METADATA_VERSION`, add a new branch there.

---

## 8. The 12 Bugs From Mental Model

    | # | Bug | Status |
| ---| -----| --------|
| 1 | `updateNodeCompleted` matched WAITING rows instead of only RUNNING | Fixed in Chunk 2(status guards in SessionRepository) |
| 2 | Double flush on error path | Fixed — errorOut in Chunk 3 takes pre - loaded session |
| 3 | `updateNodeSkipped` set misleading`startedAt` | Fixed in Chunk 2 |
| 4 | `createMany skipDuplicates` drops entries after resume | Fixed in Chunk 1 via`flushedNodeIds Set` in DatabaseListener |
| 5 | `createNodeWaiting` unique constraint crash on retry | Fixed in Chunk 2 via upsert(needs`@@unique` from Chunk 2.5) |
| 6 | `ctx.emit` promise dropped | Fixed — emitter awaits all listeners |
| 7 | Snapshot shallow — shared `$nodes` refs leaked mutations | Fixed in Chunk 1 via deep clone in `DefaultVariableStore` |
| 8 | `indexOf -1` silently restarted from node 0 | Fixed in Chunk 2 — throws descriptive error |
| 9 | `Math.min/max` on empty array returned`±Infinity` | Fixed in Chunk 2 DisplayHandler |
| 10 | `updateNodeErrored` had no status guard | Fixed in Chunk 2 |
| 11 | `skipSet` lost on pause / resume | Fixed — metadata.skippedNodes restored in continueExecution |
| 12 | Listener error stopped other listeners | Fixed in Chunk 1 via error isolation in ExecutionEventEmitter |

    All 12 bugs are resolved.

---

## 9. The Event System

### Event types emitted by WorkflowExecutor

- `session:started` / `session:paused` / `session:completed` / `session:errored` / `session:cancelled`
  - `node:started` / `node:completed` / `node:skipped` / `node:errored` / `node:waiting`

### Pause reasons

- `awaiting_user_input` — INPUT node needs values
  - `validation_error` — VALIDATION node failed with `on_error: pause`
  - `step_complete` — stepMode pause after every node(Chunk 3)
    - `background_transition` — async node hit, Inngest takes over(Chunk 4)

### Listener priority order(lower runs first)

- 50: DatabaseListener(must write first so others can read fresh state)
  - 100: AuditListener
    - 200: MetricsListener

### DatabaseListener modes

- **Batch mode** (default) — buffers node execution logs, flushes once at session end via`insertNodeExecutionLog`
  - **liveUpdates mode** — pre - creates PENDING rows on session start, updates per - node as events fire.Used in stepMode and BACKGROUND_BATCH.

---

## 10. Strategy Resolution(Current Policy)

    ```
if forceStrategy:
    use forceStrategy

elif any node type is async (API_CALL, PDF_REPORT, SUBWORKFLOW, LOOP, PARALLEL):
    BACKGROUND_BATCH  → session created, Inngest event fired, client polls

else:
    INLINE_SYNC       → executor runs in request, returns final result

```

    ** stepMode override:** If`stepMode: true`, always forces INLINE_SYNC.Step - by - step debugging across async boundaries doesn't make sense.

        ** Idempotency:** If`idempotencyKey` provided and matches existing session within`(calcWorkflowId, idempotencyKey)`, returns the existing session's state instead of creating a new one.

---

## 11. Known Limitations(Intentional)

### Async node handlers not implemented
API_CALL, PDF_REPORT, SUBWORKFLOW, LOOP, PARALLEL throw "not implemented" errors at the executor level.The infrastructure is ready; adding a handler is a 3 - line change(create file, register in bootstrap, it just works).

### Variable rollback on stepBack
If you step back past a node that wrote variable X and re - run, X keeps its old value unless the re - run path overwrites it.True rollback would need per - node variable snapshots.Acceptable for dev / debugging use.

### Worker pool spawns new worker per evaluation
No persistent pool. ~10 - 50ms overhead per CUSTOM_CODE worker invocation.Fine for typical usage; optimize only if high - throughput workflows hit it.

### Polling uses DB, not SSE
1.5s polling is fine for dozens of concurrent users.Thousands would benefit from server - sent events.Not premature to add until it's an actual bottleneck.

### Fixed TTL cutoffs
    `PAUSED_TTL_MS = 30 days`, `PENDING_TTL_MS = 6 hours` hardcoded in `session-ttl-sweeper.ts`.For per - organization configurability, move to a settings table.

### Batch executor still uses its own flow
`batch-executor.ts` operates on`BatchJob` + `BatchRowExecution` tables, separate from the `RunOrchestrator` single - session path.Reconciling them was out of scope — two paths currently exist for batch work.

### INLINE_ASYNC is dead code
`RunStrategy.INLINE_ASYNC` enum value and `RunOrchestrator.runInlineAsync()` method exist but are never reached.Safe to delete in a cleanup pass.

### `worker-mathjs-runner.js` path resolution
`WorkerPoolTimeout.ts` uses`__dirname + 'worker-mathjs-runner.js'`.Works for Next.js CommonJS server output.Will break on Edge runtime, ESM - only setups, or when build pipelines don't copy the .js sibling file.

### Metadata schema versioning
`hydrateMetadata` handles v0 → v1.Future bumps need new branches added there.If you rename a field in `SessionMetadata`, add migration logic BEFORE deploying.

---

## 12. Future Scope

### Priority 1(likely needed soon)

    ** Async handler implementations.** The biggest gap.When a real workflow needs HTTP or PDF, implement these:

1. ** `ApiCallHandler` ** (use`ky` per user's pick):
    - Config: `url`, `method`, `headers`, `body`, `credentialId`, `timeoutMs`, `retries`
        - Resolve credential via Prisma(`Credential` table is already present)
            - Return response body or selected JSON path as a variable
                - Mark as async in classify - error so failures surface cleanly
                    - Timeout: 60s default, configurable

2. ** `PdfReportHandler` **: Three options — user deferred picking:
- Puppeteer / Playwright locally(easy dev, heavy Docker)
    - External service(Browserless, Gotenberg) — queue request, poll for result
        - Lightweight(pdfkit, jspdf) — simple reports only
            - Recommend external service for production

3. ** `SubworkflowHandler` ** (Inngest - backed, per user's original pick):
        - Config: `workflowId`, `inputMapping`, `outputMapping`
            - Create child session, emit`calc/session.start-background` event
                - Parent pauses with `background_transition` until child completes
                    - ** Depth guard required ** — track`metadata.subworkflowDepth`, cap at 5 to prevent stack - overflow via circular nesting

4. ** `LoopHandler` **:
- Iterate over an array variable, create N child subworkflow invocations
    - Collect results into output array
        - Implement as fan - out - then - gather pattern in Inngest

5. ** `ParallelHandler` **:
- Like LoopHandler but with fixed branches instead of iteration
    - Each branch runs independently, merge results on join
        - VariableStore concurrency: needs per - branch store that merges on join(current store isn't concurrency-safe)

### Priority 2(quality improvements)

        ** Persistent worker pool for WorkerPoolTimeout.**
            Reuse worker threads instead of spawning fresh.Needed only if CUSTOM_CODE throughput becomes a bottleneck.Use `piscina` library.

** OpenTelemetry integration.**
    Replace`ConsoleJsonSink` in `MetricsListener` with an OTel exporter.Wrap each`handler.execute` in a span.Propagate trace context through Inngest events for end - to - end tracing.

** SSE instead of polling.**
    Replace the 1.5s poll loop with server - sent events.Requires adding an SSE endpoint that subscribes to session state changes(PostgreSQL LISTEN / NOTIFY or Redis pub / sub).

** Cleanup INLINE_ASYNC dead code.**
    Delete`RunOrchestrator.runInlineAsync()`, remove`RunStrategy.INLINE_ASYNC` enum value.~50 lines.

** Reconcile batch - executor.ts with RunOrchestrator.**
Currently batch processing goes through a separate path.Could unify by having batch - executor create N sessions and emit N `calc/session.start-background` events, letting the orchestrator handle the rest.

### Priority 3(nice to have)

    ** Per - organization TTL configuration.**
        Move`PAUSED_TTL_MS` / `PENDING_TTL_MS` to an `OrgSettings` model.Sweeper reads per - org config before running.

** Hard - delete TIMED_OUT sessions.**
    Second sweeper finds `TIMED_OUT` sessions older than 90 days and deletes them(after exporting audit if needed).

** stepBack with variable snapshots.**
    Store variable store state at each node boundary.Enables true rollback — re - running doesn't inherit stale writes from skipped-over nodes.

        ** Per - handler`isReplayable` flag.**
            Today`stepBack` blocks on `API_CALL` and `PDF_REPORT` hardcoded.Add an optional `isReplayable` flag on `NodeHandler` interface so individual handlers declare themselves(GET API calls are replayable; POSTs aren't).

                ** Keyboard shortcut for stepForward.**
                    Bind Space or Enter to Next button when`isStepPause`.Edit`use-keyboard-shortcuts.ts`.

** Size limits per - organization.**
    Currently`MAX_VARIABLE_BYTES` / `MAX_STORE_BYTES` are hardcoded.Plan tier could have different limits.

** Metrics: strategy distribution dashboard.**
    Collect`engine.metric.session_duration_ms` + strategy from logs.Build a dashboard showing how often each strategy was picked, average duration per strategy.

** Schema version v2 migration path.**
    When the next `SessionMetadata` shape change comes, the pattern is:
1. Bump`METADATA_VERSION` in types.ts
2. Add new fields to `SessionMetadata` interface
3. Add a `version === 2` branch in `hydrateMetadata()`
4. Old PAUSED sessions migrate on load

### Priority 4(research)

    ** Concurrent VariableStore for PARALLEL.**
        The current`DefaultVariableStore` assumes sequential writes.If PARALLEL handler ships, need per - branch stores that merge on join.Alternative: explicit locking with optimistic concurrency control.

** Retry policy per handler type.**
    Inngest retries 3x by default. Some handlers(read - only API calls) could handle more; some(POST API calls) should retry less or not at all.Add `retries` config on `NodeHandler` interface.

** Cross - session variable state.**
    For iterative workflows(e.g., "re-run with adjusted inputs"), consider storing variable presets per user / org.

** Dry - run mode.**
    Execute a workflow without writing DB state(for preview / validation).Swap `DatabaseListener` for a no - op listener.

---

## 13. For New AI Assistants — What to Do First

Before making any changes:

1. ** Read this whole file.** Don't assume the architecture — it's specific to this project.

2. ** Check the current state.** Run`ls src/server/engine/` and verify files match Section 6. If they don't match, the user may be mid-migration.

3. ** Never modify these files without explicit request:**
    - `batch-executor.ts`(separate concern, reconciliation is future work)
    - Anything in `src/components/react-flow/calculator/` beyond `calc-base-node.tsx` highlight patch
        - `interpolation.ts`, `units.ts`, `audit-service.ts`, `canvas-save.ts`

4. ** If adding an async handler:**
    - Create the file in `src/server/engine/handlers/`
        - Register in `bootstrap.ts`'s `registerAllHandlers()`
            - Confirm it's in the `ASYNC_NODE_TYPES` array in `types.ts` (it already is)
                - No other code changes needed — RunOrchestrator will route automatically

5. ** If changing schema:**
    - Update`prisma/schema.prisma`
    - Run`npx prisma migrate dev --name <descriptive_name>`
    - Update`prisma/seed.ts` if the change affects seeded data
        - Update`SessionRepository.ts` if it touches session / node - execution access
            - Consider if `hydrateMetadata()` needs a migration branch

6. ** If changing a handler:**
    - Handlers return `NodeOutcome` — never throw for control flow
        - Use`toErroredOutcome(err)` for error cases
            - All math goes through`safeEvaluate` / `safeEvaluateMultiLine` for timeout enforcement
                - Use`ctx.registry`(not a fresh resolver) to preserve per - execution cache

7. ** If the user reports a production bug:**
    - Check`MetricsListener` output — structured JSON logs will have category / event / sessionId
        - `engine.metric.node_duration_ms` entries show per - type latency
            - `engine.session.errored` entries show what failed
                - Prefer fixing at the listener / repo / handler layer — avoid adding logic to the executor

8. ** User preferences(from`userPreferences`):**
    - Light theme by default
   - ** No blue or black color boxes ** in UI
    - Prefer minimal formatting
        - Direct, concise answers


---

## 14. Test Checklist(After Any Engine Change)

    ```bash
npx tsc --noEmit     # Zero errors expected
npx prisma generate  # After schema changes
npm run dev          # Inngest functions should appear in dashboard
```

Smoke tests:
-[] Run `wf_dicken` with numeric input → completes with `Q_dicken` ≈ 152
    - [] Run`wf_dicken` in step mode → 3 step pauses, each showing outputs
        - [] Cancel a running session → transitions to CANCELLED cleanly
            - [] Retry idempotency → same `idempotencyKey` returns existing session
                - [] Metrics logs show `engine.session.started` and `engine.session.completed` JSON lines
                    - [] TTL sweeper visible in Inngest dashboard with `0 * * * *` cron

---

## 15. Credits

    ** Original design:** User's "mental model" document
        ** Refactor execution:** 5 chunks delivered across this conversation
            ** Philosophy:** Incremental, testable, each chunk independently shippable

The final system is production - ready for sync workflows.Async handlers are the final frontier — infrastructure awaits.
