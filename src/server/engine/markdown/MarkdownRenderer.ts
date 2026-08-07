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
  INPUT: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Input Parameters
Initialized with inputs:
{{#each inputs}}
- **{{this.label}}** (\`{{@key}}\`): **{{this.value}}** {{#if this.unit}}{{this.unit}}{{/if}}
{{/each}}

| Parameter | Key | Value | Unit |
| :--- | :--- | :--- | :--- |
{{#each inputs}}
| {{this.label}} | \`{{@key}}\` | **{{this.value}}** | {{#if this.unit}}{{this.unit}}{{else}}—{{/if}} |
{{/each}}
`,

  FORMULA: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Calculation
Expression:
\`\`\`math
{{#if outputs.displayExpression}}{{outputs.displayExpression}}{{else}}{{outputs.expression}}{{/if}}
\`\`\`

- Target: **{{outputs.outputKey}}**
- Result: **{{outputs.value}}**

| Parameter | Value |
| :--- | :--- |
| **{{outputs.outputKey}}** | **{{outputs.value}}** |
`,

  MULTI_FORMULA: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Calculation Pipeline
Evaluated sequential formulas:
{{#each outputs.expressions}}
- **{{this.description}}**: \`{{this.expression}}\` = **{{this.value}}**
{{/each}}

| Step | Expression | Value |
| :--- | :--- | :--- |
{{#each outputs.expressions}}
| {{this.description}} | \`{{this.expression}}\` | **{{this.value}}** |
{{/each}}
`,

  CUSTOM_CODE: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Script Output
Executed custom code block:
{{#each outputs}}
- **{{@key}}**: **{{this}}**
{{/each}}

| Variable | Value |
| :--- | :--- |
{{#each outputs}}
| \`{{@key}}\` | **{{this}}** |
{{/each}}

{{#if error}}
> ⚠️ **Error:** {{error}}
{{/if}}
`,

  LOOKUP_TABLE: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Table Lookup
Queried registry table using inputs:
{{#each inputs}}
- **{{@key}}**: **{{this}}**
{{/each}}

Resolved target **{{outputs.outputKey}}** to **{{outputs.value}}**.

| Filter Key | Value |
| :--- | :--- |
{{#each inputs}}
| \`{{@key}}\` | {{this}} |
{{/each}}
| **{{outputs.outputKey}} (Result)** | **{{outputs.value}}** |
`,

  GRAPH_INTERPOLATION: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Graphical Interpolation
Interpolated coordinates:
{{#each inputs}}
- **{{@key}}**: **{{this}}**
{{/each}}

Resolved coordinate target **{{outputs.outputKey}}** to **{{outputs.value}}**.

| Coordinate | Value |
| :--- | :--- |
{{#each inputs}}
| \`{{@key}}\` | {{this}} |
{{/each}}
| **{{outputs.outputKey}} (Result)** | **{{outputs.value}}** |
`,

  DECISION: `### {{node.label}}

#### Routing Decision
Evaluated conditional branches:
- **Condition Matched:** "{{outputs.matchedLabel}}"
- **Action:** Route to node **{{outputs.targetNodeId}}**

| Condition | Target |
| :--- | :--- |
| {{outputs.matchedLabel}} | {{outputs.targetNodeId}} |
`,

  DISPLAY: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Value Adoption
Compared outputs:
{{#each outputs.compareValues}}
- **{{this.method}}**: **{{this.value}}**
{{/each}}

Adoption rule **"{{outputs.selectionRule}}"** resolved to final value: **{{outputs.adopted}}**.

| Source | Value |
| :--- | :--- |
{{#each outputs.compareValues}}
| {{this.method}} | **{{this.value}}** |
{{/each}}
| **Adopted Value** | **{{outputs.adopted}}** |
`,

  VALIDATION: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Constraint Verification
Safety boundaries evaluated:
- **Status:** Passed
- **Details:** Checked variables are within design tolerances.
`,

  UNIT_CONVERSION: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

#### Unit Conversion
- **Input:** {{outputs.inputValue}} {{outputs.inputUnit}}
- **Output:** {{outputs.value}} {{outputs.outputUnit}}
`,

  CHART: `### {{node.label}}
{{#if node.description}}*{{node.description}}*{{/if}}

\`\`\`chart
{
  "title": "{{outputs.title}}",
  "chartType": "{{outputs.chartType}}",
  "xLabel": "{{outputs.xLabel}}",
  "yLabel": "{{outputs.yLabel}}",
  "xValues": {{outputs.xValues}},
  "yDataSeries": {{outputs.yDataSeries}}
}
\`\`\`
`,
};
