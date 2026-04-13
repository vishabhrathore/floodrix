# FloodRix — Server & Engine Function Audit

> Generated from code review of all 8 server/engine files.
> Status: ✅ = correct, ⚠️ = has known issue, 🔧 = needs fix applied

---

## 1. `server/router.ts` — tRPC Canvas Router

**Export:** `calcWorkflowCanvasRouter`
**Import path:** `import prisma from "@/lib/db"` ✅
**Zod import:** `import z from "zod"` ✅ (was `zod/v4` in early version — fixed)
**Auth pattern:** `ctx.auth.user.id` ✅

| Function | Status | What it does | Known Issue |
|---|---|---|---|
| `assertWorkflowAccess(workflowId, userId)` | ✅ | Checks org membership via `organization.members.some`. Returns `{ id, organizationId, status }` | None |
| `resolveActorId(userId, workflowId)` | ✅ | Finds `CalcActor` for user in the org that owns this workflow | ⚠️ No super-admin bypass — SUPER_ADMIN users without a CalcActor get FORBIDDEN |
| `list` query | ✅ | Paginated cursor-based list of `CalcWorkflow` with `_count.nodes` and `ratingAggregate` | None |
| `get` query | ✅ | Loads workflow + nodes (deletedAt:null) + edges (deletedAt:null) + variables + currentVersion + collaborators | None |
| `create` mutation | ✅ | Creates workflow with auto-slug, checks org membership | Tags cast as `Prisma.InputJsonValue` ✅ |
| `update` mutation | ✅ | Updates metadata only (name/desc/category/tags/visibility) | None |
| `saveCanvas` mutation | ⚠️ | Calls `saveCanvasOptimized()` from canvas-save.ts | **EDGE BUG**: soft-delete + `createMany({skipDuplicates:true})` silently drops edges. **FIX**: change to `deleteMany` (hard delete) |
| `publish` mutation | ✅ | Calls `publishWorkflow()` — creates CalcVersion, sets currentVersionId | None |
| `delete` mutation | ✅ | Soft-deletes workflow (sets `deletedAt`) | None |
| `duplicate` mutation | ✅ | Deep-copies nodes + edges with new IDs, remaps edge source/target | None |
| `getNode` query | ✅ | Returns single node by id + workflowId + deletedAt:null | None |
| `updateNodeConfig` mutation | ✅ | Patches node config JSON, casts as `Prisma.InputJsonValue` | None |
| `loadForExecution` query | ✅ | Calls `loadWorkflowForExecution()` — 4-query parallel load | None |

---

## 2. `server/execution-router.ts` — tRPC Execution Router

**Export:** `calcExecutionRouter`
**Import:** `import prisma from "@/lib/db"` ✅

| Function | Status | What it does | Known Issue |
|---|---|---|---|
| `resolveActorId(userId, orgId)` | ✅ | Finds CalcActor by userId + organizationId | ⚠️ No super-admin bypass |
| `getWorkflowOrgId(workflowId)` | ✅ | Looks up the orgId for a workflow | None |
| `startRun` mutation | ✅ | Creates WorkflowExecutor, calls `startExecution()`. Returns sessionId + status + pausedNode | None — **CONFIRMED WORKING** (your JSON proves it) |
| `submitInput` mutation | ✅ | Validates session is PAUSED + currentNodeId matches, calls `resumeWithInput()` | None |
| `cancelRun` mutation | ✅ | Verifies actor ownership, calls `cancelExecution()` | None |
| `getSession` query | ✅ | Returns session + all nodeExecutions ordered by stepNumber | None |
| `getHistory` query | ✅ | Paginated list of CalcSessions for all CalcActors the user owns | None |
| `rerun` mutation | ✅ | Loads old session's inputSnapshot, starts fresh execution with same initial values | None |

---

## 3. `server/canvas-queries.ts` — Optimized DB Operations

**Exports:** 5 functions + 1 class

| Function | Status | What it does | Known Issue |
|---|---|---|---|
| `saveCanvasOptimizedQueries(db, workflowId, nodes, edges)` | ✅ | Memory-diff nodes/edges, batch create/update/soft-delete in one transaction | **NOT USED** — router.ts calls `saveCanvasOptimized` from canvas-save.ts instead. This is a dead alternative implementation. |
| `loadWorkflowForExecution(db, workflowId)` | ✅ | 4 parallel queries: workflow metadata + nodes + edges + variables | None |
| `createNodeExecutionsBatch(db, sessionId, nodeIds)` | ✅ | Bulk-creates CalcNodeExecution rows with status PENDING | **NOT USED** — executor creates them directly inline |
| `completeNodeExecution(db, sessionId, calcNodeId, data)` | ✅ | Updates node execution status with outputVars/result/error | **NOT USED** — executor updates inline |
| `SessionStateBuffer` class | ✅ | Batches progress writes (every N nodes) to reduce DB calls | **NOT USED** — executor writes after every node |

> **Verdict**: Only `loadWorkflowForExecution` is actively called. The other 4 exports are utility functions that could be wired in for optimization but currently aren't used.

---

## 4. `engine/canvas-save.ts` — Canvas Save + Publish

**Exports:** `saveCanvasOptimized`, `publishWorkflow`

| Function | Status | What it does | Known Issue |
|---|---|---|---|
| `saveCanvasOptimized(input)` | ⚠️ | Loads existing state, computes diff (added/removed/modified/moved), upserts nodes, soft-deletes+recreates edges, updates workflow timestamp, logs audit | **EDGE BUG**: Soft-deletes edges then `createMany({skipDuplicates:true})`. Same edge IDs from React Flow collide with soft-deleted rows. **FIX**: Replace `updateMany({data:{deletedAt}})` with `deleteMany()` for edges. |
| `publishWorkflow(input)` | ✅ | Loads workflow+nodes+edges+variables, computes next version from `CalcVersion.findFirst({orderBy:desc})`, creates snapshot JSON, creates CalcVersion record, updates workflow status to PUBLISHED + sets currentVersionId | None |

---

## 5. `engine/workflow-executor.ts` — Core Execution Engine

**Export:** `WorkflowExecutor` class, `resolveExecutionOrder` function

| Method | Status | What it does | Known Issue |
|---|---|---|---|
| `resolveExecutionOrder(nodes, edges)` | ✅ | Topological sort using `toposort` npm package. Returns ordered node IDs. Throws on cycles. | None |
| `startExecution(workflowId, actorId, initialValues?)` | ✅ | Loads workflow+nodes+edges+variables. Topo-sorts. Initializes variable context from CalcVariable defaults + initialValues. Creates CalcSession (RUNNING). Creates CalcNodeExecution rows (PENDING). Calls `continueExecution()`. | None — **CONFIRMED WORKING** |
| `resumeWithInput(sessionId, nodeId, userInput)` | ✅ | Validates session is PAUSED at expected node. Merges userInput into variables. Marks node execution as COMPLETED. Advances currentIndex. Calls `continueExecution()`. | None |
| `cancelExecution(sessionId, actorId)` | ✅ | Sets session to CANCELLED. Skips all pending/waiting node executions. | None |
| `continueExecution(sessionId)` | ✅ | Core loop: iterates through executionOrder. Skips COMMENT/GROUP/REFERENCE_IMAGE nodes. Handles each node type. Persists progress after every node. Returns PAUSED/COMPLETED/ERRORED. | None |
| Node: `INPUT` | ✅ | If `pause_execution !== false` and fields not all provided → PAUSE session, return fields to frontend. Otherwise apply defaults and continue. | None — **CONFIRMED WORKING** |
| Node: `FORMULA` | ✅ | Supports inline expressions and registry-sourced formulas. Uses `math.evaluate()`. Handles variable bindings for registry formulas. | None |
| Node: `MULTI_FORMULA` | ✅ | Evaluates array of `{expr, result_var}` sequentially. Each result feeds into the next. | None |
| Node: `LOOKUP_TABLE` | ✅ | Supports range, exact, and nearest match modes. Registry or inline data. Configurable fallback (error/first/last). | None |
| Node: `GRAPH_INTERPOLATION` | ✅ | 1D interpolation on digitized curve data points. Supports registry or inline. | None |
| Node: `DECISION` | ✅ | Evaluates condition via math.evaluate. BFS to find nodes reachable only from the not-taken branch → adds to skipSet. Sets branch variables. | None |
| Node: `DISPLAY` | ✅ | Compares multiple variables. Supports max/min/average/custom selection rules. Implements IRC Article-6 logic (1.5×Q2 check). | None |
| Node: `VALIDATION` | ✅ | Evaluates array of check expressions. Collects errors/warnings. Can PAUSE on validation errors. | None |
| Node: `UNIT_CONVERSION` | ✅ | Uses mathjs `unit().toNumber()` or custom expression. | None |
| Node: `CUSTOM_CODE` | ✅ | Parses simple `var = expr` lines via regex, evaluates with math.evaluate. | ⚠️ Only supports single-line assignments. No loops/conditionals. |
| `classifyError(err)` | ✅ | Categorizes errors: missing_variable, lookup_miss, circular_dependency, timeout, validation, computation | None |

---

## 6. `engine/batch-executor.ts` — Inngest Batch Job

**Export:** `processBatchJob` (Inngest function)

| Step | Status | What it does | Known Issue |
|---|---|---|---|
| `fetch-job` | ✅ | Loads BatchJob + calcWorkflow + nodes (deletedAt:null) + edges (deletedAt:null) | None |
| `start-job` | ✅ | Sets BatchJob status to PROCESSING, logs audit with `job.actorId` | None — was `job.createdById` in old version, fixed |
| `prefetch-registry` | ✅ | Creates per-execution `createRegistryResolver()`, prefetches all formula/table registries for workflow | None |
| `process-chunk-N` | ✅ | Creates WorkflowExecutor per chunk. Iterates batch rows. Calls `startExecution()` with row's inputData. | ⚠️ For INPUT-node workflows, `startExecution` will PAUSE — batch executor doesn't handle this. Only works for workflows where all inputs are pre-provided via initialValues. |
| `update-rows-N` | ✅ | Updates BatchRowExecution status to SUCCESS/ERROR with outputData | None |
| `finalize-job` | ✅ | Sets BatchJob to COMPLETED/FAILED, logs audit | None |

---

## 7. `engine/registry-resolver.ts` — Formula/Table Registry Cache

**Exports:** `createRegistryResolver()` factory, `registryResolver` singleton

| Function | Status | What it does | Known Issue |
|---|---|---|---|
| `createRegistryResolver()` | ✅ | Factory that creates a resolver with per-execution cache (Map). Returns `{ resolveFormula, resolveTable, prefetchForWorkflow }`. | None |
| `resolveFormula(db, registryId, version)` | ✅ | If pinned version → parallel query (version snapshot + current record). If null → latest published. Caches by `f:id:version`. | None |
| `resolveTable(db, registryId, version)` | ✅ | Same pattern as resolveFormula but for TableRegistryItem. | None |
| `prefetchForWorkflow(db, workflowId)` | ✅ | Loads all FormulaRegistryUsage + TableRegistryUsage for workflow. Batch-loads all items in 2 queries. Warms cache for both latest and pinned versions. | None |
| `registryResolver` (singleton export) | ⚠️ | Module-level singleton. Cache persists across requests in serverless/long-running environments. | Not critical — only used as fallback. Executor should ideally create per-execution via factory. |

---

## 8. `engine/audit-service.ts` — Audit Logging

**Export:** `auditService` singleton (class `AuditService`)

| Method | Status | What it does | Known Issue |
|---|---|---|---|
| `log(db, input)` | ✅ | Creates single AuditLog row with CUID id | None |
| `logBatch(db, entries)` | ✅ | Creates multiple AuditLog rows with shared batchId | None |
| `logNodeChanges(db, actorId, workflowId, changes)` | ✅ | Maps added/removed/modified/moved node changes into individual audit entries, writes as batch | None |
| `query(db, filters)` | ✅ | Paginated query with filters on workflowId/actorId/resourceType/action/date range. Includes actor→user join. | None |
| `getWorkflowTimeline(db, workflowId, options)` | ✅ | Loads all audit logs for workflow, groups by batchId, summarizes each group. Optionally excludes NODE_MOVED. | None |
| `getExecutionHistory(db, actorId, options)` | ✅ | Lists CalcSessions for an actor with nodeExecution counts. | None |
| `getSessionDetail(db, sessionId)` | ✅ | Full session with workflow metadata + actor + all nodeExecutions with node config. | None |

---

## Critical Bugs Summary

| # | File | Bug | Fix |
|---|---|---|---|
| 1 | `canvas-save.ts` | **Edges disappear on reload.** Soft-delete + `createMany({skipDuplicates:true})` silently skips edges whose IDs already exist as soft-deleted rows. | Change edge deletion to `deleteMany()` (hard delete) instead of `updateMany({deletedAt})` |
| 2 | `router.ts` / `execution-router.ts` | **No super-admin bypass.** `resolveActorId()` throws FORBIDDEN if user has no CalcActor, even if they're SUPER_ADMIN. | Add `if (user.globalRole === "SUPER_ADMIN") return actorId` fallback |
| 3 | `registry-resolver.ts` | **Singleton cache stale across requests.** The module-level `export const registryResolver = createRegistryResolver()` defeats the per-execution pattern. | Not critical for single-user dev. For production: executor should call `createRegistryResolver()` per execution, not use the singleton. |
| 4 | `batch-executor.ts` | **Can't batch-execute workflows with INPUT nodes.** `startExecution()` returns PAUSED for workflows requiring user input. Batch executor doesn't handle resume. | Only submit batch jobs for workflows where all inputs are provided via `initialValues`. Or: add auto-skip-input mode to executor. |

## Unused but Correct Code

These functions exist in `canvas-queries.ts` and are correctly implemented, but are **not called** by anything:

- `saveCanvasOptimizedQueries()` — alternative diff-based save (router uses `saveCanvasOptimized` from canvas-save.ts instead)
- `createNodeExecutionsBatch()` — executor creates node executions inline
- `completeNodeExecution()` — executor updates node executions inline
- `SessionStateBuffer` class — executor writes progress after every node instead of batching

These could be wired in for performance optimization in the future but are not blocking anything.

---

## Call Chain Summary

```
Runner UI
  └─ calcExecution.startRun (tRPC)
       └─ resolveActorId() → CalcActor lookup
       └─ WorkflowExecutor.startExecution()
            ├─ Load workflow + nodes + edges + variables
            ├─ resolveExecutionOrder() → toposort
            ├─ Create CalcSession (RUNNING)
            ├─ Create CalcNodeExecution rows (PENDING)
            └─ continueExecution()
                 ├─ INPUT → PAUSE (return fields to UI)
                 ├─ FORMULA → math.evaluate + registry
                 ├─ LOOKUP_TABLE → range/exact/nearest
                 ├─ DECISION → condition + skip-set
                 ├─ DISPLAY → comparison + selection
                 └─ → COMPLETED (return all variables)

Canvas Editor
  └─ calcWorkflowCanvas.saveCanvas (tRPC)
       └─ resolveActorId()
       └─ saveCanvasOptimized()
            ├─ Load existing nodes + edges
            ├─ Diff: added/removed/modified/moved
            ├─ Transaction: upsert nodes + delete+recreate edges
            └─ auditService.logNodeChanges()

  └─ calcWorkflowCanvas.publish (tRPC)
       └─ publishWorkflow()
            ├─ Load workflow + nodes + edges + variables
            ├─ CalcVersion.findFirst(orderBy:desc) → next version
            ├─ Create CalcVersion with snapshot JSON
            └─ Update workflow: currentVersionId + PUBLISHED

Batch Processing (Inngest)
  └─ batch/process event
       └─ processBatchJob()
            ├─ Load BatchJob + CalcWorkflow
            ├─ createRegistryResolver().prefetchForWorkflow()
            ├─ For each chunk of 50 rows:
            │   ├─ WorkflowExecutor.startExecution(row.inputData)
            │   └─ Update BatchRowExecution (SUCCESS/ERROR)
            └─ Finalize BatchJob status
```

Yes, all 8 files are important — but they serve different roles. Here's the honest breakdown:

**Actively used right now (critical path):**

| File | Why it matters |
|---|---|
| `server/router.ts` | Every canvas operation — list, get, save, publish, duplicate, delete. Without this, the editor doesn't work. |
| `server/execution-router.ts` | Every run operation — startRun, submitInput, cancelRun, getSession. Without this, the runner doesn't work. |
| `engine/workflow-executor.ts` | The brain — topo-sort, node execution loop, pause/resume, all 10 node types. Nothing runs without this. |
| `engine/canvas-save.ts` | `saveCanvasOptimized` + `publishWorkflow`. Called by router.ts on every save and publish. |
| `engine/audit-service.ts` | Called by canvas-save and workflow-executor after every save, run start, run complete, and error. If you remove it, those files crash on the `auditService.log()` calls. |

**Partially used:**

| File | Reality |
|---|---|
| `server/canvas-queries.ts` | Only `loadWorkflowForExecution()` is actively called (by router.ts `loadForExecution`). The other 4 exports (`saveCanvasOptimizedQueries`, `createNodeExecutionsBatch`, `completeNodeExecution`, `SessionStateBuffer`) are **dead code** — correctly written but nothing calls them. They're optimization utilities you could wire in later. |
| `engine/registry-resolver.ts` | Only matters when FORMULA or LOOKUP_TABLE nodes use `source: "registry"`. If all your workflows use inline expressions (which they currently do based on your seed data), this file never gets called. It becomes critical when you build the formula registry picker UI. |

**Only used in background jobs:**

| File | Reality |
|---|---|
| `engine/batch-executor.ts` | Only runs when someone triggers a batch job via Inngest (`batch/process` event). Your runner UI doesn't call it — it's for the Excel upload "Process All" flow. Not needed until you wire the batch panel's "Calculate All" button to create a BatchJob and fire the Inngest event. |

**The store + hooks (client-side):**

| File | Reality |
|---|---|
| `store/workflow-canvas-store.ts` | Critical — drives the entire React Flow canvas. Every node drag, edge connect, undo/redo goes through this. |
| `hooks/use-execution.ts` | Used by `workflow-canvas.tsx` but the runner page (`workflow-runner.tsx`) manages its own state with direct `useMutation` calls instead. So this hook is only used in the canvas editor's toolbar "Run" button. |
| `hooks/use-node-config.ts` | Used by the canvas inspector panel — loads node config from server, patches it back. |
| `hooks/use-keyboard-shortcuts.ts` | Ctrl+S, Ctrl+Z, Delete handling for the canvas. |
| `hooks/use-auto-save.ts` | Debounced auto-save watcher. Works with the store's dirty flags. |

**Bottom line:** You could delete `canvas-queries.ts` (keep only `loadWorkflowForExecution`), `batch-executor.ts`, and `registry-resolver.ts` and everything you're currently using would still work. But keep them — they're correctly implemented and you'll need them as you build out the registry picker and batch processing features.

No. For the current working system (canvas editor + runner + execution), the files you have cover everything. But there are features you've built UI/schema for that have **no server logic yet**. Let me be specific:

**What's missing vs what you actually need:**

| Feature | Schema exists? | UI exists? | Server logic exists? | Needed? |
|---|---|---|---|---|
| **Canvas save/load** | ✅ | ✅ | ✅ `canvas-save.ts` + `router.ts` | Done |
| **Run workflow (pause/resume)** | ✅ | ✅ | ✅ `workflow-executor.ts` + `execution-router.ts` | Done |
| **Audit trail** | ✅ | ❌ (no UI to view it) | ✅ `audit-service.ts` | Done (UI later) |
| **Batch processing** | ✅ | ✅ (runner batch panel) | ⚠️ Half — `batch-executor.ts` exists but **no tRPC endpoint to create a BatchJob** | **Missing: batch router** |
| **Formula/Table registry** | ✅ | ❌ (no picker UI) | ✅ `registry-resolver.ts` | Done (UI later) |
| **CalcVariable CRUD** | ✅ Schema | ❌ | ❌ No router | **Missing** — variables are only created via seed. No way to add/edit/delete from UI. |
| **CalcActor auto-creation** | ✅ Schema | N/A | ❌ | **Missing** — if a user joins an org, no CalcActor is created. `resolveActorId()` will fail. |
| **Workspace tree (folders)** | ✅ Schema (`WorkspaceNode`) | ❌ | ❌ | Not blocking anything yet |
| **Rating/reviews** | ✅ Schema | ❌ | ❌ | Not blocking |
| **Collaborators** | ✅ Schema | ❌ | ❌ | Not blocking |

**The 3 things you should build next (in priority order):**

**1. CalcActor auto-creation** — This is a silent blocker. Right now if you create a new user and add them to an org, they can't run any workflow because `resolveActorId()` finds no CalcActor. Add this to your org membership creation flow:

```typescript
// In your org member invite/join logic:
await prisma.calcActor.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    create: { userId, organizationId, role: "MEMBER" },
    update: {},
});
```

**2. CalcVariable CRUD router** — Your executor reads from `CalcVariable` for default values, and the config drawers reference "available variables" for binding. But there's no way to create or manage them from the UI. You need a small router with `create`, `update`, `delete`, `list` for variables scoped to a workflow.

**3. Batch job creation endpoint** — Your runner has a batch panel but no way to actually trigger it. You need a tRPC mutation that creates a `BatchJob` + `BatchRowExecution` rows from uploaded CSV data, then fires the Inngest event.

Everything else (workspace tree, ratings, collaborators, audit UI) is nice-to-have and not blocking the core calculate → run → view results flow.
