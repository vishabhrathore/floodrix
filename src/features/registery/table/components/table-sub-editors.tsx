"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

// --- Exact Match Editor ---
export function ExactTableEditor({
    data,
    onChange,
    readOnly = false,
}: {
    data: any[];
    onChange: (data: any[]) => void;
    readOnly?: boolean;
}) {
    const addRow = () => !readOnly && onChange([...data, { key: "", value: 0 }]);
    const updateRow = (idx: number, patch: any) =>
        !readOnly && onChange(data.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const removeRow = (idx: number) => !readOnly && onChange(data.filter((_, i) => i !== idx));

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_40px] gap-2 px-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                <span>Category / Key</span>
                <span>Value</span>
                <span></span>
            </div>
            <div className="space-y-1.5">
                {data.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_100px_40px] items-center gap-2">
                        <Input
                            value={row.key}
                            onChange={(e) => updateRow(idx, { key: e.target.value })}
                            placeholder="e.g. Concrete"
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        <Input
                            type="number"
                            step="any"
                            value={row.value}
                            onChange={(e) => updateRow(idx, { value: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        {!readOnly && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRow(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <Button type="button" variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Add Row
                </Button>
            )}
        </div>
    );
}

// --- Range Editor ---
export function RangeTableEditor({
    data,
    onChange,
    readOnly = false,
}: {
    data: any[];
    onChange: (data: any[]) => void;
    readOnly?: boolean;
}) {
    const addRow = () => {
        if (readOnly) return;
        const lastTo = data.length > 0 ? (data[data.length - 1].to ?? 0) : 0;
        onChange([...data, { from: lastTo, to: null, value: 0, label: "" }]);
    };
    const updateRow = (idx: number, patch: any) =>
        !readOnly && onChange(data.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const removeRow = (idx: number) => !readOnly && onChange(data.filter((_, i) => i !== idx));

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[80px_80px_1fr_80px_40px] gap-2 px-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                <span>From</span>
                <span>To</span>
                <span>Label</span>
                <span>Value</span>
                <span></span>
            </div>
            <div className="space-y-1.5">
                {data.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[80px_80px_1fr_80px_40px] items-center gap-2">
                        <Input
                            type="number"
                            step="any"
                            value={row.from}
                            onChange={(e) => updateRow(idx, { from: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        <Input
                            type="number"
                            step="any"
                            value={row.to ?? ""}
                            onChange={(e) => updateRow(idx, { to: e.target.value ? parseFloat(e.target.value) : null })}
                            placeholder="∞"
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        <Input
                            value={row.label}
                            onChange={(e) => updateRow(idx, { label: e.target.value })}
                            placeholder="Condition..."
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        <Input
                            type="number"
                            step="any"
                            value={row.value}
                            onChange={(e) => updateRow(idx, { value: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        {!readOnly && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRow(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <Button type="button" variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Add Row
                </Button>
            )}
        </div>
    );
}

// --- Curve / Interpolation Editor ---
export function InterpolationEditor({
    data,
    onChange,
    readOnly = false,
}: {
    data: any[];
    onChange: (data: any[]) => void;
    readOnly?: boolean;
}) {
    const addRow = () => {
        if (readOnly) return;
        const lastX = data.length > 0 ? (data[data.length - 1].x ?? 0) + 10 : 0;
        onChange([...data, { x: lastX, y: 0 }]);
    };
    const updateRow = (idx: number, patch: any) =>
        !readOnly && onChange(data.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    const removeRow = (idx: number) => !readOnly && onChange(data.filter((_, i) => i !== idx));

    return (
        <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_40px] gap-2 px-1 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                <span>Input (X)</span>
                <span>Output (Y)</span>
                <span></span>
            </div>
            <div className="space-y-1.5">
                {data.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_40px] items-center gap-2">
                        <Input
                            type="number"
                            step="any"
                            value={row.x}
                            onChange={(e) => updateRow(idx, { x: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        <Input
                            type="number"
                            step="any"
                            value={row.y}
                            onChange={(e) => updateRow(idx, { y: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs font-mono"
                            disabled={readOnly}
                        />
                        {!readOnly && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => removeRow(idx)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
            {!readOnly && (
                <Button type="button" variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Add Row
                </Button>
            )}
        </div>
    );
}