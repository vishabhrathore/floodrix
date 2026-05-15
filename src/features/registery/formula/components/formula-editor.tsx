"use client";

import { useState } from "react";

import { Loader2 } from "lucide-react";

// NOTE: Ensure useDeleteFormula is implemented in your hooks file
import {
  useCreateFormula,
  useDeleteFormula,
  useFormula,
  useUpdateFormula,
} from "../hooks/use-formulas";
import { FormulaForm, FormulaFormValues } from "./formula-form";

interface FormulaEditorProps {
  formulaId?: string;
  onSaved?: (id: string) => void;
  onDeleted?: () => void;
}

export default function FormulaEditor({
  formulaId,
  onSaved,
  onDeleted,
}: FormulaEditorProps) {
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Data Fetching ─────────────────────────────────────────────────────────
  const { data: existing, isLoading } = useFormula(formulaId);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreateFormula();
  const updateMutation = useUpdateFormula();
  const deleteMutation = useDeleteFormula();

  // ── Data Mapping ──────────────────────────────────────────────────────────
  const initialValues: Partial<FormulaFormValues> | undefined = existing
    ? {
        name: existing.name,
        slug: existing.slug,
        category: existing.category,
        subCategory: existing.subCategory ?? undefined,
        description: existing.description ?? undefined,
        expressionNotation: existing.expressionNotation,
        displayExpression: existing.displayExpression,
        inputVariables: (existing.inputVariables as any[]) ?? [],
        outputVariable: (existing.outputVariable as any) ?? {
          notation: "",
          displayLabel: "",
        },
        reference: existing.reference ?? undefined,
        sourceStandard: existing.sourceStandard ?? undefined,
        yearIntroduced: existing.yearIntroduced ?? undefined,
        region: existing.region ?? undefined,
        applicability: existing.applicability ?? undefined,
        limitations: existing.limitations ?? undefined,
        tags: (existing.tags as string[]) ?? [],
        visibility: existing.visibility as any,
      }
    : undefined;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSubmit = async (values: FormulaFormValues) => {
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

      if (onSaved) {
        onSaved(id);
      }
    } catch (error) {
      console.error("Failed to save formula:", error);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const handleDelete = async () => {
    if (!formulaId) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync({ id: formulaId });
      if (onDeleted) {
        onDeleted();
      }
    } catch (error) {
      console.error("Failed to delete formula:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Loading State ─────────────────────────────────────────────────────────
  if (formulaId && isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render Form ───────────────────────────────────────────────────────────
  return (
    <FormulaForm
      initialValues={initialValues}
      isEditing={!!formulaId}
      isSaving={saveState === "saving"}
      isDeleting={isDeleting}
      saveState={saveState}
      onSubmit={handleSubmit}
      onDelete={formulaId ? handleDelete : undefined}
    />
  );
}
