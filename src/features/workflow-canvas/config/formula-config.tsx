// src/features/workflow-canvas/config/formula-config.tsx

"use client";

import { useCallback, useMemo, useState } from "react";

import {
  AlertTriangle,
  BookOpen,
  Code2,
  ExternalLink,
  Save,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FormulaSelector } from "@/features/registery/formula/components/formula-selector";

import { ConfigField, ConfigSection } from "./config-drawer";

// ─── Simple variable extractor (for inline mode) ──────────────────────────

const MATH_BUILTINS = new Set([
  "sqrt",
  "cbrt",
  "pow",
  "exp",
  "log",
  "log2",
  "log10",
  "log1p",
  "abs",
  "ceil",
  "floor",
  "round",
  "sign",
  "trunc",
  "mod",
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "atan2",
  "min",
  "max",
  "pi",
  "e",
  "Infinity",
]);

function extractVarsFromExpression(expr: string): string[] {
  if (!expr) return [];
  const tokens = expr.match(/[a-zA-Z_]\w*/g) ?? [];
  const unique = [...new Set(tokens)].filter((t) => !MATH_BUILTINS.has(t));
  return unique;
}

// ─── Types ───────────────────────────────────────────────────────────────

interface RegistryVariable {
  notation: string;
  displayLabel: string;
  unit: string;
  description?: string;
  dataType?: string;
}

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
    registry_inputs?: RegistryVariable[];
    registry_output?: RegistryVariable;
  };
  availableVariables?: {
    key: string;
    label: string;
    unit?: string;
    sourceNode?: string;
  }[];
  onSave: (config: Record<string, unknown>) => void;
}

export function FormulaConfig({
  config,
  availableVariables = [],
  onSave,
}: FormulaConfigProps) {
  const [source, setSource] = useState<"inline" | "registry">(
    config.source ?? "inline",
  );
  const [expression, setExpression] = useState(config.expression ?? "");
  const [displayExpr, setDisplayExpr] = useState(
    config.display_expression ?? "",
  );
  const [resultVar, setResultVar] = useState(config.result_variable ?? "");
  const [resultUnit, setResultUnit] = useState(config.result_unit ?? "");
  const [precision, setPrecision] = useState(config.result_precision ?? 3);
  const [reference, setReference] = useState(config.reference ?? "");
  const [registryId, setRegistryId] = useState(config.registry_id ?? "");

  const [registryInputs, setRegistryInputs] = useState<RegistryVariable[]>(
    config.registry_inputs ?? [],
  );
  const [registryOutput, setRegistryOutput] = useState<
    RegistryVariable | undefined
  >(config.registry_output);

  const [bindings, setBindings] = useState<Record<string, string>>(
    config.variable_bindings ?? {},
  );

  const requiredVars = useMemo(() => {
    if (source === "registry" && registryInputs.length > 0) {
      return registryInputs.map((v) => v.notation);
    }
    return extractVarsFromExpression(expression);
  }, [source, registryInputs, expression]);

  const availableKeys = useMemo(
    () => new Set(availableVariables.map((v) => v.key)),
    [availableVariables],
  );

  const effectiveBindings = useMemo(() => {
    const result = { ...bindings };
    for (const v of requiredVars) {
      if (!result[v] && availableKeys.has(v)) {
        result[v] = v;
      }
    }
    return result;
  }, [requiredVars, bindings, availableKeys]);

  const unboundVars = requiredVars.filter((v) => !effectiveBindings[v]);
  const allBound = unboundVars.length === 0 && requiredVars.length > 0;

  const updateBinding = useCallback((varName: string, contextKey: string) => {
    setBindings((prev) => ({ ...prev, [varName]: contextKey }));
  }, []);

  const [error, setError] = useState<string | null>(null);

  const doSave = useCallback(() => {
    if (!resultVar || resultVar.trim() === "" || resultVar === "undefined") {
      setError("Result Key is required to save the computation output.");
      return;
    }

    onSave({
      source,
      expression,
      display_expression: displayExpr,
      result_variable: resultVar,
      result_unit: resultUnit,
      result_precision: precision,
      reference,
      variable_bindings: effectiveBindings,
      registry_inputs: source === "registry" ? registryInputs : undefined,
      registry_output: source === "registry" ? registryOutput : undefined,
      showVars: requiredVars.map((v) => {
        const av = availableVariables.find(
          (a) => a.key === (effectiveBindings[v] ?? v),
        );
        const regVar = registryInputs.find((ri) => ri.notation === v);
        return {
          key: effectiveBindings[v] ?? v,
          label: regVar?.displayLabel || av?.label || v,
          unit: av?.unit || regVar?.unit || "",
        };
      }),
      ...(source === "registry" ? { registry_id: registryId } : {}),
    });
  }, [
    source,
    expression,
    displayExpr,
    resultVar,
    resultUnit,
    precision,
    reference,
    effectiveBindings,
    requiredVars,
    availableVariables,
    registryId,
    registryInputs,
    registryOutput,
    onSave,
  ]);

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Tabs
          value={source}
          onValueChange={(v) => setSource(v as "inline" | "registry")}
        >
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

          <TabsContent value="inline">
            <ConfigSection
              title="Expression"
              description="Define custom engineering logic"
            >
              <ConfigField label="Computation Expression" hint="mathjs syntax">
                <Textarea
                  value={expression}
                  onChange={(e) => setExpression(e.target.value)}
                  placeholder="C * M ^ (3/4)"
                  className="min-h-[80px] font-mono text-xs"
                />
              </ConfigField>

              <ConfigField
                label="Display Expression"
                hint="Pretty version for cards"
              >
                <Input
                  value={displayExpr}
                  onChange={(e) => setDisplayExpr(e.target.value)}
                  placeholder="Q = C × M^(3/4)"
                  className="h-8 font-mono text-xs"
                />
              </ConfigField>
            </ConfigSection>
          </TabsContent>

          <TabsContent value="registry">
            <ConfigSection
              title="Registry Selection"
              description="Pick standard engineering formulas"
            >
              <ConfigField label="Formula Registry Item">
                <FormulaSelector
                  value={registryId}
                  onSelect={(formula) => {
                    setRegistryId(formula.id);
                    setExpression(formula.expressionNotation);
                    setDisplayExpr(formula.displayExpression);
                    setRegistryInputs(formula.inputVariables || []);
                    setRegistryOutput(formula.outputVariable);

                    // AUTO-SYNC Result Key if empty or placeholder
                    if (
                      !resultVar ||
                      resultVar === "undefined" ||
                      resultVar === ""
                    ) {
                      if (formula.outputVariable?.notation) {
                        setResultVar(formula.outputVariable.notation);
                      }
                    }
                    if (!resultUnit && formula.outputVariable?.unit) {
                      setResultUnit(formula.outputVariable.unit);
                    }
                    setError(null);
                  }}
                />
              </ConfigField>

              {registryId && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Active Formula
                    </h4>
                    <Badge
                      variant="outline"
                      className="h-4 text-[9px] bg-white"
                    >
                      ID: {registryId.slice(0, 8)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <code className="block rounded bg-white border border-slate-200 p-2 text-xs font-mono text-slate-700">
                      {displayExpr || expression}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-full text-[10px] gap-1.5 text-slate-500 hover:text-indigo-600"
                      onClick={() =>
                        window.open(
                          `/registery/formula/${registryId}`,
                          "_blank",
                        )
                      }
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Registry Details
                    </Button>
                  </div>
                </div>
              )}
            </ConfigSection>
          </TabsContent>
        </Tabs>

        {requiredVars.length > 0 && (
          <ConfigSection
            title="Variable Mapping"
            description="Link inputs to upstream node results"
          >
            <div className="space-y-2.5">
              {requiredVars.map((varName) => {
                const bound = effectiveBindings[varName];
                const isBound = !!bound;
                const regVar = registryInputs.find(
                  (ri) => ri.notation === varName,
                );

                return (
                  <div
                    key={varName}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                            {varName}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-700 truncate">
                            {regVar?.displayLabel || "User Variable"}
                          </span>
                        </div>
                        {regVar?.unit && (
                          <span className="text-[9px] text-slate-400 mt-0.5">
                            Unit: {regVar.unit}
                          </span>
                        )}
                      </div>
                      {!isBound && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 text-[8px] border-amber-200 text-amber-600"
                        >
                          Required
                        </Badge>
                      )}
                    </div>

                    <Select
                      value={bound ?? "__unbound__"}
                      onValueChange={(v) =>
                        updateBinding(varName, v === "__unbound__" ? "" : v)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          "h-8 text-[11px]",
                          !isBound && "border-amber-200 bg-amber-50/50",
                        )}
                      >
                        <SelectValue placeholder="Link to output..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          value="__unbound__"
                          className="text-[11px] text-slate-400"
                        >
                          Not linked
                        </SelectItem>
                        {availableVariables.map((av) => (
                          <SelectItem
                            key={av.key}
                            value={av.key}
                            className="text-[11px]"
                          >
                            <span className="font-mono font-bold mr-2">
                              {av.key}
                            </span>
                            <span className="text-slate-400">{av.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ConfigSection>
        )}

        <ConfigSection
          title="Output Result"
          description="Define the key for the computed value"
        >
          <div className="grid grid-cols-2 gap-3">
            <ConfigField
              label={
                <span>
                  Result Key <span className="text-red-500">*</span>
                </span>
              }
              hint="Variable name"
            >
              <Input
                value={resultVar}
                onChange={(e) => {
                  setResultVar(e.target.value);
                  if (e.target.value) setError(null);
                }}
                placeholder="e.g. Q"
                className={cn(
                  "h-8 font-mono text-xs uppercase",
                  (!resultVar || resultVar === "undefined") &&
                    "border-red-300 bg-red-50",
                )}
              />
            </ConfigField>
            <ConfigField label="Result Unit">
              <Input
                value={resultUnit}
                onChange={(e) => setResultUnit(e.target.value)}
                placeholder="e.g. m³/s"
                className="h-8 text-xs"
              />
            </ConfigField>
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-red-600 font-medium">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <ConfigField label="Precision">
              <Input
                type="number"
                min={0}
                max={10}
                value={precision}
                onChange={(e) => setPrecision(parseInt(e.target.value) || 3)}
                className="h-8 text-xs"
              />
            </ConfigField>
          </div>
        </ConfigSection>

        <ConfigSection title="Reference">
          <ConfigField label="Standard / Clause">
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Engineering standard reference"
              className="h-8 text-xs"
            />
          </ConfigField>
        </ConfigSection>

        <Button
          size="sm"
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md"
          onClick={doSave}
        >
          <Save className="h-3.5 w-3.5" />
          Save Formula Node
        </Button>
      </div>
    </TooltipProvider>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
