// src/features/workflow-canvas/config/config-drawer.tsx

"use client";

import { useCallback, useEffect, useState } from "react";

import { Loader2, Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { NODE_ACCENTS, type NodeTypeKey } from "@/theme/calc-theme";

interface ConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeType: NodeTypeKey;
  nodeLabel: string;
  /** Called when user clicks Save — receives the full updated config */
  onSave: (config: Record<string, unknown>) => void;
  isSaving?: boolean;
  children: React.ReactNode;
}

export function ConfigDrawer({
  open,
  onOpenChange,
  nodeType,
  nodeLabel,
  onSave,
  isSaving = false,
  children,
}: ConfigDrawerProps) {
  const accent = NODE_ACCENTS[nodeType];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-[480px] max-w-full flex-col gap-0 p-0 sm:max-w-[480px]"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: accent?.bg, color: accent?.accent }}
            >
              <span className="text-sm font-bold">⚙</span>
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-sm font-bold text-slate-800">
                {nodeLabel}
              </SheetTitle>
              <SheetDescription className="text-[11px] font-mono text-slate-400">
                {nodeType} configuration
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 px-5 py-3">
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                // The individual config components manage their own state
                // and call onSave with the full config object
              }}
              disabled={isSaving}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Section helpers for config panels ────────────────────────────────────

export function ConfigSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {description && (
        <p className="mb-3 text-[11px] text-slate-400">{description}</p>
      )}
      {children}
    </div>
  );
}

export function ConfigField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3", className)}>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
      </label>
      {hint && <p className="mb-1.5 text-[10px] text-slate-400">{hint}</p>}
      {children}
    </div>
  );
}
