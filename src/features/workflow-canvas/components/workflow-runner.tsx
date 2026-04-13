// src/features/workflow-canvas/components/workflow-runner.tsx
// FloodRix Workflow Runner — Manual + Batch execution UI

"use client";

import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Play, Pause, CheckCircle2, XCircle, Loader2,
    RotateCcw, Send, Calculator, AlertTriangle,
    Upload, Download, FileSpreadsheet, Plus, Trash2,
} from "lucide-react";
import type { SessionStatus } from "@/generated/prisma";

// ─── Types ───────────────────────────────────────────────────────────────

interface InputField {
    key: string;
    label: string;
    unit?: string;
    default?: number | string;
    hint?: string;
    data_type?: string;
    required?: boolean;
    constraints?: { min?: number; max?: number; step?: number };
}

interface PausedNode {
    nodeId: string;
    nodeLabel: string;
    fields: InputField[];
}

interface RunState {
    status: SessionStatus | null;
    sessionId: string | null;
    variables: Record<string, unknown>;
    currentNodeId: string | null;
    pauseReason: string | null;
    pausedNode: PausedNode | null;
    completedAt: string | null;
    error: { nodeId: string; message: string; type: string } | null;
}

interface WorkflowRunnerProps {
    workflowId: string;
    workflowName: string;
    workflowRef?: string;
    workflowRegion?: string;
    workflowExpr?: string;
}

// ─── Component ───────────────────────────────────────────────────────────

export function WorkflowRunner({
    workflowId,
    workflowName,
    workflowRef,
    workflowRegion,
    workflowExpr,
}: WorkflowRunnerProps) {
    const trpc = useTRPC();
    const [mode, setMode] = useState<"manual" | "batch">("manual");

    const [state, setState] = useState<RunState>({
        status: null, sessionId: null, variables: {},
        currentNodeId: null, pauseReason: null, pausedNode: null,
        completedAt: null, error: null,
    });

    const [inputValues, setInputValues] = useState<Record<string, string>>({});
    const [history, setHistory] = useState<{ label: string; values: Record<string, unknown> }[]>([]);

    // Batch state
    const [batchRows, setBatchRows] = useState<Record<string, string>[]>([{}]);
    const [batchResults, setBatchResults] = useState<{ values: Record<string, unknown>; result: Record<string, unknown> }[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    // ── Mutations ────────────────────────────────────────────────────────

    const startMutation = useMutation(
        trpc.calcExecution.startRun.mutationOptions({
            onSuccess(data: any) {
                setState({
                    status: data.status, sessionId: data.sessionId,
                    variables: data.variables ?? {},
                    currentNodeId: data.currentNodeId ?? null,
                    pauseReason: data.pauseReason ?? null,
                    pausedNode: data.pausedNode ?? null,
                    completedAt: data.completedAt ?? null,
                    error: data.error ?? null,
                });
                if (data.pausedNode?.fields) {
                    const defaults: Record<string, string> = {};
                    for (const f of data.pausedNode.fields) {
                        if (f.default !== undefined) defaults[f.key] = String(f.default);
                    }
                    setInputValues(defaults);
                }
            },
            onError(err) {
                setState(s => ({ ...s, status: "ERRORED", error: { nodeId: "", message: err.message, type: "start_error" } }));
            },
        })
    );

    const submitMutation = useMutation(
        trpc.calcExecution.submitInput.mutationOptions({
            onSuccess(data: any) {
                if (state.pausedNode) {
                    setHistory(h => [...h, {
                        label: state.pausedNode!.nodeLabel,
                        values: Object.fromEntries(Object.entries(inputValues).map(([k, v]) => [k, parseFloat(v) || v])),
                    }]);
                }
                setState({
                    status: data.status, sessionId: data.sessionId ?? state.sessionId,
                    variables: data.variables ?? state.variables,
                    currentNodeId: data.currentNodeId ?? null,
                    pauseReason: data.pauseReason ?? null,
                    pausedNode: data.pausedNode ?? null,
                    completedAt: data.completedAt ?? null,
                    error: data.error ?? null,
                });
                if (data.pausedNode?.fields) {
                    const defaults: Record<string, string> = {};
                    for (const f of data.pausedNode.fields) {
                        if (f.default !== undefined) defaults[f.key] = String(f.default);
                    }
                    setInputValues(defaults);
                } else setInputValues({});
            },
            onError(err) {
                setState(s => ({ ...s, error: { nodeId: "", message: err.message, type: "submit_error" } }));
            },
        })
    );

    // ── Actions ──────────────────────────────────────────────────────────

    const handleStart = useCallback(() => {
        setHistory([]); setInputValues({});
        startMutation.mutate({ workflowId });
    }, [workflowId, startMutation]);

    const handleSubmit = useCallback(() => {
        if (!state.sessionId) return;
        const parsed: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(inputValues)) {
            const num = parseFloat(val);
            parsed[key] = isNaN(num) ? val : num;
        }
        submitMutation.mutate({ sessionId: state.sessionId, values: parsed });
    }, [state.sessionId, inputValues, submitMutation]);

    const handleReset = useCallback(() => {
        setState({ status: null, sessionId: null, variables: {}, currentNodeId: null, pauseReason: null, pausedNode: null, completedAt: null, error: null });
        setInputValues({}); setHistory([]); setBatchResults([]);
    }, []);

    const isIdle = !state.status;
    const isPaused = state.status === "PAUSED";
    const isRunning = state.status === "RUNNING";
    const isComplete = state.status === "COMPLETED";
    const isError = state.status === "ERRORED";

    // ── Waterway calculations ────────────────────────────────────────────

    const Qd = typeof state.variables.Qd === "number" ? state.variables.Qd
        : typeof state.variables.Q_dicken === "number" ? state.variables.Q_dicken
            : typeof state.variables.Q_ryve === "number" ? state.variables.Q_ryve
                : typeof state.variables.Q_ingli === "number" ? state.variables.Q_ingli
                    : typeof state.variables.Q_creager === "number" ? state.variables.Q_creager
                        : typeof state.variables.Q_rational === "number" ? state.variables.Q_rational
                            : typeof state.variables.Q_fuller === "number" ? state.variables.Q_fuller
                                : null;

    const P_lacey = Qd ? 4.8 * Math.sqrt(Qd) : null;
    const W_linear = Qd ? 4.5 * Math.sqrt(Qd) : null;
    const W_cwc = Qd ? 8.95 * Math.pow(Qd, 1 / 3) : null;
    const ww_min = P_lacey && W_linear ? Math.min(P_lacey, W_linear) : null;

    return (
        <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: 900, margin: "0 auto" }}>

            {/* ═══ MODE TOGGLE ═══ */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div>
                    <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: "#191919", letterSpacing: -0.5 }}>
                        {workflowName}
                    </div>
                    {workflowExpr && (
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#247ba0", fontWeight: 600, marginTop: 2 }}>
                            {workflowExpr}
                        </div>
                    )}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                    <ModeBtn active={mode === "manual"} onClick={() => setMode("manual")}>Manual</ModeBtn>
                    <ModeBtn active={mode === "batch"} onClick={() => setMode("batch")}>Batch / Excel</ModeBtn>
                    {workflowRef && (
                        <span style={{ background: "rgba(251,54,64,0.14)", border: "1px solid rgba(251,54,64,0.28)", color: "#fb3640", padding: "4px 11px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, marginLeft: 6 }}>
                            {workflowRef}
                        </span>
                    )}
                </div>
            </div>

            {mode === "manual" ? (
                <>
                    {/* ═══ IDLE ═══ */}
                    {isIdle && (
                        <Card icon="⌨" title="Start Calculation" sub={`Run ${workflowName} step by step`} accent="red">
                            <div style={{ textAlign: "center", padding: "20px 0" }}>
                                <button onClick={handleStart} disabled={startMutation.isPending} style={btnCalcStyle}>
                                    {startMutation.isPending ? "Starting..." : "▶ Calculate"}
                                </button>
                            </div>
                        </Card>
                    )}

                    {/* ═══ SUBMITTED INPUTS HISTORY ═══ */}
                    {history.map((h, idx) => (
                        <Card key={idx} icon="✓" title={h.label} sub={`Step ${idx + 1} — submitted`} accent="teal">
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {Object.entries(h.values).map(([k, v]) => (
                                    <VarPill key={k} name={k} value={String(v)} />
                                ))}
                            </div>
                        </Card>
                    ))}

                    {/* ═══ RUNNING ═══ */}
                    {isRunning && (
                        <Card icon="⚙" title="Executing..." sub="Processing nodes" accent="blue">
                            <div style={{ textAlign: "center", padding: 16, color: "#6b7280", fontSize: 13 }}>
                                <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-blue-500" />
                                Running calculation nodes...
                            </div>
                        </Card>
                    )}

                    {/* ═══ PAUSED — INPUT FORM ═══ */}
                    {isPaused && state.pausedNode && (
                        <Card icon="⌨" title={state.pausedNode.nodeLabel} sub="Enter values to continue" accent="red">
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
                                {state.pausedNode.fields.map(field => (
                                    <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                        <label style={{ fontSize: 11, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: 0.5 }}>
                                            {field.label}
                                        </label>
                                        {field.hint && <div style={{ fontSize: 10, color: "#9ca3af" }}>{field.hint}</div>}
                                        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1.5px solid #d1d5db" }}>
                                            <input
                                                type={field.data_type === "number" ? "number" : "text"}
                                                step={field.constraints?.step ?? "any"}
                                                min={field.constraints?.min}
                                                max={field.constraints?.max}
                                                value={inputValues[field.key] ?? ""}
                                                onChange={e => setInputValues(p => ({ ...p, [field.key]: e.target.value }))}
                                                placeholder={field.default !== undefined ? `${field.default}` : ""}
                                                style={{ flex: 1, padding: "9px 11px", border: "none", outline: "none", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: "#191919", background: "#fff" }}
                                            />
                                            {field.unit && field.unit !== "—" && (
                                                <span style={{ background: "#f9fafb", padding: "9px 10px", fontSize: 10, fontWeight: 700, color: "#6b7280", borderLeft: "1px solid #d1d5db", whiteSpace: "nowrap", letterSpacing: 0.5, textTransform: "uppercase" }}>
                                                    {field.unit}
                                                </span>
                                            )}
                                        </div>
                                        {field.constraints && (
                                            <div style={{ display: "flex", gap: 8, fontSize: 10, color: "#9ca3af" }}>
                                                {field.constraints.min !== undefined && <span>Min: {field.constraints.min}</span>}
                                                {field.constraints.max !== undefined && <span>Max: {field.constraints.max}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                                <button onClick={handleSubmit} disabled={submitMutation.isPending} style={btnCalcStyle}>
                                    {submitMutation.isPending ? "Submitting..." : "▶ Calculate"}
                                </button>
                                <button onClick={handleReset} style={btnOutlineStyle}>↺ Reset</button>
                            </div>
                        </Card>
                    )}

                    {/* ═══ COMPLETE — RESULTS ═══ */}
                    {isComplete && (
                        <>
                            {/* Result banner */}
                            {Qd !== null && (
                                <div style={{ background: "#111", borderRadius: 14, padding: "24px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#555", marginBottom: 6 }}>Design Discharge</div>
                                        <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Outfit', sans-serif" }}>{workflowName}</div>
                                        {workflowRef && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>{workflowRef} · {workflowRegion}</div>}
                                    </div>
                                    <div style={{ display: "flex", alignItems: "baseline" }}>
                                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 52, fontWeight: 800, color: "#fb3640", lineHeight: 1 }}>
                                            {fmt(Qd)}
                                        </span>
                                        <span style={{ fontSize: 16, color: "#6b7280", marginLeft: 6 }}>Cumecs</span>
                                    </div>
                                </div>
                            )}

                            {/* Formula working table */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 18, marginBottom: 20 }}>
                                <Card icon="ƒ" title="Formula Working" sub="Variable substitution" accent="teal">
                                    {workflowExpr && (
                                        <div style={{ background: "#f0fdf8", border: "1.5px solid #6ee7b7", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: "#059669", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>Formula</div>
                                            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "#064e3b", fontWeight: 600 }}>{workflowExpr}</div>
                                            {workflowRef && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3 }}>{workflowRef}</div>}
                                        </div>
                                    )}
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                        <thead>
                                            <tr>
                                                <th style={thStyle}>Var</th>
                                                <th style={thStyle}>Description</th>
                                                <th style={thStyle}>Value</th>
                                                <th style={thStyle}>Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(state.variables)
                                                .sort(([a], [b]) => a.localeCompare(b))
                                                .map(([key, value]) => {
                                                    const isResult = key.startsWith("Q") || key === "Qd";
                                                    return (
                                                        <tr key={key} style={isResult ? { background: "rgba(251,54,64,0.05)" } : {}}>
                                                            <td style={{ ...tdStyle, color: isResult ? "#fb3640" : "#247ba0", fontWeight: 600, fontSize: 13 }}>{key}</td>
                                                            <td style={{ ...tdStyle, fontFamily: "'Inter',sans-serif", color: "#374151" }}>{key}</td>
                                                            <td style={{ ...tdStyle, fontWeight: 700, fontSize: isResult ? 15 : 13, color: isResult ? "#fb3640" : "#191919" }}>
                                                                {typeof value === "number" ? fmt(value) : String(value)}
                                                            </td>
                                                            <td style={{ ...tdStyle, fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#6b7280" }}>—</td>
                                                        </tr>
                                                    );
                                                })}
                                        </tbody>
                                    </table>
                                </Card>
                            </div>

                            {/* Waterway determination */}
                            {Qd !== null && P_lacey && W_linear && W_cwc && ww_min && (
                                <Card icon="〜" title="Waterway Determination" sub="Article-8, IRC:SP:13-2004" accent="teal">
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12, marginBottom: 16 }}>
                                        <WaterwayCard label="Lacey's Regime Width" value={P_lacey} unit="m" sub="P = 4.8 × √Qd" best={P_lacey === ww_min} />
                                        <WaterwayCard label="Linear Waterway" value={W_linear} unit="m" sub="W = 4.5 × √Qd" best={W_linear === ww_min} />
                                        <WaterwayCard label="CWC Formula" value={W_cwc} unit="m" sub="W = 8.95 × Qd^(1/3)" />
                                        <WaterwayCard label="Recommended" value={ww_min} unit="m" sub="min(Lacey, Linear)" best />
                                    </div>
                                    <div style={{ background: "#f8fafc", borderLeft: "3px solid #fb3640", borderRadius: "0 8px 8px 0", padding: "10px 14px", fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>
                                        <strong style={{ color: "#111827" }}>IRC Article-8:</strong> Provide at least <strong style={{ color: "#111827" }}>{ww_min.toFixed(1)} m</strong> clear waterway.
                                    </div>
                                </Card>
                            )}

                            {/* Actions */}
                            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                                <button onClick={handleReset} style={btnOutlineStyle}>↺ New Run</button>
                                <button onClick={handleStart} style={btnCalcStyle}>▶ Re-run</button>
                            </div>
                        </>
                    )}

                    {/* ═══ ERROR ═══ */}
                    {isError && (
                        <Card icon="⚠" title="Execution Failed" sub={state.error?.type ?? "Error"} accent="red">
                            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#991b1b", marginBottom: 12 }}>
                                {state.error?.message ?? "Unknown error"}
                            </div>
                            {Object.keys(state.variables).length > 0 && (
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Partial Results</div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {Object.entries(state.variables).map(([k, v]) => (
                                            <VarPill key={k} name={k} value={String(v)} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div style={{ display: "flex", gap: 12 }}>
                                <button onClick={handleReset} style={btnOutlineStyle}>↺ Reset</button>
                                <button onClick={handleStart} style={btnCalcStyle}>▶ Retry</button>
                            </div>
                        </Card>
                    )}
                </>
            ) : (
                /* ═══ BATCH MODE ═══ */
                <BatchPanel
                    workflowId={workflowId}
                    workflowName={workflowName}
                    pausedNode={state.pausedNode}
                    onStart={handleStart}
                    isStarting={startMutation.isPending}
                    isIdle={isIdle}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-components
// ═══════════════════════════════════════════════════════════════════════════

function BatchPanel({
    workflowId, workflowName, pausedNode, onStart, isStarting, isIdle,
}: {
    workflowId: string; workflowName: string;
    pausedNode: PausedNode | null; onStart: () => void; isStarting: boolean; isIdle: boolean;
}) {
    const fields = pausedNode?.fields ?? [];
    const [rows, setRows] = useState<Record<string, string>[]>([{}]);
    const [results, setResults] = useState<Record<string, unknown>[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const addRow = () => setRows(r => [...r, {}]);
    const updateRow = (idx: number, key: string, val: string) => {
        setRows(r => r.map((row, i) => i === idx ? { ...row, [key]: val } : row));
    };
    const removeRow = (idx: number) => setRows(r => r.filter((_, i) => i !== idx));

    const downloadTemplate = () => {
        if (fields.length === 0) return;
        const headers = [...fields.map(f => f.key), "Q_result", "P_lacey", "W_linear"];
        const example = [...fields.map(f => String(f.default ?? "")), "", "", ""];
        const csv = [headers.join(","), example.join(",")].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `floodrix_template.csv`;
        a.click();
    };

    const exportResults = () => {
        if (results.length === 0) return;
        const keys = Object.keys(results[0]);
        const csv = [keys.join(","), ...results.map(r => keys.map(k => String(r[k] ?? "")).join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `floodrix_results.csv`;
        a.click();
    };

    // First run to get the fields
    if (isIdle && fields.length === 0) {
        return (
            <Card icon="📊" title="Batch Calculator" sub="First, start a single run to detect input fields" accent="blue">
                <div style={{ textAlign: "center", padding: 20 }}>
                    <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                        Click below to detect the input fields for this workflow.
                        After that, you can enter multiple rows of data.
                    </p>
                    <button onClick={onStart} disabled={isStarting} style={btnCalcStyle}>
                        {isStarting ? "Detecting..." : "▶ Detect Fields"}
                    </button>
                </div>
            </Card>
        );
    }

    return (
        <>
            {/* Template download */}
            <Card icon="📊" title="Excel Batch Upload" sub={`${workflowName} — process multiple sites`} accent="teal">
                <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
                        Required Columns
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {fields.map(f => (
                            <span key={f.key} style={{ background: "#fff", border: "1px solid #fde68a", borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "#78350f", fontFamily: "'JetBrains Mono', monospace" }}>
                                {f.key}
                            </span>
                        ))}
                        <span style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: 5, padding: "4px 10px", fontSize: 10, fontWeight: 600, color: "#166534", fontFamily: "'JetBrains Mono', monospace" }}>Q_result</span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={downloadTemplate} style={btnOutlineStyle}>
                        <Download className="inline h-3 w-3 mr-1" /> Download Template
                    </button>
                    <button onClick={() => fileRef.current?.click()} style={btnOutlineStyle}>
                        <Upload className="inline h-3 w-3 mr-1" /> Upload CSV
                    </button>
                    <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }} />
                </div>
            </Card>

            {/* Manual data entry table */}
            <Card icon="✏" title="Manual Data Entry" sub={`${rows.length} row${rows.length !== 1 ? "s" : ""}`} accent="red">
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>#</th>
                                {fields.map(f => (
                                    <th key={f.key} style={thStyle}>
                                        {f.label}<br />
                                        <span style={{ color: "#d1d5db", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", fontWeight: 400 }}>{f.unit}</span>
                                    </th>
                                ))}
                                <th style={{ ...thStyle, color: "#059669" }}>Q (Cumecs)</th>
                                <th style={{ ...thStyle, color: "#059669" }}>Waterway (m)</th>
                                <th style={thStyle}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row, idx) => (
                                <tr key={idx}>
                                    <td style={{ ...tdStyle, color: "#6b7280", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{idx + 1}</td>
                                    {fields.map(f => (
                                        <td key={f.key} style={{ padding: "4px 6px" }}>
                                            <input
                                                type="number"
                                                step="any"
                                                value={row[f.key] ?? f.default ?? ""}
                                                onChange={e => updateRow(idx, f.key, e.target.value)}
                                                style={{ width: 80, padding: "6px 8px", border: "1.5px solid #d1d5db", borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, outline: "none" }}
                                            />
                                        </td>
                                    ))}
                                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>—</td>
                                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#0d9488" }}>—</td>
                                    <td style={{ padding: "4px 6px" }}>
                                        <button onClick={() => removeRow(idx)} style={{ background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 14 }}>×</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button onClick={addRow} style={btnOutlineStyle}>+ Add Row</button>
                    <button style={btnCalcStyle}>▶ Calculate All</button>
                    <button onClick={exportResults} style={btnOutlineStyle}>⬇ Export CSV</button>
                </div>
            </Card>
        </>
    );
}

// ── Card wrapper ─────────────────────────────────────────────────────────

const ACCENT_COLORS = {
    red: { bg: "rgba(251,54,64,0.1)", color: "#fb3640" },
    blue: { bg: "rgba(36,123,160,0.1)", color: "#247ba0" },
    teal: { bg: "rgba(13,148,136,0.1)", color: "#0d9488" },
};

function Card({ icon, title, sub, accent, children }: {
    icon: string; title: string; sub: string;
    accent: keyof typeof ACCENT_COLORS; children: React.ReactNode;
}) {
    const a = ACCENT_COLORS[accent];
    return (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", gap: 10, background: "#fafbfc" }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: a.bg, flexShrink: 0 }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#191919" }}>{title}</div>
                    <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{sub}</div>
                </div>
            </div>
            <div style={{ padding: "18px 20px" }}>{children}</div>
        </div>
    );
}

function WaterwayCard({ label, value, unit, sub, best }: {
    label: string; value: number; unit: string; sub: string; best?: boolean;
}) {
    return (
        <div style={{ border: `1.5px solid ${best ? "#0d9488" : "#e5e7eb"}`, borderRadius: 10, padding: "14px 15px", background: best ? "rgba(13,148,136,0.04)" : "#fff" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: best ? "#0d9488" : "#191919", fontFamily: "'Outfit', sans-serif" }}>{value.toFixed(2)}</span>
            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 3 }}>{unit}</span>
            <div style={{ fontSize: 10, color: "#6b7280", marginTop: 3, lineHeight: 1.4 }}>{sub}</div>
        </div>
    );
}

function VarPill({ name, value }: { name: string; value: string }) {
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: "rgba(36,123,160,0.08)", border: "1px solid rgba(36,123,160,0.2)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: "#247ba0" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#247ba0" }} />
            {name}
            <span style={{ color: "#191919", fontWeight: 600 }}>= {value}</span>
        </span>
    );
}

function ModeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button onClick={onClick} style={{
            background: active ? "#fb3640" : "rgba(0,0,0,0.04)",
            border: `1px solid ${active ? "#fb3640" : "#e5e7eb"}`,
            color: active ? "#fff" : "#6b7280",
            padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: "pointer", fontFamily: "'Outfit', sans-serif", transition: "all 0.15s",
        }}>
            {children}
        </button>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────

const btnCalcStyle: React.CSSProperties = {
    background: "#fb3640", color: "#fff", border: "none",
    padding: "11px 28px", borderRadius: 8,
    fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700,
    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
    boxShadow: "0 4px 12px rgba(251,54,64,0.3)",
};

const btnOutlineStyle: React.CSSProperties = {
    background: "transparent", border: "1.5px solid #e5e7eb", color: "#6b7280",
    padding: "11px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
};

const thStyle: React.CSSProperties = {
    background: "#f9fafb", color: "#6b7280", padding: "8px 12px",
    textAlign: "left", fontSize: 9, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1,
    borderBottom: "2px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
    padding: "9px 12px", borderBottom: "1px solid #f3f4f6",
    fontFamily: "'JetBrains Mono', monospace",
};

function fmt(v: number, dp = 3): string | number {
    if (Number.isInteger(v)) return v.toLocaleString();
    if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString();
    return parseFloat(v.toFixed(dp));
}