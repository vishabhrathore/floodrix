// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/MultiFormulaHandler.ts
//
//  MULTI_FORMULA — evaluate several formulas in sequence; later formulas
//  see results of earlier ones. Each formula goes through safeEvaluate.
//
//  If any formula errors, we stop and return the error — partial results
//  are tracked in $nodes for whatever did complete.
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { safeEvaluate } from "@/features/workflow-canvas/engine/formula-validator";

interface MultiFormulaConfig {
    formulas?: { expr: string; result_var: string; unit?: string; label?: string; precision?: number }[];
}

export class MultiFormulaHandler implements NodeHandler {
    readonly type = "MULTI_FORMULA" as const;
    readonly timeoutMs = 10_000;

    async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
        try {
            const config = (ctx.node.config ?? {}) as MultiFormulaConfig;
            const formulas = config.formulas ?? [];

            if (formulas.length === 0) {
                return toErroredOutcome(new Error("MULTI_FORMULA has no formulas configured"));
            }

            const outputs: VariableMap = {};
            const trace: { expr: string; resultVar: string; value: number; label?: string }[] = [];

            // Build scope once, then update as we go so later formulas see earlier results
            const scope: Record<string, number | boolean> = {};
            const snap = ctx.variables.snapshot();
            for (const [k, v] of Object.entries(snap)) {
                if (k === "$nodes" || k === "$results") continue;
                if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
            }

            for (const f of formulas) {
                if (!f.expr?.trim() || !f.result_var) {
                    return toErroredOutcome(new Error(
                        `MULTI_FORMULA formula "${f.label ?? f.result_var}" is missing expr or result_var`
                    ));
                }

                const value = safeEvaluate(f.expr, scope, {
                    precision: f.precision ?? 3,
                    timeoutMs: this.timeoutMs,
                });

                ctx.variables.set(f.result_var, value);
                scope[f.result_var] = value; // visible to next formula in the same node
                outputs[f.result_var] = value;
                trace.push({ expr: f.expr, resultVar: f.result_var, value, label: f.label });
            }

            ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

            return {
                kind: "completed",
                outputs,
                result: { formulas: trace },
            };
        } catch (err) {
            return toErroredOutcome(err);
        }
    }
}