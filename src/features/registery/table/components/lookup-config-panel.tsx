"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Table2,
    Variable,
    ChevronRight,
    ChevronDown,
    Info,
    Check,
    AlertCircle,
    Link2,
    Link2Off,
    AlignJustify,
    Hash,
    Settings2,
    Eye,
    EyeOff,
} from "lucide-react";
import RegistryPicker, { type RegistryItem } from "@/features/registery/components/registery-picker";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────
interface LookupInputBinding {
    columnKey: string; // column in the table
    columnLabel: string;
    contextKey?: string; // which workflow variable provides this
    notation?: string; // human-readable notation for display
}

interface LookupNodeConfig {
    mode: "registry" | "inline";
    registryId?: string | null;
    pinnedVersion?: number | null;
    // Inline table definition
    inlineTableType?: string;
    inlineColumns?: { key: string; label: string; isKey?: boolean; isOutput?: boolean }[];
    inlineData?: Record<string, unknown>[];
    // Runtime bindings
    keyBindings: LookupInputBinding[]; // input column bindings
    outputBinding?: {
        columnKey: string;
        contextKey: string;
        notation: string;
        label: string;
    };
    // Fallback
    fallbackMode?: "error" | "clamp" | "default";
    fallbackValue?: unknown;
    allowOverride?: boolean;
    // Display
    label?: string;
    description?: string;
    showTableInOutput?: boolean;
}

interface LookupConfigPanelProps {
    nodeId: string;
    config: LookupNodeConfig;
    onChange: (config: LookupNodeConfig) => void;
    availableVariables?: {
        notation: string;
        displayLabel: string;
        contextKey: string;
        unit?: string;
    }[];
}

// ── Section ───────────────────────────────────────────────────────────────
function Section({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex w-full items-center gap-2 py-2 text-left"
            >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{title}</span>
                {open ? (
                    <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                )}
            </button>
            {open && <div className="space-y-3 pb-3">{children}</div>}
        </div>
    );
}

// ── Key binding row ───────────────────────────────────────────────────────
function KeyBindingRow({
    binding,
    availableVars,
    onChange,
}: {
    binding: LookupInputBinding;
    availableVars: { notation: string; displayLabel: string; contextKey: string }[];
    onChange: (b: LookupInputBinding) => void;
}) {
    return (
        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 p-2.5">
            <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-muted-foreground">
                    {binding.columnLabel || binding.columnKey}
                </p>
                <div className="mt-1">
                    <Select
                        value={binding.contextKey ?? ""}
                        onValueChange={(v) => {
                            const found = availableVars.find((x) => x.contextKey === v);
                            onChange({
                                ...binding,
                                contextKey: v,
                                notation: found?.notation ?? v,
                            });
                        }}
                    >
                        <SelectTrigger className="h-6 text-[11px]">
                            <SelectValue placeholder="Map to workflow variable…" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableVars.map((v) => (
                                <SelectItem key={v.contextKey} value={v.contextKey}>
                                    <span className="font-mono">{v.notation}</span>
                                    <span className="ml-1.5 text-muted-foreground">{v.displayLabel}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
    );
}

// ── Inline mini-table editor ──────────────────────────────────────────────
function InlineTableEditor({
    columns,
    data,
    onColumnsChange,
    onDataChange,
}: {
    columns: { key: string; label: string; isKey?: boolean; isOutput?: boolean }[];
    data: Record<string, unknown>[];
    onColumnsChange: (cols: typeof columns) => void;
    onDataChange: (rows: typeof data) => void;
}) {
    const addRow = () => {
        const row: Record<string, unknown> = {};
        columns.forEach((c) => (row[c.key] = ""));
        onDataChange([...data, row]);
    };

    const updateCell = (rowIdx: number, key: string, value: string) => {
        onDataChange(data.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));
    };

    if (columns.length === 0) {
        return (
            <div className="rounded-md border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                Select a table from the registry or add columns to define a custom table.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-md border border-border/40">
            <table className="w-full min-w-max text-xs">
                <thead>
                    <tr className="border-b border-border/40 bg-muted/40">
                        {columns.map((c) => (
                            <th
                                key={c.key}
                                className={cn(
                                    "px-2 py-1.5 text-left text-[10px] font-medium",
                                    c.isOutput
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {c.label || c.key}
                                {c.isOutput && (
                                    <span className="ml-1 text-[9px] text-primary/60">↑</span>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr
                            key={i}
                            className="group border-b border-border/20 last:border-0 hover:bg-muted/20"
                        >
                            {columns.map((c) => (
                                <td key={c.key} className="px-1 py-0.5">
                                    <input
                                        type="text"
                                        value={String(row[c.key] ?? "")}
                                        onChange={(e) => updateCell(i, c.key, e.target.value)}
                                        className="h-6 w-full min-w-[60px] rounded border-0 bg-transparent px-1 font-mono text-[11px] focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length === 0 && (
                <div className="py-4 text-center text-[11px] text-muted-foreground">No rows</div>
            )}
            <div className="border-t border-border/30 p-2">
                <button
                    type="button"
                    onClick={addRow}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                    + Add row
                </button>
            </div>
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────
export default function LookupConfigPanel({
    nodeId,
    config,
    onChange,
    availableVariables = [],
}: LookupConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState<LookupNodeConfig>(config);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const update = (patch: Partial<LookupNodeConfig>) => {
        const next = { ...localConfig, ...patch };
        setLocalConfig(next);
        onChange(next);
    };

    const handleRegistrySelect = (id: string | null, item: RegistryItem | null) => {
        if (!item || !id) {
            update({ registryId: null, keyBindings: [], outputBinding: undefined });
            return;
        }
        const cols = (item.columns ?? []) as {
            key: string;
            label: string;
            isKey?: boolean;
            isOutput?: boolean;
        }[];
        const keyBindings: LookupInputBinding[] = cols
            .filter((c) => c.isKey)
            .map((c) => ({ columnKey: c.key, columnLabel: c.label, contextKey: "" }));

        const outputCol = cols.find((c) => c.isOutput);
        const outputBinding = outputCol
            ? { columnKey: outputCol.key, contextKey: "", notation: outputCol.key, label: outputCol.label }
            : undefined;

        update({
            registryId: id,
            keyBindings,
            outputBinding,
            inlineColumns: cols,
            inlineData: (item.data as Record<string, unknown>[]) ?? [],
        });
    };

    const updateKeyBinding = (index: number, binding: LookupInputBinding) => {
        const next = localConfig.keyBindings.map((b, i) => (i === index ? binding : b));
        update({ keyBindings: next });
    };

    const allBound =
        localConfig.keyBindings.every((b) => !!b.contextKey) &&
        !!localConfig.outputBinding?.contextKey;

    return (
        <div className="flex flex-col gap-0 divide-y divide-border/40">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100">
                    <Table2 className="h-3.5 w-3.5 text-blue-700" />
                </div>
                <div>
                    <p className="text-sm font-semibold">Lookup Table Node</p>
                    <p className="text-[10px] text-muted-foreground">{nodeId}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                {/* Label */}
                <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Node Label
                    </Label>
                    <Input
                        value={localConfig.label ?? ""}
                        onChange={(e) => update({ label: e.target.value })}
                        placeholder="Scour Depth Coefficient"
                        className="mt-1 h-8 text-sm"
                    />
                </div>

                <Separator />

                {/* Mode toggle */}
                <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Table Source
                    </Label>
                    <div className="mt-2 flex gap-2">
                        {(["registry", "inline"] as const).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => update({ mode: m })}
                                className={cn(
                                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border py-2 text-xs font-medium transition-colors",
                                    localConfig.mode === m
                                        ? "border-primary bg-primary/5 text-primary"
                                        : "border-border/60 text-muted-foreground hover:bg-muted/30"
                                )}
                            >
                                {m === "registry" ? (
                                    <><Link2 className="h-3.5 w-3.5" />Registry</>
                                ) : (
                                    <><Link2Off className="h-3.5 w-3.5" />Custom</>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Registry mode */}
                {localConfig.mode === "registry" && (
                    <div className="space-y-3">
                        <Section title="Table" icon={Table2}>
                            <RegistryPicker
                                type="table"
                                value={localConfig.registryId}
                                onChange={handleRegistrySelect}
                                showVersionPin
                                pinnedVersion={localConfig.pinnedVersion}
                                onPinnedVersionChange={(v) => update({ pinnedVersion: v })}
                            />
                        </Section>

                        {localConfig.registryId && localConfig.inlineColumns && (
                            <Section title="Table Preview" icon={AlignJustify} defaultOpen={false}>
                                <InlineTableEditor
                                    columns={localConfig.inlineColumns ?? []}
                                    data={localConfig.inlineData ?? []}
                                    onColumnsChange={(cols) => update({ inlineColumns: cols })}
                                    onDataChange={(data) => update({ inlineData: data })}
                                />
                            </Section>
                        )}
                    </div>
                )}

                {/* Custom / inline mode */}
                {localConfig.mode === "inline" && (
                    <Section title="Custom Table" icon={Settings2}>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Match Mode
                                </Label>
                                <Select
                                    value={localConfig.inlineTableType ?? "RANGE_LOOKUP"}
                                    onValueChange={(v) => update({ inlineTableType: v })}
                                >
                                    <SelectTrigger className="mt-1 h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RANGE_LOOKUP">Range Lookup</SelectItem>
                                        <SelectItem value="EXACT_LOOKUP">Exact Lookup</SelectItem>
                                        <SelectItem value="INTERPOLATION_1D">1D Interpolation</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <InlineTableEditor
                                columns={localConfig.inlineColumns ?? []}
                                data={localConfig.inlineData ?? []}
                                onColumnsChange={(cols) => update({ inlineColumns: cols })}
                                onDataChange={(data) => update({ inlineData: data })}
                            />
                        </div>
                    </Section>
                )}

                {/* Variable bindings */}
                {(localConfig.keyBindings.length > 0 || localConfig.registryId) && (
                    <>
                        <Separator />
                        <Section title="Variable Bindings" icon={Variable}>
                            <div className="space-y-2">
                                {localConfig.keyBindings.length > 0 ? (
                                    <>
                                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Lookup Keys
                                        </p>
                                        {localConfig.keyBindings.map((b, i) => (
                                            <KeyBindingRow
                                                key={`${b.columnKey}-${i}`}
                                                binding={b}
                                                availableVars={availableVariables}
                                                onChange={(updated) => updateKeyBinding(i, updated)}
                                            />
                                        ))}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        Select a table to configure key bindings.
                                    </p>
                                )}

                                {localConfig.outputBinding && (
                                    <>
                                        <p className="pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Output
                                        </p>
                                        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 p-2.5">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[10px] font-medium text-muted-foreground">
                                                    {localConfig.outputBinding.label} → store as
                                                </p>
                                                <div className="mt-1 grid grid-cols-2 gap-2">
                                                    <div>
                                                        <Label className="text-[10px] text-muted-foreground">Notation</Label>
                                                        <Input
                                                            value={localConfig.outputBinding.notation}
                                                            onChange={(e) =>
                                                                update({
                                                                    outputBinding: {
                                                                        ...localConfig.outputBinding!,
                                                                        notation: e.target.value,
                                                                    },
                                                                })
                                                            }
                                                            placeholder="f_s"
                                                            className="mt-0.5 h-6 font-mono text-[11px]"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-[10px] text-muted-foreground">Variable</Label>
                                                        <Select
                                                            value={localConfig.outputBinding.contextKey ?? ""}
                                                            onValueChange={(v) =>
                                                                update({
                                                                    outputBinding: {
                                                                        ...localConfig.outputBinding!,
                                                                        contextKey: v,
                                                                    },
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger className="mt-0.5 h-6 text-[11px]">
                                                                <SelectValue placeholder="Select…" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="__new__">
                                                                    + Create new variable
                                                                </SelectItem>
                                                                {availableVariables.map((v) => (
                                                                    <SelectItem key={v.contextKey} value={v.contextKey}>
                                                                        <span className="font-mono">{v.notation}</span>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {!allBound && (localConfig.keyBindings.length > 0 || localConfig.outputBinding) && (
                                    <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/50 px-2.5 py-2 text-xs text-amber-700">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        Bind all keys and the output before running.
                                    </div>
                                )}
                            </div>
                        </Section>
                    </>
                )}

                {/* Fallback */}
                <Separator />
                <Section title="Fallback Behaviour" icon={Settings2} defaultOpen={false}>
                    <div className="space-y-3">
                        <div>
                            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                When no match is found
                            </Label>
                            <Select
                                value={localConfig.fallbackMode ?? "error"}
                                onValueChange={(v) => update({ fallbackMode: v as any })}
                            >
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="error">Throw error</SelectItem>
                                    <SelectItem value="clamp">Clamp to nearest</SelectItem>
                                    <SelectItem value="default">Use default value</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {localConfig.fallbackMode === "default" && (
                            <div>
                                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                    Default Value
                                </Label>
                                <Input
                                    value={String(localConfig.fallbackValue ?? "")}
                                    onChange={(e) => update({ fallbackValue: e.target.value })}
                                    placeholder="0"
                                    className="mt-1 h-8 text-xs"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium">Show in Output</p>
                                <p className="text-[10px] text-muted-foreground">Include table match in report</p>
                            </div>
                            <Switch
                                checked={localConfig.showTableInOutput ?? true}
                                onCheckedChange={(v) => update({ showTableInOutput: v })}
                            />
                        </div>
                    </div>
                </Section>

                {/* Description */}
                <Separator />
                <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Description
                    </Label>
                    <Input
                        value={localConfig.description ?? ""}
                        onChange={(e) => update({ description: e.target.value })}
                        placeholder="Describe the purpose of this lookup…"
                        className="mt-1 h-8 text-sm"
                    />
                </div>
            </div>
        </div>
    );
}