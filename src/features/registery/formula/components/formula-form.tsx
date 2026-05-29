"use client";

/**
 * FormulaFormWithEditor
 *
 * FormulaForm (react-hook-form + zod) with a live MathEditor
 * embedded at the top. Clicking "Auto-fill from editor" pushes
 * inputVariables, expressionNotation, and outputVariable into
 * the form state.
 *
 * Drop-in replacement for your existing <FormulaForm>.
 *
 * Deps:
 *   npm install codemirror @codemirror/view @codemirror/state \
 *     @codemirror/language @codemirror/commands @codemirror/autocomplete \
 *     @codemirror/lint mathjs \
 *     react-hook-form @hookform/resolvers zod
 */
import { useCallback, useMemo, useRef, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  AlertCircle,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  FunctionSquare,
  GripVertical,
  Info,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Tag,
  Trash2,
  Variable,
  Wand2,
  X,
} from "lucide-react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { type EditorParsed, MathEditor, type MathEditorRef } from "@/components/core/MathEditor";
import { Badge } from "@/components/ui/badge";
// ── Shadcn/ui — swap for your own if needed ───────────────────────────────────
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";

// ─── Schema ───────────────────────────────────────────────────────────────────

const variableSchema = z.object({
  notation: z.string().min(1, "Notation required"),
  displayLabel: z.string().min(1, "Label required"),
  unit: z.string().optional(),
  description: z.string().optional(),
  dataType: z.enum(["NUMBER", "STRING", "BOOLEAN", "ARRAY", "OBJECT"]),
  value: z.any().optional(),
});

const formulaSchema = z.object({
  name: z.string().min(2, "At least 2 characters"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase, numbers, hyphens only"),
  category: z.string().min(1, "Category required"),
  subCategory: z.string().optional(),
  description: z.string().optional(),
  expressionNotation: z.string().min(1, "Expression required"),
  displayExpression: z.string().optional(),
  inputVariables: z
    .array(variableSchema)
    .min(1, "At least one input variable required"),
  outputVariable: variableSchema,
  reference: z.string().optional(),
  sourceStandard: z.string().optional(),
  yearIntroduced: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2099)
    .optional()
    .nullable(),
  region: z.string().optional(),
  applicability: z.string().optional(),
  limitations: z.string().optional(),
  tags: z.array(z.string()),
  visibility: z.enum(["PRIVATE", "PUBLIC"]),
  isSystem: z.boolean().optional(),
  isPublished: z.boolean().optional(),
  intermediateSteps: z.array(z.any()).optional(),
});

export type FormulaFormValues = z.infer<typeof formulaSchema>;

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

// ─── Section accordion ────────────────────────────────────────────────────────

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
        className="flex w-full items-center gap-2 rounded-t-lg bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
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

// ─── Variable row ─────────────────────────────────────────────────────────────

type RHFRegister = ReturnType<typeof useForm>["register"];

function VariableRow({
  prefix,
  onRemove,
  register,
  errors,
}: {
  prefix: string;
  onRemove?: () => void;
  register: RHFRegister;
  errors: Record<string, unknown>;
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
            {(errors?.notation as { message?: string })?.message && (
              <p className="mt-0.5 text-[10px] text-destructive">
                {(errors.notation as { message: string }).message}
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
              placeholder="m³/s"
              className="mt-1 h-7 text-xs"
            />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Description
            </Label>
            <Input
              {...register(`${prefix}.description`)}
              placeholder="Optional"
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

// ─── Main component ───────────────────────────────────────────────────────────

interface FormulaFormWithEditorProps {
  initialValues?: Partial<FormulaFormValues>;
  isEditing?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
  saveState?: "idle" | "saving" | "saved" | "error";
  showEditor?: boolean;
  onSubmit: (values: FormulaFormValues) => void;
  onDelete?: () => void;
}

export function FormulaForm({
  initialValues,
  isEditing = false,
  isSaving = false,
  isDeleting = false,
  saveState = "idle",
  showEditor = true,
  onSubmit,
  onDelete,
}: FormulaFormWithEditorProps) {
  const [tagInput, setTagInput] = useState("");
  const [editorOpen, setEditorOpen] = useState(showEditor);
  const [autoFillFlash, setAutoFillFlash] = useState(false);
  const lastParsedRef = useRef<EditorParsed | null>(null);
  const editorRef = useRef<MathEditorRef>(null);

  const { data: session } = authClient.useSession();
  const isSuperAdminUser = (session?.user as any)?.globalRole === "SUPER_ADMIN";

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FormulaFormValues>({
    resolver: zodResolver(formulaSchema),
    defaultValues: {
      visibility: "PRIVATE",
      inputVariables: [
        {
          notation: "",
          displayLabel: "",
          unit: "",
          description: "",
          dataType: "NUMBER",
        },
      ],
      outputVariable: {
        notation: "",
        displayLabel: "",
        unit: "",
        description: "",
        dataType: "NUMBER",
      },
      tags: [],
      isSystem: false,
      isPublished: false,
      ...initialValues,
    },
  });

  const {
    fields: inputFields,
    append,
    remove,
    replace,
  } = useFieldArray({
    control,
    name: "inputVariables",
  });

  const tags = watch("tags") || [];
  const expressionNotation = watch("expressionNotation") || "";

  // ── Reconstruct editor code from initialValues ────────────────────────────
  const editorInitialValue = useMemo(() => {
    if (!initialValues?.expressionNotation) return undefined;

    let code = "";
    initialValues.inputVariables?.forEach((v: any) => {
      const meta = [];
      if (v.displayLabel) meta.push(`name: ${v.displayLabel}`);
      if (v.unit) meta.push(`unit: ${v.unit}`);
      if (v.description) meta.push(`desc: ${v.description}`);

      if (meta.length > 0) {
        code += `// ${meta.join(", ")}\n`;
      }
      // Use saved value if available, else default to 0
      code += `${v.notation} = ${v.value ?? 0}\n\n`;
    });

    code += initialValues.expressionNotation;
    return code;
  }, [initialValues]);

  // ── Save parsed data from editor ──────────────────────────────────────────
  const handleParsed = useCallback((data: EditorParsed) => {
    lastParsedRef.current = data;
  }, []);

  // ── Push editor data → form ────────────────────────────────────────────────
  const applyEditorData = () => {
    const data = lastParsedRef.current;
    if (!data || !data.formulas.length) return;

    // Input variables (all non-formula variables)
    if (data.inputVariables.length > 0) {
      replace(
        data.inputVariables.map((v) => ({
          notation: v.notation,
          displayLabel: v.displayLabel,
          unit: v.unit ?? "",
          description: v.description ?? "",
          dataType: v.dataType,
          value: v.value,
        })),
      );
    }

    // Main formula = first formula
    const main = data.formulas[0];
    setValue("expressionNotation", main.fullExpression);

    // Output variable = last formula output
    if (data.outputVariable) {
      setValue("outputVariable", {
        notation: data.outputVariable.notation,
        displayLabel: data.outputVariable.displayLabel,
        unit: data.outputVariable.unit ?? "",
        description: data.outputVariable.description ?? "",
        dataType: "NUMBER",
        value: data.outputVariable.value,
      });
    }

    setAutoFillFlash(true);
    setTimeout(() => setAutoFillFlash(false), 2000);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setValue("tags", [...tags, t]);
    setTagInput("");
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <FunctionSquare className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">
            {isEditing ? "Edit Formula" : "New Formula"}
          </h2>
          {isDirty && (
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[10px] text-amber-600 border-amber-300"
            >
              Unsaved changes
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing && onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isSaving || isDeleting}
              onClick={() => {
                if (window.confirm("Delete this formula?")) onDelete();
              }}
            >
              {isDeleting ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Delete
            </Button>
          )}
          <Button type="submit" size="sm" disabled={isSaving || isDeleting}>
            {saveState === "saving" ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 p-6">
        {/* ── Expression Editor Panel ── */}
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setEditorOpen((p) => !p)}
            className="flex w-full items-center gap-2 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50"
          >
            <FunctionSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Expression Editor</span>
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Define variables &amp; formulas — then auto-fill the form ↓
            </span>
            {editorOpen ? (
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {editorOpen && (
            <div className="space-y-3 p-4">
              <MathEditor
                ref={editorRef}
                onParsed={handleParsed}
                defaultValue={editorInitialValue}
              />

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={applyEditorData}
                  className="gap-1.5"
                >
                  {autoFillFlash ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      Applied!
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5" />
                      Auto-fill form from editor
                    </>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Fills input variables, expression &amp; output variable
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Basic Information ── */}
        <Section title="Basic Information" icon={Info}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                {...register("name")}
                placeholder="Dicken's Formula"
                className="mt-1 h-8 text-sm"
              />
              {errors.name && (
                <p className="mt-1 text-[11px] text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Slug *</Label>
              <Input
                {...register("slug")}
                placeholder="dickens-formula"
                className="mt-1 h-8 font-mono text-sm"
              />
              {errors.slug && (
                <p className="mt-1 text-[11px] text-destructive">
                  {errors.slug.message}
                </p>
              )}
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
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-xs">Sub-category</Label>
              <Input
                {...register("subCategory")}
                placeholder="Empirical, Indian"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                {...register("description")}
                placeholder="Describe when and how to apply…"
                className="mt-1 min-h-[72px] resize-none text-sm"
              />
            </div>
          </div>
        </Section>

        {/* ── Expression ── */}
        <Section title="Expression" icon={FunctionSquare}>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Expression (mathjs notation) *</Label>
              <Input
                {...register("expressionNotation")}
                placeholder="Q = C * A^(3/4)"
                className="mt-1 h-9 font-mono text-sm"
              />
              {errors.expressionNotation && (
                <p className="mt-1 text-[11px] text-destructive">
                  {errors.expressionNotation.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Display Expression</Label>
              <Input
                {...register("displayExpression")}
                placeholder="Q = C × A³/⁴"
                className="mt-1 h-9 text-sm"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Human-readable version with proper symbols. Shown on cards and
                PDFs.
              </p>
            </div>
            {expressionNotation && (
              <div className="rounded-md border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                <p className="mb-1 text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                  Preview
                </p>
                <code className="font-mono text-sm text-emerald-800 dark:text-emerald-300">
                  {expressionNotation}
                </code>
              </div>
            )}
          </div>
        </Section>

        {/* ── Variables ── */}
        <Section title="Variables & Steps" icon={Variable}>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Input Variables *
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    append({
                      notation: "",
                      displayLabel: "",
                      unit: "",
                      description: "",
                      dataType: "NUMBER",
                    })
                  }
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add input
                </Button>
              </div>
              <div className="space-y-2">
                {inputFields.map((field, index) => (
                  <VariableRow
                    key={field.id}
                    prefix={`inputVariables.${index}`}
                    onRemove={
                      inputFields.length > 1 ? () => remove(index) : undefined
                    }
                    register={register}
                    errors={
                      (errors.inputVariables?.[index] ?? {}) as Record<
                        string,
                        unknown
                      >
                    }
                  />
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Intermediate Steps
              </p>
              <p className="mb-3 text-[11px] text-muted-foreground">
                Optional steps defined during calculation for clarity.
              </p>
              {/* For now, just a placeholder or similar row editor if needed. 
                                Since schema says array of any, we can add a simple step editor later. */}
              <div className="rounded-md border border-dashed border-border/60 p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  No intermediate steps defined.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Output Variable *
              </p>
              <VariableRow
                prefix="outputVariable"
                register={register}
                errors={
                  (errors.outputVariable ?? {}) as Record<string, unknown>
                }
              />
            </div>
          </div>
        </Section>

        {/* ── Source & Reference ── */}
        <Section title="Source & Reference" icon={BookOpen} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Source Standard</Label>
              <Controller
                name="sourceStandard"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="Select standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARDS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-xs">Reference</Label>
              <Input
                {...register("reference")}
                placeholder="Art. 6.2, Table 3"
                className="mt-1 h-8 text-sm"
              />
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
              <Input
                {...register("region")}
                placeholder="India"
                className="mt-1 h-8 text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Applicability</Label>
              <Textarea
                {...register("applicability")}
                placeholder="Applicable for catchment areas up to 250 km²…"
                className="mt-1 min-h-[60px] resize-none text-sm"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Limitations</Label>
              <Textarea
                {...register("limitations")}
                placeholder="Not valid for coastal areas…"
                className="mt-1 min-h-[60px] resize-none text-sm"
              />
            </div>
          </div>
        </Section>

        {/* ── Tags & Visibility ── */}
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                >
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
                      onClick={() =>
                        setValue(
                          "tags",
                          tags.filter((x) => x !== t),
                        )
                      }
                    >
                      {t} <X className="ml-1 h-2.5 w-2.5" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">Public visibility</p>
                <p className="text-xs text-muted-foreground">
                  Allow other organisations to view this formula
                </p>
              </div>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value === "PUBLIC"}
                    onCheckedChange={(v) =>
                      field.onChange(v ? "PUBLIC" : "PRIVATE")
                    }
                  />
                )}
              />
            </div>
          </div>
        </Section>
      </div>
      {/* ── Admin & System ── */}
      {isSuperAdminUser && (
        <div className="mt-8 border-t border-border/60 bg-muted/10 p-6">
          <div className="mb-6 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold uppercase tracking-wider">
              Admin &amp; System Settings
            </h3>
            <Badge
              variant="outline"
              className="ml-2 bg-primary/5 text-[10px] text-primary"
            >
              SuperAdmin Only
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border border-border/60 bg-background p-3">
                <div>
                  <p className="text-sm font-medium">System Formula</p>
                  <p className="text-xs text-muted-foreground">
                    Mark as an official system-wide standard
                  </p>
                </div>
                <Controller
                  name="isSystem"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-md border border-border/60 bg-background p-3">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">
                    Make available for general use in workflows
                  </p>
                </div>
                <Controller
                  name="isPublished"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-md border border-border/60 bg-background p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Metadata
              </p>
              <div className="grid grid-cols-2 gap-y-2 text-[11px]">
                <span className="text-muted-foreground">ID:</span>
                <code className="truncate font-mono">
                  {(initialValues as any)?.id || "—"}
                </code>

                <span className="text-muted-foreground">Created By:</span>
                <span>{(initialValues as any)?.createdBy || "—"}</span>

                <span className="text-muted-foreground">Created At:</span>
                <span>
                  {(initialValues as any)?.createdAt
                    ? new Date(
                        (initialValues as any).createdAt,
                      ).toLocaleString()
                    : "—"}
                </span>

                <span className="text-muted-foreground">Updated At:</span>
                <span>
                  {(initialValues as any)?.updatedAt
                    ? new Date(
                        (initialValues as any).updatedAt,
                      ).toLocaleString()
                    : "—"}
                </span>

                <span className="text-muted-foreground">Version:</span>
                <span>{(initialValues as any)?.currentVersion || "1"}</span>

                <span className="text-muted-foreground">Deleted At:</span>
                <span className="text-destructive">
                  {(initialValues as any)?.deletedAt
                    ? new Date(
                        (initialValues as any).deletedAt,
                      ).toLocaleString()
                    : "—"}
                </span>

                <span className="text-muted-foreground">Organization ID:</span>
                <span className="truncate font-mono">
                  {(initialValues as any)?.organizationId || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {saveState === "error" && (
        <div className="flex items-center gap-2 border-t border-destructive/20 bg-destructive/5 px-6 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Failed to save. Please try again.
        </div>
      )}
    </form>
  );
}
