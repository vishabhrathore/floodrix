# Chapter 4 — Node Handlers & Math Worker

> **Picks up from:** `runHandlerWithTimeout(handler, ctx)` is called for each node.
> **Covers:** Every handler type, how math expressions are evaluated, and the Piscina worker thread.

---

## 4.1 The NodeHandler Interface

**File:** `src/server/engine/NodeHandler.ts`

```ts
export interface NodeHandler {
  readonly type: string;         // e.g. "FORMULA", "INPUT"
  readonly timeoutMs?: number;   // default 30_000ms (30s)
  execute(ctx: ExecutionContext): Promise<NodeOutcome>;
}
```

Every node type has exactly one handler class. Handlers receive an `ExecutionContext` and return a `NodeOutcome`.

### ExecutionContext (what a handler receives)
```ts
interface ExecutionContext {
  node: CalcNode;                  // the node config from DB
  edges: CalcEdge[];               // workflow edges (for DECISION branches)
  variables: VariableStore;        // shared mutable scope — read/write
  db: PrismaClient;                // DB access for LOOKUP, SUBWORKFLOW
  registry: RegistryResolver;      // formula registry access
  sessionId: string;
  workflowId: string;
  actorId: string;
  isBackgroundRun: boolean;        // affects math eval thread choice
  liveUpdates: boolean;
}
```

### NodeOutcome (what a handler returns)
```ts
type NodeOutcome =
  | { kind: "completed"; outputs: VariableMap; result: Record<string, unknown>; cpuUserMs?: number; cpuSystemMs?: number; sideEffects?: { skipNodes?: string[] } }
  | { kind: "paused"; reason: string; fields?: InputField[]; nodeLabel?: string; pauseMessage?: string }
  | { kind: "errored"; error: Error }
  | { kind: "skipped" }
```

---

## 4.2 NodeHandlerRegistry

**File:** `src/server/engine/NodeHandlerRegistry.ts`

A simple map from `CalcNodeType → NodeHandler`:

```ts
class NodeHandlerRegistry {
  private handlers = new Map<string, NodeHandler>();

  register(handler: NodeHandler): void {
    this.handlers.set(handler.type, handler);
  }

  get(type: string): NodeHandler | undefined {
    return this.handlers.get(type);
  }
}
```

All handlers are registered in `bootstrap.ts` at server startup.

---

## 4.3 FormulaHandler — The Most Important Handler

**File:** `src/server/engine/handlers/FormulaHandler.ts`
**Timeout:** 120,000ms (2 minutes)

This handles `FORMULA` nodes — the core math computation nodes.

### Two sources of formulas

**1. Registry formula** (`config.source === "registry"`)
- The formula lives in the `FormulaRegistry` table in Postgres
- Has named input/output variables with notations (like `M`, `C`, `R`)
- `variable_bindings` maps registry notation → context key (e.g. `{ "M": "catchment_area" }`)

```ts
// Fetch from registry (or use pre-fetched snapshot)
const registry = config.snapshot ?? await ctx.registry.resolveFormula(ctx.db, config.registry_id);

// Build scope: map notation → actual value from variable store
const evalScope = {};
for (const inputVar of registry.inputVariables) {
  const contextKey = bindings[inputVar.notation] ?? inputVar.key;
  const value = ctx.variables.get(contextKey);
  // Error if variable not found
  evalScope[inputVar.notation] = value;
}

expression = registry.expressionNotation;  // e.g. "Q = C * I * A"
outputKey = bindings[outputNotation] ?? registry.outputVariable.key;
```

**2. Inline formula** (`config.source === "inline"` or default)
- Expression is stored directly in the node config
- Scope is built from the entire current variable store
- `variable_bindings` optionally remap notation → context key

```ts
expression = config.expression ?? "";
evalScope = scopeFromVariables(ctx);  // all numbers/booleans/arrays from variable store
```

### Expression normalization
```ts
// If expression has no "=" assignment, auto-wrap it
const finalCode = expression.includes("=")
  ? expression
  : `${outputNotation} = ${expression}`;
// e.g. "C * I * A"  →  "result = C * I * A"
```

### Worker vs Main Thread Decision
```ts
const use_worker = config.source === "registry"
  ? (registry?.use_worker || config.use_worker ?? false)
  : (config.use_worker ?? true);

// Don't spawn worker if already inside a Piscina worker thread
const runLocally = !use_worker || (!isMainThread && ctx.isBackgroundRun);
```

### Math evaluation
```ts
const pool = new WorkerPoolTimeout();
const workerResult = await pool.runMathEvaluation(finalCode, scope, {
  timeoutMs: this.timeoutMs,
  handlerType: "FORMULA_REGISTRY_CUSTOM",
}, runLocally);
```

### Output extraction and precision
```ts
const rawValue = workerResult.outputs[outputNotation] ?? workerResult.outputs[outputKey];

// Round to configured precision
const precision = config.result_precision ?? 3;
const factor = 10 ** precision;
value = Math.round(rawValue * factor) / factor;

// Write result to variable store
ctx.variables.set(outputKey, value);
ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, { [outputKey]: value });
```

---

## 4.4 InputHandler — Pausing for User Input

**File:** `src/server/engine/handlers/InputHandler.ts`

```ts
async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
  const config = ctx.node.config as InputConfig;
  const fields = config.fields ?? [];
  const shouldPause = config.pause_execution !== false;

  // Find fields not yet in variable store
  const unassigned = fields.filter(f => !ctx.variables.has(f.key));

  if (shouldPause && unassigned.length > 0) {
    // Return field definitions to the UI for rendering <InputForm>
    return {
      kind: "paused",
      reason: "awaiting_user_input",
      fields,
      nodeLabel: ctx.node.label,
    };
  }

  // All fields present (or pause_execution: false) — apply defaults + complete
  const outputs = {};
  for (const f of fields) {
    if (!ctx.variables.has(f.key) && f.default !== undefined) {
      ctx.variables.set(f.key, f.default);
    }
    const value = ctx.variables.get(f.key);
    if (value !== undefined) {
      outputs[f.key] = value;
      // MCQ special case: inject extra variables from selected option
      if (f.data_type === "mcq" && f.mcq_options) {
        const selectedOption = f.mcq_options.find(opt => opt.label === value);
        if (selectedOption?.variables) {
          for (const v of selectedOption.variables) {
            if (v.key) { ctx.variables.set(v.key, v.value); outputs[v.key] = v.value; }
          }
        }
      }
    }
  }
  ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);
  return { kind: "completed", outputs, result: { fields: fields.map(f => f.key), provided: Object.keys(outputs) } };
}
```

When user submits via `<InputForm>` → `submitInput` mutation → `executor.resumeWithInput()`:
1. User values are written to `variableStore`
2. Handler is called again for the same node
3. `unassigned` is now empty → returns `completed`

**MCQ note:** When user selects an MCQ option (e.g. "Soil Type = Clay"), the handler also injects the option's bundled variables (e.g. `CN = 72`) directly into the variable store.

---

## 4.5 LookupTableHandler

**File:** `src/server/engine/handlers/LookupTableHandler.ts`

Looks up a value from a 2D table (stored in the workflow node config or formula registry).

```
config = {
  lookup_key: "rainfall_duration",      // variable name to look up
  table: [ [10, 25.4], [20, 38.1], [30, 50.8] ],   // [key, value] pairs
  output_variable: "rainfall_intensity",
  interpolate: true                     // linear interpolation between rows
}
```

1. Read `lookup_key` value from `variableStore`
2. Find matching row in `table`
3. If `interpolate: true` → linearly interpolate between adjacent rows
4. Write result to `variableStore[output_variable]`

---

## 4.6 InterpolationHandler

**File:** `src/server/engine/handlers/InterpolationHandler.ts`

More advanced than lookup — reads an x-value and interpolates y from a coordinate table.

```
config = {
  x_variable: "time_hours",
  x_table: [0, 1, 2, 3, 4],
  y_table: [0, 12.5, 25.0, 18.5, 8.0],
  output_variable: "unit_hydrograph_ordinate",
}
```

Evaluates piecewise linear interpolation between table points.

---

## 4.7 DecisionHandler — Branching

**File:** `src/server/engine/handlers/DecisionHandler.ts`

Reads a condition from config and evaluates it against variable store values.

```
config = {
  condition: "rainfall > threshold_value",   // boolean math.js expression
  branches: {
    "true":  { label: "High Rainfall",  set_variables: { design_storm: 100 } },
    "false": { label: "Normal Rainfall", set_variables: { design_storm: 50  } },
  }
}
```

**How it actually works (not value-matching, it's boolean math):**

```ts
// 1. Build scope from numeric/boolean vars in store
const scope = {};
for (const [k, v] of Object.entries(snap)) {
  if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
}

// 2. Evaluate condition via safeEvaluate (returns number: >0 = truthy)
const numResult = safeEvaluate(config.condition, scope, { precision: 0, timeoutMs: 5000 });
conditionResult = numResult > 0;  // true or false

// 3. Apply taken branch's set_variables to the store
const branchTaken = conditionResult ? "true" : "false";
for (const [k, v] of Object.entries(branches[branchTaken].set_variables)) {
  ctx.variables.set(k, v);
}

// 4. Compute skip set — BFS from not-taken branch edges
// Conservative: only skip a node if ALL its inbound edges come from already-skipped nodes
const skipNodes = computeSkipSet(ctx.node.id, branchNotTaken, ctx.edges);
```

Returns:
```ts
return {
  kind: "completed",
  outputs: setVars,  // variables set by the taken branch
  result: { condition, evaluatedTo: conditionResult, branchTaken, skippedNodes },
  sideEffects: { skipNodes },  // tells executor which nodes to add to skipSet
};
```

The executor adds these IDs to `skipSet`. The `computeSkipSet` BFS is **conservative** — it only skips a node if every path reaching it comes through the not-taken branch. If a node has any path from the taken branch, it stays scheduled.

---

## 4.8 ValidationHandler

**File:** `src/server/engine/handlers/ValidationHandler.ts`

Evaluates an assertion against variable values.

```
config = {
  expression: "rainfall > 0 and rainfall < 1000",
  error_message: "Rainfall must be between 0 and 1000 mm",
}
```

- If assertion passes → `{ kind: "completed" }`
- If assertion fails → `{ kind: "paused", reason: "validation_error", pauseMessage: error_message }`

UI shows the validation error card. User can only cancel the run (cannot fix and continue — they must restart).

---

## 4.9 DisplayHandler

**File:** `src/server/engine/handlers/DisplayHandler.ts`

Renders a markdown template using current variable values.

```
config = {
  template: "## Results\n\n**Peak Flow:** {{Qp}} cumec\n**Time to Peak:** {{Tp}} hours",
  output_variable: "display_output",
}
```

Uses Handlebars-style `{{variable_name}}` substitution. Output is stored as markdown string in `variableStore`.

---

## 4.10 ChartHandler

**File:** `src/server/engine/handlers/ChartHandler.ts`

Assembles chart data payloads from variable arrays.

```
config = {
  chart_type: "line",
  series: [
    { label: "Unit Hydrograph", x_variable: "time_array", y_variable: "uh_ordinates" },
    { label: "Direct Runoff",   x_variable: "time_array", y_variable: "dro_array" },
  ],
  output_variable: "hydrograph_chart_data",
}
```

Reads arrays from variable store, assembles into chart-ready JSON, stores in `variableStore`. The UI renders this as a Recharts component.

---

## 4.11 UnitConversionHandler

**File:** `src/server/engine/handlers/UnitConversionHandler.ts`

```
config = {
  input_variable: "area_sqkm",
  from_unit: "km2",
  to_unit: "m2",
  output_variable: "area_sqm",
  conversion_factor: 1_000_000,
}
```

Simple multiplication/division. Evaluates in the main thread (no worker needed).

---

## 4.12 SubworkflowHandler

**File:** `src/server/engine/handlers/SubworkflowHandler.ts`

Spawns a nested workflow run as a child session.

```ts
async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
  const config = ctx.node.config as SubworkflowConfig;

  // Map parent variables to child workflow's expected input keys
  const childInputs = {};
  for (const mapping of config.input_mappings) {
    childInputs[mapping.childKey] = ctx.variables.get(mapping.parentKey);
  }

  // Run child workflow (INLINE_SYNC) with parent context
  const result = await executor.startExecution(
    config.sub_workflow_id,
    ctx.actorId,
    childInputs,
    {
      parentSessionId: ctx.sessionId,
      ancestorWorkflowChain: [...config.ancestorChain, ctx.workflowId],
      isBackgroundRun: ctx.isBackgroundRun,
    }
  );

  // Map child outputs back to parent variable store
  for (const mapping of config.output_mappings) {
    const value = result.variables[mapping.childKey];
    ctx.variables.set(mapping.parentKey, value);
  }

  return { kind: "completed", outputs: result.variables, result: { subSessionId: result.sessionId } };
}
```

---

## 4.13 CustomCodeHandler

**File:** `src/server/engine/handlers/CustomCodeHandler.ts`

Executes user-written JavaScript in a sandboxed `vm.runInContext` environment.

```ts
config = {
  code: `
    const rainfall_data = inputs.rainfall_array;
    const peak = Math.max(...rainfall_data);
    const mean = rainfall_data.reduce((a, b) => a + b, 0) / rainfall_data.length;
    return { peak_rainfall: peak, mean_rainfall: mean };
  `,
  input_variables: ["rainfall_array"],
  output_variables: ["peak_rainfall", "mean_rainfall"],
}
```

Uses `isJS: true` flag → `worker-mathjs-runner.js` runs it through Node.js `vm` module. Sandbox only exposes: `Math`, `Array`, `Object`, `String`, `Number`, `Boolean`, `RegExp`, `Date`, `JSON`, `Map`, `Set` — no `process`, `require`, or `global`.

---

## 4.14 MultiFormulaHandler

**File:** `src/server/engine/handlers/MultiFormulaHandler.ts`

Evaluates multiple formula expressions in sequence within one node.

```ts
config = {
  formulas: [
    { expression: "tc = 0.87 * (L^3 / H)^0.385", result_variable: "tc" },
    { expression: "Tp = tc / 2 + 0.6 * tc",       result_variable: "Tp" },
    { expression: "Qp = 2.08 * A / Tp",            result_variable: "Qp" },
  ]
}
```

Each formula is evaluated in order, with each result written to scope before the next runs.

---

## 4.15 The Piscina Math Worker — `worker-mathjs-runner.js`

**File:** `src/server/engine/worker-mathjs-runner.js`

This runs in **isolated Piscina worker threads** — completely separate from the Next.js event loop.

### Why Piscina?
`Promise.race` with `setTimeout` can detect a timeout but **cannot cancel** the running code. A bad formula like `factorial(99999)` would keep burning CPU even after we "timed out". With Piscina + `AbortController`, the thread is actually **killed** when timeout fires.

### WorkerPoolTimeout singleton
```ts
// src/server/engine/WorkerPoolTimeout.ts

let piscinaInstance: Piscina | null = null;

function getPiscinaInstance(): Piscina {
  if (!piscinaInstance) {
    piscinaInstance = new Piscina({
      filename: "src/server/engine/worker-mathjs-runner.js",
      minThreads: 2,
      maxThreads: Math.max(2, os.cpus().length), // scales to CPU core count
    });
  }
  return piscinaInstance;
}
```

Thread pool is created once and reused. Threads are warm — no startup cost per evaluation.

### Running a task
```ts
const piscina = getPiscinaInstance();
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  return await piscina.run(
    { code, scope, isJS: opts.isJS },
    { signal: controller.signal }
  );
} catch (err) {
  if (controller.signal.aborted) {
    throw new Error(`Worker timed out after ${timeoutMs}ms`);
  }
  throw err;
} finally {
  clearTimeout(timer);
}
```

### Security checks in worker
```js
// worker-mathjs-runner.js, line 177
if (/constructor|__proto__|prototype|global|process|require|module|exports/i.test(req.code)) {
  throw new Error("Formula execution aborted: Security audit violation");
}
```

All dangerous JS keywords are blocked before evaluation begins.

### Math.js configuration in worker
```js
const math = create(all);

// Patched functions with dimension limits (MAX_ELEMENTS = 10,000,000)
math.import({
  import:      () => { throw new Error("import disabled"); },
  createUnit:  () => { throw new Error("createUnit disabled"); },
  simplify:    () => { throw new Error("simplify disabled"); },
  parse:       () => { throw new Error("parse disabled"); },
  compile:     () => { throw new Error("compile disabled"); },
  random:      safeRandom,    // checks matrix size before creating
  ones:        safeOnes,
  zeros:       safeZeros,
  identity:    safeIdentity,
  range:       safeRange,
  convolve:    convolve,          // custom: rainfall-UH convolution
  forecastLinear: forecastLinear, // custom: linear regression forecast
}, { override: true });
```

**Custom functions available to formulas:**

| Function | Purpose |
|---|---|
| `convolve(rain, uh)` | Convolution of rainfall array with unit hydrograph |
| `forecastLinear(targetX, yValues, xValues)` | Linear regression extrapolation |
| `safeRange(start, end, step)` | Bounds-checked array range |
| `safeOnes / safeZeros / safeIdentity` | Bounds-checked matrix creation |

---

## 4.16 Markdown Enrichment

After a node completes, the executor calls:

```ts
private enrichOutcomeWithMarkdown(node, outcome, variables) {
  const template = node.config?.display_template ?? DEFAULT_TEMPLATES[node.type];
  if (template) {
    outcome.result.markdown = renderMarkdown(template, variables, outcome.outputs);
  }
}
```

`renderMarkdown` (from `src/server/engine/markdown/MarkdownRenderer.ts`) substitutes `{{variable_name}}` placeholders. The result is stored in `CalcNodeExecution.result.markdown` and rendered in the UI via `<MarkdownContent>`.

---

## Summary — Handler Routing

```
node.type  →  handler
──────────────────────────────────────────────────────────────
INPUT          → InputHandler       (pause for user values)
FORMULA        → FormulaHandler     (math.js via Piscina worker)
MULTI_FORMULA  → MultiFormulaHandler (multiple formulas in sequence)
LOOKUP         → LookupTableHandler  (table row lookup)
INTERPOLATION  → InterpolationHandler (linear interpolation)
DECISION       → DecisionHandler    (branch + skip set)
VALIDATION     → ValidationHandler  (assert condition)
DISPLAY        → DisplayHandler     (markdown template render)
CHART          → ChartHandler       (chart data assembly)
UNIT_CONVERSION → UnitConversionHandler (unit math)
SUBWORKFLOW    → SubworkflowHandler (nested workflow run)
CUSTOM_CODE    → CustomCodeHandler  (sandboxed JS via vm)
```

All handlers except `InputHandler` and `UnitConversionHandler` use math evaluation via `WorkerPoolTimeout` (Piscina).

➡️ **Next: [Chapter 5 — Variable Store, Cache & Persistence](./CHAPTER-5-variable-store-cache-and-persistence.md)**
