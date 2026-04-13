"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
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
    FunctionSquare,
    Variable,
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    Info,
    Check,
    GripVertical,
    Link2,
    Link2Off,
    AlertCircle,
    BookOpen,
} from "lucide-react";
import RegistryPicker, { type RegistryItem } from "@/features/registery/components/registery-picker";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────
interface VariableBinding {
    nodeVar: string; // notation used in this workflow
    formulaVar: string; // notation as defined in the formula
    displayLabel: string;
    unit?: string;
    contextKey?: string; // which workflow variable it maps to
}

interface FormulaNodeConfig {
    mode: "registry" | "inline";
    registryId?: string | null;
    pinnedVersion?: number | null;
    inlineExpression?: string;
    inlineDisplayExpression?: string;
    label?: string;
    description?: string;
    inputBindings: VariableBinding[];
    outputBinding?: VariableBinding;
}

interface FormulaConfigPanelProps {
    nodeId: string;
    config: FormulaNodeConfig;
    onChange: (config: FormulaNodeConfig) => void;
    availableVariables?: { notation: string; displayLabel: string; contextKey: string; unit?: string }[];
}

// ── Zod schema ────────────────────────────────────────────────────────────
const bindingSchema = z.object({
    nodeVar: z.string().min(1),
    formulaVar: z.string().min(1),
    displayLabel: z.string(),
    unit: z.string().optional(),
    contextKey: z.string().optional(),
});

const formulaConfigSchema = z.object({
    mode: z.enum(["registry", "inline"]),
    registryId: z.string().nullable().optional(),
    pinnedVersion: z.number().nullable().optional(),
    inlineExpression: z.string().optional(),
    inlineDisplayExpression: z.string().optional(),
    label: z.string().optional(),
    description: z.string().optional(),
    inputBindings: z.array(bindingSchema),
    outputBinding: bindingSchema.optional(),
});

type FormValues = z.infer<typeof formulaConfigSchema>;

// ── Variable binding row ──────────────────────────────────────────────────
function BindingRow({
    binding,
    availableVars,
    onChange,
    direction,
}: {
    binding: VariableBinding;
    availableVars: { notation: string; displayLabel: string; contextKey: string; unit?: string }[];
    onChange: (b: VariableBinding) => void;
    direction: "input" | "output";
}) {
    return (
        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 p-2.5">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-semibold text-primary">
                        {binding.formulaVar}
                    </span>
                    <span className="text-[10px] text-muted-foreground">=</span>
                    <span className="text-xs text-muted-foreground">{binding.displayLabel}</span>
                </div>
                <div className="mt-1.5">
                    <Select
                        value={binding.contextKey ?? ""}
                        onValueChange={(v) => {
                            const found = availableVars.find((x) => x.contextKey === v);
                            onChange({
                                ...binding,
                                contextKey: v,
                                nodeVar: found?.notation ?? v,
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
            {direction === "input" ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
                <div className="shrink-0 rounded bg-primary/10 p-0.5">
                    <ChevronRight className="h-3.5 w-3.5 text-primary" />
                </div>
            )}
        </div>
    );
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

// ── Inline expression editor ──────────────────────────────────────────────
function InlineExpressionEditor({
    value,
    displayValue,
    onChange,
    onDisplayChange,
    availableVars,
}: {
    value: string;
    displayValue: string;
    onChange: (v: string) => void;
    onDisplayChange: (v: string) => void;
    availableVars: { notation: string }[];
}) {
    return (
        <div className="space-y-3">
            <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Expression *
                </Label>
                <div className="relative mt-1">
                    <Input
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Q = C * M^(3/4)"
                        className="h-8 font-mono text-xs"
                    />
                </div>
                {availableVars.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        <p className="w-full text-[10px] text-muted-foreground">Available:</p>
                        {availableVars.map((v) => (
                            <button
                                key={v.notation}
                                type="button"
                                onClick={() => onChange(value + v.notation)}
                                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] hover:bg-muted/80"
                            >
                                {v.notation}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div>
                <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Display Expression
                </Label>
                <Input
                    value={displayValue}
                    onChange={(e) => onDisplayChange(e.target.value)}
                    placeholder="Q = C × M³/⁴"
                    className="mt-1 h-8 text-xs"
                />
            </div>
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────
export default function FormulaConfigPanel({
    nodeId,
    config,
    onChange,
    availableVariables = [],
}: FormulaConfigPanelProps) {
    const [selectedRegistryItem, setSelectedRegistryItem] = useState<RegistryItem | null>(null);
    const [localConfig, setLocalConfig] = useState<FormulaNodeConfig>(config);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const update = (patch: Partial<FormulaNodeConfig>) => {
        const next = { ...localConfig, ...patch };
        setLocalConfig(next);
        onChange(next);
    };

    // When a registry formula is selected, auto-populate input bindings
    const handleRegistrySelect = (id: string | null, item: RegistryItem | null) => {
        if (!item) {
            update({ registryId: null, inputBindings: [], outputBinding: undefined });
            setSelectedRegistryItem(null);
            return;
        }
        setSelectedRegistryItem(item);
        const inputBindings: VariableBinding[] =
            (item.inputVariables ?? []).map((v) => ({
                nodeVar: v.notation,
                formulaVar: v.notation,
                displayLabel: v.displayLabel,
                unit: v.unit,
                contextKey: "",
            }));
        const outputVar = item.outputVariable;
        const outputBinding: VariableBinding | undefined = outputVar
            ? {
                nodeVar: outputVar.notation,
                formulaVar: outputVar.notation,
                displayLabel: outputVar.displayLabel,
                unit: outputVar.unit,
                contextKey: "",
            }
            : undefined;

        update({ registryId: id, inputBindings, outputBinding });
    };

    const updateInputBinding = (index: number, binding: VariableBinding) => {
        const next = localConfig.inputBindings.map((b, i) => (i === index ? binding : b));
        update({ inputBindings: next });
    };

    return (
        <div className="flex flex-col gap-0 divide-y divide-border/40">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100">
                    <FunctionSquare className="h-3.5 w-3.5 text-emerald-700" />
                </div>
                <div>
                    <p className="text-sm font-semibold">Formula Node</p>
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
                        placeholder="Dicken's Formula"
                        className="mt-1 h-8 text-sm"
                    />
                </div>

                <Separator />

                {/* Mode toggle */}
                <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Formula Source
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
                                    <><Link2Off className="h-3.5 w-3.5" />Inline</>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Registry mode */}
                {localConfig.mode === "registry" && (
                    <div className="space-y-3">
                        <Section title="Formula" icon={FunctionSquare}>
                            <RegistryPicker
                                type="formula"
                                value={localConfig.registryId}
                                onChange={handleRegistrySelect}
                                showVersionPin
                                pinnedVersion={localConfig.pinnedVersion}
                                onPinnedVersionChange={(v) => update({ pinnedVersion: v })}
                            />
                        </Section>

                        {localConfig.registryId && localConfig.inputBindings.length > 0 && (
                            <Section title="Variable Bindings" icon={Variable}>
                                <div className="space-y-1.5">
                                    <p className="text-[10px] text-muted-foreground">
                                        Map formula variables to workflow variables
                                    </p>
                                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                        Inputs
                                    </p>
                                    {localConfig.inputBindings.map((b, i) => (
                                        <BindingRow
                                            key={`${b.formulaVar}-${i}`}
                                            binding={b}
                                            availableVars={availableVariables}
                                            onChange={(updated) => updateInputBinding(i, updated)}
                                            direction="input"
                                        />
                                    ))}

                                    {localConfig.outputBinding && (
                                        <>
                                            <p className="pt-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                                Output
                                            </p>
                                            <BindingRow
                                                binding={localConfig.outputBinding}
                                                availableVars={availableVariables}
                                                onChange={(b) => update({ outputBinding: b })}
                                                direction="output"
                                            />
                                        </>
                                    )}
                                </div>

                                {localConfig.inputBindings.some((b) => !b.contextKey) && (
                                    <div className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50/50 px-2.5 py-2 text-xs text-amber-700">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        Some inputs are unbound. Map all variables before running.
                                    </div>
                                )}
                            </Section>
                        )}
                    </div>
                )}

                {/* Inline mode */}
                {localConfig.mode === "inline" && (
                    <Section title="Expression" icon={FunctionSquare}>
                        <InlineExpressionEditor
                            value={localConfig.inlineExpression ?? ""}
                            displayValue={localConfig.inlineDisplayExpression ?? ""}
                            onChange={(v) => update({ inlineExpression: v })}
                            onDisplayChange={(v) => update({ inlineDisplayExpression: v })}
                            availableVars={availableVariables}
                        />

                        <div className="mt-3 space-y-1.5">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                                Output Variable
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-[10px] text-muted-foreground">Notation</Label>
                                    <Input
                                        value={localConfig.outputBinding?.nodeVar ?? ""}
                                        onChange={(e) =>
                                            update({
                                                outputBinding: {
                                                    ...(localConfig.outputBinding ?? { formulaVar: "", displayLabel: "" }),
                                                    nodeVar: e.target.value,
                                                    formulaVar: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="Q"
                                        className="mt-1 h-7 font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px] text-muted-foreground">Label</Label>
                                    <Input
                                        value={localConfig.outputBinding?.displayLabel ?? ""}
                                        onChange={(e) =>
                                            update({
                                                outputBinding: {
                                                    ...(localConfig.outputBinding ?? { nodeVar: "", formulaVar: "" }),
                                                    displayLabel: e.target.value,
                                                },
                                            })
                                        }
                                        placeholder="Peak Discharge"
                                        className="mt-1 h-7 text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </Section>
                )}

                {/* Description */}
                <Separator />
                <div>
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Description (optional)
                    </Label>
                    <Input
                        value={localConfig.description ?? ""}
                        onChange={(e) => update({ description: e.target.value })}
                        placeholder="Add context about when/why this formula is used…"
                        className="mt-1 h-8 text-sm"
                    />
                </div>

                {/* Info box for registry mode */}
                {localConfig.mode === "registry" && (
                    <div className="flex items-start gap-2 rounded-md border border-blue-200/60 bg-blue-50/40 p-3 text-xs text-blue-700">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <p>
                            Registry formulas are versioned. Use{" "}
                            <strong>version pinning</strong> to protect this workflow from
                            future formula changes.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}