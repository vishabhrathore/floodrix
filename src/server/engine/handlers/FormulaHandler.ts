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
import { safeEvaluate, safeEvaluateMultiLine } from "@/features/workflow-canvas/engine/formula-validator";

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import { WorkerPoolTimeout } from "../WorkerPoolTimeout";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { logger } from "../logger";

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
  snapshot?: any;
  use_worker?: boolean;
}

export class FormulaHandler implements NodeHandler {
  readonly type = "FORMULA" as const;
  readonly timeoutMs = 120_000;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    try {
      const config = (ctx.node.config ?? {}) as FormulaConfig;

      let expression: string;
      let displayExpression: string;
      let outputKey: string;
      let evalScope: Record<string, number | boolean>;
      let outputNotation = "result";
      let registry: any = null;

      if (config.source === "registry" && config.registry_id) {
        registry =
          (config.snapshot as Awaited<
            ReturnType<typeof ctx.registry.resolveFormula>
          >) ??
          (await ctx.registry.resolveFormula(
            ctx.db,
            config.registry_id,
          ));

        const bindings = config.variable_bindings ?? {};
        expression = registry.expressionNotation;
        displayExpression = registry.displayExpression;

        // Build scope: registry uses `notation` keys (M, C, etc.);
        // we feed them values pulled from the bound context keys.
        evalScope = {};
        for (const inputVar of registry.inputVariables) {
          const contextKey =
            bindings[inputVar.notation] ?? inputVar.key;
          const value = ctx.variables.get(contextKey);
          if (value === undefined) {
            return toErroredOutcome(
              new Error(
                `${registry.name} requires "${inputVar.notation}" (bound to "${contextKey}") ` +
                  `but it hasn't been computed yet. ` +
                  `Add an upstream node that produces "${contextKey}".`,
              ),
            );
          }
          if (typeof value !== "number" && typeof value !== "boolean") {
            return toErroredOutcome(
              new Error(
                `${registry.name}: variable "${contextKey}" is ${typeof value}, expected number/boolean`,
              ),
            );
          }
          evalScope[inputVar.notation] = value;
        }

        outputNotation = (registry.outputVariable as any)?.notation ?? "result";

        outputKey =
          config.result_variable ??
          bindings[outputNotation] ??
          (registry.outputVariable as any)?.key ??
          "result";
      } else {
        expression = config.expression ?? "";
        displayExpression = config.display_expression ?? expression;
        outputKey = config.result_variable ?? "result";

        // Build scope from current variables
        evalScope = scopeFromVariables(ctx);

        // If explicit bindings are provided for the inline expression, apply them.
        // This allows notations like "c" to work even if the store only has "field_1".
        if (config.variable_bindings) {
          for (const [notation, contextKey] of Object.entries(
            config.variable_bindings,
          )) {
            const value = ctx.variables.get(contextKey);
            if (
              value !== undefined &&
              (typeof value === "number" || typeof value === "boolean")
            ) {
              evalScope[notation] = value;
            }
          }
        }
      }

      if (!expression.trim()) {
        return toErroredOutcome(
          new Error("Formula has no expression configured"),
        );
      }

      const precision =
        config.overrides?.result_precision ?? config.result_precision ?? 3;

      const useWorkerFromRegistry = registry
        ? (registry.useWorker === true ||
           (registry.outputVariable as any)?.useWorker === true ||
           (registry.outputVariable as any)?.use_worker === true)
        : false;
      const finalUseWorker = (config.use_worker === true) || (useWorkerFromRegistry === true);

      let value: number;

      if (finalUseWorker) {
        // Isolated Worker Thread (Background Heavy Task)
        const pool = new WorkerPoolTimeout();
        const scope: Record<string, number | boolean | string> = { ...evalScope };
        
        // If the expression doesn't contain assignment, rewrite it to assign to the output variable
        const finalCode = expression.includes("=") ? expression : `${outputNotation} = ${expression}`;
        
        logger.info(
          {
            sessionId: ctx.sessionId,
            nodeId: ctx.node.id,
            nodeLabel: ctx.node.label,
            expression: finalCode,
            scope,
          },
          `[FormulaHandler] 🧵 Running in WORKER THREAD (Background Heavy Task)`
        );

        const workerResult = (await pool.runMathEvaluation(finalCode, scope, {
          timeoutMs: this.timeoutMs,
          handlerType: "FORMULA_REGISTRY_CUSTOM",
        })) as Record<string, number>;

        logger.info(
          {
            sessionId: ctx.sessionId,
            nodeId: ctx.node.id,
            workerResult,
          },
          `[FormulaHandler] Worker completed execution`
        );

        const rawValue =
          workerResult[outputNotation] ??
          workerResult[outputKey] ??
          workerResult["result"];

        if (rawValue === undefined) {
          throw new Error(
            `Custom code formula did not assign a value to the expected output variable "${outputNotation}". ` +
              `Ensure your script assigns a value to "${outputNotation}" (e.g. ${outputNotation} = ...).`
          );
        }

        const factor = 10 ** precision;
        value = Math.round(rawValue * factor) / factor;
      } else {
        const isMultiLineCustom = expression.includes("\n") || expression.includes("=");

        if (isMultiLineCustom) {
          // Synchronous Main Thread (Fast 2ms Simple Code) - Multi-line or has =
          logger.info(
            {
              sessionId: ctx.sessionId,
              nodeId: ctx.node.id,
              nodeLabel: ctx.node.label,
              expression,
              evalScope,
              outputNotation,
              outputKey,
            },
            `[FormulaHandler] 🧵 Running in MAIN THREAD (Synchronous Multi-Line)`
          );

          const workerResult = safeEvaluateMultiLine(expression, evalScope, [
            outputNotation,
            outputKey,
            "result",
          ], {
            timeoutMs: this.timeoutMs,
          });

          logger.info(
            {
              sessionId: ctx.sessionId,
              nodeId: ctx.node.id,
              workerResult,
            },
            `[FormulaHandler] Main Thread completed execution`
          );

          const rawValue =
            workerResult[outputNotation] ??
            workerResult[outputKey] ??
            workerResult["result"];

          if (rawValue === undefined) {
            throw new Error(
              `Custom code formula did not assign a value to the expected output variable "${outputNotation}". ` +
                `Ensure your script assigns a value to "${outputNotation}" (e.g. ${outputNotation} = ...).`
            );
          }

          const factor = 10 ** precision;
          value = Math.round(rawValue * factor) / factor;
        } else {
          // Synchronous Main Thread - Single-line standard expression
          logger.info(
            {
              sessionId: ctx.sessionId,
              nodeId: ctx.node.id,
              nodeLabel: ctx.node.label,
              expression,
              evalScope,
            },
            `[FormulaHandler] 🧵 Running simple formula in MAIN THREAD`
          );
          value = safeEvaluate(expression, evalScope, {
            precision,
            timeoutMs: this.timeoutMs,
          });
        }
      }

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
function scopeFromVariables(
  ctx: ExecutionContext,
): Record<string, number | boolean> {
  const snap = ctx.variables.snapshot();
  const scope: Record<string, number | boolean> = {};
  for (const [k, v] of Object.entries(snap)) {
    if (k === "$nodes" || k === "$results") continue;
    if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
  }
  return scope;
}
