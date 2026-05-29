import { interpolate } from "./interpolate";

export function renderMarkdown(
  template: string,
  ctx: {
    node: { id: string; label: string; description?: string | null; type: string };
    inputs: Record<string, any>;
    outputs: Record<string, any>;
    variables: Record<string, any>;
    error?: string;
  }
): string {
  return interpolate(template, {
    node: {
      id: ctx.node.id,
      label: ctx.node.label,
      description: ctx.node.description ?? undefined,
      type: ctx.node.type,
    },
    inputs: ctx.inputs,
    outputs: ctx.outputs,
    variables: ctx.variables,
    error: ctx.error,
  }).replace(/\r\n/g, "\n");
}

export const DEFAULT_TEMPLATES: Record<string, string> = {
  INPUT: `## 📥 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

| Parameter | Value | Unit |
|-----------|-------|------|{{#each inputs}}
| {{this.label}} | **{{this.value}}** | {{this.unit}} |{{/each}}
`,

  FORMULA: `## 🔢 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

**Formula:**
\$\${{outputs.displayExpression}}\$\$

Result: **{{outputs.value}}**
`,

  MULTI_FORMULA: `## 🔢 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

### Formulas Applied

{{#each outputs.expressions}}
**{{this.description}}**
\$\${{this.expression}}\$\$
Result: **{{this.value}}**

{{/each}}
`,

  CUSTOM_CODE: `## ⚙️ {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

**Outputs:**
{{#each outputs}}
- **{{@key}}**: {{this}}
{{/each}}

{{#if error}}
> ⚠️ Error: {{error}}
{{/if}}
`,

  LOOKUP_TABLE: `## 📋 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

### Lookup Keys

| Parameter | Value |
|-----------|-------|{{#each inputs}}
| {{@key}} | {{this}} |{{/each}}

**Result:** {{outputs.outputKey}} = **{{outputs.value}}**
`,

  GRAPH_INTERPOLATION: `## 📋 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

### Interpolation Input

| Parameter | Value |
|-----------|-------|{{#each inputs}}
| {{@key}} | {{this}} |{{/each}}

**Result:** {{outputs.outputKey}} = **{{outputs.value}}**
`,

  DECISION: `## 🔀 {{node.label}}

**Condition matched:** {{outputs.matchedLabel}}

**Routing to:** {{outputs.targetNodeId}}
`,

  DISPLAY: `## 🌉 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

### Comparison Values

| Method / Source | Value |
|-----------------|-------|{{#each outputs.compareValues}}
| {{this.method}} | **{{this.value}}** |{{/each}}

**Selection Rule:** {{outputs.selectionRule}}
**Adopted Value:** **{{outputs.adopted}}**
`,

  VALIDATION: `## ✅ {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

**Validation Status:** Passed
`,

  UNIT_CONVERSION: `## 🔄 {{node.label}}

{{#if node.description}}*{{node.description}}*{{/if}}

**Converted:** {{outputs.inputValue}} {{outputs.inputUnit}} ➔ **{{outputs.value}} {{outputs.outputUnit}}**
`,
};
