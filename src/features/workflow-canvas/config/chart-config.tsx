// src/features/workflow-canvas/config/chart-config.tsx

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

interface ChartConfigProps {
  config: {
    chart_type?: "line" | "area" | "bar" | "scatter";
    title?: string;
    x_variable?: string;
    y_variables?: string[];
    x_label?: string;
    y_label?: string;
    y_labels?: string[];
    width?: number;
    height?: number;
    output_variable?: string;
  };
  availableVariables: {
    key: string;
    label: string;
    unit?: string;
    sourceNode?: string;
  }[];
  onSave: (config: Record<string, unknown>) => void;
}

export function ChartConfig({ config, availableVariables, onSave }: ChartConfigProps) {
  const [title, setTitle] = useState(config.title ?? "");
  const [chartType, setChartType] = useState(config.chart_type ?? "line");
  const [xVariable, setXVariable] = useState(config.x_variable ?? "");
  const [xLabel, setXLabel] = useState(config.x_label ?? "");
  const [yLabel, setYLabel] = useState(config.y_label ?? "");
  const [width, setWidth] = useState(config.width ?? 600);
  const [height, setHeight] = useState(config.height ?? 300);
  const [outputVariable, setOutputVariable] = useState(config.output_variable ?? "");

  // Y series configuration
  const [ySeries, setYSeries] = useState<{ key: string; label: string }[]>(() => {
    const vars = config.y_variables ?? [];
    const labels = config.y_labels ?? [];
    if (vars.length === 0) {
      return [{ key: "", label: "" }];
    }
    return vars.map((v, i) => ({
      key: v,
      label: labels[i] ?? "",
    }));
  });

  const addYSeries = useCallback(() => {
    setYSeries((prev) => [...prev, { key: "", label: "" }]);
  }, []);

  const updateYSeries = useCallback((index: number, patch: Partial<{ key: string; label: string }>) => {
    setYSeries((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }, []);

  const removeYSeries = useCallback((index: number) => {
    setYSeries((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(() => {
    const y_variables = ySeries.map((s) => s.key).filter((k) => k !== "");
    const y_labels = ySeries.map((s) => s.label || s.key).filter((_, i) => ySeries[i].key !== "");

    onSave({
      title,
      chart_type: chartType,
      x_variable: xVariable || undefined,
      y_variables,
      y_labels,
      x_label: xLabel,
      y_label: yLabel,
      width: Number(width) || 600,
      height: Number(height) || 300,
      output_variable: outputVariable || undefined,
    });
  }, [
    title,
    chartType,
    xVariable,
    ySeries,
    xLabel,
    yLabel,
    width,
    height,
    outputVariable,
    onSave,
  ]);

  return (
    <div className="space-y-4">
      <ConfigSection title="Chart Type & Title" description="Base properties of the chart node">
        <ConfigField label="Chart Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Unit Hydrograph Chart"
            className="h-8 text-xs"
          />
        </ConfigField>

        <ConfigField label="Chart Style" className="mt-3">
          <Select value={chartType} onValueChange={(val: any) => setChartType(val)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line" className="text-xs">Line Chart</SelectItem>
              <SelectItem value="area" className="text-xs">Area Chart</SelectItem>
              <SelectItem value="bar" className="text-xs">Bar Chart</SelectItem>
              <SelectItem value="scatter" className="text-xs">Scatter Plot</SelectItem>
            </SelectContent>
          </Select>
        </ConfigField>
      </ConfigSection>

      <ConfigSection title="X-Axis Configuration" description="Bound X-axis variables and labels">
        <ConfigField label="X-Axis Variable (Optional - defaults to Index)">
          <Select value={xVariable} onValueChange={setXVariable}>
            <SelectTrigger className="h-8 text-xs font-mono">
              <SelectValue placeholder="Select a variable..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none_index" className="text-xs font-sans">
                <em>Index / Step Sequence</em>
              </SelectItem>
              {availableVariables.map((v) => (
                <SelectItem key={v.key} value={v.key} className="text-xs font-mono">
                  {v.key} <span className="text-[10px] text-slate-400 font-sans">({v.sourceNode})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConfigField>

        <ConfigField label="X-Axis Label" className="mt-3">
          <Input
            value={xLabel}
            onChange={(e) => setXLabel(e.target.value)}
            placeholder="e.g. Time (hours)"
            className="h-8 text-xs"
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection title="Y-Axis Variables" description="Add variables to plot on Y-axis">
        <div className="space-y-2">
          {ySeries.map((item, idx) => (
            <div key={idx} className="flex flex-col p-2.5 border border-slate-100 rounded-md bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-slate-500">Series #{idx + 1}</span>
                {ySeries.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-slate-400 hover:text-rose-500"
                    onClick={() => removeYSeries(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-medium text-slate-400 block mb-1">Variable</label>
                  <Select
                    value={item.key}
                    onValueChange={(val) => updateYSeries(idx, { key: val })}
                  >
                    <SelectTrigger className="h-7 text-xs font-mono">
                      <SelectValue placeholder="Choose..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVariables.map((v) => (
                        <SelectItem key={v.key} value={v.key} className="text-xs font-mono">
                          {v.key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[9px] font-medium text-slate-400 block mb-1">Display Label</label>
                  <Input
                    value={item.label}
                    onChange={(e) => updateYSeries(idx, { label: e.target.value })}
                    placeholder="e.g. Discharge"
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-full gap-1.5 text-xs h-8"
          onClick={addYSeries}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Y-Series
        </Button>

        <ConfigField label="Y-Axis Title" className="mt-3">
          <Input
            value={yLabel}
            onChange={(e) => setYLabel(e.target.value)}
            placeholder="e.g. Discharge (cumec)"
            className="h-8 text-xs"
          />
        </ConfigField>
      </ConfigSection>

      <ConfigSection title="Chart Dimensions & Outputs" description="Dimensions and target variable name">
        <div className="grid grid-cols-2 gap-2">
          <ConfigField label="Width (px)">
            <Input
              type="number"
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              placeholder="600"
              className="h-8 text-xs"
            />
          </ConfigField>
          <ConfigField label="Height (px)">
            <Input
              type="number"
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
              placeholder="300"
              className="h-8 text-xs"
            />
          </ConfigField>
        </div>

        <ConfigField label="Output Variable (Optional)" className="mt-3">
          <Input
            value={outputVariable}
            onChange={(e) => setOutputVariable(e.target.value)}
            placeholder="e.g. uh_chart_svg"
            className="h-8 font-mono text-xs"
          />
        </ConfigField>
      </ConfigSection>

      <Button
        size="sm"
        className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
        onClick={handleSave}
      >
        <Save className="h-3.5 w-3.5" />
        Save Chart Node
      </Button>
    </div>
  );
}
