"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useFormula, useCreateFormula, useUpdateFormula } from "../hooks/use-formulas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    AlertCircle,
    Plus,
    Trash2,
    Save,
    SendHorizonal,
    ChevronDown,
    ChevronRight,
    FunctionSquare,
    Variable,
    Info,
    Check,
    X,
    Tag,
    BookOpen,
    Globe,
    AlertTriangle,
    Loader2,
    GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Zod schema ────────────────────────────────────────────────────────────
const variableSchema = z.object({
    notation: z.string().min(1, "Notation required"),
    displayLabel: z.string().min(1, "Label required"),
    unit: z.string().optional(),
    description: z.string().optional(),
    dataType: z.enum(["NUMBER", "STRING", "BOOLEAN", "ARRAY", "OBJECT"]),
});

const formulaSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, hyphens only"),
    category: z.string().min(1, "Category required"),
    subCategory: z.string().optional(),
    description: z.string().optional(),
    expressionNotation: z.string().min(1, "Expression required"),
    displayExpression: z.string().optional(),
    inputVariables: z.array(variableSchema).min(1, "At least one input variable required"),
    outputVariable: variableSchema,
    reference: z.string().optional(),
    sourceStandard: z.string().optional(),
    yearIntroduced: z.coerce.number().int().min(1900).max(2099).optional().nullable(),
    region: z.string().optional(),
    applicability: z.string().optional(),
    limitations: z.string().optional(),
    tags: z.array(z.string()),
    visibility: z.enum(["PRIVATE", "PUBLIC"]),
});

type FormulaFormValues = z.infer<typeof formulaSchema>;

// ── Validation preview ────────────────────────────────────────────────────
interface ValidationResult {
    valid: boolean;
    error?: string;
    variables?: string[];
}

function ExpressionValidator({
    expression,
    inputVarNotations,
}: {
    expression: string;
    inputVarNotations: string[];
}) {
    const [result, setResult] = useState<ValidationResult | null>(null);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        if (!expression) {
            setResult(null);
            return;
        }
        setChecking(true);
        const timer = setTimeout(() => {
            // Client-side quick check — full validation happens server-side
            try {
                const dangerous = /\b(import|eval|require|process|global)\b/.test(expression);
                if (dangerous) {
                    setResult({ valid: false, error: "Contains disallowed functions" });
                } else {
                    const foundVars = inputVarNotations.filter((v) =>
                        new RegExp(`\\b${v}\\b`).test(expression)
                    );
                    setResult({ valid: true, variables: foundVars });
                }
            } catch {
                setResult({ valid: false, error: "Invalid expression syntax" });
            } finally {
                setChecking(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [expression, inputVarNotations]);

    if (!expression) return null;
    if (checking) {
        return (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking…
            </span>
        );
    }
    if (!result) return null;

    return result.valid ? (
        <span className="flex items-center gap-1 text-xs text-emerald-600">
            <Check className="h-3 w-3" />
            Valid · uses: {result.variables?.join(", ") || "no variables"}
        </span>
    ) : (
        <span className="flex items-center gap-1 text-xs text-destructive">
            <X className="h-3 w-3" />
            {result.error}
        </span>
    );
}

// ── Expression preview ────────────────────────────────────────────────────
function ExpressionPreview({ expr }: { expr: string }) {
    if (!expr) return null;
    return (
        <div className="rounded-md border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Preview
            </p>
            <code className="font-mono text-sm text-emerald-800 dark:text-emerald-300">{expr}</code>
        </div>
    );
}

// ── Section wrapper ───────────────────────────────────────────────────────
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
        <div className="rounded-lg border border-border/60">
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="flex w-full items-center gap-2 rounded-t-lg bg-muted/30 px-4 py-3 text-left hover:bg-muted/50"
            >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{title}</span>
                {open ? (
                    <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                ) : (
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                )}
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
}

// ── Variable row ──────────────────────────────────────────────────────────
function VariableRow({
    index,
    prefix,
    onRemove,
    register,
    errors,
}: {
    index: number;
    prefix: string;
    onRemove?: () => void;
    register: any;
    errors: any;
}) {
    return (
        <div className="group flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 p-3">
            <GripVertical className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/40" />
            <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Notation *
                        </Label>
                        <Input
                            {...register(`${prefix}.notation`)}
                            placeholder="Q"
                            className="mt-1 h-7 font-mono text-xs"
                        />
                        {errors?.notation && (
                            <p className="mt-0.5 text-[10px] text-destructive">
                                {errors.notation.message}
                            </p>
                        )}
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Label *
                        </Label>
                        <Input
                            {...register(`${prefix}.displayLabel`)}
                            placeholder="Peak Discharge"
                            className="mt-1 h-7 text-xs"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Unit
                        </Label>
                        <Input
                            {...register(`${prefix}.unit`)}
                            placeholder="Cumecs"
                            className="mt-1 h-7 text-xs"
                        />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            Description
                        </Label>
                        <Input
                            {...register(`${prefix}.description`)}
                            placeholder="Optional description"
                            className="mt-1 h-7 text-xs"
                        />
                    </div>
                </div>
            </div>
            {onRemove && (
                <button
                    type="button"
                    onClick={onRemove}
                    className="mt-1 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────
interface FormulaEditorProps {
    formulaId?: string;
    onSaved?: (id: string) => void;
}

const CATEGORIES = [
    "Flood Discharge",
    "Scour Depth",
    "Waterway Width",
    "Rainfall",
    "Velocity",
    "Afflux",
    "Sediment",
    "General",
];

const STANDARDS = [
    "IRC:SP:13-2004",
    "IRC:78-2014",
    "IRC:5-2015",
    "IS:11532-1985",
    "RDSO Guidelines",
    "Custom",
];

export default function FormulaEditor({ formulaId, onSaved }: FormulaEditorProps) {
    const [tagInput, setTagInput] = useState("");
    const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

    const { data: existing } = useFormula(formulaId);

    const createMutation = useCreateFormula();
    const updateMutation = useUpdateFormula();

    const {
        register,
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isDirty },
        reset,
    } = useForm({
        resolver: zodResolver(formulaSchema),
        defaultValues: {
            visibility: "PRIVATE",
            inputVariables: [
                { notation: "", displayLabel: "", unit: "", description: "", dataType: "NUMBER" },
            ],
            outputVariable: { notation: "", displayLabel: "", unit: "", description: "", dataType: "NUMBER" },
            tags: [],
        },
    });

    const { fields: inputFields, append, remove } = useFieldArray({
        control,
        name: "inputVariables",
    });

    const tags = watch("tags");
    const expressionNotation = watch("expressionNotation");
    const displayExpression = watch("displayExpression");
    const inputVarNotations = watch("inputVariables").map((v) => v.notation).filter(Boolean);

    // Populate form when editing existing
    useEffect(() => {
        if (existing) {
            reset({
                name: existing.name,
                slug: existing.slug,
                category: existing.category,
                subCategory: existing.subCategory ?? undefined,
                description: existing.description ?? undefined,
                expressionNotation: existing.expressionNotation,
                displayExpression: existing.displayExpression,
                inputVariables: (existing.inputVariables as any[]) ?? [],
                outputVariable: (existing.outputVariable as any) ?? { notation: "", displayLabel: "" },
                reference: existing.reference ?? undefined,
                sourceStandard: existing.sourceStandard ?? undefined,
                yearIntroduced: existing.yearIntroduced ?? undefined,
                region: existing.region ?? undefined,
                applicability: existing.applicability ?? undefined,
                limitations: existing.limitations ?? undefined,
                tags: (existing.tags as string[]) ?? [],
                visibility: existing.visibility as any,
            });
        }
    }, [existing, reset]);

    // Auto-generate slug from name
    const name = watch("name");
    useEffect(() => {
        if (!formulaId && name) {
            setValue(
                "slug",
                name
                    .toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .slice(0, 50)
            );
        }
    }, [name, formulaId, setValue]);

    const onSubmit = async (values: FormulaFormValues) => {
        setSaveState("saving");
        try {
            let id: string;
            if (formulaId) {
                await updateMutation.mutateAsync({ id: formulaId, ...values });
                id = formulaId;
            } else {
                const result = await createMutation.mutateAsync(values);
                id = result.id;
            }
            setSaveState("saved");
            setTimeout(() => setSaveState("idle"), 2000);
            onSaved?.(id);
        } catch {
            setSaveState("error");
            setTimeout(() => setSaveState("idle"), 3000);
        }
    };

    const addTag = () => {
        const t = tagInput.trim().toLowerCase();
        if (t && !tags.includes(t)) {
            setValue("tags", [...tags, t]);
        }
        setTagInput("");
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 bg-background/95 px-6 py-4 backdrop-blur">
                <div className="flex items-center gap-2">
                    <FunctionSquare className="h-5 w-5 text-primary" />
                    <h2 className="text-base font-semibold">
                        {formulaId ? "Edit Formula" : "New Formula"}
                    </h2>
                    {isDirty && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-amber-600 border-amber-300">
                            Unsaved changes
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button type="submit" size="sm" disabled={saveState === "saving"}>
                        {saveState === "saving" ? (
                            <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Saving…</>
                        ) : saveState === "saved" ? (
                            <><Check className="mr-1.5 h-3.5 w-3.5" />Saved</>
                        ) : (
                            <><Save className="mr-1.5 h-3.5 w-3.5" />Save</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Basic info */}
                <Section title="Basic Information" icon={Info}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Name *</Label>
                            <Input {...register("name")} placeholder="Dicken's Formula" className="mt-1 h-8 text-sm" />
                            {errors.name && <p className="mt-1 text-[11px] text-destructive">{errors.name.message}</p>}
                        </div>
                        <div>
                            <Label className="text-xs">Slug *</Label>
                            <Input {...register("slug")} placeholder="dickens-formula" className="mt-1 h-8 font-mono text-sm" />
                            {errors.slug && <p className="mt-1 text-[11px] text-destructive">{errors.slug.message}</p>}
                        </div>
                        <div>
                            <Label className="text-xs">Category *</Label>
                            <Controller
                                name="category"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="mt-1 h-8 text-sm">
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Sub-category</Label>
                            <Input {...register("subCategory")} placeholder="Empirical, Indian" className="mt-1 h-8 text-sm" />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">Description</Label>
                            <Textarea
                                {...register("description")}
                                placeholder="Describe when and how this formula should be applied…"
                                className="mt-1 min-h-[72px] resize-none text-sm"
                            />
                        </div>
                    </div>
                </Section>

                {/* Expression */}
                <Section title="Expression" icon={FunctionSquare}>
                    <div className="space-y-4">
                        <div>
                            <div className="mb-1 flex items-center justify-between">
                                <Label className="text-xs">Expression (mathjs notation) *</Label>
                                <ExpressionValidator
                                    expression={expressionNotation}
                                    inputVarNotations={inputVarNotations}
                                />
                            </div>
                            <Input
                                {...register("expressionNotation")}
                                placeholder="Q = C * M^(3/4)"
                                className="h-9 font-mono text-sm"
                            />
                            {errors.expressionNotation && (
                                <p className="mt-1 text-[11px] text-destructive">{errors.expressionNotation.message}</p>
                            )}
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Uses mathjs syntax. Variables must match input variable notations.
                            </p>
                        </div>

                        <div>
                            <Label className="text-xs">Display Expression</Label>
                            <Input
                                {...register("displayExpression")}
                                placeholder="Q = C × M³/⁴"
                                className="mt-1 h-9 text-sm"
                            />
                            <p className="mt-1 text-[11px] text-muted-foreground">
                                Human-readable version with proper symbols (×, ³/⁴, √). Shown on cards and PDFs.
                            </p>
                        </div>

                        {(displayExpression || expressionNotation) && (
                            <ExpressionPreview expr={displayExpression || expressionNotation} />
                        )}
                    </div>
                </Section>

                {/* Variables */}
                <Section title="Variables" icon={Variable}>
                    <div className="space-y-4">
                        {/* Input variables */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs font-medium">Input Variables *</p>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() =>
                                        append({ notation: "", displayLabel: "", unit: "", description: "", dataType: "NUMBER" })
                                    }
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add variable
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {inputFields.map((field, index) => (
                                    <VariableRow
                                        key={field.id}
                                        index={index}
                                        prefix={`inputVariables.${index}`}
                                        onRemove={inputFields.length > 1 ? () => remove(index) : undefined}
                                        register={register}
                                        errors={errors.inputVariables?.[index]}
                                    />
                                ))}
                            </div>
                            {errors.inputVariables?.root && (
                                <p className="mt-1 text-[11px] text-destructive">{errors.inputVariables.root.message}</p>
                            )}
                        </div>

                        <Separator />

                        {/* Output variable */}
                        <div>
                            <p className="mb-2 text-xs font-medium">Output Variable *</p>
                            <VariableRow
                                index={0}
                                prefix="outputVariable"
                                register={register}
                                errors={errors.outputVariable}
                            />
                        </div>
                    </div>
                </Section>

                {/* Source & reference */}
                <Section title="Source & Reference" icon={BookOpen} defaultOpen={false}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs">Source Standard</Label>
                            <Controller
                                name="sourceStandard"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                                        <SelectTrigger className="mt-1 h-8 text-sm">
                                            <SelectValue placeholder="Select standard" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {STANDARDS.map((s) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Reference (clause/table/fig)</Label>
                            <Input {...register("reference")} placeholder="Art. 6.2, Table 3" className="mt-1 h-8 text-sm" />
                        </div>
                        <div>
                            <Label className="text-xs">Year Introduced</Label>
                            <Input
                                {...register("yearIntroduced")}
                                type="number"
                                placeholder="1965"
                                className="mt-1 h-8 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Region</Label>
                            <Input {...register("region")} placeholder="India" className="mt-1 h-8 text-sm" />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">Applicability</Label>
                            <Textarea
                                {...register("applicability")}
                                placeholder="Applicable for catchment areas up to 250 km², in hilly regions…"
                                className="mt-1 min-h-[60px] resize-none text-sm"
                            />
                        </div>
                        <div className="col-span-2">
                            <Label className="text-xs">Limitations</Label>
                            <Textarea
                                {...register("limitations")}
                                placeholder="Not valid for coastal areas or desert terrain…"
                                className="mt-1 min-h-[60px] resize-none text-sm"
                            />
                        </div>
                    </div>
                </Section>

                {/* Tags & visibility */}
                <Section title="Tags & Visibility" icon={Tag} defaultOpen={false}>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs">Tags</Label>
                            <div className="mt-1 flex gap-2">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTag();
                                        }
                                    }}
                                    placeholder="Add tag and press Enter"
                                    className="h-8 flex-1 text-sm"
                                />
                                <Button type="button" variant="outline" size="sm" onClick={addTag}>
                                    Add
                                </Button>
                            </div>
                            {tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {tags.map((t) => (
                                        <Badge
                                            key={t}
                                            variant="secondary"
                                            className="h-6 cursor-pointer text-xs"
                                            onClick={() => setValue("tags", tags.filter((x) => x !== t))}
                                        >
                                            {t}
                                            <X className="ml-1 h-2.5 w-2.5" />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                            <div>
                                <p className="text-sm font-medium">Public visibility</p>
                                <p className="text-xs text-muted-foreground">
                                    Allow other organizations to view and use this formula
                                </p>
                            </div>
                            <Controller
                                name="visibility"
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value === "PUBLIC"}
                                        onCheckedChange={(v) => field.onChange(v ? "PUBLIC" : "PRIVATE")}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </Section>
            </div>

            {saveState === "error" && (
                <div className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/5 px-6 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Failed to save. Please try again.
                </div>
            )}
        </form>
    );
}