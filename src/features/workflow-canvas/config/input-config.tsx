// src/features/workflow-canvas/config/input-config.tsx

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  default: any;
  hint: string;
  required: boolean;
  constraints?: { min?: number; max?: number; step?: number };
  mcq_options?: {
    label: string;
    variables: { key: string; value: string | number | boolean }[];
  }[];
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

  const [rawDefault, setRawDefault] = useState(() => {
    if (field.default === undefined || field.default === null) return "";
    if (typeof field.default === "object") {
      return JSON.stringify(field.default, null, 2);
    }
    return String(field.default);
  });

  useEffect(() => {
    if (field.default === undefined || field.default === null) {
      setRawDefault("");
    } else if (typeof field.default === "object") {
      setRawDefault(JSON.stringify(field.default, null, 2));
    } else {
      setRawDefault(String(field.default));
    }
  }, [field.default]);

  const isInvalidJson = useMemo(() => {
    if (field.data_type !== "array" && field.data_type !== "object") return false;
    if (!rawDefault.trim()) return false;
    try {
      const parsed = JSON.parse(rawDefault);
      if (field.data_type === "array" && !Array.isArray(parsed)) return true;
      if (
        field.data_type === "object" &&
        (typeof parsed !== "object" || Array.isArray(parsed) || parsed === null)
      ) {
        return true;
      }
      return false;
    } catch (e) {
      return true;
    }
  }, [rawDefault, field.data_type]);

  const update = (patch: Partial<InputField>) => {
    onUpdate(index, { ...field, ...patch });
  };

  const handleDefaultChange = (val: string) => {
    setRawDefault(val);
    if (field.data_type === "number") {
      const parsed = parseFloat(val);
      update({ default: isNaN(parsed) ? 0 : parsed });
    } else if (field.data_type === "boolean") {
      update({ default: val.toLowerCase() === "true" });
    } else if (field.data_type === "array" || field.data_type === "object") {
      try {
        const parsed = JSON.parse(val);
        update({ default: parsed });
      } catch (e) {
        // Leave as string until valid JSON
      }
    } else {
      update({ default: val });
    }
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
        <span className="text-[10px] text-slate-400">{field.data_type === "mcq" ? "mcq" : (field.unit || "—")}</span>
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

            <ConfigField label="Data Type">
              <Select
                value={field.data_type || "number"}
                onValueChange={(v) => {
                  let defaultVal: any = "";
                  if (v === "number") defaultVal = 0;
                  if (v === "boolean") defaultVal = false;
                  if (v === "array") defaultVal = [];
                  if (v === "object") defaultVal = {};
                  update({
                    data_type: v,
                    default: defaultVal,
                    mcq_options: v === "mcq" && !field.mcq_options ? [] : field.mcq_options,
                  });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number" className="text-xs">
                    Number
                  </SelectItem>
                  <SelectItem value="string" className="text-xs">
                    String / Text
                  </SelectItem>
                  <SelectItem value="boolean" className="text-xs">
                    Boolean (True/False)
                  </SelectItem>
                  <SelectItem value="array" className="text-xs">
                    Array / List (JSON)
                  </SelectItem>
                  <SelectItem value="object" className="text-xs">
                    Object / Map (JSON)
                  </SelectItem>
                  <SelectItem value="mcq" className="text-xs">
                    Multiple Choice (MCQ)
                  </SelectItem>
                </SelectContent>
              </Select>
            </ConfigField>

            {field.data_type !== "mcq" && (
              <ConfigField label="Unit" hint="Enter standard or custom unit">
                <div className="flex gap-1">
                  <Input
                    value={field.unit ?? ""}
                    onChange={(e) => update({ unit: e.target.value })}
                    placeholder="e.g. m, km, cumec"
                    className="h-8 text-xs flex-1 font-mono"
                  />
                  <Select
                    value=""
                    onValueChange={(v) => update({ unit: v })}
                  >
                    <SelectTrigger className="h-8 w-8 px-0 flex items-center justify-center text-slate-400 bg-slate-50 border-slate-200">
                      <ChevronDown className="h-3.5 w-3.5" />
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
                </div>
              </ConfigField>
            )}

            {field.data_type === "boolean" && (
              <ConfigField label="Default Value">
                <Select
                  value={String(field.default ?? "false")}
                  onValueChange={(v) => update({ default: v === "true" })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true" className="text-xs">True</SelectItem>
                    <SelectItem value="false" className="text-xs">False</SelectItem>
                  </SelectContent>
                </Select>
              </ConfigField>
            )}

            {(field.data_type === "number" || field.data_type === "string") && (
              <ConfigField label="Default Value">
                <Input
                  type={field.data_type === "number" ? "number" : "text"}
                  step="any"
                  value={rawDefault}
                  onChange={(e) => handleDefaultChange(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </ConfigField>
            )}

            {(field.data_type === "array" || field.data_type === "object") && (
              <div className="col-span-2">
                <ConfigField label="Default Value (JSON)" hint="Must be valid JSON">
                  <textarea
                    value={rawDefault}
                    onChange={(e) => handleDefaultChange(e.target.value)}
                    placeholder={field.data_type === "array" ? "[\n  1,\n  2\n]" : "{\n  \"key\": \"value\"\n}"}
                    rows={4}
                    className={`w-full rounded-md border p-2 font-mono text-xs focus:outline-none ${
                      isInvalidJson ? "border-rose-300 focus:border-rose-500 bg-rose-50/20" : "border-slate-200 focus:border-indigo-500"
                    }`}
                  />
                  {isInvalidJson && (
                    <span className="text-[10px] text-rose-500 mt-1 block">
                      Warning: Invalid JSON for {field.data_type}
                    </span>
                  )}
                </ConfigField>
              </div>
            )}
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
          {field.data_type !== "mcq" && (
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
          )}

          {/* MCQ Options */}
          {field.data_type === "mcq" && (
            <div className="mt-3 space-y-3 rounded-md border border-slate-100 bg-slate-50/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-600">
                  MCQ Options
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px]"
                  onClick={() => {
                    const newOptions = [...(field.mcq_options || [])];
                    newOptions.push({
                      label: `Option ${newOptions.length + 1}`,
                      variables: [],
                    });
                    update({ mcq_options: newOptions });
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              </div>

              {(field.mcq_options || []).map((opt, optIdx) => (
                <div
                  key={optIdx}
                  className="space-y-2 rounded border border-slate-200 bg-white p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={opt.label}
                      onChange={(e) => {
                        const newOptions = [...(field.mcq_options || [])];
                        newOptions[optIdx] = { ...opt, label: e.target.value };
                        update({ mcq_options: newOptions });
                      }}
                      placeholder="e.g. Sandy Soil"
                      className="h-7 text-xs font-medium"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-rose-500"
                      onClick={() => {
                        const newOptions = (field.mcq_options || []).filter(
                          (_, idx) => idx !== optIdx,
                        );
                        update({ mcq_options: newOptions });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Nested Variables injection */}
                  <div className="pl-3 border-l-2 border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Injected Variables
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[9px] text-indigo-600 hover:text-indigo-800"
                        onClick={() => {
                          const newOptions = [...(field.mcq_options || [])];
                          const newVars = [...(opt.variables || [])];
                          newVars.push({ key: "", value: "" });
                          newOptions[optIdx] = { ...opt, variables: newVars };
                          update({ mcq_options: newOptions });
                        }}
                      >
                        <Plus className="mr-0.5 h-2.5 w-2.5" /> Add Variable
                      </Button>
                    </div>

                    {(opt.variables || []).map((v, vIdx) => (
                      <div key={vIdx} className="flex items-center gap-1.5">
                        <Input
                          value={v.key}
                          onChange={(e) => {
                            const newOptions = [...(field.mcq_options || [])];
                            const newVars = [...(opt.variables || [])];
                            newVars[vIdx] = { ...v, key: e.target.value };
                            newOptions[optIdx] = { ...opt, variables: newVars };
                            update({ mcq_options: newOptions });
                          }}
                          placeholder="Var key (e.g. C)"
                          className="h-6 text-[10px] font-mono"
                        />
                        <Input
                          value={String(v.value)}
                          onChange={(e) => {
                            const val = e.target.value;
                            const numVal = parseFloat(val);
                            const parsedVal = isNaN(numVal) ? val : numVal;
                            const newOptions = [...(field.mcq_options || [])];
                            const newVars = [...(opt.variables || [])];
                            newVars[vIdx] = { ...v, value: parsedVal };
                            newOptions[optIdx] = { ...opt, variables: newVars };
                            update({ mcq_options: newOptions });
                          }}
                          placeholder="Value (e.g. 0.3)"
                          className="h-6 text-[10px] font-mono"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-slate-300 hover:text-rose-500"
                          onClick={() => {
                            const newOptions = [...(field.mcq_options || [])];
                            const newVars = (opt.variables || []).filter(
                              (_, idx) => idx !== vIdx,
                            );
                            newOptions[optIdx] = { ...opt, variables: newVars };
                            update({ mcq_options: newOptions });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
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
