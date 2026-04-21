// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/UnitConversionHandler.ts
//
//  UNIT_CONVERSION — converts a value from one unit to another.
//  Supports either:
//    - input_unit / output_unit (uses the unit registry in units.ts)
//    - expression (for custom conversion math)
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { convertUnit } from "@/features/workflow-canvas/engine/units";
import { safeEvaluate } from "@/features/workflow-canvas/engine/formula-validator";

interface UnitConversionConfig {
    input_variable?: string;
    input_unit?: string;
    output_variable?: string;
    result_variable?: string;
    output_unit?: string;
    expression?: string;
    precision?: number;
}

export class UnitConversionHandler implements NodeHandler {
    readonly type = "UNIT_CONVERSION" as const;
    readonly timeoutMs = 5_000;

    async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
        try {
            const config = (ctx.node.config ?? {}) as UnitConversionConfig;
            const inputVar = config.input_variable;
            // Accept either output_variable or result_variable for back-compat
            const outputVar = config.output_variable ?? config.result_variable;
            const precision = config.precision ?? 4;

            if (!inputVar) return toErroredOutcome(new Error("UNIT_CONVERSION: input_variable not configured"));
            if (!outputVar) return toErroredOutcome(new Error("UNIT_CONVERSION: output_variable not configured"));

            const inputRaw = ctx.variables.get(inputVar);
            if (inputRaw === undefined) {
                return toErroredOutcome(new Error(`UNIT_CONVERSION: input "${inputVar}" not found in variables`));
            }
            const inputVal = Number(inputRaw);
            if (!Number.isFinite(inputVal)) {
                return toErroredOutcome(new Error(`UNIT_CONVERSION: input "${inputVar}" is not a finite number`));
            }

            let result: number;
            if (config.expression) {
                // Custom expression: scope contains all current vars plus `value`
                const snap = ctx.variables.snapshot();
                const scope: Record<string, number | boolean> = { value: inputVal };
                for (const [k, v] of Object.entries(snap)) {
                    if (k === "$nodes" || k === "$results") continue;
                    if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
                }
                result = safeEvaluate(config.expression, scope, {
                    precision,
                    timeoutMs: this.timeoutMs,
                });
            } else {
                if (!config.input_unit || !config.output_unit) {
                    return toErroredOutcome(new Error(
                        "UNIT_CONVERSION: either expression OR input_unit+output_unit must be configured"
                    ));
                }
                const raw = convertUnit(inputVal, config.input_unit, config.output_unit);
                const factor = 10 ** precision;
                result = Math.round(raw * factor) / factor;
            }

            ctx.variables.set(outputVar, result);
            const outputs: VariableMap = { [outputVar]: result };
            ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

            return {
                kind: "completed",
                outputs,
                result: {
                    inputVar, inputVal, outputVar,
                    inputUnit: config.input_unit,
                    outputUnit: config.output_unit,
                    result,
                },
            };
        } catch (err) {
            return toErroredOutcome(err);
        }
    }
}