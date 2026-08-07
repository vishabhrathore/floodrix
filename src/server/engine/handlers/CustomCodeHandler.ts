// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/CustomCodeHandler.ts
//
//  CUSTOM_CODE — multi-line mathjs assignments (variable = expression).
//  Despite the name, this is SYNC — it evaluates math, no I/O.
//  The classification mistake (treating it as background) is from the
//  legacy code; the mental model fixes it and this handler enforces it.
//
//  All evaluation goes through safeEvaluateMultiLine or WorkerPoolTimeout.
// ═══════════════════════════════════════════════════════════════════════════

import { isMainThread } from "worker_threads";
import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import { WorkerPoolTimeout } from "../WorkerPoolTimeout";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { logger, sanitizeForLog } from "../logger";

interface CustomCodeConfig {
  code?: string;
  output_variables?: string[];
  timeoutMs?: number;
  use_worker?: boolean;
}

export class CustomCodeHandler implements NodeHandler {
  readonly type = "CUSTOM_CODE" as const;
  readonly timeoutMs = 120_000;

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

      // Build scope containing all variable values inside an 'inputs' object
      const snap = ctx.variables.snapshot();
      const inputs: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(snap)) {
        if (k === "$nodes" || k === "$results") continue;
        inputs[k] = v;
      }
      const scope = { inputs };

      let outputs: Record<string, any>;

      const use_worker = config.use_worker ?? true;
      const runLocally = !use_worker || (!isMainThread && ctx.isBackgroundRun);

      logger.info(
        {
          sessionId: ctx.sessionId,
          nodeId: ctx.node.id,
          nodeLabel: ctx.node.label,
          code,
          scope: sanitizeForLog(scope),
          use_worker,
          runLocally,
        },
        `[CustomCodeHandler] Running custom code evaluation in ${runLocally ? "Main Thread (local)" : "Piscina Worker Thread"}`
      );

      // Run in isolated Worker Thread (Piscina) to prevent blocking the event loop
      const pool = new WorkerPoolTimeout();
      const workerResult = await pool.runMathEvaluation(code, scope, {
        timeoutMs: config.timeoutMs ?? this.timeoutMs,
        handlerType: "CUSTOM_CODE",
        isJS: true,
      }, runLocally);

      outputs = workerResult.outputs;

      logger.info(
        {
          sessionId: ctx.sessionId,
          nodeId: ctx.node.id,
          outputs: sanitizeForLog(outputs),
          cpuUserMs: workerResult.cpuUserMs,
          cpuSystemMs: workerResult.cpuSystemMs,
        },
        `[CustomCodeHandler] Custom code execution completed`
      );

      // Apply outputs to the variable store
      const trackedOutputs: VariableMap = {};
      for (const [k, v] of Object.entries(outputs)) {
        ctx.variables.set(k, v);
        trackedOutputs[k] = v;
      }

      // Warn if any declared outputs weren't produced
      const missing = outputVarNames.filter((v) => outputs[v] === undefined);

      ctx.variables.trackNodeOutput(
        ctx.node.id,
        ctx.node.label,
        trackedOutputs,
      );

      return {
        kind: "completed",
        outputs: trackedOutputs,
        cpuUserMs: workerResult.cpuUserMs,
        cpuSystemMs: workerResult.cpuSystemMs,
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
