// src/features/workflow-canvas/config/display-config.tsx

"use client";

import { useCallback, useState } from "react";

import { Plus, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ConfigField, ConfigSection } from "./config-drawer";

interface CompareVar {
  key: string;
  method: string;
  label: string;
}

interface DisplayConfigProps {
  config: {
    mode?: string;
    compare_variables?: CompareVar[];
    selection_rule?: string;
    custom_selection_expr?: string;
    result_variable?: string;
    result_unit?: string;
  };
  onSave: (config: Record<string, unknown>) => void;
}

export function DisplayConfig({ config, onSave }: DisplayConfigProps) {
  const [compareVars, setCompareVars] = useState<CompareVar[]>(
    config.compare_variables ?? [],
  );
  const [selectionRule, setSelectionRule] = useState(
    config.selection_rule ?? "max",
  );
  const [customExpr, setCustomExpr] = useState(
    config.custom_selection_expr ?? "",
  );
  const [resultVar, setResultVar] = useState(config.result_variable ?? "Qd");
  const [resultUnit, setResultUnit] = useState(config.result_unit ?? "Cumecs");

  const addVar = useCallback(() => {
    setCompareVars((prev) => [...prev, { key: "", method: "", label: "" }]);
  }, []);

  const updateVar = useCallback((index: number, patch: Partial<CompareVar>) => {
    setCompareVars((prev) =>
      prev.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    );
  }, []);

  const removeVar = useCallback((index: number) => {
    setCompareVars((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const doSave = useCallback(() => {
    onSave({
      mode: "comparison",
      compare_variables: compareVars,
      selection_rule: selectionRule,
      ...(selectionRule === "custom"
        ? { custom_selection_expr: customExpr }
        : {}),
      result_variable: resultVar,
      result_unit: resultUnit,
    });
  }, [compareVars, selectionRule, customExpr, resultVar, resultUnit, onSave]);

  return (
    <div>
      <ConfigSection
        title="Compare Variables"
        description="Variables to compare for design value selection"
      >
        <div className="space-y-1.5">
          {compareVars.map((cv, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_1fr_28px] items-center gap-1.5"
            >
              <Input
                value={cv.key}
                onChange={(e) => updateVar(idx, { key: e.target.value })}
                placeholder="Q_dicken"
                className="h-7 font-mono text-[10px]"
              />
              <Input
                value={cv.label || cv.method}
                onChange={(e) =>
                  updateVar(idx, {
                    method: e.target.value,
                    label: e.target.value,
                  })
                }
                placeholder="Dicken's"
                className="h-7 text-[10px]"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-rose-500"
                onClick={() => removeVar(idx)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full gap-1.5 text-xs"
          onClick={addVar}
        >
          <Plus className="h-3 w-3" />
          Add Variable
        </Button>
      </ConfigSection>

      <ConfigSection
        title="Selection Rule"
        description="How to pick the design discharge from compared values"
      >
        <Select value={selectionRule} onValueChange={setSelectionRule}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="max" className="text-xs">
              Maximum (IRC Article-6 with 1.5×Q2 check)
            </SelectItem>
            <SelectItem value="min" className="text-xs">
              Minimum
            </SelectItem>
            <SelectItem value="average" className="text-xs">
              Average
            </SelectItem>
            <SelectItem value="custom" className="text-xs">
              Custom expression
            </SelectItem>
          </SelectContent>
        </Select>

        {selectionRule === "custom" && (
          <ConfigField label="Custom Expression" className="mt-3">
            <Input
              value={customExpr}
              onChange={(e) => setCustomExpr(e.target.value)}
              placeholder="max(Q_dicken, Q_ryve) * 1.1"
              className="h-8 font-mono text-xs"
            />
          </ConfigField>
        )}
      </ConfigSection>

      <ConfigSection title="Output">
        <div className="grid grid-cols-2 gap-3">
          <ConfigField label="Result Variable">
            <Input
              value={resultVar}
              onChange={(e) => setResultVar(e.target.value)}
              placeholder="Qd"
              className="h-8 font-mono text-xs"
            />
          </ConfigField>
          <ConfigField label="Unit">
            <Input
              value={resultUnit}
              onChange={(e) => setResultUnit(e.target.value)}
              placeholder="Cumecs"
              className="h-8 text-xs"
            />
          </ConfigField>
        </div>
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
