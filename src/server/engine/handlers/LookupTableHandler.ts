// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/LookupTableHandler.ts
//
//  LOOKUP_TABLE — find a row matching the input value(s) and return its value.
//
//  Supports three match modes:
//    range     — input falls within [from, to] of a row
//    exact     — input equals row.key
//    nearest   — closest numeric match (used for 1D coefficient lookups)
//
//  Plus multi-key (when input_keys has 2+ keys) — both must match.
//
//  Source can be "registry" (resolves via ctx.registry) or inline.
// ═══════════════════════════════════════════════════════════════════════════

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";

interface RangeRow {
    range?: [number, number | null];
    from?: number;
    to?: number | null;
    key?: string | number;
    keys?: Record<string, string | number>;
    value: number;
    label?: string;
}

interface LookupConfig {
    source?: "registry" | "inline";
    registry_id?: string;
    registry_version?: number | null;
    variable_bindings?: Record<string, string>;
    table_mode?: "range" | "interpolated" | "multi_key";
    match_mode?: "range" | "exact" | "nearest";
    lookup_key?: string;
    result_variable?: string;
    rows?: RangeRow[];
    range_rows?: RangeRow[];
    multi_rows?: RangeRow[];
    data?: RangeRow[];
    input_keys?: { key: string; type: "exact" | "range"; unit?: string }[];
    fallback_mode?: "error" | "first" | "last" | "nearest";
}

export class LookupTableHandler implements NodeHandler {
    readonly type = "LOOKUP_TABLE" as const;

    async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
        try {
            const config = (ctx.node.config ?? {}) as LookupConfig;

            let rows: RangeRow[];
            let outputKey: string;
            let inputKeys: string[];
            let matchMode: "range" | "exact" | "nearest";

            if (config.source === "registry" && config.registry_id) {
                const registry = await ctx.registry.resolveTable(
                    ctx.db,
                    config.registry_id,
                    config.registry_version ?? null
                );
                const bindings = config.variable_bindings ?? {};
                inputKeys = registry.inputKeys.map((k) => bindings[k.notation] ?? k.key);
                outputKey = bindings[registry.outputKey.notation] ?? registry.outputKey.key;
                rows = registry.data as RangeRow[];
                matchMode = (config.match_mode ?? "range");
            } else {
                rows = (config.range_rows ?? config.multi_rows ?? config.rows ?? config.data ?? []) as RangeRow[];
                outputKey = config.result_variable ?? "result";
                if (config.table_mode === "multi_key" && config.input_keys) {
                    inputKeys = config.input_keys.map((k) => k.key);
                    matchMode = "exact"; // multi-key uses exact for first key, range semantics handled below
                } else {
                    inputKeys = [config.lookup_key ?? ""];
                    matchMode = (config.match_mode ?? "range");
                }
            }

            if (rows.length === 0) {
                return toErroredOutcome(new Error("LOOKUP_TABLE has no data rows"));
            }
            if (inputKeys.length === 0 || inputKeys[0] === "") {
                return toErroredOutcome(new Error("LOOKUP_TABLE has no lookup key configured"));
            }

            // Read input values
            const inputValues: Record<string, unknown> = {};
            for (const k of inputKeys) {
                const v = ctx.variables.get(k);
                if (v === undefined) {
                    return toErroredOutcome(new Error(
                        `Lookup key "${k}" not found in variables`
                    ));
                }
                inputValues[k] = v;
            }

            // Find matching row
            const { row: matchedRow, index: matchedIndex } = findMatchingRow(
                rows,
                inputKeys,
                inputValues,
                matchMode
            );

            let finalRow = matchedRow;
            let finalIndex = matchedIndex;

            if (!finalRow) {
                const fallback = config.fallback_mode ?? "error";
                if (fallback === "error") {
                    return toErroredOutcome(new Error(
                        `No matching row found in lookup table for ${inputKeys.join(",")} = ${Object.values(inputValues).join(",")}`
                    ));
                }
                if (fallback === "first") { finalRow = rows[0]; finalIndex = 0; }
                else if (fallback === "last") { finalRow = rows[rows.length - 1]; finalIndex = rows.length - 1; }
                else if (fallback === "nearest" && inputKeys.length === 1) {
                    const target = Number(inputValues[inputKeys[0]]);
                    if (!Number.isFinite(target)) {
                        return toErroredOutcome(new Error("nearest fallback requires numeric input"));
                    }
                    let best = 0;
                    let bestDist = Infinity;
                    for (let i = 0; i < rows.length; i++) {
                        const r = rows[i];
                        const ref = r.range ? r.range[0] : (typeof r.key === "number" ? r.key : Number(r.key));
                        if (!Number.isFinite(ref)) continue;
                        const dist = Math.abs(ref - target);
                        if (dist < bestDist) { bestDist = dist; best = i; }
                    }
                    finalRow = rows[best]; finalIndex = best;
                }
            }

            if (!finalRow) {
                return toErroredOutcome(new Error("Lookup fallback failed to produce a row"));
            }

            ctx.variables.set(outputKey, finalRow.value);
            const outputs: VariableMap = { [outputKey]: finalRow.value };
            ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

            return {
                kind: "completed",
                outputs,
                result: {
                    inputKeys, inputValues,
                    matchedRow: finalRow,
                    matchedIndex: finalIndex,
                    selectedValue: finalRow.value,
                    totalRows: rows.length,
                },
            };
        } catch (err) {
            return toErroredOutcome(err);
        }
    }
}

// ─── Match logic ──────────────────────────────────────────────────────────

function findMatchingRow(
    rows: RangeRow[],
    inputKeys: string[],
    inputValues: Record<string, unknown>,
    matchMode: "range" | "exact" | "nearest"
): { row: RangeRow | null; index: number } {
    // Multi-key path
    if (inputKeys.length > 1) {
        for (let i = 0; i < rows.length; i++) {
            const r = rows[i];
            if (!r.keys) continue;
            let allMatch = true;
            for (const k of inputKeys) {
                const want = r.keys[k];
                const got = inputValues[k];
                if (want === undefined || want !== got) { allMatch = false; break; }
            }
            if (allMatch) return { row: r, index: i };
        }
        return { row: null, index: -1 };
    }

    // Single-key path
    const key = inputKeys[0];
    const value = inputValues[key];

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];

        if (matchMode === "range") {
            const range = r.range ?? (r.from !== undefined ? [r.from, r.to ?? null] as [number, number | null] : null);
            if (!range) continue;
            const num = Number(value);
            if (!Number.isFinite(num)) continue;
            const [lo, hi] = range;
            if (num >= lo && (hi === null || num < hi)) return { row: r, index: i };
        } else if (matchMode === "exact") {
            if (r.key === undefined) continue;
            if (r.key === value || String(r.key) === String(value)) return { row: r, index: i };
        }
    }

    return { row: null, index: -1 };
}