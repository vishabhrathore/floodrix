# Dynamic Workflow Engine Specification: Inputs, Formulas, and Markdown Templating

This document serves as a complete technical specification and developer manual for the **Floodrix Workflow Orchestration Engine**. It defines the precise configuration schemas, runtime execution behaviors, variable scope mappings, and markdown template interpolation rules.

Use this specification to configure, validate, and automatically generate valid workflow JSON payloads that can be successfully executed by the server and rendered in the canvas sidebar.

---

## 📥 1. Input Nodes (`INPUT`)

Input nodes collect user-provided parameters, validate them, and initialize the global execution `VariableStore`.

### ⚙️ Configuration Schema (`node.config`)
An Input node has a `fields` array. Each field maps a form element to a global runtime variable:
```json
{
  "fields": [
    {
      "key": "field_1",
      "label": "Reservoir Height",
      "notation": "H",
      "unit": "meters",
      "value": 12.5
    }
  ]
}
```

### 🧠 Runtime Lifecycle & Variables
1. When execution begins, every field inside `config.fields` is loaded.
2. The user-provided or default `value` is registered in the global variable map under the unique `key` (e.g. `field_1`).
3. An `inputs` object is constructed for markdown template interpolation:
   ```json
   {
     "field_1": {
       "label": "Reservoir Height",
       "notation": "H",
       "value": 12.5,
       "unit": "meters"
     }
   }
   ```

---

## 🔢 2. Formula Nodes (`FORMULA`)

Formula nodes evaluate mathematical expressions using the **MathJS** engine. They can run either inline simple expressions or call complex parameterized formulas from the global registry.

### ⚙️ Configuration Schema (`node.config`)
Formula nodes support two execution sources:

#### A. Inline Formulas (`source: "inline"`)
Directly executes a math expression using custom variable scoping:
```json
{
  "source": "inline",
  "expression": "Q = C * A * sqrt(2 * g * H)",
  "display_expression": "Q = C · A · \\sqrt{2gH}",
  "result_variable": "discharge_output",
  "result_precision": 3,
  "use_worker": false,
  "variable_bindings": {
    "C": "field_discharge_coefficient",
    "A": "field_orifice_area",
    "g": "constant_gravity",
    "H": "field_1"
  }
}
```

#### B. Registry Formulas (`source: "registry"`)
Pulls a validated, published formula specification from the SQL Database:
```json
{
  "source": "registry",
  "registry_id": "form_rec_01h8x9p",
  "variable_bindings": {
    "A": "input_width",
    "B": "input_depth"
  },
  "result_variable": "computed_area",
  "result_precision": 4
}
```

### 🧠 Scope & Variable Bindings
To decouple equations from direct UI state, the execution engine maps variables using the `variable_bindings` dictionary:
* **The Formula Equation** references short mathematical notations (e.g., `H`, `C`, `A`).
* **The variable_bindings Map** translates notations to global variable keys:
  $$\text{notation} \longrightarrow \text{global\_variable\_key}$$
* During execution, the engine queries the global `VariableStore` for each bound key, populating a clean mathematical scope object (e.g., `{ H: 12.5, C: 0.6 }`) before compiling the math.

### 🧵 Threading Execution (Main vs Worker)
* **Main Thread (Fast path):** Simple single-line evaluations execute synchronously in the main thread (completion in under $2\text{ms}$).
* **Piscina Worker Pool (Heavy tasks):** If `use_worker: true` or a multiline block containing matrix operations (e.g., loops, ranges, matrices) is detected, the engine runs the task in an isolated Piscina worker thread with a **120-second timeout limit** and safety caps.
* **OOM Prevention:** JavaScript allocations (e.g., `random([10000, 10000])`) can instantly exceed V8 memory limits due to object wrapping. Limit matrix allocations to a maximum of $1,000,000$ elements for safe shared-server runtime.

---

## 📝 3. Markdown Templating & Rendering

Once a node executes successfully, the engine automatically populates a dynamic markdown outline of the outcome. 

### 🗃️ Interpolation Template Context
The rendering engine compiles templates using a strict interpolation context. Use these exact variable paths in your templates:

```typescript
interface InterpolationContext {
  // Metadata about the active node
  node: {
    id: string;
    label: string;
    description?: string;
    type: string;
  };
  // Parsed inputs matching config parameters
  inputs: Record<string, {
    label: string;
    notation: string;
    value: any;
    unit: string;
  }>;
  // Node outcomes and computed results
  outputs: {
    displayExpression: string; // The formatted math equation
    value: any;                // The rounded output number or array
    expressions: Array<{       // Array of individual operations (useful for loops)
      outputKey: string;
      expression: string;
      description: string;
      value: any;
      unit: string;
    }>;
    [key: string]: any;
  };
  // Full flat global variables snapshot
  variables: Record<string, any>;
  // Optional runtime error message
  error?: string;
}
```

### ⚙️ Template Syntax Rules

#### A. Standard Interpolation (`{{path}}`)
Inserts variables directly. Numerical values are automatically formatted and rounded to **6 significant figures** for premium display.
```markdown
* Node: **{{node.label}}**
* Formula used: $${{outputs.displayExpression}}$$
* Computed Result: **{{outputs.value}}**
```

#### B. Conditional Blocks (`{{#if}} ... {{/if}}`)
Renders a block only if the path resolves to a truthy value:
```markdown
{{#if node.description}}
> 💡 *Description: {{node.description}}*
{{/if}}
```

#### C. Loop Iterations (`{{#each}} ... {{/each}}`)
Loops through arrays (like `outputs.expressions`) or key-value object entries. Within the loop:
* `{{this}}` points to the active element.
* `{{@key}}` maps the active index or object key.
* `{{this.property}}` accesses children values.

```markdown
### Applied Formula Timeline
{{#each outputs.expressions}}
- **{{this.description}}**: $${{this.expression}}$$ ➔ **{{this.value}}** {{this.unit}}
{{/each}}
```

#### D. LaTeX / KaTeX Mathematical Notation
For rich scientific output, wrap KaTeX expressions within double dollar-signs `$$ ... $$` to enable smooth typographic rendering of equations, fractions, and Greek symbols:
```markdown
$$\sigma = \frac{M \cdot c}{I}$$
```

---

## 🤖 4. AI Guide: How to Generate a Valid Workflow

When constructing or modifying a workflow automatically, always follow these structure validation rules:

### 1. Variables Dependency Chain
An edge represents data flow. A Formula node can **only** evaluate if all keys bound in its `variable_bindings` have been created by upstream nodes.
* **Good:** `INPUT (outputs H)` ➔ `Edge` ➔ `FORMULA (bindings: { H: "H" })`
* **Bad:** `FORMULA (bindings: { H: "H" })` executing before `H` is defined.

### 2. Edge Integrity
Every edge must link `sourceNodeId` to `targetNodeId`, mapping the target node as a dependent of the source.

### 3. Concrete Workflow JSON Structure
Here is an example of a perfectly structured 2-node workflow representing pressure head evaluation:

```json
{
  "name": "Orifice Pressure Head",
  "description": "Calculates fluid discharge velocity through an orifice.",
  "nodes": [
    {
      "id": "node_input_head",
      "type": "INPUT",
      "label": "Pressure Head",
      "positionX": 100,
      "positionY": 150,
      "config": {
        "fields": [
          {
            "key": "fluid_height",
            "label": "Fluid Height",
            "notation": "h",
            "unit": "m",
            "value": 15.0
          }
        ]
      }
    },
    {
      "id": "node_formula_velocity",
      "type": "FORMULA",
      "label": "Torricelli Velocity",
      "positionX": 450,
      "positionY": 150,
      "config": {
        "source": "inline",
        "expression": "v = sqrt(2 * 9.81 * h)",
        "display_expression": "v = \\sqrt{2gh}",
        "result_variable": "discharge_velocity",
        "result_precision": 3,
        "variable_bindings": {
          "h": "fluid_height"
        },
        "markdownTemplate": "## 🚀 Torricelli Output\n\nFor a fluid height of **{{variables.fluid_height}} m**:\n\n**Velocity Formula:**\n$${{outputs.displayExpression}}$$\n\nResulting Velocity: **{{outputs.value}} m/s**"
      }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "sourceNodeId": "node_input_head",
      "targetNodeId": "node_formula_velocity",
      "sourceHandle": "output",
      "targetHandle": "input"
    }
  ]
}
```

---

## 🌐 5. Programmatic JSON Import API (`importWorkflow`)

To support programmatic migrations, automated AI workflow generation, and backup restores, the orchestration engine exposes a robust, transactional import mutation endpoint.

### 🔌 API Signature (tRPC)
* **Path:** `trpc.calcWorkflowCanvas.importWorkflow`
* **Procedure Type:** `MUTATION`
* **Access Level:** `Protected` (Requires active user authentication & organization member scope)

### 📥 Request Input
```typescript
interface ImportWorkflowInput {
  organizationId: string; // Target organization slug/id to host the workflow
  workflowJson: string;   // Stringified JSON payload matching the spec in Section 4
}
```

### 🧠 Transactional Import & ID Re-Mapping
The import API does not just dump JSON into the database. It executes a comprehensive, single-transaction migration sequence:
1. **Zod Validation:** The uploaded string is parsed and validated against `importWorkflowSchema`, guaranteeing that all node fields, matrix capacities, and formatting schemas conform to security policies.
2. **Kebab Slug Generation:** Generates a kebab-case slug based on the name. If a collision is found in the target organization, it automatically appends a version counter (e.g. `torricelli-velocity-3`).
3. **Owner Collaborator Setup:** The importing user's actor ID is automatically fetched or mapped. The engine creates a `CalcCollaborator` link establishing the importer as the root `ADMIN` of the draft workflow.
4. **CUID Regeneration & ID Resolution:**
   To prevent primary key collisions with pre-existing nodes:
   * A mapping dictionary is opened: `nodeIdMap: Map<string, string>`.
   * For every node in the JSON, the engine generates a fresh database CUID. It stores the mapping:
     $$\text{old\_json\_node\_id} \longrightarrow \text{new\_database\_cuid\_id}$$
   * When importing edges, the engine translates the original `sourceNodeId` and `targetNodeId` through the mapping dictionary, writing perfectly linked, error-free connections to the database!

