// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/nodes/types/core-nodes.tsx
//  P0 node types — the essential six
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import {
    VariablePill,
    FormulaDisplay,
    FieldRow,
    SectionLabel,
    TablePreview,
    ConditionDisplay,
    ResultDisplay,
    EmptyState,
} from "@/components/react-flow/calculator/calc-node-fields";
import { BaseNode } from "@/components/react-flow/calculator/calc-base-node";

// ─── Shared type for node data coming from the store ─────────────────────

interface NodeData {
    label: string;
    description?: string;
    config: Record<string, unknown>;
    executionStatus?: "pending" | "running" | "completed" | "errored" | "waiting" | "skipped";
    executionResult?: Record<string, unknown>;
    [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INPUT NODE
//  Collects user values — pauses execution until submitted.
//  Shows field list with labels, units, and default values.
// ═══════════════════════════════════════════════════════════════════════════

function InputNodeInner({ id, data, selected }: NodeProps) {
    const d = data as NodeData;
    const config = d.config;
    const fields = (config.fields || []) as {
        key: string;
        label: string;
        unit?: string;
        default?: number;
        hint?: string;
    }[];

    return (
        <BaseNode
            id={id}
            nodeType="INPUT"
            label={d.label || "Input Parameters"}
            subtitle={`${fields.length} field${fields.length !== 1 ? "s" : ""}`}
            selected={selected}
            executionStatus={d.executionStatus}
            badge="Input"
        >
            {fields.length === 0 ? (
                <EmptyState message="No fields defined" action="Configure" />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {fields.slice(0, 5).map((f) => (
                        <FieldRow key={f.key} label={f.label}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span
                                    style={{
                                        fontFamily: "'JetBrains Mono', monospace",
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: "#1e293b",
                                    }}
                                >
                                    {f.default ?? "—"}
                                </span>
                                {f.unit && (
                                    <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600 }}>
                                        {f.unit}
                                    </span>
                                )}
                            </span>
                        </FieldRow>
                    ))}
                    {fields.length > 5 && (
                        <div style={{ fontSize: 10, color: "#cbd5e1", textAlign: "center", paddingTop: 2 }}>
                            +{fields.length - 5} more fields
                        </div>
                    )}
                </div>
            )}
        </BaseNode>
    );
}

export const InputNode = memo(InputNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  FORMULA NODE
//  Evaluates a mathjs expression. Shows the formula, variables, and result.
//  Can reference a registry formula or be inline.
// ═══════════════════════════════════════════════════════════════════════════

import { useTable } from "@/features/registery/table/hooks/use-tables";

function FormulaNodeInner({ id, data, selected }: NodeProps) {
    const d = data as NodeData;
    const config = d.config;
    const result = d.executionResult;

    const mode = config.mode as string | undefined;
    const isRegistry = mode === "registry";
    const displayExpr = (config.inlineDisplayExpression || config.inlineExpression || config.display_expression || config.expression || "") as string;
    const resultVar = ((config.outputBinding as any)?.nodeVar || config.result_variable) as string | undefined;
    const resultUnit = ((config.outputBinding as any)?.unit || config.result_unit) as string | undefined;
    const reference = (config.description || config.reference) as string | undefined;
    const showVars = (config.inputBindings || config.showVars || []) as any[];

    return (
        <BaseNode
            id={id}
            nodeType="FORMULA"
            label={(config.label as string) || d.label || "Formula"}
            subtitle={isRegistry ? "From registry" : "Inline"}
            selected={selected}
            executionStatus={d.executionStatus}
            badge={isRegistry ? "Registry" : undefined}
            reference={reference}
        >
            {displayExpr || isRegistry ? (
                <>
                    {displayExpr ? (
                        <FormulaDisplay expression={displayExpr} />
                    ) : (
                        <div className="flex h-12 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400">
                            {isRegistry ? "Registry Item Linked" : "No formula configured"}
                        </div>
                    )}

                    {showVars.length > 0 && (
                        <>
                            <SectionLabel>Variables</SectionLabel>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                {showVars.map((v) => (
                                    <VariablePill
                                        key={v.contextKey || v.key}
                                        name={v.nodeVar || v.key}
                                        unit={v.unit}
                                        value={result ? (result[v.nodeVar || v.key] as number) : undefined}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {result && resultVar && result[resultVar] !== undefined && (
                        <ResultDisplay
                            label={resultVar}
                            value={result[resultVar] as number}
                            unit={resultUnit}
                        />
                    )}
                </>
            ) : (
                <EmptyState message="No formula configured" action="Select formula" />
            )}
        </BaseNode>
    );
}

export const FormulaNode = memo(FormulaNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  LOOKUP TABLE NODE
//  Matches an input value to a range/row and returns a coefficient.
//  Shows the table preview with the matched row highlighted.
// ═══════════════════════════════════════════════════════════════════════════

function LookupTableNodeInner({ id, data, selected }: NodeProps) {
    const d = data as NodeData;
    const config = d.config;
    const result = d.executionResult;

    const mode = config.mode as "registry" | "inline" | undefined;
    const isRegistry = mode === "registry";

    // Fetch registry data if in registry mode
    const { data: registryItem, isLoading: isLoadingRegistry } = useTable(isRegistry ? (config.registryId as string) : undefined);

    const lookupKey = ((config.keyBindings as any)?.[0]?.contextKey || config.lookup_key) as string | undefined;
    const resultVar = ((config.outputBinding as any)?.contextKey || config.result_variable) as string | undefined;

    // Resolve rows: from registry item OR from inline config
    const rawRows = (isRegistry ? (registryItem?.data as any[]) : (config.inlineData as any[] || config.rows as any[] || config.data as any[])) || [];
    const reference = (config.description || config.reference || (isRegistry ? registryItem?.reference : undefined)) as string | undefined;

    const matchedIndex = result?.matchedIndex as number | undefined;
    const selectedValue = result?.selectedValue as number | undefined;

    const tableRows = rawRows.slice(0, 5).map((r: any) => ({
        label: r.label || (r.range ? `${r.range?.[0]}–${r.range?.[1] ?? "∞"}` : String(r.key || Object.values(r)[0] || "")),
        value: r.value,
    }));

    return (
        <BaseNode
            id={id}
            nodeType="LOOKUP_TABLE"
            label={(config.label as string) || d.label || (isRegistry && registryItem ? registryItem.name : "Lookup Table")}
            subtitle={lookupKey ? `Key: ${lookupKey}` : (isRegistry && isLoadingRegistry ? "Loading registry..." : undefined)}
            selected={selected}
            executionStatus={d.executionStatus}
            reference={reference}
            badge={isRegistry ? "Registry" : undefined}
        >
            {tableRows.length > 0 ? (
                <>
                    <TablePreview
                        rows={tableRows}
                        maxRows={4}
                        highlightIndex={matchedIndex}
                    />

                    {selectedValue !== undefined && resultVar && (
                        <ResultDisplay
                            label={resultVar}
                            value={selectedValue}
                            accent="#7c3aed"
                        />
                    )}
                </>
            ) : (
                <EmptyState
                    message={isRegistry && !config.registryId ? "No table selected" : "No table data"}
                    action={isRegistry ? "Select registry table" : "Configure table"}
                />
            )}
        </BaseNode>
    );
}

export const LookupTableNode = memo(LookupTableNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  GRAPH INTERPOLATION NODE
//  Interpolates a value from digitized curve points.
//  Shows a mini curve preview with the interpolated point marked.
// ═══════════════════════════════════════════════════════════════════════════

function GraphInterpolationNodeInner({ id, data, selected }: NodeProps) {
    const d = data as NodeData;
    const config = d.config;
    const result = d.executionResult;

    const inputVar = config.input_variable as string | undefined;
    const resultVar = config.result_variable as string | undefined;
    const method = config.interpolation_method as string | undefined;
    const points = (config.data_points || []) as { x: number; y: number }[];
    const reference = config.reference as string | undefined;

    const interpolatedValue = result?.interpolatedValue as number | undefined;

    // Build mini SVG curve
    const hasCurve = points.length >= 2;
    let curvePath = "";
    let dotX = 0;
    let dotY = 0;

    if (hasCurve) {
        const w = 220;
        const h = 50;
        const pad = 4;
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const yMin = Math.min(...ys);
        const yMax = Math.max(...ys);
        const sx = (v: number) => pad + ((v - xMin) / (xMax - xMin || 1)) * (w - 2 * pad);
        const sy = (v: number) => h - pad - ((v - yMin) / (yMax - yMin || 1)) * (h - 2 * pad);

        curvePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`).join(" ");

        if (result?.xValue !== undefined) {
            dotX = sx(result.xValue as number);
            dotY = sy(interpolatedValue ?? 0);
        }
    }

    return (
        <BaseNode
            id={id}
            nodeType="GRAPH_INTERPOLATION"
            label={d.label || "Interpolation"}
            subtitle={method ? `${method} · ${points.length} pts` : `${points.length} points`}
            selected={selected}
            executionStatus={d.executionStatus}
            reference={reference}
        >
            {hasCurve ? (
                <>
                    {/* Mini curve preview */}
                    <div style={{ backgroundColor: "#fdf2f8", borderRadius: 6, border: "1px solid #fce7f3", padding: 4 }}>
                        <svg viewBox={`0 0 220 50`} style={{ width: "100%", height: 50, display: "block" }}>
                            <path d={curvePath} fill="none" stroke="#db2777" strokeWidth="1.5" strokeLinejoin="round" />
                            {result?.xValue !== undefined && (
                                <circle cx={dotX} cy={dotY} r="3" fill="#db2777" stroke="white" strokeWidth="1.5" />
                            )}
                        </svg>
                    </div>

                    <FieldRow label="Input">{inputVar ? <VariablePill name={inputVar} /> : "—"}</FieldRow>

                    {interpolatedValue !== undefined && resultVar && (
                        <ResultDisplay label={resultVar} value={interpolatedValue.toFixed(4)} accent="#db2777" />
                    )}
                </>
            ) : (
                <EmptyState message="No curve data" action="Digitize curve" />
            )}
        </BaseNode>
    );
}

export const GraphInterpolationNode = memo(GraphInterpolationNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  DECISION NODE
//  Evaluates a boolean condition and routes to true/false branches.
//  Shows condition expression and which branch was taken.
// ═══════════════════════════════════════════════════════════════════════════

function DecisionNodeInner({ id, data, selected }: NodeProps) {
    const d = data as NodeData;
    const config = d.config;
    const result = d.executionResult;

    const condition = config.condition as string | undefined;
    const branches = config.branches as Record<string, { label: string; set_variables?: Record<string, unknown> }> | undefined;
    const conditionResult = result?.evaluatedTo as boolean | undefined;

    return (
        <BaseNode
            id={id}
            nodeType="DECISION"
            label={d.label || "Decision"}
            selected={selected}
            executionStatus={d.executionStatus}
            width={280}
        >
            {condition ? (
                <>
                    <ConditionDisplay condition={condition} result={conditionResult} />

                    {branches && (
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                            {/* True branch */}
                            <div
                                style={{
                                    flex: 1,
                                    padding: "4px 6px",
                                    borderRadius: 5,
                                    border: `1px solid ${conditionResult === true ? "#86efac" : "#f1f5f9"}`,
                                    backgroundColor: conditionResult === true ? "#f0fdf4" : "transparent",
                                    fontSize: 10,
                                    fontWeight: 500,
                                }}
                            >
                                <div style={{ color: "#16a34a", fontWeight: 600, marginBottom: 1 }}>True</div>
                                <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {branches.true?.label || "—"}
                                </div>
                            </div>

                            {/* False branch */}
                            <div
                                style={{
                                    flex: 1,
                                    padding: "4px 6px",
                                    borderRadius: 5,
                                    border: `1px solid ${conditionResult === false ? "#fca5a5" : "#f1f5f9"}`,
                                    backgroundColor: conditionResult === false ? "#fef2f2" : "transparent",
                                    fontSize: 10,
                                    fontWeight: 500,
                                }}
                            >
                                <div style={{ color: "#dc2626", fontWeight: 600, marginBottom: 1 }}>False</div>
                                <div style={{ color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {branches.false?.label || "—"}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <EmptyState message="No condition set" action="Set condition" />
            )}
        </BaseNode>
    );
}

export const DecisionNode = memo(DecisionNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  DISPLAY NODE
//  Shows results, comparisons, and design discharge selection.
//  Renders ranked method cards and the adopted value.
// ═══════════════════════════════════════════════════════════════════════════

function DisplayNodeInner({ id, data, selected }: NodeProps) {
    const d = data as NodeData;
    const config = d.config;
    const result = d.executionResult;

    const mode = config.mode as string | undefined;
    const compareVars = (config.compare_variables || []) as { key: string; method?: string; label?: string }[];
    const selectionRule = config.selection_rule as string | undefined;
    const resultVar = config.result_variable as string | undefined;
    const resultUnit = config.result_unit as string | undefined;

    const ranking = result?.ranking as { key: string; method: string; value: number }[] | undefined;
    const adopted = result?.adopted as number | undefined;

    return (
        <BaseNode
            id={id}
            nodeType="DISPLAY"
            label={d.label || "Display"}
            subtitle={mode === "comparison" ? `Compare ${compareVars.length} methods` : mode}
            selected={selected}
            executionStatus={d.executionStatus}
            width={280}
        >
            {compareVars.length > 0 ? (
                <>
                    {ranking ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {ranking.slice(0, 4).map((r, i) => (
                                <div
                                    key={r.key}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "3px 6px",
                                        borderRadius: 4,
                                        backgroundColor: i === 0 ? "#fffbeb" : "transparent",
                                        border: i === 0 ? "1px solid #fde68a" : "1px solid transparent",
                                        fontSize: 11,
                                    }}
                                >
                                    <span style={{ color: i === 0 ? "#92400e" : "#64748b", fontWeight: i === 0 ? 600 : 400 }}>
                                        {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `${i + 1}th`} {r.method}
                                    </span>
                                    <span
                                        style={{
                                            fontFamily: "'JetBrains Mono', monospace",
                                            fontWeight: 700,
                                            color: i === 0 ? "#92400e" : "#1e293b",
                                            fontSize: 12,
                                        }}
                                    >
                                        {Math.round(r.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {compareVars.map((v) => (
                                <VariablePill key={v.key} name={v.key} />
                            ))}
                        </div>
                    )}

                    <FieldRow label="Rule">{selectionRule || "max"}</FieldRow>

                    {adopted !== undefined && resultVar && (
                        <ResultDisplay label={resultVar} value={adopted} unit={resultUnit} accent="#0284c7" />
                    )}
                </>
            ) : (
                <EmptyState message="No variables to compare" action="Configure" />
            )}
        </BaseNode>
    );
}

export const DisplayNode = memo(DisplayNodeInner);
