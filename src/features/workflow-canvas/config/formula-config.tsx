// src/features/workflow-canvas/config/formula-config.tsx

"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, BookOpen, Code2, Check, X, AlertTriangle, Link2 } from "lucide-react";
import { ConfigSection, ConfigField } from "./config-drawer";

// ─── Simple variable extractor (no mathjs dependency in client) ──────────
// Pulls out variable-like tokens from a mathjs expression string.
// Ignores known math functions and constants.

const MATH_BUILTINS = new Set([
    "sqrt", "cbrt", "pow", "exp", "log", "log2", "log10", "log1p",
    "abs", "ceil", "floor", "round", "sign", "trunc", "mod",
    "sin", "cos", "tan", "asin", "acos", "atan", "atan2",
    "min", "max", "pi", "e", "Infinity",
]);

function extractVarsFromExpression(expr: string): string[] {
    if (!expr) return [];
    // Match word tokens that aren't numbers and aren't builtins
    const tokens = expr.match(/[a-zA-Z_]\w*/g) ?? [];
    const unique = [...new Set(tokens)].filter((t) => !MATH_BUILTINS.has(t));
    return unique;
}

// ─── Types ───────────────────────────────────────────────────────────────

interface FormulaConfigProps {
    config: {
        source?: "inline" | "registry";
        registry_id?: string;
        registry_version?: number | null;
        expression?: string;
        display_expression?: string;
        result_variable?: string;
        result_unit?: string;
        result_precision?: number;
        reference?: string;
        variable_bindings?: Record<string, string>;
        showVars?: { key: string; label: string; unit: string }[];
    };
    /** All variables available from upstream nodes (INPUT, LOOKUP, etc.) */
    availableVariables?: { key: string; label: string; unit?: string; sourceNode?: string }[];
    onSave: (config: Record<string, unknown>) => void;
}

// ─── Component ───────────────────────────────────────────────────────────

export function FormulaConfig({ config, availableVariables = [], onSave }: FormulaConfigProps) {
    const [source, setSource] = useState<"inline" | "registry">(config.source ?? "inline");
    const [expression, setExpression] = useState(config.expression ?? "");
    const [displayExpr, setDisplayExpr] = useState(config.display_expression ?? "");
    const [resultVar, setResultVar] = useState(config.result_variable ?? "");
    const [resultUnit, setResultUnit] = useState(config.result_unit ?? "");
    const [precision, setPrecision] = useState(config.result_precision ?? 3);
    const [reference, setReference] = useState(config.reference ?? "");
    const [registryId, setRegistryId] = useState(config.registry_id ?? "");
    const [bindings, setBindings] = useState<Record<string, string>>(
        config.variable_bindings ?? {}
    );

    // ── Parse expression to find required variables ──────────────────────
    const requiredVars = useMemo(() => extractVarsFromExpression(expression), [expression]);
    const availableKeys = useMemo(() => new Set(availableVariables.map((v) => v.key)), [availableVariables]);

    // Auto-bind: if a required var name matches an available key exactly, bind it
    const effectiveBindings = useMemo(() => {
        const result = { ...bindings };
        for (const v of requiredVars) {
            if (!result[v] && availableKeys.has(v)) {
                result[v] = v; // auto-bind by name match
            }
        }
        return result;
    }, [requiredVars, bindings, availableKeys]);

    const unboundVars = requiredVars.filter((v) => !effectiveBindings[v]);
    const allBound = unboundVars.length === 0 && requiredVars.length > 0;

    const updateBinding = useCallback((varName: string, contextKey: string) => {
        setBindings((prev) => ({ ...prev, [varName]: contextKey }));
    }, []);

    const doSave = useCallback(() => {
        onSave({
            source,
            expression,
            display_expression: displayExpr,
            result_variable: resultVar,
            result_unit: resultUnit,
            result_precision: precision,
            reference,
            variable_bindings: effectiveBindings,
            showVars: requiredVars.map((v) => {
                const av = availableVariables.find((a) => a.key === (effectiveBindings[v] ?? v));
                return { key: effectiveBindings[v] ?? v, label: av?.label ?? v, unit: av?.unit ?? "" };
            }),
            ...(source === "registry" ? { registry_id: registryId } : {}),
        });
    }, [source, expression, displayExpr, resultVar, resultUnit, precision, reference, effectiveBindings, requiredVars, availableVariables, registryId, onSave]);

    return (
        <div>
            <Tabs value={source} onValueChange={(v) => setSource(v as "inline" | "registry")}>
                <TabsList className="mb-4 grid w-full grid-cols-2">
                    <TabsTrigger value="inline" className="gap-1.5 text-xs">
                        <Code2 className="h-3 w-3" />
                        Inline
                    </TabsTrigger>
                    <TabsTrigger value="registry" className="gap-1.5 text-xs">
                        <BookOpen className="h-3 w-3" />
                        Registry
                    </TabsTrigger>
                </TabsList>

                {/* ── Inline mode ──────────────────────────────────────────── */}
                <TabsContent value="inline">
                    <ConfigSection title="Expression" description="mathjs expression — use variable keys from INPUT nodes">
                        <ConfigField label="Computation Expression" hint="e.g. C * M ^ (3/4)">
                            <Textarea
                                value={expression}
                                onChange={(e) => setExpression(e.target.value)}
                                placeholder="C * M ^ (3/4)"
                                className="min-h-[80px] font-mono text-xs"
                            />
                        </ConfigField>

                        <ConfigField label="Display Expression" hint="Pretty version shown in the node card">
                            <Input
                                value={displayExpr}
                                onChange={(e) => setDisplayExpr(e.target.value)}
                                placeholder="Q = C × M^(3/4)"
                                className="h-8 font-mono text-xs"
                            />
                        </ConfigField>
                    </ConfigSection>

                    {/* ── Variable Bindings ─────────────────────────────────── */}
                    {requiredVars.length > 0 && (
                        <ConfigSection
                            title="Variable Mapping"
                            description="Link formula variables to upstream node outputs"
                        >
                            {/* Status badge */}
                            <div className="mb-3">
                                {allBound ? (
                                    <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                                        <span className="text-[11px] font-medium text-emerald-700">
                                            All {requiredVars.length} variables mapped
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                        <span className="text-[11px] font-medium text-amber-700">
                                            {unboundVars.length} variable{unboundVars.length > 1 ? "s" : ""} not mapped
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Variable list */}
                            <div className="space-y-2">
                                {requiredVars.map((varName) => {
                                    const bound = effectiveBindings[varName];
                                    const isBound = !!bound;
                                    const av = availableVariables.find((a) => a.key === bound);

                                    return (
                                        <div
                                            key={varName}
                                            className="rounded-lg border border-slate-200 p-2.5"
                                        >
                                            <div className="flex items-center gap-2">
                                                {/* Formula variable name */}
                                                <div className="flex items-center gap-1.5">
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700"
                                                    >
                                                        {varName}
                                                    </span>
                                                </div>

                                                {/* Arrow */}
                                                <Link2 className="h-3 w-3 flex-shrink-0 text-slate-300" />

                                                {/* Binding selector */}
                                                <div className="flex-1">
                                                    <Select
                                                        value={bound ?? "__unbound__"}
                                                        onValueChange={(v) =>
                                                            updateBinding(varName, v === "__unbound__" ? "" : v)
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            className={`h-7 text-xs ${isBound
                                                                    ? "border-emerald-200 bg-emerald-50"
                                                                    : "border-amber-200 bg-amber-50"
                                                                }`}
                                                        >
                                                            <SelectValue placeholder="Select source..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="__unbound__" className="text-xs text-slate-400">
                                                                — Not mapped —
                                                            </SelectItem>
                                                            {availableVariables.map((av) => (
                                                                <SelectItem key={av.key} value={av.key} className="text-xs">
                                                                    <span className="font-mono font-semibold">{av.key}</span>
                                                                    <span className="ml-2 text-slate-400">
                                                                        {av.label}
                                                                        {av.unit ? ` (${av.unit})` : ""}
                                                                    </span>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Status dot */}
                                                {isBound ? (
                                                    <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                                                ) : (
                                                    <X className="h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                                                )}
                                            </div>

                                            {/* Show bound source info */}
                                            {isBound && av && (
                                                <div className="mt-1.5 flex items-center gap-2 pl-8 text-[10px] text-slate-400">
                                                    <span>→ {av.label}</span>
                                                    {av.unit && <span className="font-mono">({av.unit})</span>}
                                                    {av.sourceNode && (
                                                        <Badge variant="secondary" className="h-4 px-1 text-[8px]">
                                                            {av.sourceNode}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Help text */}
                            {availableVariables.length === 0 && (
                                <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-center">
                                    <p className="text-[11px] text-slate-400">
                                        No upstream variables found. Add an INPUT node and connect it
                                        to this FORMULA node to see available variables.
                                    </p>
                                </div>
                            )}
                        </ConfigSection>
                    )}
                </TabsContent>

                {/* ── Registry mode ────────────────────────────────────────── */}
                <TabsContent value="registry">
                    <ConfigSection title="Registry Formula" description="Select a formula from the shared library">
                        <ConfigField label="Formula ID">
                            <Input
                                value={registryId}
                                onChange={(e) => setRegistryId(e.target.value)}
                                placeholder="Paste formula registry ID"
                                className="h-8 font-mono text-xs"
                            />
                        </ConfigField>

                        <div className="mt-2 rounded-lg border border-dashed border-slate-300 p-4 text-center">
                            <BookOpen className="mx-auto mb-2 h-5 w-5 text-slate-300" />
                            <p className="text-[11px] text-slate-400">
                                Registry browser coming soon — paste ID for now
                            </p>
                        </div>
                    </ConfigSection>
                </TabsContent>
            </Tabs>

            {/* ── Output ──────────────────────────────────────────────────── */}
            <ConfigSection title="Output">
                <div className="grid grid-cols-2 gap-3">
                    <ConfigField label="Result Variable" hint="Output variable key">
                        <Input
                            value={resultVar}
                            onChange={(e) => setResultVar(e.target.value)}
                            placeholder="Q_dicken"
                            className="h-8 font-mono text-xs"
                        />
                    </ConfigField>
                    <ConfigField label="Result Unit">
                        <Input
                            value={resultUnit}
                            onChange={(e) => setResultUnit(e.target.value)}
                            placeholder="Cumecs"
                            className="h-8 text-xs"
                        />
                    </ConfigField>
                </div>
                <ConfigField label="Decimal Precision">
                    <Input
                        type="number"
                        min={0}
                        max={10}
                        value={precision}
                        onChange={(e) => setPrecision(parseInt(e.target.value) || 3)}
                        className="h-8 w-24 text-xs"
                    />
                </ConfigField>
            </ConfigSection>

            {/* ── Reference ───────────────────────────────────────────────── */}
            <ConfigSection title="Reference">
                <ConfigField label="Source Reference" hint="IRC clause, codebook page, etc.">
                    <Input
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Cl.4.2, IRC:SP:13-2004"
                        className="h-8 text-xs"
                    />
                </ConfigField>
            </ConfigSection>

            <Button
                size="sm"
                className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={doSave}
            >
                <Save className="h-3.5 w-3.5" />
                Save Configuration
            </Button>
        </div>
    );
}