"use client";

import { Database } from "lucide-react";

import {
  ExactTableEditor,
  InterpolationEditor,
  RangeTableEditor,
} from "./table-sub-editors";

interface TableDataEditorProps {
  type: string;
  data: any[];
  columns: any[];
  onTypeChange: (type: string) => void;
  onDataChange: (data: any[]) => void;
  onColumnsChange: (columns: any[]) => void; // FIX: was never wired in original
}

export function TableDataEditor({
  type,
  data,
  columns,
  onTypeChange,
  onDataChange,
  onColumnsChange,
}: TableDataEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Table Data</h2>
      </div>

      {type === "EXACT_LOOKUP" && (
        <ExactTableEditor data={data} onChange={onDataChange} />
      )}
      {type === "RANGE_LOOKUP" && (
        <RangeTableEditor data={data} onChange={onDataChange} />
      )}
      {type === "INTERPOLATION_1D" && (
        <InterpolationEditor data={data} onChange={onDataChange} />
      )}
      {type === "MULTI_KEY_LOOKUP" && (
        <p className="text-sm text-muted-foreground italic">
          Multi-key lookup editor is planned and not yet available.
        </p>
      )}
    </div>
  );
}
