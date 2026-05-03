// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/FormulaHandler.ts
//
//  FORMULA node — evaluates a single mathjs expression.
//  - source: "registry" → fetch expression from FormulaRegistryItem,
//    apply variable_bindings to map registry notation → context keys
//  - source: "inline" → use config.expression directly
//
//  Routes through safeEvaluate so timeout enforcement applies uniformly.
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { safeEvaluate } from "@/features/workflow-canvas/engine/formula-validator";

interface FormulaConfig {
    source?: "registry" | "inline";
    registry_id?: string;
    registry_version?: number | null;
    variable_bindings?: Record<string, string>;
    overrides?: { result_variable?: string; result_precision?: number };
    expression?: string;
    display_expression?: string;
    result_variable?: string;
    result_unit?: string;
    result_precision?: number;
}

export class FormulaHandler implements NodeHandler {
    readonly type = "FORMULA" as const;
    readonly timeoutMs = 5_000;

    async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
        try {
            const config = (ctx.node.config ?? {}) as FormulaConfig;

            let expression: string;
            let displayExpression: string;
            let outputKey: string;
            let evalScope: Record<string, number | boolean>;

            if (config.source === "registry" && config.registry_id) {
                const registry = await ctx.registry.resolveFormula(
                    ctx.db,
                    config.registry_id,
                    config.registry_version ?? null
                );

                const bindings = config.variable_bindings ?? {};
                expression = registry.expressionNotation;
                displayExpression = registry.displayExpression;

                // Build scope: registry uses `notation` keys (M, C, etc.);
                // we feed them values pulled from the bound context keys.
                evalScope = {};
                for (const inputVar of registry.inputVariables) {
                    const contextKey = bindings[inputVar.notation] ?? inputVar.key;
                    const value = ctx.variables.get(contextKey);
                    if (value === undefined) {
                        return toErroredOutcome(new Error(
                            `${registry.name} requires "${inputVar.notation}" (bound to "${contextKey}") ` +
                            `but it hasn't been computed yet. ` +
                            `Add an upstream node that produces "${contextKey}".`
                        ));
                    }
                    if (typeof value !== "number" && typeof value !== "boolean") {
                        return toErroredOutcome(new Error(
                            `${registry.name}: variable "${contextKey}" is ${typeof value}, expected number/boolean`
                        ));
                    }
                    evalScope[inputVar.notation] = value;
                }

                outputKey = bindings[registry.outputVariable.notation] ?? registry.outputVariable.key;
                if (config.overrides?.result_variable) {
                    outputKey = config.overrides.result_variable;
                }
            } else {
                expression = config.expression ?? "";
                displayExpression = config.display_expression ?? expression;
                outputKey = config.result_variable ?? "result";

                // Build scope from current variables
                evalScope = scopeFromVariables(ctx);

                // If explicit bindings are provided for the inline expression, apply them.
                // This allows notations like "c" to work even if the store only has "field_1".
                if (config.variable_bindings) {
                    for (const [notation, contextKey] of Object.entries(config.variable_bindings)) {
                        const value = ctx.variables.get(contextKey);
                        if (value !== undefined && (typeof value === "number" || typeof value === "boolean")) {
                            evalScope[notation] = value;
                        }
                    }
                }
            }

            if (!expression.trim()) {
                return toErroredOutcome(new Error("Formula has no expression configured"));
            }

            const precision = config.overrides?.result_precision ?? config.result_precision ?? 3;
            const value = safeEvaluate(expression, evalScope, {
                precision,
                timeoutMs: this.timeoutMs,
            });

            ctx.variables.set(outputKey, value);
            const outputs: VariableMap = { [outputKey]: value };
            ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

            return {
                kind: "completed",
                outputs,
                result: {
                    expression,
                    displayExpression,
                    evalScope,
                    value,
                    outputKey,
                },
            };
        } catch (err) {
            return toErroredOutcome(err);
        }
    }
}

/**
 * Pull the subset of variables that are usable in mathjs expressions
 * (numbers and booleans). Strings, arrays, and objects are excluded since
 * formulas can't operate on them anyway, and including them would pollute
 * the scope with values that throw confusing errors if accidentally referenced.
 */
function scopeFromVariables(ctx: ExecutionContext): Record<string, number | boolean> {
    const snap = ctx.variables.snapshot();
    const scope: Record<string, number | boolean> = {};
    for (const [k, v] of Object.entries(snap)) {
        if (k === "$nodes" || k === "$results") continue;
        if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
    }
    return scope;
}