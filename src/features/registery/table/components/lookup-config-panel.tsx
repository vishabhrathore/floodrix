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
    BookOpen,
    Edit3,
} from "lucide-react";
import RegistryPicker, { type RegistryItem } from "@/features/registery/components/registery-picker";
import { cn } from "@/lib/utils";
import { TableDataEditor } from "./table-data-editor";
import { TableRegistryAutocomplete } from "./table-registry-autocomplete";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        const next = { ...localConfig, ...patch } as LookupNodeConfig;
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
            mode: "registry",
            keyBindings,
            outputBinding,
            inlineColumns: cols,
            inlineData: (item.data as Record<string, unknown>[]) ?? [],
            inlineTableType: item.tableType,
        });
    };

    const handleModeChange = (mode: "registry" | "inline") => {
        if (mode === "inline") {
            // Initialize inline bindings if missing
            const keyBindings = localConfig.keyBindings.length > 0 ? localConfig.keyBindings :
                [{ columnKey: "key", columnLabel: "Lookup Key", contextKey: "" }];

            const outputBinding = localConfig.outputBinding ||
                { columnKey: "value", contextKey: "", notation: "result", label: "Output" };

            update({ mode, keyBindings, outputBinding });
        } else {
            update({ mode });
        }
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
                <div className="px-0 py-2">
                    <Tabs
                        value={localConfig.mode}
                        onValueChange={(v) => handleModeChange(v as "registry" | "inline")}
                    >
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="registry" className="gap-1.5 text-xs font-semibold">
                                <BookOpen className="h-3.5 w-3.5" />
                                Registry
                            </TabsTrigger>
                            <TabsTrigger value="inline" className="gap-1.5 text-xs font-semibold">
                                <Edit3 className="h-3.5 w-3.5" />
                                Custom Table
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Registry mode */}
                {
                    localConfig.mode === "registry" && (
                        <div className="space-y-3">
                            <Section title="Table Selection" icon={Table2}>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 block">
                                            Autocomplete Search
                                        </Label>
                                        <TableRegistryAutocomplete
                                            value={localConfig.registryId}
                                            onSelect={handleRegistrySelect}
                                        />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-border/40" />
                                        </div>
                                        <div className="relative flex justify-center text-[10px] uppercase font-semibold">
                                            <span className="bg-background px-2 text-muted-foreground/60">Or Browse Registry</span>
                                        </div>
                                    </div>

                                    <RegistryPicker
                                        type="table"
                                        value={localConfig.registryId}
                                        onChange={handleRegistrySelect}
                                        showVersionPin
                                        pinnedVersion={localConfig.pinnedVersion}
                                        onPinnedVersionChange={(v) => update({ pinnedVersion: v })}
                                    />
                                </div>
                            </Section>

                            {localConfig.registryId && localConfig.inlineColumns && (
                                <Section title="Table Preview" icon={AlignJustify} defaultOpen={false}>
                                    <TableDataEditor
                                        type={(localConfig.inlineTableType as any) || "RANGE_LOOKUP"}
                                        data={localConfig.inlineData ?? []}
                                        readOnly={true}
                                    />
                                </Section>
                            )}
                        </div>
                    )
                }

                {/* Custom / inline mode */}
                {
                    localConfig.mode === "inline" && (
                        <Section title="Custom Table" icon={Settings2}>
                            <div className="space-y-3">
                                <TableDataEditor
                                    type={(localConfig.inlineTableType as any) || "RANGE_LOOKUP"}
                                    data={localConfig.inlineData ?? []}
                                    onTypeChange={(v) => update({ inlineTableType: v })}
                                    onDataChange={(data) => update({ inlineData: data })}
                                />
                            </div>
                        </Section>
                    )
                }

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
                                    <div className="flex flex-col gap-2">
                                        <p className="text-xs text-muted-foreground italic">
                                            No lookup variables configured.
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-[10px]"
                                            onClick={() => update({
                                                keyBindings: [{ columnKey: "key", columnLabel: "Lookup Key", contextKey: "" }]
                                            })}
                                        >
                                            + Add Lookup Key
                                        </Button>
                                    </div>
                                )}

                                {localConfig.outputBinding && (
                                    <>
                                        <p className="pt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                            Outcome
                                        </p>
                                        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 p-2.5">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-baseline justify-between gap-2">
                                                    <p className="text-[10px] font-medium text-muted-foreground">
                                                        Store {localConfig.outputBinding.label} as:
                                                    </p>
                                                    <span className="text-[9px] font-mono text-muted-foreground bg-muted/30 px-1 rounded">
                                                        Workflow Variable
                                                    </span>
                                                </div>
                                                <div className="mt-1.5">
                                                    <Input
                                                        value={localConfig.outputBinding.contextKey ?? localConfig.outputBinding.notation ?? ""}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            update({
                                                                outputBinding: {
                                                                    ...localConfig.outputBinding!,
                                                                    contextKey: val,
                                                                    notation: val,
                                                                },
                                                            });
                                                        }}
                                                        placeholder="e.g. scour_depth"
                                                        className="h-8 text-[12px] font-mono font-semibold"
                                                    />
                                                    <p className="mt-1 text-[9px] text-muted-foreground">
                                                        This name will be available to other nodes in the workflow.
                                                    </p>
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