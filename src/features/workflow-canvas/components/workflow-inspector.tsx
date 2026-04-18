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
    GripVertical,
    Link,
    AlertTriangle,
    EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CalcNodeType, VariableDataType, VariableScope } from "@/generated/prisma";
import { NODE_ACCENTS } from "@/theme/calc-theme";

// --- Extended Interfaces for Lineage & Status ---
export interface WorkflowVariable {
    id: string;
    contextKey: string;
    displayLabel: string;
    notation: string;
    dataType: VariableDataType;
    unit?: string | null;
    scope: VariableScope;
    sourceNodeId?: string | null;
    sourceNodeLabel?: string | null; // Added for grouping/lineage
    description?: string | null;
    // Engine computed flags
    isMissing?: boolean; // Source node was deleted
    isUnused?: boolean;  // No downstream node consumes this
    consumers?: string[]; // Array of node labels that use this
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
    onTestValueChange?: (variableId: string, value: string) => void; // Added for live testing
    configPanel?: React.ReactNode;
}

const DATA_TYPE_CONFIG: Record<VariableDataType, { icon: React.ReactNode; color: string; label: string }> = {
    NUMBER: { icon: <Hash className="h-3 w-3" />, color: "text-blue-500", label: "Number" },
    STRING: { icon: <Type className="h-3 w-3" />, color: "text-violet-500", label: "String" },
    BOOLEAN: { icon: <ToggleLeft className="h-3 w-3" />, color: "text-amber-500", label: "Boolean" },
    ARRAY: { icon: <Layers className="h-3 w-3" />, color: "text-emerald-500", label: "Array" },
    OBJECT: { icon: <Braces className="h-3 w-3" />, color: "text-rose-500", label: "Object" },
};

// ─── Component: Variable Row ──────────────────────────────────────────────

function VariableRow({
    variable,
    onEdit,
    onDelete,
    onTestValueChange
}: {
    variable: WorkflowVariable;
    onEdit: () => void;
    onDelete: () => void;
    onTestValueChange?: (id: string, val: string) => void;
}) {
    const typeConfig = DATA_TYPE_CONFIG[variable.dataType];

    // Styling states based on variable health
    const isError = variable.isMissing;
    const isWarning = variable.isUnused;

    return (
        <div className={cn(
            "group flex flex-col rounded-md border transition-all mb-1 overflow-hidden",
            isError ? "border-rose-200 bg-rose-50/50" :
                isWarning ? "border-transparent opacity-60 hover:opacity-100" :
                    "border-transparent hover:border-slate-200 hover:bg-slate-50"
        )}>
            <div className="flex items-center gap-1.5 px-1 py-2">
                {/* Drag Handle for Injection */}
                <GripVertical className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0 hover:text-slate-500" />

                {/* Type icon */}
                <div className={cn("flex-shrink-0", isError ? "text-rose-500" : typeConfig.color)}>
                    {isError ? <AlertTriangle className="h-3 w-3" /> : typeConfig.icon}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 pl-1">
                    <div className="flex items-baseline gap-1.5">
                        <span className={cn(
                            "font-mono text-xs font-semibold",
                            isError ? "text-rose-700" : "text-slate-700"
                        )}>
                            {variable.notation}
                        </span>
                        {variable.unit && (
                            <span className="text-[9px] text-slate-400 font-mono bg-slate-100 px-1 rounded-sm">
                                {variable.unit}
                            </span>
                        )}
                    </div>
                </div>

                {/* Live Test Value Input */}
                {(variable.scope === "GLOBAL" || variable.sourceNodeId) && (
                    <input
                        type="text"
                        placeholder="Test..."
                        className="h-6 w-16 bg-white border border-slate-200 rounded px-1.5 text-[10px] font-mono text-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity placeholder:text-slate-300"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onTestValueChange?.(variable.id, e.target.value)}
                    />
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-200" onClick={onEdit}>
                        <Settings2 className="h-3 w-3 text-slate-500" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-rose-400 hover:text-rose-600 hover:bg-rose-100"
                        onClick={onDelete}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            {/* Lineage & Status Footer */}
            {(variable.consumers?.length || variable.isMissing || variable.isUnused) ? (
                <div className={cn(
                    "px-7 py-1.5 flex flex-col gap-1 text-[9px] border-t",
                    isError ? "border-rose-100 bg-rose-50" : "border-slate-100 bg-slate-100/50 text-slate-500"
                )}>
                    {variable.isMissing && (
                        <span className="text-rose-600 font-medium flex items-center gap-1">
                            Source node deleted! This will cause execution errors.
                        </span>
                    )}
                    {variable.isUnused && !variable.isMissing && (
                        <span className="text-amber-600 flex items-center gap-1">
                            <EyeOff className="h-2.5 w-2.5" /> Unused in workflow
                        </span>
                    )}
                    {!variable.isMissing && variable.consumers && variable.consumers.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Link className="h-2.5 w-2.5 text-slate-400" />
                            <span className="truncate">
                                Used in: <span className="font-semibold text-slate-600">{variable.consumers.join(", ")}</span>
                            </span>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}

// ─── Component: Empty States & Headers ────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────────────────

export function WorkflowInspector({
    selectedNode,
    variables,
    onClose,
    onOpenNodeConfig,
    onAddVariable,
    onEditVariable,
    onDeleteVariable,
    onTestValueChange,
    configPanel,
}: WorkflowInspectorProps) {
    const [activeTab, setActiveTab] = useState<"config" | "variables">("config");

    // Grouping Logic
    const globalVars = variables.filter((v) => v.scope === "GLOBAL");
    const localVars = variables.filter((v) => v.scope !== "GLOBAL");

    const varsByNode = localVars.reduce((acc, v) => {
        const groupName = v.sourceNodeLabel || "Unlinked Local Variables";
        if (!acc[groupName]) acc[groupName] = [];
        acc[groupName].push(v);
        return acc;
    }, {} as Record<string, WorkflowVariable[]>);

    // Collision Detection
    const notationCounts: Record<string, number> = {};
    variables.forEach((v) => {
        notationCounts[v.notation] = (notationCounts[v.notation] ?? 0) + 1;
    });
    const hasCollisions = Object.values(notationCounts).some((c) => c > 1);

    return (
        <TooltipProvider delayDuration={400}>
            <div className="flex w-[320px] flex-col border-l border-slate-200 bg-white shadow-xl z-10">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-600">Inspector</p>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-600" onClick={onClose}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => setActiveTab(v as "config" | "variables")}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <TabsList className="mx-3 mt-3 h-8 flex-shrink-0 grid w-auto grid-cols-2 bg-slate-100/80">
                        <TabsTrigger value="config" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                            <Settings2 className="h-3 w-3" />
                            Node Config
                        </TabsTrigger>
                        <TabsTrigger value="variables" className="text-xs gap-1.5 data-[state=active]:shadow-sm">
                            <Variable className="h-3 w-3" />
                            Data Graph
                            {variables.length > 0 && (
                                <Badge variant="secondary" className="ml-0.5 h-4 min-w-[16px] rounded-full px-1 text-[9px] bg-slate-200 text-slate-600">
                                    {variables.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    </TabsList>

                    {/* Config Tab */}
                    <TabsContent value="config" className="mt-2 flex-1 overflow-hidden">
                        <ScrollArea className="h-full">
                            {selectedNode ? (
                                <>
                                    <NodeHeader node={selectedNode} />
                                    <div className="p-3">
                                        {configPanel ?? (
                                            <div className="flex flex-col items-center justify-center py-8 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
                                                <Info className="mb-2 h-5 w-5 text-slate-300" />
                                                <p className="text-xs text-slate-400">
                                                    No config panel for this node type yet
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-3 h-7 text-xs bg-white"
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
                            <div className="p-3 pt-4">
                                {/* Collision warning */}
                                {hasCollisions && (
                                    <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 shadow-sm">
                                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                        <p className="text-[10px] text-amber-800 leading-relaxed">
                                            <strong className="font-semibold block mb-0.5">Notation Collision</strong>
                                            Some symbols refer to multiple variables. This will cause MathJS evaluation errors.
                                        </p>
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mb-4 h-8 w-full gap-1.5 text-xs shadow-sm bg-white"
                                    onClick={onAddVariable}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Create Global Variable
                                </Button>

                                {variables.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Variable className="mb-2 h-5 w-5 text-slate-300" />
                                        <p className="text-xs text-slate-400">No data flowing yet</p>
                                        <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">
                                            Variables are created automatically when nodes output data.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-5 pb-6">
                                        {/* Global variables */}
                                        {globalVars.length > 0 && (
                                            <div>
                                                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                    <Layers className="h-3 w-3" />
                                                    Global Scope ({globalVars.length})
                                                </p>
                                                <div className="space-y-0">
                                                    {globalVars.map((v) => (
                                                        <VariableRow
                                                            key={v.id}
                                                            variable={v}
                                                            onEdit={() => onEditVariable(v.id)}
                                                            onDelete={() => onDeleteVariable(v.id)}
                                                            onTestValueChange={onTestValueChange}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Grouped Local variables */}
                                        {Object.entries(varsByNode).map(([nodeLabel, vars]) => (
                                            <div key={nodeLabel}>
                                                <div className="mb-2 px-1 flex items-center justify-between">
                                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate pr-2">
                                                        {nodeLabel}
                                                    </p>
                                                    <Badge variant="outline" className="h-4 text-[8px] px-1 text-slate-400 border-slate-200">
                                                        {vars.length} out
                                                    </Badge>
                                                </div>
                                                <div className="space-y-0 border-l-2 border-slate-100 pl-2 ml-1">
                                                    {vars.map((v) => (
                                                        <VariableRow
                                                            key={v.id}
                                                            variable={v}
                                                            onEdit={() => onEditVariable(v.id)}
                                                            onDelete={() => onDeleteVariable(v.id)}
                                                            onTestValueChange={onTestValueChange}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>
        </TooltipProvider>
    );
}