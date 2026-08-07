# Chapter 1 — System Overview & UI Trigger Layer

> **Who should read this?** Anyone new to the project who wants to understand what happens the moment a user clicks "Run All" or "Step Run" inside the Workflow Canvas.

---

## 1.1 What is Floodrix?

Floodrix is a **calculation workflow engine** built on Next.js (App Router) + tRPC + Prisma + PostgreSQL + Redis + BullMQ. It lets engineers model complex engineering calculations (hydrology, civil, water infrastructure) as a **graph of nodes**, then execute them sequentially with full audit, real-time progress, and resumable state.

A **Workflow** is made of **Nodes**. Each node is a typed computation unit:

| Node Type | What it does |
|---|---|
| `INPUT` | Pauses execution and asks the user for a value |
| `FORMULA` | Evaluates a math.js expression (e.g. `Q = C * I * A`) |
| `MULTI_FORMULA` | Evaluates several formulas in sequence |
| `LOOKUP` | Reads a value from a lookup table |
| `INTERPOLATION` | Interpolates between two table rows |
| `DECISION` | Branches the flow (if/else) and marks nodes to skip |
| `DISPLAY` | Renders a markdown output card |
| `CHART` | Produces a chart data payload |
| `UNIT_CONVERSION` | Converts a value between engineering units |
| `VALIDATION` | Asserts a condition; pauses with error if it fails |
| `SUBWORKFLOW` | Spawns a nested workflow run |
| `CUSTOM_CODE` | Executes sandboxed JavaScript via Node.js `vm` |

---

## 1.2 High-Level Execution Pipeline

```
User clicks "Run All"
        │
        ▼
workflow-runner.tsx          ← React UI component
        │  calls
        ▼
useExecution hook            ← React state machine + tRPC mutations
        │  fires tRPC mutation
        ▼
execution-router.ts          ← tRPC API route (server-side)
        │  calls
        ▼
RunOrchestrator.ts           ← picks strategy (INLINE_SYNC vs BACKGROUND)
        │
   ┌────┴────────────────────────┐
   │ INLINE_SYNC                 │ BACKGROUND
   ▼                             ▼
WorkflowExecutor.ts          QueueProducer → BullMQ → piscinaWorker.ts
   │                                                        │
   │  (same executor, different entry)                      │
   ▼                                                        ▼
Handler (Formula/Input/etc.)    ◄───────────────────────────┘
   │
   ▼
VariableStore (in-memory scope)
   │
   ▼
AppCache (Redis — fast reads)   +   SessionRepository (Postgres — durable)
   │
   ▼
ExecutionEventEmitter → DatabaseListener + RedisPubSubListener
   │                                                 │
   ▼                                                 ▼
Postgres (CalcNodeExecution)         Redis channel  `workflow:<sessionId>`
                                                     │
                                                     ▼
                                         tRPC subscribeProgress
                                                     │
                                                     ▼
                                         useExecution hook (React state update)
                                                     │
                                                     ▼
                                         workflow-runner.tsx re-renders
```

---

## 1.3 The UI Entry Point — `workflow-runner.tsx`

**File:** `src/features/workflow-canvas/components/workflow-runner.tsx`

This is a large React component (~1208 lines). It renders the right-side panel during a workflow run. Key responsibilities:

### Auto-start on mount
```tsx
// Lines 94–99
useEffect(() => {
  if (!autoStarted && !exec.status) {
    exec.startRun({ stepMode });  // ← THIS is the trigger
    setAutoStarted(true);
  }
}, [autoStarted, exec, stepMode]);
```
When the runner panel opens, it immediately fires `exec.startRun()`. If the user manually clicks **"Run All"**, that also calls `exec.startRun({ stepMode: false })`.

### Run All Button (line 387–403)
```tsx
<Button onClick={() => exec.startRun({ stepMode: false })}>
  <Play /> Run All
</Button>
```

### Step Run Button (line 366–386)
```tsx
onClick={() => {
  if (exec.isStepPause) {
    exec.stepForward();        // advance one node at a time
  } else {
    exec.startRun({ stepMode: true });   // new run in step mode
  }
}}
```

### Node card states shown in the UI

| State | What the user sees |
|---|---|
| `LOCKED` | 🔒 grey dashed card — waiting on upstream |
| `ACTIVE (running)` | Blue spinning loader — computation in progress |
| `ACTIVE (input pause)` | `<InputForm>` — asks user to fill values |
| `ACTIVE (step pause)` | `<StepPauseForm>` — shows result, waits for "Next" |
| `ACTIVE (validation error)` | Yellow warning — validation failed |
| `COMPLETED` | Green ✓ with collapsed output preview |
| `ERRORED` | Red banner — `exec.error` shown |

---

## 1.4 The Execution Hook — `use-execution.ts`

**File:** `src/features/workflow-canvas/hooks/use-execution.ts`

This is the **React-side state machine**. It owns all execution state and exposes clean methods to the UI.

### State shape
```ts
interface ExecutionState {
  status: SessionStatus | null;     // RUNNING | PAUSED | COMPLETED | ERRORED | CANCELLED
  sessionId: string | null;         // the DB session ID once started
  currentNodeId: string | null;     // which node is executing right now
  pauseReason: string | null;       // "awaiting_user_input" | "step_complete" | "validation_error"
  pausedNode: PausedNode | null;    // fields to render in <InputForm>
  stepOutput: StepOutput | null;    // last completed node output (step mode)
  nodeOutputs: Record<string, StepOutput>; // all completed node outputs
  variables: Record<string, unknown>;      // accumulated variable scope
  error: string | null;
  completedAt: string | null;
}
```

### Visual Output Rendering
```tsx
<DynamicVisualizer node={node} completedOutput={exec.nodeOutputs[node.id]} variables={exec.variables} />
```
`DynamicVisualizer` uses **heuristic key-name detection** on the node outputs:
1. **Slope profile table** — if `stream_profile` output is an array of `{ chainage, rl }` objects → renders `<SlopeProfileTable>` (computes segment lengths and weighted values)
2. **Line chart** — if outputs have a time/x-axis key (`time`, `hour`, `instant`, `x`) AND a y-axis key (`ordinate`, `flow`, `discharge`, `pmf`, `drh`, `rainfall`, `excess`, `y`) with matching array lengths → renders `<DynamicChart>` (Recharts)
3. **Grid table** — if any output key is an array of objects → renders `<DynamicTableView>`
4. **Markdown fallback** — if `completedOutput.result.markdown` exists → renders `<MarkdownContent>`
5. **Null** — if none of the above match, renders nothing

### Methods exposed to the UI

| Method | What it does |
|---|---|
| `startRun({ stepMode })` | Clears state → fires `calcExecution.startRun` mutation |
| `stepForward()` | Fires `calcExecution.stepForward` mutation |
| `stepBack(nodeId)` | Fires `calcExecution.stepBack` mutation |
| `submitInput(values)` | Fires `calcExecution.submitInput` mutation |
| `cancel()` | Fires `calcExecution.cancelRun` mutation |
| `reset()` | Clears all state back to `initialState` |

### Two update channels

**1. tRPC Subscription (real-time WebSocket)**
```ts
useSubscription(trpc.calcExecution.subscribeProgress.subscriptionOptions({
  executionId: state.sessionId!,
  onData(event) {
    switch (event.type) {
      case "NODE_STARTED":    // update currentNodeId, set RUNNING
      case "NODE_COMPLETED":  // add to nodeOutputs, update variables
      case "NODE_FAILED":     // set ERRORED
      case "WORKFLOW_COMPLETED": // set COMPLETED
      // ...
    }
  }
}))
```
This is the **primary path** for live updates. Every time the engine completes a node, Redis publishes an event, the tRPC subscription receives it, and React state is updated immediately.

**2. Polling fallback (every 1.5s)**
```ts
useQuery(trpc.calcExecution.getSession.queryOptions({
  sessionId: state.sessionId!,
  refetchInterval: (status === "RUNNING" || status === "PENDING") ? 1500 : undefined,
}))
```
If the WebSocket drops, polling continues to keep the UI in sync.

### The `ingest()` function (lines 84–130)
Both channels feed into a single `ingest(data)` helper that merges server response into React state:
```ts
const ingest = useCallback((data: any) => {
  setState(s => {
    // merge nodeOutputs
    // merge variables
    // update status, currentNodeId, pauseReason, etc.
  });
  // sync canvas highlights
  highlightStore.syncExecutionHighlights(data.nodeExecutions);
  highlightStore.setActiveExecutionNode(data.currentNodeId);
}, [highlightStore]);
```

---

## 1.5 Status Flags Derived for the UI

```ts
return {
  isRunning:          status === "RUNNING" || status === "PENDING",
  isPaused:           status === "PAUSED",
  isComplete:         status === "COMPLETED",
  isErrored:          status === "ERRORED",
  isStepPause:        pauseReason === "step_complete",
  isInputPause:       pauseReason === "awaiting_user_input",
  isValidationPause:  pauseReason === "validation_error",
  isStarting:         startMutation.isPending,
  isSubmitting:       submitInputMutation.isPending,
  isStepping:         stepForwardMutation.isPending || stepBackMutation.isPending,
}
```

---

## 1.6 Canvas Highlight Store

**File:** `src/features/workflow-canvas/store/workflow-canvas-store.ts`

A Zustand store that tracks per-node highlight states (`RUNNING`, `COMPLETED`, `ERRORED`, `SKIPPED`) on the canvas graph. The `useExecution` hook writes to it; the canvas node components read from it to show coloured borders.

---

## Summary

1. User clicks **Run All** → `exec.startRun({ stepMode: false })` is called.
2. `useExecution` resets state, fires `startMutation.mutate({ workflowId, stepMode: false })`.
3. tRPC sends request to `execution-router.ts` → **Chapter 2** takes over.
4. While running, real-time events come back via `subscribeProgress` (Redis PubSub → tRPC subscription).
5. Each event updates React state → UI re-renders showing progress.

➡️ **Next: [Chapter 2 — tRPC Router & Run Orchestrator](./CHAPTER-2-trpc-router-and-orchestrator.md)**
