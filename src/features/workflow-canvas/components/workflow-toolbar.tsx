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
    workflowName: string;
    status: string;
    saveState: "saved" | "unsaved" | "saving" | "error";
    onRun: (opts: { stepMode: boolean }) => void;
    onPublish: () => void;
    onSave: () => void;
    onRename?: (name: string) => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onSettings?: () => void;
    isRunning?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
}

export function WorkflowToolbar({
    workflowId,
    workflowName,
    status,
    saveState,
    onRun,
    onPublish,
    onSave,
    isRunning = false,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
}: WorkflowToolbarProps) {
    const [stepMode, setStepMode] = useState(false);

    return (
        <div className="flex h-12 items-center justify-between border-b bg-white px-4 shadow-sm">
            <div className="flex items-center gap-4">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <h1 className="text-sm font-semibold text-slate-900">{workflowName}</h1>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>
                            {status}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${saveState === "saving" ? "animate-pulse bg-blue-500" :
                                saveState === "unsaved" ? "bg-amber-500" :
                                    saveState === "error" ? "bg-red-500" : "bg-emerald-500"
                            }`} />
                        <span className="text-[10px] text-slate-400 capitalize">
                            {saveState === "saving" ? "Saving changes..." :
                                saveState === "unsaved" ? "Unsaved changes" :
                                    saveState === "error" ? "Save failed" : "All changes saved"}
                        </span>
                    </div>
                </div>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSave}>
                                <Save className="h-4 w-4 text-slate-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Save (⌘S)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canUndo} onClick={onUndo}>
                                <Undo2 className="h-4 w-4 text-slate-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Undo</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canRedo} onClick={onRedo}>
                                <Redo2 className="h-4 w-4 text-slate-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Redo</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50/50 px-2 py-1">
                    <Switch
                        id="step-mode"
                        checked={stepMode}
                        onCheckedChange={setStepMode}
                        className="scale-75"
                    />
                    <Label htmlFor="step-mode" className="text-[11px] font-medium text-slate-600">
                        Step Mode
                    </Label>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={onPublish}
                    >
                        Publish
                    </Button>
                    <Button
                        size="sm"
                        className={`h-8 gap-1.5 text-xs font-medium ${isRunning ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                        onClick={() => onRun({ stepMode })}
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <>
                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Running...
                            </>
                        ) : (
                            <>
                                <Play className="h-3.5 w-3.5 fill-current" />
                                Run Workflow
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}