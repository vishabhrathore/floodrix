"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ExactTableEditor, RangeTableEditor, InterpolationEditor } from "./table-sub-editors";
import { Database, Zap, Settings2 } from "lucide-react";

interface TableDataEditorProps {
    type: "EXACT_LOOKUP" | "RANGE_LOOKUP" | "INTERPOLATION_1D" | "MULTI_KEY_LOOKUP";
    data: any[];
    onTypeChange?: (type: any) => void;
    onDataChange?: (data: any[]) => void;
    showTypeSelector?: boolean;
    readOnly?: boolean;
}

export function TableDataEditor({
    type,
    data,
    onTypeChange,
    onDataChange,
    showTypeSelector = true,
    readOnly = false
}: TableDataEditorProps) {
    const handleDataChange = (newData: any[]) => {
        if (!readOnly && onDataChange) {
            onDataChange(newData);
        }
    };

    return (
        <div className="space-y-6">
            {showTypeSelector && (
                <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <Settings2 className="h-3.5 w-3.5" />
                        Lookup Logic Type
                    </Label>
                    <Select
                        onValueChange={onTypeChange}
                        value={type}
                        disabled={readOnly}
                    >
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EXACT_LOOKUP">Exact Match (Text Category)</SelectItem>
                            <SelectItem value="RANGE_LOOKUP">Range Match (Numerical Interval)</SelectItem>
                            <SelectItem value="INTERPOLATION_1D">1D Interpolation (Linear/Cubic Curve)</SelectItem>
                            <SelectItem value="MULTI_KEY_LOOKUP">Multi-Key Lookup (Reference only)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold">Table Entries</h3>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-4 md:p-6">
                    {type === "EXACT_LOOKUP" && (
                        <ExactTableEditor
                            data={data}
                            onChange={handleDataChange}
                            readOnly={readOnly}
                        />
                    )}
                    {type === "RANGE_LOOKUP" && (
                        <RangeTableEditor
                            data={data}
                            onChange={handleDataChange}
                            readOnly={readOnly}
                        />
                    )}
                    {type === "INTERPOLATION_1D" && (
                        <InterpolationEditor
                            data={data}
                            onChange={handleDataChange}
                            readOnly={readOnly}
                        />
                    )}
                    {type === "MULTI_KEY_LOOKUP" && (
                        <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                            Multi-key lookup configuration is managed via the specialized multi-column editor.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
