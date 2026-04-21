// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/DisplayHandler.ts
//
//  DISPLAY — compare multiple variables and pick a "design value" via a
//  selection rule.
//
//  Bug 9 fix from the mental model: max/min on empty arrays threw ±Infinity.
//  We now check empty input first and return a descriptive error.
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { safeEvaluate } from "@/features/workflow-canvas/engine/formula-validator";

interface DisplayConfig {
    mode?: string;
    compare_variables?: { key: string; method?: string; label?: string }[];
    selection_rule?: "max" | "min" | "average" | "custom";
    custom_selection_expr?: string;
    result_variable?: string;
    result_unit?: string;
}

export class DisplayHandler implements NodeHandler {
    readonly type = "DISPLAY" as const;
    readonly timeoutMs = 5_000;

    async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
        try {
            const config = (ctx.node.config ?? {}) as DisplayConfig;
            const compareVars = config.compare_variables ?? [];

            if (compareVars.length === 0) {
                return toErroredOutcome(new Error("DISPLAY has no variables to compare"));
            }

            const values = compareVars.map((cv) => {
                const v = ctx.variables.get(cv.key);
                const num = typeof v === "number" ? v : Number(v);
                return {
                    key: cv.key,
                    method: cv.method ?? cv.label ?? cv.key,
                    value: Number.isFinite(num) ? num : 0,
                };
            });

            const positiveValues = values.filter((v) => v.value > 0);
            const rule = config.selection_rule ?? "max";
            let selectedValue: number;
            let selectionDetails: Record<string, unknown> = {};

            if (rule === "max") {
                if (positiveValues.length === 0) {
                    return toErroredOutcome(new Error(
                        "DISPLAY (max): no positive values to compare. " +
                        "All compared variables are zero or missing."
                    ));
                }
                const sorted = [...positiveValues].sort((a, b) => b.value - a.value);
                const Q1 = sorted[0].value;
                const Q2 = sorted[1]?.value ?? 0;
                const check15 = 1.5 * Q2;
                // IRC:SP:13 Article-6: if 1.5×Q2 > Q1, adopt 1.5×Q2
                selectedValue = check15 > Q1 ? Math.round(check15) : Math.round(Q1);
                selectionDetails = {
                    ranking: sorted, Q1, Q2,
                    check_1_5_Q2: check15,
                    adopted: selectedValue,
                    adoptionRule: check15 > Q1 ? "1.5 × Q2 (exceeds Q1)" : "Q1 (highest)",
                };
            } else if (rule === "min") {
                if (positiveValues.length === 0) {
                    return toErroredOutcome(new Error("DISPLAY (min): no positive values to compare"));
                }
                selectedValue = Math.min(...positiveValues.map((v) => v.value));
                selectionDetails = { rule: "minimum", selectedValue };
            } else if (rule === "average") {
                if (positiveValues.length === 0) {
                    return toErroredOutcome(new Error("DISPLAY (average): no positive values to compare"));
                }
                selectedValue = positiveValues.reduce((s, v) => s + v.value, 0) / positiveValues.length;
                selectionDetails = { rule: "average", count: positiveValues.length, selectedValue };
            } else if (rule === "custom") {
                if (!config.custom_selection_expr) {
                    return toErroredOutcome(new Error("DISPLAY (custom): no custom_selection_expr configured"));
                }
                const snap = ctx.variables.snapshot();
                const scope: Record<string, number | boolean> = {};
                for (const [k, v] of Object.entries(snap)) {
                    if (k === "$nodes" || k === "$results") continue;
                    if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
                }
                selectedValue = safeEvaluate(config.custom_selection_expr, scope, {
                    timeoutMs: this.timeoutMs,
                });
                selectionDetails = { rule: "custom", expr: config.custom_selection_expr, selectedValue };
            } else {
                return toErroredOutcome(new Error(`DISPLAY: unknown selection_rule "${rule}"`));
            }

            const outputs: VariableMap = {};
            if (config.result_variable) {
                ctx.variables.set(config.result_variable, selectedValue);
                outputs[config.result_variable] = selectedValue;
            }
            ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

            return {
                kind: "completed",
                outputs,
                result: {
                    mode: config.mode ?? "comparison",
                    compareValues: values,
                    selectionRule: rule,
                    ...selectionDetails,
                },
            };
        } catch (err) {
            return toErroredOutcome(err);
        }
    }
}