// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/CustomCodeHandler.ts
//
//  CUSTOM_CODE — multi-line mathjs assignments (variable = expression).
//  Despite the name, this is SYNC — it evaluates math, no I/O.
//  The classification mistake (treating it as background) is from the
//  legacy code; the mental model fixes it and this handler enforces it.
//
//  All evaluation goes through safeEvaluateMultiLine which has timeout
//  enforcement and proper line-ending normalization.
// ═══════════════════════════════════════════════════════════════════════════
import { safeEvaluateMultiLine } from "@/features/workflow-canvas/engine/formula-validator";

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import { WorkerPoolTimeout } from "../WorkerPoolTimeout";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";

interface CustomCodeConfig {
  code?: string;
  output_variables?: string[];
  timeoutMs?: number;
}

export class CustomCodeHandler implements NodeHandler {
  readonly type = "CUSTOM_CODE" as const;
  readonly timeoutMs = 10_000;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    try {
      const config = (ctx.node.config ?? {}) as CustomCodeConfig;
      const code = (config.code ?? "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .trim();
      const outputVarNames = config.output_variables ?? [];

      if (!code) {
        return toErroredOutcome(
          new Error("CUSTOM_CODE has no code configured"),
        );
      }
      if (outputVarNames.length === 0) {
        return toErroredOutcome(
          new Error("CUSTOM_CODE has no output_variables declared"),
        );
      }

      // Build scope from current numeric/boolean vars
      const snap = ctx.variables.snapshot();
      const scope: Record<string, number | boolean> = {};
      for (const [k, v] of Object.entries(snap)) {
        if (k === "$nodes" || k === "$results") continue;
        if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
      }

      // CHUNK 5: Execute in a worker pool for hard-cancellation support.
      // This prevents an infinite loop in custom code from pinning the event loop.
      const pool = new WorkerPoolTimeout();
      const outputs = (await pool.runMathEvaluation(code, scope, {
        timeoutMs: config.timeoutMs ?? this.timeoutMs,
        handlerType: "CUSTOM_CODE",
      })) as Record<string, number>;

      // Apply outputs to the variable store
      const trackedOutputs: VariableMap = {};
      for (const [k, v] of Object.entries(outputs)) {
        ctx.variables.set(k, v);
        trackedOutputs[k] = v;
      }

      // Warn if any declared outputs weren't produced (validation already covers
      // this at config time, but it can happen if users edit the code after
      // declaring outputs)
      const missing = outputVarNames.filter((v) => outputs[v] === undefined);

      ctx.variables.trackNodeOutput(
        ctx.node.id,
        ctx.node.label,
        trackedOutputs,
      );

      return {
        kind: "completed",
        outputs: trackedOutputs,
        result: {
          declaredOutputs: outputVarNames,
          producedOutputs: Object.keys(outputs),
          missingOutputs: missing,
          outputs: trackedOutputs,
        },
      };
    } catch (err) {
      return toErroredOutcome(err);
    }
  }
}
