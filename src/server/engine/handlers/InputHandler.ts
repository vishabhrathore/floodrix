// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/InputHandler.ts
//
//  INPUT node — collects user-provided values.
//  - If pause_execution !== false AND any required field is missing →
//    return { kind: "paused", reason: "awaiting_user_input" }
//  - Otherwise apply defaults for any missing optional fields and complete.
//
//  This handler is the reason "paused" exists as an outcome shape — every
//  other handler runs to completion or errors. INPUT can wait on a human.
// ═══════════════════════════════════════════════════════════════════════════
import type { NodeHandler } from "../NodeHandler";
import type {
  ExecutionContext,
  InputFieldDef,
  NodeOutcome,
  VariableMap,
} from "../types";

interface InputConfig {
  fields?: InputFieldDef[];
  pause_execution?: boolean;
}

export class InputHandler implements NodeHandler {
  readonly type = "INPUT" as const;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    const config = (ctx.node.config ?? {}) as InputConfig;
    const fields = config.fields ?? [];
    const shouldPause = config.pause_execution !== false;

    // Determine which fields are not yet in the variable store
    const unassigned: InputFieldDef[] = [];
    for (const f of fields) {
      if (!ctx.variables.has(f.key)) {
        unassigned.push(f);
      }
    }

    if (shouldPause && unassigned.length > 0) {
      return {
        kind: "paused",
        reason: "awaiting_user_input",
        fields,
        nodeLabel: ctx.node.label,
      };
    }

    // Apply defaults; record outputs
    const outputs: VariableMap = {};
    for (const f of fields) {
      if (!ctx.variables.has(f.key) && f.default !== undefined) {
        ctx.variables.set(f.key, f.default as never);
      }
      const value = ctx.variables.get(f.key);
      if (value !== undefined) {
        outputs[f.key] = value;

        // If it's an MCQ field, find the matching option and inject its variables
        if (f.data_type === "mcq" && f.mcq_options) {
          const selectedOption = f.mcq_options.find(
            (opt: any) => opt.label === value,
          );
          if (selectedOption && selectedOption.variables) {
            for (const v of selectedOption.variables) {
              if (v.key) {
                ctx.variables.set(v.key, v.value);
                outputs[v.key] = v.value;
              }
            }
          }
        }
      }
    }

    ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

    return {
      kind: "completed",
      outputs,
      result: {
        fields: fields.map((f) => f.key),
        provided: Object.keys(outputs),
      },
    };
  }
}
