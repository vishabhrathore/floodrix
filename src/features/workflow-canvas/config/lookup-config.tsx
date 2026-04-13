// src/features/workflow-canvas/config/lookup-config.tsx

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Table2, TrendingUp, Layers, ArrowRight } from "lucide-react";
import { ConfigSection, ConfigField } from "./config-drawer";

// ─── Types ───────────────────────────────────────────────────────────────

interface RangeRow {
    from: number;
    to: number | null;
    value: number;
    label: string;
    remarks?: string;
}

interface CurvePoint {
    x: number;
    y: number;
}

interface MultiKeyRow {
    keys: Record<string, string | number>;
    value: number;
}

type TableMode = "range" | "interpolated" | "multi_key";

interface LookupConfigProps {
    config: {
        table_mode?: TableMode;
        // Shared
        lookup_key?: string;
        result_variable?: string;
        reference?: string;
        fallback_mode?: string;
        allow_override?: boolean;
        // Range
        range_rows?: RangeRow[];
        // Interpolated
        data_points?: CurvePoint[];
        interpolation_method?: string;
        extrapolation?: string;
        input_unit?: string;
        output_unit?: string;
        // Multi-key
        input_keys?: { key: string; type: "exact" | "range"; unit?: string }[];
        multi_rows?: MultiKeyRow[];
        // Legacy compat
        rows?: unknown[];
        match_mode?: string;
        source?: string;
    };
    onSave: (config: Record<string, unknown>) => void;
}

// ─── Component ───────────────────────────────────────────────────────────

export function LookupConfig({ config, onSave }: LookupConfigProps) {
    // Detect mode from existing config
    const initialMode: TableMode =
        config.table_mode ??
        (config.data_points && config.data_points.length > 0
            ? "interpolated"
            : config.input_keys && config.input_keys.length > 1
                ? "multi_key"
                : "range");

    const [mode, setMode] = useState<TableMode>(initialMode);
    const [lookupKey, setLookupKey] = useState(config.lookup_key ?? "");
    const [resultVar, setResultVar] = useState(config.result_variable ?? "");
    const [reference, setReference] = useState(config.reference ?? "");
    const [fallbackMode, setFallbackMode] = useState(config.fallback_mode ?? "error");
    const [allowOverride, setAllowOverride] = useState(config.allow_override ?? false);

    // Range state
    const [rangeRows, setRangeRows] = useState<RangeRow[]>(
        config.range_rows ?? (config.rows as RangeRow[] | undefined) ?? []
    );

    // Interpolated state
    const [dataPoints, setDataPoints] = useState<CurvePoint[]>(config.data_points ?? []);
    const [interpMethod, setInterpMethod] = useState(config.interpolation_method ?? "linear");
    const [extrapolation, setExtrapolation] = useState(config.extrapolation ?? "clamp");
    const [inputUnit, setInputUnit] = useState(config.input_unit ?? "");
    const [outputUnit, setOutputUnit] = useState(config.output_unit ?? "");

    // Multi-key state
    const [inputKeys, setInputKeys] = useState<{ key: string; type: "exact" | "range"; unit?: string }[]>(
        config.input_keys ?? [
            { key: "", type: "exact", unit: "" },
            { key: "", type: "range", unit: "" },
        ]
    );
    const [multiRows, setMultiRows] = useState<MultiKeyRow[]>(config.multi_rows ?? []);

    // ── Save ─────────────────────────────────────────────────────────────

    const doSave = useCallback(() => {
        const base = {
            table_mode: mode,
            lookup_key: lookupKey,
            result_variable: resultVar,
            reference,
            fallback_mode: fallbackMode,
            allow_override: allowOverride,
            source: "inline",
        };

        if (mode === "range") {
            onSave({
                ...base,
                match_mode: "range",
                range_rows: rangeRows,
                rows: rangeRows.map((r) => ({
                    range: [r.from, r.to],
                    value: r.value,
                    label: r.label,
                })),
            });
        } else if (mode === "interpolated") {
            onSave({
                ...base,
                data_points: dataPoints,
                interpolation_method: interpMethod,
                extrapolation,
                input_unit: inputUnit,
                output_unit: outputUnit,
            });
        } else {
            onSave({
                ...base,
                match_mode: "multi_key",
                input_keys: inputKeys,
                multi_rows: multiRows,
            });
        }
    }, [mode, lookupKey, resultVar, reference, fallbackMode, allowOverride, rangeRows, dataPoints, interpMethod, extrapolation, inputUnit, outputUnit, inputKeys, multiRows, onSave]);

    return (
        <div>
            {/* Mode selector */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as TableMode)}>
                <TabsList className="mb-4 grid w-full grid-cols-3">
                    <TabsTrigger value="range" className="gap-1 text-[11px]">
                        <Table2 className="h-3 w-3" />
                        Range
                    </TabsTrigger>
                    <TabsTrigger value="interpolated" className="gap-1 text-[11px]">
                        <TrendingUp className="h-3 w-3" />
                        Interpolated
                    </TabsTrigger>
                    <TabsTrigger value="multi_key" className="gap-1 text-[11px]">
                        <Layers className="h-3 w-3" />
                        Multi-key
                    </TabsTrigger>
                </TabsList>

                {/* ═══ Shared: Input/Output keys ═══ */}
                <ConfigSection title="Variables">
                    {mode === "multi_key" ? (
                        <MultiKeyInputs inputKeys={inputKeys} onUpdate={setInputKeys} />
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <ConfigField label="Input Variable" hint="Variable to look up">
                                <Input
                                    value={lookupKey}
                                    onChange={(e) => setLookupKey(e.target.value)}
                                    placeholder="annual_rain"
                                    className="h-8 font-mono text-xs"
                                />
                            </ConfigField>
                            <ConfigField label="Output Variable" hint="Result variable key">
                                <Input
                                    value={resultVar}
                                    onChange={(e) => setResultVar(e.target.value)}
                                    placeholder="C_dicken"
                                    className="h-8 font-mono text-xs"
                                />
                            </ConfigField>
                        </div>
                    )}

                    {/* Visual flow indicator */}
                    {lookupKey && resultVar && mode !== "multi_key" && (
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                            <span className="font-mono text-xs font-semibold text-blue-600">{lookupKey}</span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="text-[11px] text-slate-400">
                                {mode === "range" ? "matches row" : "interpolate"}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="font-mono text-xs font-semibold text-violet-600">{resultVar}</span>
                        </div>
                    )}
                </ConfigSection>

                {/* ═══ RANGE LOOKUP ═══ */}
                <TabsContent value="range" className="mt-0">
                    <ConfigSection
                        title="Range Table"
                        description="Each row defines a range. First matching range wins (top to bottom)."
                    >
                        <RangeTableEditor rows={rangeRows} onUpdate={setRangeRows} />
                    </ConfigSection>
                </TabsContent>

                {/* ═══ INTERPOLATED ═══ */}
                <TabsContent value="interpolated" className="mt-0">
                    <ConfigSection title="Interpolation Method">
                        <div className="mb-3 grid grid-cols-3 gap-1.5">
                            {(["linear", "cubic_spline", "step"] as const).map((m) => (
                                <button
                                    key={m}
                                    onClick={() => setInterpMethod(m)}
                                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${interpMethod === m
                                            ? "border-violet-300 bg-violet-50 text-violet-700 font-semibold"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                                        }`}
                                >
                                    {m === "linear" ? "Linear" : m === "cubic_spline" ? "Cubic spline" : "Step (flat)"}
                                </button>
                            ))}
                        </div>

                        <ConfigField label="Extrapolation (outside data range)">
                            <Select value={extrapolation} onValueChange={setExtrapolation}>
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="clamp" className="text-xs">Clamp to nearest point</SelectItem>
                                    <SelectItem value="extend" className="text-xs">Extend linearly</SelectItem>
                                    <SelectItem value="error" className="text-xs">Error (stop execution)</SelectItem>
                                </SelectContent>
                            </Select>
                        </ConfigField>
                    </ConfigSection>

                    <ConfigSection
                        title="Curve Data Points"
                        description="Enter x,y pairs from the digitized curve. Points auto-sort by x."
                    >
                        <CurvePointsEditor
                            points={dataPoints}
                            onUpdate={setDataPoints}
                            xUnit={inputUnit}
                            yUnit={outputUnit}
                        />

                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <ConfigField label="X-axis unit">
                                <Input
                                    value={inputUnit}
                                    onChange={(e) => setInputUnit(e.target.value)}
                                    placeholder="Km²"
                                    className="h-7 text-[10px]"
                                />
                            </ConfigField>
                            <ConfigField label="Y-axis unit">
                                <Input
                                    value={outputUnit}
                                    onChange={(e) => setOutputUnit(e.target.value)}
                                    placeholder="factor"
                                    className="h-7 text-[10px]"
                                />
                            </ConfigField>
                        </div>
                    </ConfigSection>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                        Interpolated values are computed at runtime between the nearest data points using the selected method.
                        The result is written to <span className="font-mono font-semibold text-pink-600">{resultVar || "result"}</span>.
                    </div>
                </TabsContent>

                {/* ═══ MULTI-KEY ═══ */}
                <TabsContent value="multi_key" className="mt-0">
                    <ConfigSection
                        title="Multi-key Table"
                        description="Two or more input variables determine the output. Both keys must match."
                    >
                        <ConfigField label="Output Variable">
                            <Input
                                value={resultVar}
                                onChange={(e) => setResultVar(e.target.value)}
                                placeholder="P_runoff"
                                className="h-8 font-mono text-xs"
                            />
                        </ConfigField>

                        <MultiKeyTableEditor
                            inputKeys={inputKeys}
                            rows={multiRows}
                            onUpdate={setMultiRows}
                        />
                    </ConfigSection>

                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500">
                        Matching logic: first key does{" "}
                        <span className="font-mono font-semibold">exact match</span>, second key does{" "}
                        <span className="font-mono font-semibold">range match</span>.
                        First row where all keys match is selected.
                    </div>
                </TabsContent>
            </Tabs>

            {/* ═══ Edge Cases (shared) ═══ */}
            <ConfigSection title="Edge Cases" className="mt-4">
                <ConfigField label="If no match found">
                    <Select value={fallbackMode} onValueChange={setFallbackMode}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="error" className="text-xs">Error (stop execution)</SelectItem>
                            <SelectItem value="first" className="text-xs">Use first row</SelectItem>
                            <SelectItem value="last" className="text-xs">Use last row</SelectItem>
                            <SelectItem value="nearest" className="text-xs">Use nearest row</SelectItem>
                        </SelectContent>
                    </Select>
                </ConfigField>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
                    <div>
                        <p className="text-xs font-medium text-slate-700">Allow user override</p>
                        <p className="text-[10px] text-slate-400">Let user manually pick a different row at runtime</p>
                    </div>
                    <Switch checked={allowOverride} onCheckedChange={setAllowOverride} />
                </div>
            </ConfigSection>

            {/* Reference */}
            <ConfigSection title="Reference">
                <ConfigField label="Source Reference">
                    <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Cl.4.2, IRC:SP:13-2004"
                        className="h-8 text-xs"
                    />
                </ConfigField>
            </ConfigSection>

            <Button size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={doSave}>
                <Save className="h-3.5 w-3.5" />
                Save Configuration
            </Button>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Sub-editors
// ═══════════════════════════════════════════════════════════════════════════

// ─── Range Table Editor ──────────────────────────────────────────────────

function RangeTableEditor({
    rows,
    onUpdate,
}: {
    rows: RangeRow[];
    onUpdate: (rows: RangeRow[]) => void;
}) {
    const addRow = () => {
        const lastTo = rows.length > 0 ? (rows[rows.length - 1].to ?? 0) : 0;
        onUpdate([...rows, { from: lastTo, to: null, value: 0, label: "", remarks: "" }]);
    };

    const updateRow = (idx: number, patch: Partial<RangeRow>) => {
        onUpdate(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    };

    const removeRow = (idx: number) => {
        onUpdate(rows.filter((_, i) => i !== idx));
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-1 grid grid-cols-[60px_60px_1fr_60px_28px] gap-1 px-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">From</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">To</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Label</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Value</span>
                <span />
            </div>

            <div className="space-y-1">
                {rows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[60px_60px_1fr_60px_28px] items-center gap-1">
                        <Input
                            type="number"
                            step="any"
                            value={row.from}
                            onChange={(e) => updateRow(idx, { from: parseFloat(e.target.value) || 0 })}
                            className="h-7 font-mono text-[10px]"
                        />
                        <Input
                            type="number"
                            step="any"
                            value={row.to ?? ""}
                            onChange={(e) =>
                                updateRow(idx, { to: e.target.value ? parseFloat(e.target.value) : null })
                            }
                            placeholder="∞"
                            className="h-7 font-mono text-[10px]"
                        />
                        <Input
                            value={row.label}
                            onChange={(e) => updateRow(idx, { label: e.target.value })}
                            placeholder="Description"
                            className="h-7 text-[10px]"
                        />
                        <Input
                            type="number"
                            step="any"
                            value={row.value}
                            onChange={(e) => updateRow(idx, { value: parseFloat(e.target.value) || 0 })}
                            className="h-7 font-mono text-[10px] font-bold"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-500"
                            onClick={() => removeRow(idx)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 text-xs" onClick={addRow}>
                <Plus className="h-3 w-3" />
                Add Row
            </Button>
        </div>
    );
}

// ─── Curve Points Editor ─────────────────────────────────────────────────

function CurvePointsEditor({
    points,
    onUpdate,
    xUnit,
    yUnit,
}: {
    points: CurvePoint[];
    onUpdate: (points: CurvePoint[]) => void;
    xUnit?: string;
    yUnit?: string;
}) {
    const sorted = [...points].sort((a, b) => a.x - b.x);

    const addPoint = () => {
        const lastX = sorted.length > 0 ? sorted[sorted.length - 1].x + 10 : 0;
        onUpdate([...points, { x: lastX, y: 0 }]);
    };

    const updatePoint = (idx: number, patch: Partial<CurvePoint>) => {
        // Find original index in unsorted array
        const original = points.findIndex(
            (p) => p.x === sorted[idx].x && p.y === sorted[idx].y
        );
        if (original === -1) return;
        onUpdate(points.map((p, i) => (i === original ? { ...p, ...patch } : p)));
    };

    const removePoint = (idx: number) => {
        const original = points.findIndex(
            (p) => p.x === sorted[idx].x && p.y === sorted[idx].y
        );
        if (original === -1) return;
        onUpdate(points.filter((_, i) => i !== original));
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-1 grid grid-cols-[1fr_1fr_28px] gap-1.5 px-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">
                    X {xUnit ? `(${xUnit})` : ""}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">
                    Y {yUnit ? `(${yUnit})` : ""}
                </span>
                <span />
            </div>

            <div className="space-y-1">
                {sorted.map((pt, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_28px] items-center gap-1.5">
                        <Input
                            type="number"
                            step="any"
                            value={pt.x}
                            onChange={(e) => updatePoint(idx, { x: parseFloat(e.target.value) || 0 })}
                            className="h-7 font-mono text-[10px]"
                        />
                        <Input
                            type="number"
                            step="any"
                            value={pt.y}
                            onChange={(e) => updatePoint(idx, { y: parseFloat(e.target.value) || 0 })}
                            className="h-7 font-mono text-[10px]"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-500"
                            onClick={() => removePoint(idx)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 text-xs" onClick={addPoint}>
                <Plus className="h-3 w-3" />
                Add Point
            </Button>

            {sorted.length >= 2 && (
                <div className="mt-2 text-[10px] text-slate-400 text-center">
                    {sorted.length} points · x range: [{sorted[0].x} → {sorted[sorted.length - 1].x}]
                </div>
            )}
        </div>
    );
}

// ─── Multi-key Input Keys Editor ─────────────────────────────────────────

function MultiKeyInputs({
    inputKeys,
    onUpdate,
}: {
    inputKeys: { key: string; type: "exact" | "range"; unit?: string }[];
    onUpdate: (keys: { key: string; type: "exact" | "range"; unit?: string }[]) => void;
}) {
    const updateKey = (idx: number, patch: Partial<{ key: string; type: "exact" | "range"; unit?: string }>) => {
        onUpdate(inputKeys.map((k, i) => (i === idx ? { ...k, ...patch } : k)));
    };

    const addKey = () => {
        onUpdate([...inputKeys, { key: "", type: "exact", unit: "" }]);
    };

    const removeKey = (idx: number) => {
        if (inputKeys.length <= 2) return; // Minimum 2 keys
        onUpdate(inputKeys.filter((_, i) => i !== idx));
    };

    return (
        <div className="space-y-2">
            {inputKeys.map((k, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_60px_28px] items-end gap-1.5">
                    <ConfigField label={`Key ${idx + 1}`}>
                        <Input
                            value={k.key}
                            onChange={(e) => updateKey(idx, { key: e.target.value })}
                            placeholder="soil_type"
                            className="h-8 font-mono text-xs"
                        />
                    </ConfigField>
                    <ConfigField label="Match">
                        <Select value={k.type} onValueChange={(v) => updateKey(idx, { type: v as "exact" | "range" })}>
                            <SelectTrigger className="h-8 text-[10px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="exact" className="text-xs">Exact</SelectItem>
                                <SelectItem value="range" className="text-xs">Range</SelectItem>
                            </SelectContent>
                        </Select>
                    </ConfigField>
                    <ConfigField label="Unit">
                        <Input
                            value={k.unit ?? ""}
                            onChange={(e) => updateKey(idx, { unit: e.target.value })}
                            placeholder="—"
                            className="h-8 text-[10px]"
                        />
                    </ConfigField>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-7 text-slate-400 hover:text-rose-500"
                        onClick={() => removeKey(idx)}
                        disabled={inputKeys.length <= 2}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>
            ))}

            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={addKey}>
                <Plus className="h-3 w-3" />
                Add Key
            </Button>
        </div>
    );
}

// ─── Multi-key Table Editor ──────────────────────────────────────────────

function MultiKeyTableEditor({
    inputKeys,
    rows,
    onUpdate,
}: {
    inputKeys: { key: string; type: "exact" | "range"; unit?: string }[];
    rows: MultiKeyRow[];
    onUpdate: (rows: MultiKeyRow[]) => void;
}) {
    const addRow = () => {
        const keys: Record<string, string | number> = {};
        for (const k of inputKeys) keys[k.key || `key_${inputKeys.indexOf(k)}`] = "";
        onUpdate([...rows, { keys, value: 0 }]);
    };

    const updateRow = (idx: number, keyName: string, val: string | number) => {
        onUpdate(
            rows.map((r, i) =>
                i === idx ? { ...r, keys: { ...r.keys, [keyName]: val } } : r
            )
        );
    };

    const updateValue = (idx: number, val: number) => {
        onUpdate(rows.map((r, i) => (i === idx ? { ...r, value: val } : r)));
    };

    const removeRow = (idx: number) => {
        onUpdate(rows.filter((_, i) => i !== idx));
    };

    const keyNames = inputKeys.map((k) => k.key || `key_${inputKeys.indexOf(k)}`);

    return (
        <div className="mt-3">
            {/* Header */}
            <div
                className="mb-1 grid gap-1 px-1"
                style={{ gridTemplateColumns: `${keyNames.map(() => "1fr").join(" ")} 70px 28px` }}
            >
                {keyNames.map((k) => (
                    <span key={k} className="text-[9px] font-bold uppercase tracking-wider text-violet-500">
                        {k}
                    </span>
                ))}
                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Value</span>
                <span />
            </div>

            <div className="space-y-1">
                {rows.map((row, idx) => (
                    <div
                        key={idx}
                        className="grid items-center gap-1"
                        style={{ gridTemplateColumns: `${keyNames.map(() => "1fr").join(" ")} 70px 28px` }}
                    >
                        {keyNames.map((k) => (
                            <Input
                                key={k}
                                value={row.keys[k] ?? ""}
                                onChange={(e) => updateRow(idx, k, e.target.value)}
                                className="h-7 font-mono text-[10px]"
                                placeholder={k}
                            />
                        ))}
                        <Input
                            type="number"
                            step="any"
                            value={row.value}
                            onChange={(e) => updateValue(idx, parseFloat(e.target.value) || 0)}
                            className="h-7 font-mono text-[10px] font-bold"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-rose-500"
                            onClick={() => removeRow(idx)}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>

            <Button variant="outline" size="sm" className="mt-2 w-full gap-1.5 text-xs" onClick={addRow}>
                <Plus className="h-3 w-3" />
                Add Row
            </Button>
        </div>
    );
}