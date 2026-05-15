// src/features/workflow-canvas/config/input-config.tsx

"use client";

import { useCallback, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";
// Need this import for the Save icon
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

import { ConfigField, ConfigSection } from "./config-drawer";

interface InputField {
  key: string;
  label: string;
  data_type: string;
  unit: string;
  default: number | string;
  hint: string;
  required: boolean;
  constraints?: { min?: number; max?: number; step?: number };
}

interface InputConfigProps {
  config: {
    fields: InputField[];
    pause_execution: boolean;
  };
  onSave: (config: Record<string, unknown>) => void;
}

const UNIT_OPTIONS = [
  { group: "Area", units: ["Km²", "ha", "m²", "acres"] },
  { group: "Length", units: ["Km", "m", "cm", "mm", "ft"] },
  { group: "Discharge", units: ["Cumecs", "cusecs", "l/s"] },
  { group: "Rainfall", units: ["cm", "mm", "in"] },
  { group: "Intensity", units: ["cm/hr", "mm/hr"] },
  { group: "Velocity", units: ["m/s", "ft/s", "Km/hr"] },
  { group: "Time", units: ["hr", "min", "s", "days", "years"] },
  { group: "Slope", units: ["%", "‰", "ratio"] },
  { group: "Other", units: ["—", "°C", "kPa"] },
];

function FieldEditor({
  field,
  index,
  onUpdate,
  onRemove,
}: {
  field: InputField;
  index: number;
  onUpdate: (index: number, field: InputField) => void;
  onRemove: (index: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const update = (patch: Partial<InputField>) => {
    onUpdate(index, { ...field, ...patch });
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
        onClick={() => setExpanded(!expanded)}
      >
        <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        )}
        <span className="flex-1 font-mono text-xs font-semibold text-slate-700">
          {field.key || `field_${index + 1}`}
        </span>
        <span className="text-[10px] text-slate-400">{field.unit || "—"}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400 hover:text-rose-500"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="border-t border-slate-100 px-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            <ConfigField label="Variable Key">
              <Input
                value={field.key}
                onChange={(e) => update({ key: e.target.value })}
                placeholder="M"
                className="h-8 font-mono text-xs"
              />
            </ConfigField>

            <ConfigField label="Display Label">
              <Input
                value={field.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Catchment Area"
                className="h-8 text-xs"
              />
            </ConfigField>

            <ConfigField label="Unit">
              <Select
                value={field.unit}
                onValueChange={(v) => update({ unit: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((group) => (
                    <div key={group.group}>
                      <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        {group.group}
                      </div>
                      {group.units.map((u) => (
                        <SelectItem key={u} value={u} className="text-xs">
                          {u}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </ConfigField>

            <ConfigField label="Default Value">
              <Input
                type="number"
                step="any"
                value={field.default ?? ""}
                onChange={(e) =>
                  update({ default: parseFloat(e.target.value) || 0 })
                }
                className="h-8 font-mono text-xs"
              />
            </ConfigField>
          </div>

          <ConfigField label="Hint Text" className="mt-2">
            <Input
              value={field.hint ?? ""}
              onChange={(e) => update({ hint: e.target.value })}
              placeholder="Help text shown to user"
              className="h-8 text-xs"
            />
          </ConfigField>

          <div className="mt-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(v) => update({ required: v })}
                className="h-4 w-7"
              />
              <span className="text-[11px] text-slate-500">Required</span>
            </div>
          </div>

          {/* Constraints */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <ConfigField label="Min">
              <Input
                type="number"
                step="any"
                value={field.constraints?.min ?? ""}
                onChange={(e) =>
                  update({
                    constraints: {
                      ...field.constraints,
                      min: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    },
                  })
                }
                className="h-7 font-mono text-[10px]"
                placeholder="—"
              />
            </ConfigField>
            <ConfigField label="Max">
              <Input
                type="number"
                step="any"
                value={field.constraints?.max ?? ""}
                onChange={(e) =>
                  update({
                    constraints: {
                      ...field.constraints,
                      max: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    },
                  })
                }
                className="h-7 font-mono text-[10px]"
                placeholder="—"
              />
            </ConfigField>
            <ConfigField label="Step">
              <Input
                type="number"
                step="any"
                value={field.constraints?.step ?? ""}
                onChange={(e) =>
                  update({
                    constraints: {
                      ...field.constraints,
                      step: e.target.value
                        ? parseFloat(e.target.value)
                        : undefined,
                    },
                  })
                }
                className="h-7 font-mono text-[10px]"
                placeholder="—"
              />
            </ConfigField>
          </div>
        </div>
      )}
    </div>
  );
}

export function InputConfig({ config, onSave }: InputConfigProps) {
  const [fields, setFields] = useState<InputField[]>(config.fields ?? []);
  const [pauseExecution, setPauseExecution] = useState(
    config.pause_execution ?? true,
  );

  const addField = useCallback(() => {
    const idx = fields.length + 1;
    setFields((prev) => [
      ...prev,
      {
        key: `field_${idx}`,
        label: `Field ${idx}`,
        data_type: "number",
        unit: "—",
        default: 0,
        hint: "",
        required: true,
      },
    ]);
  }, [fields.length]);

  const updateField = useCallback((index: number, field: InputField) => {
    setFields((prev) => prev.map((f, i) => (i === index ? field : f)));
  }, []);

  const removeField = useCallback((index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Auto-save on changes
  const doSave = useCallback(() => {
    onSave({ fields, pause_execution: pauseExecution });
  }, [fields, pauseExecution, onSave]);

  return (
    <div>
      <ConfigSection
        title="Input Fields"
        description="Define the parameters users will enter at runtime"
      >
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <FieldEditor
              key={idx}
              field={field}
              index={idx}
              onUpdate={updateField}
              onRemove={removeField}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-1.5 text-xs"
          onClick={addField}
        >
          <Plus className="h-3 w-3" />
          Add Field
        </Button>
      </ConfigSection>

      <Separator className="my-4" />

      <ConfigSection title="Behavior">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
          <div>
            <p className="text-xs font-medium text-slate-700">
              Pause for input
            </p>
            <p className="text-[10px] text-slate-400">
              Stop execution and wait for user to fill in values
            </p>
          </div>
          <Switch
            checked={pauseExecution}
            onCheckedChange={setPauseExecution}
          />
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
