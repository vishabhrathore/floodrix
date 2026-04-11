// ═══════════════════════════════════════════════════════════════════════════
//  nodes/base/node-fields.tsx
//  Composable field components rendered inside node bodies.
//
//  Each component is self-contained: it owns its styling, layout, and
//  formatting. Node types compose these like building blocks.
//
//  Components:
//    VariablePill     — colored inline pill showing a variable name + value
//    FormulaDisplay   — syntax-colored formula expression
//    FieldRow         — label/value horizontal row
//    SectionLabel     — uppercase divider inside a node body
//    TablePreview     — compact lookup table with highlighted match
//    ConditionDisplay — boolean condition with TRUE/FALSE tag
//    ResultDisplay    — prominent computed result with accent color
//    EmptyState       — placeholder when node needs configuration
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { HANDLE_COLORS, HandleDataType } from "@/theme/calc-theme";
import { memo, type ReactNode } from "react";
// import { HANDLE_COLORS, type HandleDataType } from "./calc-theme";

// ─── VariablePill ────────────────────────────────────────────────────────
// Shows a variable name with a type-colored dot.
// Optionally shows the current value and unit.
//
// Usage: <VariablePill name="C_dicken" value={14} unit="" />

interface VariablePillProps {
    name: string;
    dataType?: HandleDataType;
    value?: string | number;
    unit?: string;
}

function VariablePillInner({ name, dataType = "number", value, unit }: VariablePillProps) {
    const c = HANDLE_COLORS[dataType];
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "1px 6px",
                borderRadius: 4,
                backgroundColor: `${c.bg}10`,
                border: `1px solid ${c.bg}28`,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontWeight: 500,
                color: c.border,
                lineHeight: 1.6,
                maxWidth: "100%",
            }}
        >
            <span
                style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: c.bg,
                    flexShrink: 0,
                }}
            />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {name}
            </span>
            {value !== undefined && (
                <span style={{ color: "#1e293b", fontWeight: 600, flexShrink: 0 }}>
                    = {typeof value === "number" ? formatNum(value) : value}
                </span>
            )}
            {unit && (
                <span style={{ color: "#94a3b8", fontWeight: 400, flexShrink: 0 }}>
                    {unit}
                </span>
            )}
        </span>
    );
}

export const VariablePill = memo(VariablePillInner);

// ─── FormulaDisplay ──────────────────────────────────────────────────────
// Renders a mathjs expression in a green-tinted code box.
//
// Usage: <FormulaDisplay expression="Q = C × M^(3/4)" />

interface FormulaDisplayProps {
    expression: string;
    compact?: boolean;
}

function FormulaDisplayInner({ expression, compact = false }: FormulaDisplayProps) {
    return (
        <div
            style={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: compact ? 11 : 12,
                fontWeight: 500,
                color: "#064e3b",
                backgroundColor: "#f0fdf8",
                border: "1px solid #d1fae5",
                borderRadius: 6,
                padding: compact ? "3px 7px" : "5px 8px",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}
        >
            {expression}
        </div>
    );
}

export const FormulaDisplay = memo(FormulaDisplayInner);

// ─── FieldRow ────────────────────────────────────────────────────────────
// Horizontal label + value row. Used for simple key-value displays.
//
// Usage: <FieldRow label="Area">24.1 Km²</FieldRow>

interface FieldRowProps {
    label: string;
    children: ReactNode;
    muted?: boolean;
}

export function FieldRow({ label, children, muted = false }: FieldRowProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                padding: "3px 0",
                fontSize: 11,
                lineHeight: 1.4,
            }}
        >
            <span
                style={{
                    color: muted ? "#d1d5db" : "#94a3b8",
                    fontWeight: 500,
                    flexShrink: 0,
                }}
            >
                {label}
            </span>
            <span
                style={{
                    color: "#374151",
                    fontWeight: 500,
                    textAlign: "right",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {children}
            </span>
        </div>
    );
}

// ─── SectionLabel ────────────────────────────────────────────────────────
// Small uppercase divider text between sections inside a node body.
//
// Usage: <SectionLabel>Variables</SectionLabel>

export function SectionLabel({ children }: { children: ReactNode }) {
    return (
        <div
            style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: "uppercase",
                color: "#cbd5e1",
                marginTop: 6,
                marginBottom: 3,
            }}
        >
            {children}
        </div>
    );
}

// ─── TablePreview ────────────────────────────────────────────────────────
// Compact table rows for lookup table nodes.
// Highlights the matched row with a blue background.
//
// Usage:
//   <TablePreview
//     rows={[{ label: "< 60 cm", value: 11 }, ...]}
//     highlightIndex={1}
//   />

interface TablePreviewProps {
    rows: { label: string; value: string | number }[];
    maxRows?: number;
    highlightIndex?: number;
}

function TablePreviewInner({ rows, maxRows = 4, highlightIndex }: TablePreviewProps) {
    const visible = rows.slice(0, maxRows);
    const remaining = rows.length - maxRows;

    return (
        <div
            style={{
                borderRadius: 6,
                border: "1px solid #f1f5f9",
                overflow: "hidden",
            }}
        >
            {visible.map((row, i) => {
                const isMatch = i === highlightIndex;
                return (
                    <div
                        key={i}
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "3px 8px",
                            fontSize: 11,
                            borderBottom: i < visible.length - 1 ? "1px solid #f8fafc" : "none",
                            backgroundColor: isMatch ? "#eff6ff" : "transparent",
                        }}
                    >
                        <span
                            style={{
                                color: isMatch ? "#1d4ed8" : "#64748b",
                                fontWeight: isMatch ? 600 : 400,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {isMatch && "▸ "}
                            {row.label}
                        </span>
                        <span
                            style={{
                                fontFamily: "'JetBrains Mono', monospace",
                                fontWeight: 600,
                                fontSize: 11,
                                color: isMatch ? "#1d4ed8" : "#1e293b",
                                flexShrink: 0,
                                marginLeft: 8,
                            }}
                        >
                            {row.value}
                        </span>
                    </div>
                );
            })}
            {remaining > 0 && (
                <div
                    style={{
                        padding: "2px 8px",
                        fontSize: 10,
                        color: "#cbd5e1",
                        textAlign: "center",
                        borderTop: "1px solid #f8fafc",
                    }}
                >
                    +{remaining} more
                </div>
            )}
        </div>
    );
}

export const TablePreview = memo(TablePreviewInner);

// ─── ConditionDisplay ────────────────────────────────────────────────────
// Shows a boolean condition expression with a TRUE/FALSE result tag.
//
// Usage: <ConditionDisplay condition="dist_coast <= 25" result={false} />

interface ConditionDisplayProps {
    condition: string;
    result?: boolean;
}

function ConditionDisplayInner({ condition, result }: ConditionDisplayProps) {
    return (
        <div
            style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                fontWeight: 500,
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: 6,
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
            }}
        >
            <span
                style={{
                    color: "#c2410c",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {condition}
            </span>
            {result !== undefined && (
                <span
                    style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: 3,
                        backgroundColor: result ? "#dcfce7" : "#fef2f2",
                        color: result ? "#166534" : "#991b1b",
                        flexShrink: 0,
                    }}
                >
                    {result ? "TRUE" : "FALSE"}
                </span>
            )}
        </div>
    );
}

export const ConditionDisplay = memo(ConditionDisplayInner);

// ─── ResultDisplay ───────────────────────────────────────────────────────
// Prominent result bar at the bottom of a node.
// Shows the output variable name and computed value.
//
// Usage: <ResultDisplay label="Q_dicken" value={152.06} unit="Cumecs" />

interface ResultDisplayProps {
    label: string;
    value: string | number;
    unit?: string;
    accent?: string;
}

function ResultDisplayInner({
    label,
    value,
    unit,
    accent = "#059669",
}: ResultDisplayProps) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: `${accent}08`,
                border: `1px solid ${accent}22`,
                borderRadius: 6,
                padding: "5px 8px",
                marginTop: 4,
            }}
        >
            <span
                style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: accent,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                }}
            >
                {label}
            </span>
            <span
                style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    fontWeight: 700,
                    color: accent,
                }}
            >
                {typeof value === "number" ? formatNum(value) : value}
                {unit && (
                    <span
                        style={{
                            fontSize: 10,
                            fontWeight: 500,
                            color: "#94a3b8",
                            marginLeft: 3,
                        }}
                    >
                        {unit}
                    </span>
                )}
            </span>
        </div>
    );
}

export const ResultDisplay = memo(ResultDisplayInner);

export function CodePreview({
    code,
    maxLines = 3,
}: {
    code: string;
    maxLines?: number;
}) {
    const lines = code.split("\n").filter(Boolean);
    const visible = lines.slice(0, maxLines);
    const remaining = lines.length - maxLines;

    return (
        <div
            style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                lineHeight: 1.6,
                backgroundColor: "#1e293b",
                color: "#e2e8f0",
                borderRadius: 6,
                padding: "6px 8px",
                overflow: "hidden",
            }}
        >
            {visible.map((line, i) => (
                <div key={i} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <span style={{ color: "#475569", marginRight: 8, userSelect: "none" }}>{i + 1}</span>
                    {line}
                </div>
            ))}
            {remaining > 0 && (
                <div style={{ color: "#64748b", marginTop: 2 }}>... +{remaining} lines</div>
            )}
        </div>
    );
}

// ─── EmptyState ──────────────────────────────────────────────────────────
// Shown when a node needs configuration before it can do anything.
//
// Usage: <EmptyState message="No formula set" action="Select formula" />

interface EmptyStateProps {
    message: string;
    action?: string;
    onAction?: () => void;
}

export function EmptyState({ message, action, onAction }: EmptyStateProps) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "8px 4px",
                color: "#94a3b8",
                fontSize: 11,
                textAlign: "center",
            }}
        >
            <span>{message}</span>
            {action && onAction && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAction();
                    }}
                    style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#3b82f6",
                        backgroundColor: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        borderRadius: 5,
                        padding: "3px 10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                    }}
                >
                    {action}
                </button>
            )}
        </div>
    );
}

// ─── Utility ─────────────────────────────────────────────────────────────

function formatNum(n: number): string {
    if (Number.isInteger(n)) return n.toLocaleString();
    if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString();
    return parseFloat(n.toFixed(3)).toString();
}
