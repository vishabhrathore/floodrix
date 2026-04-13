"use client";

import { useState } from "react";
import {
    X,
    Variable,
    Settings2,
    ChevronRight,
    Info,
    Hash,
    Type,
    ToggleLeft,
    Layers,
    Braces,
    Plus,
    AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CalcNodeType, VariableDataType, VariableScope } from "@/generated/prisma";
import { NODE_ACCENTS } from "@/theme/calc-theme";

interface WorkflowVariable {
    id: string;
    contextKey: string;
    displayLabel: string;
    notation: string;
    dataType: VariableDataType;
    unit?: string | null;
    scope: VariableScope;
    sourceNodeId?: string | null;
    description?: string | null;
}

interface SelectedNode {
    id: string;
    type: CalcNodeType;
    label: string;
    config: Record<string, unknown>;
}

interface WorkflowInspectorProps {
    selectedNode: SelectedNode | null;
    variables: WorkflowVariable[];
    onClose: () => void;
    onOpenNodeConfig: (nodeId: string) => void;
    onAddVariable: () => void;
    onEditVariable: (variableId: string) => void;
    onDeleteVariable: (variableId: string) => void;
    /** Slot for the per-node config panel injected from outside */
    configPanel?: React.ReactNode;
}

const DATA_TYPE_CONFIG: Record<VariableDataType, { icon: React.ReactNode; color: string; label: string }> = {
    NUMBER: { icon: <Hash className="h-3 w-3" />, color: "text-blue-500", label: "Number" },
    STRING: { icon: <Type className="h-3 w-3" />, color: "text-violet-500", label: "String" },
    BOOLEAN: { icon: <ToggleLeft className="h-3 w-3" />, color: "text-amber-500", label: "Boolean" },
    ARRAY: { icon: <Layers className="h-3 w-3" />, color: "text-emerald-500", label: "Array" },
    OBJECT: { icon: <Braces className="h-3 w-3" />, color: "text-rose-500", label: "Object" },
};

const SCOPE_CONFIG: Record<VariableScope, { label: string; color: string }> = {
    GLOBAL: { label: "Global", color: "text-slate-500" },
    GROUP_SCOPED: { label: "Group", color: "text-violet-500" },
    NODE_LOCAL: { label: "Local", color: "text-amber-500" },
};

function VariableRow({
    variable,
    onEdit,
    onDelete,
}: {
    variable: WorkflowVariable;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const typeConfig = DATA_TYPE_CONFIG[variable.dataType];
    const scopeConfig = SCOPE_CONFIG[variable.scope];

    return (
        <div className="group flex items-start gap-2 rounded-md px-2 py-2 hover:bg-slate-50 transition-colors">
            {/* Type icon */}
            <div className={cn("mt-0.5 flex-shrink-0", typeConfig.color)}>
                {typeConfig.icon}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                    <span className="font-mono text-xs font-semibold text-slate-700">{variable.notation}</span>
                    <span className="text-[10px] text-slate-400 truncate">{variable.displayLabel}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                    <span className={cn("text-[10px]", scopeConfig.color)}>{scopeConfig.label}</span>
                    {variable.unit && (
                        <span className="text-[10px] text-slate-400 font-mono">{variable.unit}</span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onEdit}>
                    <Settings2 className="h-3 w-3" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-rose-400 hover:text-rose-600"
                    onClick={onDelete}
                >
                    <X className="h-3 w-3" />
                </Button>
            </div>
        </div>
    );
}

function EmptyInspector() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <Settings2 className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600">No node selected</p>
            <p className="mt-1 text-xs text-slate-400">
                Click any node on the canvas to configure it
            </p>
        </div>
    );
}

function NodeHeader({ node }: { node: SelectedNode }) {
    const accent = NODE_ACCENTS[node.type];

    return (
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-3">
            <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
                style={{ backgroundColor: accent?.bg, color: accent?.accent }}
            >
                <Settings2 className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{node.label}</p>
                <p className="text-[10px] text-slate-400 font-mono">{node.type}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
        </div>
    );
}

export function WorkflowInspector({
    selectedNode,
    variables,
    onClose,
    onOpenNodeConfig,
    onAddVariable,
    onEditVariable,
    onDeleteVariable,
    configPanel,
}: WorkflowInspectorProps) {
    const [activeTab, setActiveTab] = useState<"config" | "variables">("config");

    const globalVars = variables.filter((v) => v.scope === "GLOBAL");
    const localVars = variables.filter((v) => v.scope !== "GLOBAL");

    // Detect notation collisions
    const notationCounts: Record<string, number> = {};
    variables.forEach((v) => {
        notationCounts[v.notation] = (notationCounts[v.notation] ?? 0) + 1;
    });
    const hasCollisions = Object.values(notationCounts).some((c) => c > 1);

    return (
        <TooltipProvider delayDuration={400}>
            <div className="flex w-72 flex-col border-l border-slate-200 bg-white">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-600">Inspector</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as "config" | "variables")}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <TabsList className="mx-3 mt-2 h-8 flex-shrink-0 grid w-auto grid-cols-2">
                        <TabsTrigger value="config" className="text-xs gap-1">
                            <Settings2 className="h-3 w-3" />
                            Config
                        </TabsTrigger>
                        <TabsTrigger value="variables" className="text-xs gap-1">
                            <Variable className="h-3 w-3" />
                            Variables
                            {variables.length > 0 && (
                                <Badge variant="secondary" className="ml-1 h-4 min-w-[16px] rounded-full px-1 text-[9px]">
                                    {variables.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Config Tab */}
                    <TabsContent value="config" className="mt-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            {selectedNode ? (
                                <>
                                    <NodeHeader node={selectedNode} />
                                    <div className="p-3">
                                        {configPanel ?? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <Info className="mb-2 h-5 w-5 text-slate-300" />
                                                <p className="text-xs text-slate-400">
                                                    No config panel for this node type yet
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-3 h-7 text-xs"
                                                    onClick={() => onOpenNodeConfig(selectedNode.id)}
                                                >
                                                    Open full config
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <EmptyInspector />
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Variables Tab */}
                    <TabsContent value="variables" className="mt-0 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="p-3">
                                {/* Collision warning */}
                                {hasCollisions && (
                                    <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2">
                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                        <p className="text-[10px] text-amber-700">
                                            Notation collision detected. Some symbols refer to multiple variables.
                                        </p>
                                    </div>
                                )}

                                {/* Add variable */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mb-3 h-7 w-full gap-1.5 text-xs"
                                    onClick={onAddVariable}
                                >
                                    <Plus className="h-3 w-3" />
                                    Add variable
                                </Button>

                                {variables.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Variable className="mb-2 h-5 w-5 text-slate-300" />
                                        <p className="text-xs text-slate-400">No variables yet</p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            Variables are created automatically when you configure nodes
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Global variables */}
                                        {globalVars.length > 0 && (
                                            <div className="mb-3">
                                                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Global ({globalVars.length})
                                                </p>
                                                <div className="space-y-0.5">
                                                    {globalVars.map((v) => (
                                                        <VariableRow
                                                            key={v.id}
                                                            variable={v}
                                                            onEdit={() => onEditVariable(v.id)}
                                                            onDelete={() => onDeleteVariable(v.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Local/scoped variables */}
                                        {localVars.length > 0 && (
                                            <div>
                                                <Separator className="mb-3" />
                                                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                                    Scoped ({localVars.length})
                                                </p>
                                                <div className="space-y-0.5">
                                                    {localVars.map((v) => (
                                                        <VariableRow
                                                            key={v.id}
                                                            variable={v}
                                                            onEdit={() => onEditVariable(v.id)}
                                                            onDelete={() => onDeleteVariable(v.id)}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </TooltipProvider>
    );
}