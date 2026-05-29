// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/InterpolationHandler.ts
//
//  GRAPH_INTERPOLATION — interpolate a y-value from a curve given an x-value.
//  Delegates to the existing interpolation.ts (linear / cubic spline / step).
// ═══════════════════════════════════════════════════════════════════════════
import { interpolate } from "@/features/workflow-canvas/engine/interpolation";

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";

interface InterpolationConfig {
  source?: "registry" | "inline";
  registry_id?: string;
  registry_version?: number | null;
  variable_bindings?: Record<string, string>;
  overrides?: { interpolation_method?: string };
  input_variable?: string;
  result_variable?: string;
  data_points?: { x: number; y: number }[];
  interpolation_method?: "linear" | "cubic_spline" | "step";
  extrapolation?: "clamp" | "extend" | "error";
  snapshot?: any;
}

export class InterpolationHandler implements NodeHandler {
  readonly type = "GRAPH_INTERPOLATION" as const;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    try {
      const config = (ctx.node.config ?? {}) as InterpolationConfig;

      let points: { x: number; y: number }[];
      let inputVar: string;
      let outputKey: string;
      let method: string;
      let extrapolation: string;

      if (config.source === "registry" && config.registry_id) {
        const registry =
          (config.snapshot as Awaited<
            ReturnType<typeof ctx.registry.resolveTable>
          >) ??
          (await ctx.registry.resolveTable(
            ctx.db,
            config.registry_id,
          ));
        const bindings = config.variable_bindings ?? {};
        const inputDef = registry.inputKeys[0];
        inputVar = bindings[inputDef.notation] ?? bindings["undefined"] ?? inputDef.key;
        outputKey =
          bindings[registry.outputKey.notation] ?? bindings["undefined"] ?? registry.outputKey.key;
        points = registry.data as { x: number; y: number }[];
        const interpConfig = registry.interpolationConfig as {
          method?: string;
          extrapolation?: string;
        } | null;
        method =
          config.overrides?.interpolation_method ??
          interpConfig?.method ??
          "linear";
        extrapolation = interpConfig?.extrapolation ?? "clamp";
      } else {
        inputVar = config.input_variable ?? "";
        outputKey = config.result_variable ?? "result";
        points = config.data_points ?? [];
        method = config.interpolation_method ?? "linear";
        extrapolation = config.extrapolation ?? "clamp";
      }

      if (!inputVar) {
        return toErroredOutcome(
          new Error("GRAPH_INTERPOLATION has no input variable configured"),
        );
      }
      if (points.length === 0) {
        return toErroredOutcome(
          new Error("GRAPH_INTERPOLATION has no data points"),
        );
      }

      const xRaw = ctx.variables.get(inputVar);
      if (xRaw === undefined) {
        return toErroredOutcome(
          new Error(`Interpolation input "${inputVar}" not found in variables`),
        );
      }
      const xValue = Number(xRaw);
      if (!Number.isFinite(xValue)) {
        return toErroredOutcome(
          new Error(
            `Interpolation input "${inputVar}" is not a finite number: ${xRaw}`,
          ),
        );
      }

      const value = interpolate(points, xValue, method, extrapolation);
      const rounded = Math.round(value * 10000) / 10000;

      ctx.variables.set(outputKey, rounded);
      const outputs: VariableMap = { [outputKey]: rounded };
      ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

      return {
        kind: "completed",
        outputs,
        result: {
          inputVar,
          xValue,
          method,
          extrapolation,
          pointCount: points.length,
          interpolatedValue: rounded,
        },
      };
    } catch (err) {
      return toErroredOutcome(err);
    }
  }
}
