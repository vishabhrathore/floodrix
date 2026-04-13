"use client";

import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import {
    Play,
    Upload,
    Undo2,
    Redo2,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Save,
    ChevronDown,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    MoreHorizontal,
    Settings,
    Copy,
    Trash2,
    Eye,
    EyeOff,
    Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useWorkflowCanvasStore } from "../store/workflow-canvas-store";

type SaveState = "saved" | "saving" | "unsaved" | "error";

interface WorkflowToolbarProps {
    workflowId: string;
    workflowName: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DEPRECATED";
    saveState: SaveState;
    onRun: () => void;
    onPublish: () => void;
    onSave: () => void;
    onRename: (name: string) => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onSettings: () => void;
    isRunning?: boolean;
    canUndo?: boolean;
    canRedo?: boolean;
}

const STATUS_CONFIG = {
    DRAFT: { label: "Draft", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
    PUBLISHED: { label: "Published", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
    ARCHIVED: { label: "Archived", color: "bg-slate-500/15 text-slate-500 border-slate-500/30" },
    DEPRECATED: { label: "Deprecated", color: "bg-rose-500/15 text-rose-500 border-rose-500/30" },
};

const SAVE_STATE_CONFIG: Record<SaveState, { icon: React.ReactNode; label: string; color: string }> = {
    saved: {
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: "Saved",
        color: "text-emerald-600",
    },
    saving: {
        icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
        label: "Saving…",
        color: "text-slate-500",
    },
    unsaved: {
        icon: <Clock className="h-3.5 w-3.5" />,
        label: "Unsaved",
        color: "text-amber-600",
    },
    error: {
        icon: <AlertCircle className="h-3.5 w-3.5" />,
        label: "Save failed",
        color: "text-rose-600",
    },
};

export function WorkflowToolbar({
    workflowId,
    workflowName,
    status,
    saveState,
    onRun,
    onPublish,
    onSave,
    onRename,
    onDuplicate,
    onDelete,
    onSettings,
    isRunning = false,
    canUndo = false,
    canRedo = false,
}: WorkflowToolbarProps) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(workflowName);
    const { undo, redo } = useWorkflowCanvasStore();
    const { zoomIn, zoomOut, fitView } = useReactFlow();

    const statusConfig = STATUS_CONFIG[status];
    const saveConfig = SAVE_STATE_CONFIG[saveState];

    function handleNameSubmit() {
        const trimmed = nameValue.trim();
        if (trimmed && trimmed !== workflowName) {
            onRename(trimmed);
        } else {
            setNameValue(workflowName);
        }
        setIsEditingName(false);
    }

    function handleNameKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter") handleNameSubmit();
        if (e.key === "Escape") {
            setNameValue(workflowName);
            setIsEditingName(false);
        }
    }

    return (
        <TooltipProvider delayDuration={400}>
            <div className="flex h-12 items-center gap-1 border-b border-slate-200 bg-white px-3">
                {/* Workflow Name + Status */}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    {isEditingName ? (
                        <Input
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onBlur={handleNameSubmit}
                            onKeyDown={handleNameKeyDown}
                            className="h-7 w-48 text-sm font-medium"
                            autoFocus
                        />
                    ) : (
                        <button
                            className="max-w-[220px] truncate text-sm font-semibold text-slate-800 hover:text-slate-600 transition-colors"
                            onClick={() => setIsEditingName(true)}
                            title="Click to rename"
                        >
                            {workflowName}
                        </button>
                    )}

                    <Badge
                        variant="outline"
                        className={cn("h-5 px-1.5 text-[10px] font-medium uppercase tracking-wide", statusConfig.color)}
                    >
                        {statusConfig.label}
                    </Badge>

                    {/* Save state indicator */}
                    <span className={cn("flex items-center gap-1 text-xs", saveConfig.color)}>
                        {saveConfig.icon}
                        <span>{saveConfig.label}</span>
                    </span>
                </div>

                {/* Center: Undo / Redo */}
                <div className="flex items-center gap-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!canUndo}
                                onClick={undo}
                            >
                                <Undo2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Undo (Ctrl+Z)</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={!canRedo}
                                onClick={redo}
                            >
                                <Redo2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Redo (Ctrl+Shift+Z)</TooltipContent>
                    </Tooltip>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Zoom controls */}
                <div className="flex items-center gap-0.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Zoom out</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Zoom in</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fitView({ padding: 0.15 })}>
                                <Maximize2 className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Fit to view</TooltipContent>
                    </Tooltip>
                </div>

                <Separator orientation="vertical" className="mx-1 h-6" />

                {/* Right: Save, Publish, Run */}
                <div className="flex items-center gap-1.5">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5"
                                onClick={onSave}
                                disabled={saveState === "saving"}
                            >
                                {saveState === "saving" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Save className="h-3.5 w-3.5" />
                                )}
                                Save
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Save canvas (Ctrl+S)</TooltipContent>
                    </Tooltip>

                    {/* Publish split button */}
                    <div className="flex items-center">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 rounded-r-none border-r-0"
                            onClick={onPublish}
                            disabled={status === "PUBLISHED"}
                        >
                            <Upload className="h-3.5 w-3.5" />
                            Publish
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-6 rounded-l-none px-0"
                                >
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onClick={onPublish} disabled={status === "PUBLISHED"}>
                                    <Upload className="mr-2 h-3.5 w-3.5" />
                                    Publish version
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Eye className="mr-2 h-3.5 w-3.5" />
                                    Preview
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Share2 className="mr-2 h-3.5 w-3.5" />
                                    Share link
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Run button */}
                    <Button
                        size="sm"
                        className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={onRun}
                        disabled={isRunning}
                    >
                        {isRunning ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                        )}
                        {isRunning ? "Running…" : "Run"}
                    </Button>

                    {/* More menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={onSettings}>
                                <Settings className="mr-2 h-3.5 w-3.5" />
                                Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={onDuplicate}>
                                <Copy className="mr-2 h-3.5 w-3.5" />
                                Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={onDelete}
                            >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete workflow
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </TooltipProvider>
    );
}