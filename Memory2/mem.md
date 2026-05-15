# FloodRix Workflow Engine — Handoff Memory

This document is the complete context for the workflow engine refactor done across Chunks 1 through 5. If you're another AI picking this up, read this end-to-end before touching any code.

---

## 1. Project at a glance

**Name:** FloodRix / nodebase
**Stack:** Next.js 15 (App Router) · Prisma · tRPC · React Flow · Zustand · TanStack Query · Better Auth · Inngest · Tailwind + shadcn
**Domain:** Engineering calculation workflows — IRC bridge design formulas (Dicken's flood discharge, Ryves formula, scour depth, etc.) plus automation nodes
**Path aliases:** `@/*` → `./src/*`
**Location preference:** server engine lives at `src/server/engine/`, not `src/features/workflow-canvas/engine/` (that folder still contains auxiliary utilities like `formula-validator.ts`, `registry-resolver.ts`, `interpolation.ts`, `units.ts`, `batch-executor.ts`, `audit-service.ts`, `canvas-save.ts`)
**User preferences:** Light theme UI by default, no blue/black boxes (use emerald/sky/amber/purple/neutral instead)

---

## 2. The refactor in one paragraph

The original `WorkflowExecutor` was a 700-line class with all 10 node type behaviors inlined in one `if/else` chain inside `continueExecution`. DB writes were scattered across the executor, error paths were duplicated 10 times, and nothing supported step-by-step debugging, idempotency, or background execution. We refactored into a handler-based architecture with a clean executor (~330 lines), one handler file per node type, a repository layer for all Prisma calls, an event emitter for side effects, and an orchestrator that picks execution strategy. Then we added step-by-step UI, Inngest for long-running jobs, and production hardening (TTL cleanup, metrics, true timeouts, size limits).

---

## 3. Architecture (post-refactor)

```
┌─────────────────────────────────────────────────────────────┐
│                     tRPC router                             │
│   src/features/workflow-canvas/server/execution-router.ts   │
│     startRun / stepForward / stepBack / poll / cancel /     │
│     submitInput / getSession / getHistory / rerun           │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ↓                             ↓
    ┌───────────────────────┐    ┌──────────────────────┐
    │   RunOrchestrator     │    │    SessionPoller     │
    │  picks strategy,      │    │   reads session +    │
    │  handles idempotency, │    │   returns PollResult │
    │  dispatches to Inngest│    │   with 1.5s interval │
    └────────┬──────────────┘    └──────────┬───────────┘
             │                              │
             ↓                              │
    ┌────────────────────────┐              │
    │ RunStrategyResolver    │              │
    │  any async node →      │              │
    │    BACKGROUND_BATCH    │              │
    │  else → INLINE_SYNC    │              │
    └────────────────────────┘              │
             │                              │
             ↓                              │
    ┌─────────────────────────────┐         │
    │      WorkflowExecutor       │         │
    │   (dispatch loop, ~330 LOC) │         │
    └─┬──────────┬──────────┬─────┘         │
      │          │          │               │
      ↓          ↓          ↓               │
  NodeHandler   Event     Session           │
  Registry    Emitter     Repo──────────────┘
      │          │          │
      ↓          ↓          ↓
  10 sync    Database    Prisma
  handlers   + Audit     (CalcSession,
  (1 file    + Metrics    CalcNodeExecution,
  each)      listeners    CalcWorkflow, etc.)

Inngest side (for async / background):
  calc/session.resume       → src/inngest/functions/session-resume.ts
  calc/session.start-background → src/inngest/functions/session-start.ts
  (cron) session-ttl-sweeper   → src/inngest/functions/session-ttl-sweeper.ts
```

### Key design decisions

1. **NodeOutcome is a discriminated union.** Handlers never throw for control flow. They return `{ kind: "completed" | "paused" | "skipped" | "errored" }`. The executor reacts to the shape. This makes error handling uniform and testable.

2. **SessionRepository is the only Prisma chokepoint** for session/node-execution operations. Handlers and the executor never touch Prisma directly. One file owns the entire DB surface area of the engine.

3. **ExecutionContext is per-node.** A fresh `ctx` is built for every node dispatch. Handlers must not capture it. Contains `node`, `edges`, `variables`, `db`, `registry`, `sessionId`, `workflowId`, `actorId`, `isBackgroundRun`.

4. **Events drive side effects.** The executor emits events (`session:started`, `node:completed`, `session:paused`, etc.). Three listeners subscribe: `DatabaseListener` (writes node execution rows), `AuditListener` (writes audit log entries), `MetricsListener` (structured JSON logs). Listeners can fail independently — one listener's exception doesn't stop others (Bug 12 fix).

5. **Session metadata is versioned JSON.** `CalcSession.metadata` holds `stepMode`, `skippedNodes`, `stepPauseReason`, `idempotencyKey`, `runStrategy`, `metadataVersion`. Currently version 1. Future shape changes must add a forward-migration case in `hydrateMetadata()` in `SessionRepository.ts`.

6. **Strategy policy is simple.** Workflow contains ANY async node → `BACKGROUND_BATCH` (full Inngest handoff from the start). All sync → `INLINE_SYNC` (run in request path). `INLINE_ASYNC` enum value exists but is never returned by the resolver — kept for possible future use.

7. **Polling is fixed-interval.** 1500ms while session is non-terminal, 0 (stop polling) when terminal.

---

## 4. File inventory (complete)

### `src/server/engine/` (new)

| File                                | Owns                                                       | Changed in chunks |
| ----------------------------------- | ---------------------------------------------------------- | ----------------- |
| `types.ts`                          | All shared types, enums, constants                         | 1, 2, 4           |
| `NodeHandler.ts`                    | Handler interface, `toErroredOutcome`, `classifyError`     | 1                 |
| `NodeHandlerRegistry.ts`            | Handler lookup + validation                                | 1                 |
| `VariableStore.ts`                  | Store impl, deep-clone snapshot, size limits               | 1, 5              |
| `ExecutionEventEmitter.ts`          | Typed event bus with priority + error isolation            | 1                 |
| `SessionRepository.ts`              | All Prisma session/node-execution calls                    | 1, 2.5            |
| `WorkflowExecutor.ts`               | Dispatch loop, stepForward, stepBack, errorOut             | 2, 3              |
| `RunStrategyResolver.ts`            | Picks INLINE_SYNC / BACKGROUND_BATCH                       | 4 (patched)       |
| `RunOrchestrator.ts`                | API entry point, idempotency, Inngest handoff              | 4                 |
| `SessionPoller.ts`                  | Returns `PollResult` for poll endpoint                     | 4 (patched)       |
| `WorkerPoolTimeout.ts`              | `worker_threads` wrapper for true cancellation             | 5                 |
| `worker-mathjs-runner.js`           | Worker script (plain .js, not .ts)                         | 5                 |
| `bootstrap.ts`                      | Three factories: executor, orchestrator, poller            | 1, 2, 4, 5        |
| `index.ts`                          | Public barrel                                              | 1, 2              |
| `handlers/InputHandler.ts`          | INPUT nodes — collects user values, pauses if missing      | 2                 |
| `handlers/FormulaHandler.ts`        | FORMULA — registry-sourced or inline mathjs                | 2                 |
| `handlers/MultiFormulaHandler.ts`   | MULTI_FORMULA — sequential formulas sharing scope          | 2                 |
| `handlers/LookupTableHandler.ts`    | LOOKUP_TABLE — range/exact/multi-key + fallback modes      | 2                 |
| `handlers/InterpolationHandler.ts`  | GRAPH_INTERPOLATION — delegates to `interpolate()`         | 2                 |
| `handlers/DecisionHandler.ts`       | DECISION — conservative skip-set BFS                       | 2                 |
| `handlers/DisplayHandler.ts`        | DISPLAY — max/min/average/custom with IRC Article-6 rule   | 2                 |
| `handlers/ValidationHandler.ts`     | VALIDATION — pause/error/warn modes                        | 2                 |
| `handlers/UnitConversionHandler.ts` | UNIT_CONVERSION — registry-based or custom expression      | 2                 |
| `handlers/CustomCodeHandler.ts`     | CUSTOM_CODE — mathjs multi-line; SYNC despite name         | 2                 |
| `listeners/DatabaseListener.ts`     | Writes node execution rows (batch vs liveUpdates branches) | 1                 |
| `listeners/AuditListener.ts`        | Writes audit log entries (session lifecycle only)          | 1                 |
| `listeners/MetricsListener.ts`      | Structured JSON console logs for observability             | 5                 |

### `src/features/workflow-canvas/engine/` (existing, lightly touched)

- `formula-validator.ts` — ADDED `timeoutMs` option to `safeEvaluate` and `safeEvaluateMultiLine` (Chunk 1). Otherwise unchanged.
- `registry-resolver.ts` — REMOVED the `export const registryResolver = createRegistryResolver()` singleton at the bottom (Chunk 1). Now purely factory-based.
- `batch-executor.ts` — Swapped `new WorkflowExecutor(prisma)` to `createWorkflowExecutor(prisma)` (Chunk 3 manual edit).
- `workflow-executor.ts` — **DELETED** in Chunk 2. The 700-line legacy executor is gone.
- `interpolation.ts`, `units.ts`, `audit-service.ts`, `canvas-save.ts` — untouched.

### `src/features/workflow-canvas/server/`

- `execution-router.ts` — Rewritten multiple times (Chunks 2, 3, 4). Current version uses `createRunOrchestrator`, exposes `startRun`, `stepForward`, `stepBack`, `poll`, `cancelRun`, `submitInput`, `getSession`, `getHistory`, `rerun`. Has `assertSessionAccess` helper with super-admin bypass.

### `src/features/workflow-canvas/hooks/`

- `use-execution.ts` — Rewritten in Chunk 3. Exposes `startRun({ stepMode })`, `stepForward`, `stepBack`, `submitInput`, `cancel`, `reset`. State includes `stepOutput`, `pausedNode`, `isStepPause`, `isInputPause`, `isValidationPause`. **KNOWN PATCH REQUIRED** — user was told to (a) wrap the render-time `ingest()` call in `useEffect`, and (b) import `useWorkflowCanvasStore` to merge highlight sync into `ingest()` to avoid double polling. Verify these were applied before calling the hook "done".

### `src/features/workflow-canvas/components/`

- `workflow-runner.tsx` — New in Chunk 3. Renders five distinct pause views (input, validation error, step complete, completed, errored). Uses light theme with emerald/sky/amber/purple accents.
- `workflow-toolbar.tsx` — New in Chunk 3. Has stepMode Switch + Run/Step-through button.

### `src/features/workflow-canvas/store/`

- `workflow-canvas-store.ts` — User was told to MERGE (not replace) 4 new fields + 4 actions: `nodeExecutionStatus`, `activeExecutionNodeId`, `setNodeExecutionStatus`, `setActiveExecutionNode`, `clearExecutionHighlights`, `syncExecutionHighlights`. Verify merged.

### `src/components/react-flow/calculator/`

- `calc-base-node.tsx` — User was told to add `executionStatus` lookup and `getExecutionHighlightClass()` helper for canvas highlighting during runs. Don't delete or rewrite this file; it's the rendering shell for calc nodes.
- `calc-base-handle.tsx`, `calc-node-fields.tsx` — Pure UI, untouched by the refactor.

### `src/app/calc-workflows/[workflowId]/run/`

- `page.tsx` — Chunk 3 delivered a version that wires toolbar + canvas + runner panel. User may have merged into an existing file; verify.

### `src/inngest/`

- `client.ts` — Pre-existing. User confirmed it exports a configured `Inngest` instance.
- `functions.ts` — MERGE POINT. User was told to add `calcSessionResume`, `calcSessionStart`, `calcSessionTtlSweeper` imports and entries to the `functions` array. This file also registers the existing 9 trigger/action channels (anthropic, slack, stripe, etc.) — don't touch those.
- `functions/session-resume.ts` — New in Chunk 4. Handles `calc/session.resume` event.
- `functions/session-start.ts` — New in Chunk 4. Handles `calc/session.start-background` event.
- `functions/session-ttl-sweeper.ts` — New in Chunk 5. Hourly cron (`0 * * * *`). PAUSED > 30 days or PENDING > 6 hours → `TIMED_OUT`.

### `prisma/`

- `schema.prisma` — **SCHEMA CHANGES from Chunk 2.5** must be present:
  1. `CalcNodeExecution` has `@@unique([sessionId, calcNodeId])`
  2. `CalcSession` has `idempotencyKey String?` column plus `@@unique([calcWorkflowId, idempotencyKey])`
     Migration name: `add_session_idempotency_and_node_execution_unique`.
- `seed/seed.ts` — Updated in Chunk 2.5 to write `idempotencyKey` on sess_1 and sess_2, and switched `CalcNodeExecution.upsert` calls to use `sessionId_calcNodeId` compound key. Seed is idempotent — safe to re-run.

---

## 5. Schema quick reference

Key enums (all in `schema.prisma`):

- `SessionStatus`: `PENDING | RUNNING | PAUSED | COMPLETED | ERRORED | CANCELLED | TIMED_OUT`
- `NodeExecutionStatus`: `PENDING | WAITING | RUNNING | COMPLETED | SKIPPED | ERRORED`
- `CalcNodeType` (20 values): `INPUT`, `FORMULA`, `MULTI_FORMULA`, `LOOKUP_TABLE`, `GRAPH_INTERPOLATION`, `DECISION`, `DISPLAY`, `VALIDATION`, `UNIT_CONVERSION`, `CUSTOM_CODE` (10 sync), `API_CALL`, `PDF_REPORT`, `SUBWORKFLOW`, `LOOP`, `PARALLEL` (5 async), `COMMENT`, `GROUP`, `REFERENCE_IMAGE` (3 structural)
- `RunMode`: `SINGLE | BATCH | API`
- `AuditAction`: includes `WORKFLOW_RUN_STARTED`, `WORKFLOW_RUN_COMPLETED`, `WORKFLOW_RUN_ERRORED`, `WORKFLOW_RUN_CANCELLED`, `WORKFLOW_PAUSED`, `WORKFLOW_RESUMED`, `USER_INPUT_SUBMITTED`

Key session fields:

```prisma
model CalcSession {
  id              String
  calcWorkflowId  String
  actorId         String
  status          SessionStatus
  variables       Json          // VariableSnapshot
  executionOrder  Json          // string[]
  currentIndex    Int
  currentNodeId   String?       // not FK — survives node deletion
  pauseReason     String?       // mirrors metadata.stepPauseReason
  metadata        Json          // SessionMetadata (see types.ts)
  idempotencyKey  String?       // Chunk 2.5
  inputSnapshot   Json?         // user-provided values for replay
  @@unique([calcWorkflowId, idempotencyKey])  // Chunk 2.5
}

model CalcNodeExecution {
  sessionId       String
  calcNodeId      String?       // nullable for soft-deleted nodes
  status          NodeExecutionStatus
  stepNumber      Int
  @@unique([sessionId, calcNodeId])  // Chunk 2.5
}
```

---

## 6. Pause reasons and what they mean

`PauseReason` union (`types.ts`):

| Value                   | Trigger                                                | Resume via                                                            |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| `awaiting_user_input`   | INPUT node needs values                                | `resumeWithInput(sessionId, nodeId, values)` → `submitInput` mutation |
| `validation_error`      | VALIDATION handler's `on_error: "pause"` with failures | `resumeWithInput` with corrected upstream values                      |
| `step_complete`         | stepMode ON, node just completed                       | `stepForward(sessionId)` → `stepForward` mutation                     |
| `background_transition` | Hit an async node in INLINE_ASYNC / BACKGROUND_BATCH   | Inngest emits `calc/session.resume`, handled by `session-resume.ts`   |

---

## 7. 12 bugs from the mental model — status

| #   | Bug                                                      | Status | Fix location                                                             |
| --- | -------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| 1   | `updateNodeCompleted` also matched WAITING rows          | FIXED  | `SessionRepository.updateNodeCompleted` — `where: { status: "RUNNING" }` |
| 2   | Double-flush on session error                            | FIXED  | DatabaseListener is sole flush path; executor never flushes              |
| 3   | `updateNodeSkipped` set misleading `startedAt`           | FIXED  | `updateNodeSkipped` omits `startedAt`                                    |
| 4   | `createMany skipDuplicates` dropped entries after resume | FIXED  | `DatabaseListener` tracks `flushedNodeIds` Set                           |
| 5   | `createNodeWaiting` crashed on unique constraint         | FIXED  | `upsertNodeWaiting` uses upsert with `sessionId_calcNodeId` key          |
| 6   | `ctx.emit` promise dropped                               | FIXED  | Emitter returns Promise, awaited by executor                             |
| 7   | Shallow snapshot shared `$nodes` refs                    | FIXED  | `DefaultVariableStore.snapshot()` uses `structuredClone`                 |
| 8   | `indexOf(-1)` silently restarted from 0                  | FIXED  | `resumeWithInput` throws descriptive error on -1                         |
| 9   | `Math.max/min` on empty array returned ±Infinity         | FIXED  | `DisplayHandler` checks `positiveValues.length` before reducing          |
| 10  | `updateNodeErrored` lacked status guard                  | FIXED  | `where: { status: "RUNNING" }`                                           |
| 11  | `skipSet` lost after pause/resume                        | FIXED  | `metadata.skippedNodes` persisted and restored in `continueExecution`    |
| 12  | One listener throwing stopped others                     | FIXED  | `ExecutionEventEmitter` isolates per-listener errors                     |

---

## 8. Chunk-by-chunk summary

### Chunk 1 — Foundation (12 files)

Scaffolding only. Types, NodeHandler interface, registry, VariableStore, event emitter, SessionRepository, two listeners, bootstrap stub. Plus two patches: deleted singleton from `registry-resolver.ts`, added timeout option to `formula-validator.ts`. Nothing executes yet.

### Chunk 2 — Handlers + executor (15 files)

All 10 sync handlers + new `WorkflowExecutor.ts` (~330 lines) + updated `execution-router.ts` + filled-in bootstrap. After this chunk, every existing workflow runs identically through the new architecture. Old `workflow-executor.ts` deleted.

**Handler routing decision:** all handlers that touch mathjs route through `safeEvaluate` / `safeEvaluateMultiLine` for timeout enforcement. Direct `mathjs.evaluate` calls in handler code are banned.

### Chunk 2.5 — Schema migration (3 files)

`prisma/schema.prisma` gets two constraints added, `SessionRepository.ts` gets patched to use `findUnique` on compound idempotency key, `prisma/seed/seed.ts` gets two sessions with `idempotencyKey` and all `CalcNodeExecution.upsert` calls use `sessionId_calcNodeId`. Migration name: `add_session_idempotency_and_node_execution_unique`.

### Chunk 3 — stepMode + UI (11 files)

`stepForward`, `stepBack`, `step_complete` pause reason. New `workflow-runner.tsx` and `workflow-toolbar.tsx`. Store slice for canvas highlighting. Authorization with super-admin bypass. **Two known patches required in `use-execution.ts`** — see section 4. Light theme, no blue/black boxes per user preference.

**stepBack safety:** blocks stepping past nodes in `IRREVERSIBLE_NODE_TYPES = ["API_CALL", "PDF_REPORT"]`. Does NOT undo variable mutations — re-run overwrites them with fresh values.

### Chunk 4 — Inngest infrastructure (9 files) + patch (2 files)

`RunOrchestrator` (single entry point), `RunStrategyResolver` (picks strategy), `SessionPoller` (adaptive → then patched to fixed 1.5s), two Inngest functions, updated `execution-router.ts` with `poll` query. Async handlers intentionally NOT registered — any async node errors cleanly.

**Policy after patch:** workflow has any async node → `BACKGROUND_BATCH`. All sync → `INLINE_SYNC`. `INLINE_ASYNC` enum value exists but is never returned.

### Chunk 5 — Hardening (7 files)

TTL sweeper (30 days PAUSED, 6 hours PENDING). MetricsListener (structured JSON via `console.log`). WorkerPoolTimeout for true cancellation via `worker_threads`. `VariableStore` size enforcement (5MB per variable, 20MB total). Bootstrap registers metrics listener.

**Manual patch optional:** user was told to wire `WorkerPoolTimeout` into `CustomCodeHandler` if they want worker isolation. Ship-works without it.

---

## 9. Decisions locked in (don't revisit)

- **Engine location:** `src/server/engine/` (matches mental model, not `features/`)
- **`batch-executor.ts`:** left in place, only one line changed — serves a different purpose than `BackgroundBatch` strategy
- **Inngest:** installed, client exists at `src/inngest/client.ts`
- **HTTP client for future API_CALL:** `ky` (smaller, nicer API than axios)
- **SUBWORKFLOW future behavior:** user originally said Inngest-backed, then said skip all async handlers — skip wins
- **Strategy policy:** simple two-way split (any async → BACKGROUND_BATCH, else INLINE_SYNC)
- **Poll interval:** fixed 1.5s
- **TTL cutoffs:** 30 days PAUSED, 6 hours PENDING
- **Metrics output:** structured JSON via `console.log`, no OTel dependency
- **Worker timeouts:** yes, `worker_threads` with 30s default
- **safeEvaluate everywhere:** all mathjs handlers route through the timeout-enforced wrapper

---

## 10. Future scope — work not done, organized by priority

### Must-do when adding async integrations

**A. The 5 async handlers.** Stubs don't exist; the engine errors cleanly when it encounters one of these node types.

1. `ApiCallHandler` — HTTP calls via `ky`. Config: URL, method, headers, body, credentialId, timeout. Outputs: response body, status, headers. Must support retry with exponential backoff. Must fail the node if response size exceeds the variable size limit.

2. `PdfReportHandler` — renders a workflow's results as PDF. Options considered: Puppeteer/Playwright (heavy, works), Browserless/Gotenberg (requires separate service), `pdfkit`/`jspdf` (lightweight, limited layouts). User deferred the decision.

3. `SubworkflowHandler` — runs another workflow as a node. Requires:
   - Depth counter in `ExecutionContext` or via Inngest event propagation
   - Max depth constant (recommend 5)
   - Variable passing: parent → child inputs, child final vars → parent outputs
   - Cycle detection: maintain visited set of `calcWorkflowId` values

4. `LoopHandler` — iterate over an array, run inner nodes per item. Config: source array variable, item variable name, inner node ids. Output: accumulated array. Consider max-iteration cap.

5. `ParallelHandler` — fan out to multiple branches, collect results. Requires:
   - Branch-scoped `VariableStore` copies (current store is not safe for concurrent writes)
   - Join semantics: what happens if branch errors? Fail-fast vs. best-effort vs. first-success
   - Timeout across all branches

**Registration:** after implementing a handler, add `registry.register(new XHandler())` in `bootstrap.ts`'s `registerAllHandlers()`. No other routing code changes.

**Executor changes needed:** the executor currently does `errorOut(...)` when it hits an async node without `isBackgroundRun` set. Once async handlers exist and the orchestrator picks `BACKGROUND_BATCH`, the Inngest function sets `isBackgroundRun: true`, and the executor will dispatch to the handler normally. No executor code change needed, just handler registration.

### Should-do at moderate scale

**B. Real metrics sink.** `MetricsListener` currently writes JSON to `console.log`. Plug OpenTelemetry, Datadog, or similar when observability matters. The `MetricsSink` interface is already designed for this — swap `ConsoleJsonSink` for an OTel-backed one.

**C. Server-sent events instead of polling.** Current polling at 1.5s is fine for dozens of concurrent users, not great for thousands. SSE via `next/server`'s `ReadableStream` would be straightforward. Keep polling as a fallback for clients that don't support SSE.

**D. Persistent worker pool.** `WorkerPoolTimeout` spawns a fresh worker per evaluation (~10-50ms overhead). For high-throughput workflows with many CUSTOM_CODE evaluations per second, a long-lived pool using e.g. `piscina` would amortize startup cost. Not worth it until you have a real perf complaint.

**E. Rate limiting per org.** Currently any authenticated user can spam `startRun`. `OrgBilling.remainingRuns` exists in schema but isn't enforced anywhere. Add a check in `RunOrchestrator.start()` before creating the session.

**F. Sentry error integration.** `classifyError` in `NodeHandler.ts` produces nice error type strings. Pipe `node:errored` events to Sentry for non-user-fault error categories (not `validation_error`, not `user_input_missing`).

### Could-do eventually

**G. Cancel-mid-Inngest needs testing.** The executor checks `session.status` between nodes and bails if `CANCELLED`. Tested in in-process runs. For Inngest runs, the check only fires between node executions; if a node is mid-HTTP-call when cancel arrives, it keeps running until the HTTP call returns. That's acceptable for most cases but worth documenting if users report "clicked cancel, still running."

**H. Workflow versioning during mid-run edits.** If a user edits a workflow while a session is PAUSED, the session's `executionOrder` is fixed but node configs re-read fresh on resume. This means a paused FORMULA could run with a changed expression. Two options: snapshot full node configs into the session on start (large JSON payloads), or lock workflows from edit while any session references them (UX friction). Current behavior: edits take effect on resume. Document it.

**I. Idempotency key TTL.** Keys are unique forever per workflow. A key from 6 months ago still dedupes. Add a TTL (e.g. 24h) if billing-sensitive or high-volume.

**J. Audit log retention.** `AuditLog.expiresAt` field exists but nothing consumes it. Add a cleanup cron similar to the session TTL sweeper.

**K. Observability hook for poll traffic.** Nobody currently tracks how many active polling clients there are. Add a metric emission from `SessionPoller.poll()` or count in middleware.

**L. `stepBack` variable rollback.** Currently re-running overwrites variables but doesn't undo mutations from nodes that WROTE variables the re-run path doesn't touch. Real fix requires per-node variable snapshots (expensive). Alternative: document the limitation and recommend rerun instead of stepBack for complex debug sessions.

**M. Subworkflow / loop / parallel observability.** When those handlers land, metrics needs extending — current `node_duration_ms` metric doesn't account for fan-out patterns.

**N. Metadata schema version 2.** When you next need to change `SessionMetadata` shape, bump `METADATA_VERSION` to 2 and add a migration case in `hydrateMetadata()`. Old paused sessions will auto-migrate on load.

**O. Worker path resolution for ESM / Edge runtime.** `WorkerPoolTimeout` uses `__dirname`. Breaks on Edge runtime or pure ESM. If you migrate, switch to `new URL(...)` pattern.

### Nice-to-have UX

**P. Keyboard shortcuts for stepMode.** Bind Space or Enter to `stepForward` when `isStepPause` is true. File: `src/features/workflow-canvas/hooks/use-keyboard-shortcuts.ts`.

**Q. Step output history panel.** Runner currently shows only the current step's output. Add a scrollable history of all completed steps so users can look back without scrolling canvas nodes.

**R. Execution comparison view.** Two sessions side by side. Useful for debugging "why did this run give different numbers than the last one."

**S. Export session as report.** JSON or PDF snapshot of variables + node executions for sharing with engineering reviewers.

---

## 11. Things that will trip up the next AI

1. **InputHandler filename with leading space.** Original save produced `InputHandler.ts` (with a leading space). The rename to `InputHandler.ts` was included in every subsequent chunk's checklist. If the tree shows the space-prefixed version, run `mv " InputHandler.ts" InputHandler.ts`.

2. **The user's tsconfig path alias.** All code uses `@/*` → `./src/*`. If the project ever switches to `~/` or similar, every file in the engine needs import rewrites.

3. **Legacy `batch-executor.ts` vs. new `BACKGROUND_BATCH` strategy.** These are NOT the same thing. `batch-executor.ts` is an existing Inngest function that operates on `BatchJob`/`BatchRowExecution` tables for bulk row processing. `BACKGROUND_BATCH` is a run strategy that sends individual `CalcSession` runs to Inngest. They coexist. Don't try to unify them without a design discussion.

4. **Audit listener subscribes to session events, not node events.** Node-level audit entries were in the legacy executor and were deliberately dropped. If audit requirements change, check `AuditListener.ts` — adding node audit back is an easy one-line subscription.

5. **`registry-resolver.ts` is per-execution, not global.** Chunk 1 deleted the singleton at the bottom. Anywhere that imports `registryResolver` as a value (not as a type) is broken; grep first if you see `Cannot find name 'registryResolver'` errors.

6. **`liveUpdates` flag drives whether DatabaseListener writes per-node.** Currently always true for stepMode and background runs, false otherwise. If you want per-node audit visibility in batch mode, flip the default in `bootstrap.ts`.

7. **Metadata has two copies of `idempotencyKey`.** One in the column (Chunk 2.5), one in the metadata JSON (kept for read convenience). The column is source of truth. If they drift, the column wins.

8. **`use-execution.ts` has TWO bugs** that user was told to patch in Chunk 3: (a) render-time `ingest()` call must be wrapped in `useEffect`, (b) highlight sync should be inlined into `ingest()` to avoid double polling. Verify both are applied before debugging polling issues.

9. **All `sideEffects.skipNodes` from DECISION must be preserved across pause.** The executor reads `metadata.skippedNodes` on resume. If you rename that field, update `SessionRepository.pauseSession` and `continueExecution`'s restore logic.

10. **User preferences matter.** Light theme, no blue/black boxes, no emojis unless user uses them, no excessive bullet points or headers for conversational replies. Code and READMEs can have more structure.

---

## 12. Testing end-to-end

Quick smoke tests that should all pass after Chunks 1-5 are applied:

```bash
# Type check
npx tsc --noEmit

# Schema migrations present
npx prisma migrate status
# Should show add_session_idempotency_and_node_execution_unique applied

# Seed data works
npx prisma db seed
# Should create sess_1 / sess_2 with idempotencyKey values
```

UI smoke test: go to `/calc-workflows/wf_dicken/run`, toggle step mode on, click "Step through":

1. INPUT pauses for catchment_area
2. Enter 84.5, submit
3. "Step 1 of 3" shows INPUT outputs → Next
4. "Step 2 of 3" shows Q_dicken ≈ 152.06 → Next
5. "Step 3 of 3" (DISPLAY) → Next
6. "Completed"

Canvas nodes glow amber during run, green when done.

Log output should show JSON lines like:

```json
{"ts":"...","level":"info","category":"engine.session","event":"started",...}
{"ts":"...","level":"info","category":"engine.metric","event":"node_duration_ms","nodeType":"FORMULA","value":4}
```

---

## 13. If a critical bug surfaces after handoff

Priority debugging order:

1. **Check `npx tsc --noEmit` first.** Most issues are import or type errors from one of the patches not being applied.
2. **Check the DB schema.** Is the Chunk 2.5 migration applied? Without it, upserts crash and idempotency lookups fail.
3. **Check `use-execution.ts` patches.** The two render-time bugs were easy to miss.
4. **Check store merge.** If canvas highlights don't work, the store slice probably wasn't merged.
5. **Check `functions.ts` merge.** If Inngest functions don't appear in the dashboard, they weren't added to the `functions` array.
6. **Check delete of legacy executor.** `src/features/workflow-canvas/engine/workflow-executor.ts` must be gone. If it's still there, grep finds broken imports.

Common failure modes:

- "registryResolver is not defined" → Chunk 1's singleton removal exposed this; either update the caller or it's calling into legacy code that should've been deleted
- "Cannot find name 'sessionId_calcNodeId'" → Prisma client needs regen: `npx prisma generate`
- "Worker script not found" → `WorkerPoolTimeout`'s path resolution needs adjusting for your build setup; see Chunk 5 README sharp edges
- "Expected 10 handlers, got 9" → `InputHandler.ts` filename has a leading space, rename it

---

## 14. Where to pick up next

Most likely next work item: implement the async handlers (section 10, item A). Start with `ApiCallHandler` since it's the most broadly useful. The infrastructure is fully wired — implementing a handler is purely additive. Template to copy: any of the 10 sync handlers. Key difference: async handlers do I/O and must be robust to retries from Inngest.

Second most likely: plug a real metrics backend (section 10, item B). The `MetricsSink` interface is designed for this — OpenTelemetry is the obvious choice.

Don't start fresh architectural rewrites. The engine is solid. Build on top of it.

---

_End of handoff memory._
