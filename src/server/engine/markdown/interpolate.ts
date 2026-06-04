/**
 * Interpolates a markdown template with values.
 *
 * Supported syntax:
 *   {{variable}}            → ctx.variables[variable]
 *   {{outputs.key}}         → outputs.key
 *   {{inputs.key}}          → inputs.key
 *   {{node.label}}          → node.label
 *   {{node.description}}    → node.description
 *   {{#if expr}}...{{/if}}  → conditional block
 *   {{#each arr}}...{{/each}} → loop over array or object entries
 *   {{@key}}                → current key in each loop
 *   {{this}}                → current value in each loop
 *   {{this.field}}          → field of current object in each loop
 */

export interface InterpolationContext {
  node: { label: string; description?: string; [key: string]: any };
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  variables: Record<string, any>;
  error?: string;
}

export function interpolate(template: string, ctx: InterpolationContext): string {
  let result = template;

  // ── Handle {{#each arr}} ... {{/each}} ──────────────────────────────────────
  result = result.replace(
    /\{\{\s*#each\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/each\s*\}\}/g,
    (_match, path, body) => {
      const trimmedPath = path.trim();
      const items = resolvePath(trimmedPath, ctx);
      if (!items) return "";

      const entries = Array.isArray(items)
        ? items.map((v, i) => ({ key: String(i), value: v }))
        : Object.entries(items).map(([k, v]) => ({ key: k, value: v }));

      // If the body starts or ends with a newline, it's likely a block-style loop.
      // We trim one leading/trailing newline and join with a single newline to prevent blank lines.
      // If it doesn't have newlines, we preserve it as an inline loop.
      const hasNewline = body.includes("\n");
      const cleanBody = body.replace(/^\n/, "").replace(/\n$/, "");

      return entries
        .map(({ key, value }) => {
          let rendered = cleanBody;
          rendered = rendered.replace(/\{\{@key\}\}/g, key);
          rendered = rendered.replace(/\{\{this\}\}/g, formatValue(value));
          if (typeof value === "object" && value !== null) {
            for (const [k, v] of Object.entries(value)) {
              rendered = rendered.replace(
                new RegExp(`\\{\\{this\\.${k}\\}\\}`, "g"),
                formatValue(v)
              );
            }
          }
          return rendered;
        })
        .join(hasNewline ? "\n" : "");
    }
  );

  // ── Handle {{#if expr}} ... {{/if}} ─────────────────────────────────────────
  result = result.replace(
    /\{\{\s*#if\s+([\w.]+)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g,
    (_match, path, body) => {
      const trimmedPath = path.trim();
      const val = resolvePath(trimmedPath, ctx);
      const parts = body.split(/\{\{\s*else\s*\}\}/);
      if (parts.length > 1) {
        return val ? parts[0] : parts[1];
      }
      return val ? body : "";
    }
  );

  // ── Handle {{#if error}} special case ────────────────────────────────────────
  result = result.replace(
    /\{\{#if error\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, body) => (ctx.error ? body : "")
  );

  // ── Simple token replacement {{path}} ────────────────────────────────────────
  result = result.replace(/\{\{\s*([\w.@]+)\s*\}\}/g, (_match, path) => {
    const trimmedPath = path.trim();
    if (trimmedPath === "error") return ctx.error ?? "";
    const val = resolvePath(trimmedPath, ctx);
    return val !== undefined ? formatValue(val) : `{{${trimmedPath}}}`;
  });

  return result;
}

function resolvePath(path: string, ctx: InterpolationContext): any {
  const parts = path.split(".");
  let current: any = {
    node: ctx.node,
    inputs: ctx.inputs,
    outputs: ctx.outputs,
    variables: ctx.variables,
    error: ctx.error,
    ...ctx.variables, // top-level variable access
  };

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number") {
    // Round to 6 significant figures for display
    return parseFloat(val.toPrecision(6)).toString();
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return `[${val.map(formatValue).join(", ")}]`;
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}
