// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/ValidationHandler.ts
//
//  VALIDATION — evaluate boolean check expressions; collect failures.
//  - on_error: "pause"  → return { kind: "paused", reason: "validation_error" }
//  - on_error: "warn"   → complete with warnings in result
//  - on_error: "error"  → return { kind: "errored" }
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";
import { safeEvaluate } from "@/features/workflow-canvas/engine/formula-validator";

interface ValidationConfig {
    checks?: { expr: string; severity: "error" | "warning"; message: string }[];
    on_error?: "pause" | "error" | "warn";
}

export class ValidationHandler implements NodeHandler {
    readonly type = "VALIDATION" as const;
    readonly timeoutMs = 5_000;

    async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
        try {
            const config = (ctx.node.config ?? {}) as ValidationConfig;
            const checks = config.checks ?? [];
            const onError = config.on_error ?? "pause";

            if (checks.length === 0) {
                // No checks = always passes
                return { kind: "completed", outputs: {}, result: { checks: [], passed: true } };
            }

            const snap = ctx.variables.snapshot();
            const scope: Record<string, number | boolean> = {};
            for (const [k, v] of Object.entries(snap)) {
                if (k === "$nodes" || k === "$results") continue;
                if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
            }

            const results: { expr: string; severity: string; message: string; passed: boolean }[] = [];
            const errors: { message: string }[] = [];
            const warnings: { message: string }[] = [];

            for (const check of checks) {
                let passed = false;
                try {
                    const num = safeEvaluate(check.expr, scope, {
                        precision: 0,
                        timeoutMs: this.timeoutMs,
                    });
                    passed = num > 0;
                } catch {
                    passed = false;
                }
                results.push({ ...check, passed });
                if (!passed) {
                    if (check.severity === "error") errors.push({ message: check.message });
                    else if (check.severity === "warning") warnings.push({ message: check.message });
                }
            }

            const detail = { checks: results, errors, warnings, hasErrors: errors.length > 0 };

            if (errors.length > 0) {
                if (onError === "error") {
                    return toErroredOutcome(new Error(
                        `Validation failed: ${errors.map((e) => e.message).join("; ")}`
                    ));
                }
                if (onError === "pause") {
                    return {
                        kind: "paused",
                        reason: "validation_error",
                        nodeLabel: ctx.node.label,
                        pauseMessage: errors.map((e) => e.message).join("; "),
                    };
                }
                // "warn" → fall through to completed
            }

            const outputs: VariableMap = {};
            ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);
            return { kind: "completed", outputs, result: detail };
        } catch (err) {
            return toErroredOutcome(err);
        }
    }
}