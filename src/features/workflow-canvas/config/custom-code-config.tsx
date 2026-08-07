// src/features/workflow-canvas/config/custom-code-config.tsx

"use client";

import { useCallback, useState } from "react";

import { Plus, Save, Trash2 } from "lucide-react";

import { MathEditor } from "@/components/core/MathEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { ConfigField, ConfigSection } from "./config-drawer";

interface CustomCodeConfigProps {
  config: {
    code?: string;
    output_variables?: string[];
    use_worker?: boolean;
  };
  onSave: (config: Record<string, unknown>) => void;
}

export function CustomCodeConfig({ config, onSave }: CustomCodeConfigProps) {
  const [code, setCode] = useState(config.code ?? "");
  const [outputVars, setOutputVars] = useState<string[]>(
    config.output_variables ?? [],
  );
  const [useWorker, setUseWorker] = useState<boolean>(
    config.use_worker ?? true,
  );
  const [newVar, setNewVar] = useState("");

  const handleAddVar = useCallback(() => {
    const trimmed = newVar.trim().toLowerCase();
    if (trimmed && !outputVars.includes(trimmed)) {
      setOutputVars((prev) => [...prev, trimmed]);
      setNewVar("");
    }
  }, [newVar, outputVars]);

  const handleRemoveVar = useCallback((variable: string) => {
    setOutputVars((prev) => prev.filter((v) => v !== variable));
  }, []);

  const doSave = useCallback(() => {
    onSave({
      code,
      output_variables: outputVars,
      use_worker: useWorker,
    });
  }, [code, outputVars, useWorker, onSave]);

  return (
    <div className="space-y-5">
      <ConfigSection
        title="Custom Code Block"
        description="Write multi-line mathematical and procedural code in MathJS"
      >
        <ConfigField
          label="Execution Script"
          hint="Use standard MathJS assignment syntax (e.g. y = x * 2)"
        >
          <div className="mt-1.5 min-h-[300px] rounded-lg overflow-hidden border border-slate-200">
            <MathEditor
              defaultValue={code}
              onChange={(newVal) => setCode(newVal)}
              className="border-0 rounded-none h-full min-h-[300px]"
            />
          </div>
        </ConfigField>
      </ConfigSection>

      <ConfigSection
        title="Output Variables"
        description="Declare variables created inside the script that should be exported to the workflow scope"
      >
        <div className="flex gap-2 mb-3">
          <Input
            value={newVar}
            onChange={(e) => setNewVar(e.target.value)}
            placeholder="e.g. result_peak"
            className="h-8 font-mono text-xs uppercase"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddVar();
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 px-3 text-xs"
            onClick={handleAddVar}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        {outputVars.length > 0 ? (
          <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
            {outputVars.map((v) => (
              <div
                key={v}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm"
              >
                <code className="text-xs font-mono font-bold text-slate-700 uppercase">
                  {v}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  onClick={() => handleRemoveVar(v)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center">
            <p className="text-xs text-slate-400">
              No output variables declared yet
            </p>
          </div>
        )}
      </ConfigSection>

      <ConfigSection
        title="Execution Settings"
        description="Control execution environments"
      >
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mr-4">
            <p className="text-xs font-semibold text-slate-700">
              Run on Worker Thread
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Offload execution to Piscina worker pool (recommended). Disable to
              bypass and run locally on the main thread.
            </p>
          </div>
          <Switch checked={useWorker} onCheckedChange={setUseWorker} />
        </div>
      </ConfigSection>

      <Button
        size="sm"
        className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md"
        onClick={doSave}
      >
        <Save className="h-3.5 w-3.5" />
        Save Custom Code
      </Button>
    </div>
  );
}
