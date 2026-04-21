// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/workflow-toolbar.tsx
//
//  CHUNK 3: adds a step-mode toggle + run button that opens the runner panel.
//  The rest of the toolbar (save/undo/redo/zoom) is unchanged.
//
//  NOTE: if your existing toolbar already has state management, merge the
//  stepMode toggle + runner open button into it. This file assumes a
//  relatively simple toolbar; adjust imports to match your store/hooks.
// ═══════════════════════════════════════════════════════════════════════════
// todo -- need to fix previous commit
"use client";

import { useState } from "react";
import { Play, StepForward, Save, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useWorkflowCanvasStore } from "@/features/workflow-canvas/store/workflow-canvas-store";

interface WorkflowToolbarProps {
    workflowId: string;
    onOpenRunner: (opts: { stepMode: boolean }) => void;
    onSave?: () => void;
    canSave?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
}

export function WorkflowToolbar({
    workflowId,
    onOpenRunner,
    onSave,
    canSave = false,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
}: WorkflowToolbarProps) {
    const [stepMode, setStepMode] = useState(false);

    return (
        <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
            {/* ── Save / Undo / Redo ──────────────────────────────── */}
            {onSave && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onSave}
                            disabled={!canSave}
                            className="gap-1.5"
                        >
                            <Save className="h-4 w-4" />
                            <span className="text-sm">Save</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Save workflow (⌘S)</TooltipContent>
                </Tooltip>
            )}

            {onUndo && (
                <Button size="sm" variant="ghost" onClick={onUndo} disabled={!canUndo}>
                    <Undo2 className="h-4 w-4" />
                </Button>
            )}
            {onRedo && (
                <Button size="sm" variant="ghost" onClick={onRedo} disabled={!canRedo}>
                    <Redo2 className="h-4 w-4" />
                </Button>
            )}

            <Separator orientation="vertical" className="mx-1 h-5" />

            {/* ── Step-mode toggle ──────────────────────────────── */}
            <div className="flex items-center gap-2 rounded-md border border-neutral-200 px-3 py-1">
                <Switch
                    id="step-mode"
                    checked={stepMode}
                    onCheckedChange={setStepMode}
                    className="scale-90"
                />
                <Label
                    htmlFor="step-mode"
                    className="text-xs font-medium text-neutral-700 cursor-pointer"
                >
                    Step mode
                </Label>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span className="text-[11px] text-neutral-400 cursor-help">ⓘ</span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                        <p className="text-xs">
                            Pauses after every node so you can inspect outputs before advancing.
                            Useful for debugging calculations.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* ── Run button ───────────────────────────────────── */}
            <Button
                size="sm"
                onClick={() => onOpenRunner({ stepMode })}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white ml-auto"
            >
                {stepMode ? (
                    <>
                        <StepForward className="h-4 w-4" />
                        Step through
                    </>
                ) : (
                    <>
                        <Play className="h-4 w-4" />
                        Run
                    </>
                )}
            </Button>
        </div>
    );
}