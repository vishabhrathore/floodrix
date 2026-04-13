"use client";

import { useState, useCallback } from "react";
import {
    Search,
    ChevronDown,
    ChevronRight,
    GripVertical,
    Type,
    Calculator,
    Table2,
    TrendingUp,
    GitBranch,
    Monitor,
    Code2,
    RotateCcw,
    Layers,
    Ruler,
    ShieldCheck,
    Globe,
    BarChart2,
    TableProperties,
    FileText,
    Boxes,
    Workflow,
    StickyNote,
    Image,
    MessageSquare,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CalcNodeType } from "@/generated/prisma";
import { NODE_ACCENTS } from "@/theme/calc-theme";

interface NodePaletteItem {
    type: CalcNodeType;
    label: string;
    description: string;
    icon: React.ReactNode;
    category: string;
    accent: string;
    bg: string;
}

const ICON_MAP: Record<CalcNodeType, React.ReactNode> = {
    INPUT: <Type className="h-3.5 w-3.5" />,
    FORMULA: <Calculator className="h-3.5 w-3.5" />,
    LOOKUP_TABLE: <Table2 className="h-3.5 w-3.5" />,
    GRAPH_INTERPOLATION: <TrendingUp className="h-3.5 w-3.5" />,
    DECISION: <GitBranch className="h-3.5 w-3.5" />,
    DISPLAY: <Monitor className="h-3.5 w-3.5" />,
    MULTI_FORMULA: <Layers className="h-3.5 w-3.5" />,
    VALIDATION: <ShieldCheck className="h-3.5 w-3.5" />,
    UNIT_CONVERSION: <Ruler className="h-3.5 w-3.5" />,
    CUSTOM_CODE: <Code2 className="h-3.5 w-3.5" />,
    LOOP: <RotateCcw className="h-3.5 w-3.5" />,
    SUBWORKFLOW: <Workflow className="h-3.5 w-3.5" />,
    COMMENT: <StickyNote className="h-3.5 w-3.5" />,
    CHART: <BarChart2 className="h-3.5 w-3.5" />,
    TABLE_BUILDER: <TableProperties className="h-3.5 w-3.5" />,
    PDF_REPORT: <FileText className="h-3.5 w-3.5" />,
    GROUP: <Boxes className="h-3.5 w-3.5" />,
    PARALLEL: <GitBranch className="h-3.5 w-3.5" />,
    REFERENCE_IMAGE: <Image className="h-3.5 w-3.5" />,
    API_CALL: <Globe className="h-3.5 w-3.5" />,
};

const DESCRIPTIONS: Record<CalcNodeType, string> = {
    INPUT: "Collect user-provided values",
    FORMULA: "Evaluate a math expression",
    LOOKUP_TABLE: "Find a coefficient by range",
    GRAPH_INTERPOLATION: "Read values off a curve",
    DECISION: "Branch on a condition",
    DISPLAY: "Compare results, pick design value",
    MULTI_FORMULA: "Multiple formulas in sequence",
    VALIDATION: "Assert constraints with messages",
    UNIT_CONVERSION: "Convert between unit systems",
    CUSTOM_CODE: "Arbitrary mathjs expression block",
    LOOP: "Iterate over a dataset or range",
    SUBWORKFLOW: "Embed another workflow inline",
    COMMENT: "Annotation — no computation",
    CHART: "Render a chart at run-time",
    TABLE_BUILDER: "Construct a result table",
    PDF_REPORT: "Generate a PDF output",
    GROUP: "Visually group nodes",
    PARALLEL: "Run branches concurrently",
    REFERENCE_IMAGE: "Attach a codebook figure",
    API_CALL: "HTTP call to external service",
};

const CATEGORIES: { key: string; label: string; types: CalcNodeType[] }[] = [
    {
        key: "core",
        label: "Core",
        types: ["INPUT", "FORMULA", "LOOKUP_TABLE", "GRAPH_INTERPOLATION", "DECISION", "DISPLAY"],
    },
    {
        key: "extended",
        label: "Extended",
        types: ["MULTI_FORMULA", "VALIDATION", "UNIT_CONVERSION", "CUSTOM_CODE", "LOOP", "SUBWORKFLOW"],
    },
    {
        key: "output",
        label: "Output",
        types: ["CHART", "TABLE_BUILDER", "PDF_REPORT"],
    },
    {
        key: "advanced",
        label: "Advanced",
        types: ["GROUP", "PARALLEL", "API_CALL"],
    },
    {
        key: "annotation",
        label: "Annotation",
        types: ["COMMENT", "REFERENCE_IMAGE"],
    },
];

function DraggableNodeItem({ item }: { item: NodePaletteItem }) {
    const onDragStart = useCallback(
        (e: React.DragEvent) => {
            e.dataTransfer.setData("application/reactflow-node-type", item.type);
            e.dataTransfer.effectAllowed = "move";
        },
        [item.type]
    );

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className={cn(
                "group flex cursor-grab items-center gap-2.5 rounded-md px-2.5 py-2",
                "border border-transparent hover:border-slate-200 hover:bg-slate-50",
                "active:cursor-grabbing transition-all duration-100 select-none"
            )}
        >
            {/* Drag grip */}
            <GripVertical className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />

            {/* Icon */}
            <div
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded"
                style={{ backgroundColor: item.bg, color: item.accent }}
            >
                {item.icon}
            </div>

            {/* Label + Description */}
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-700 leading-tight">{item.label}</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">{item.description}</p>
            </div>
        </div>
    );
}

function CategorySection({
    category,
    items,
    defaultOpen = true,
}: {
    category: { key: string; label: string };
    items: NodePaletteItem[];
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    if (items.length === 0) return null;

    return (
        <div className="mb-1">
            <button
                className="flex w-full items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setOpen((o) => !o)}
            >
                {open ? (
                    <ChevronDown className="h-3 w-3" />
                ) : (
                    <ChevronRight className="h-3 w-3" />
                )}
                {category.label}
                <Badge
                    variant="secondary"
                    className="ml-auto h-4 min-w-[16px] rounded-full px-1 text-[9px] font-medium"
                >
                    {items.length}
                </Badge>
            </button>

            {open && (
                <div className="space-y-0.5 px-1">
                    {items.map((item) => (
                        <DraggableNodeItem key={item.type} item={item} />
                    ))}
                </div>
            )}
        </div>
    );
}

interface WorkflowSidebarProps {
    className?: string;
}

export function WorkflowSidebar({ className }: WorkflowSidebarProps) {
    const [search, setSearch] = useState("");

    // Build palette items from theme + descriptions
    const allItems: NodePaletteItem[] = Object.entries(NODE_ACCENTS).map(([type, accent]) => ({
        type: type as CalcNodeType,
        label: accent.label,
        description: DESCRIPTIONS[type as CalcNodeType] ?? "",
        icon: ICON_MAP[type as CalcNodeType] ?? <MessageSquare className="h-3.5 w-3.5" />,
        category: "",
        accent: accent.accent,
        bg: accent.bg,
    }));

    const filteredItems = search.trim()
        ? allItems.filter(
            (item) =>
                item.label.toLowerCase().includes(search.toLowerCase()) ||
                item.description.toLowerCase().includes(search.toLowerCase())
        )
        : null;

    return (
        <div
            className={cn(
                "flex w-56 flex-col border-r border-slate-200 bg-white",
                className
            )}
        >
            {/* Header */}
            <div className="flex-shrink-0 border-b border-slate-100 px-3 py-3">
                <p className="mb-2 text-xs font-semibold text-slate-600">Node Palette</p>
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search nodes…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 pl-7 text-xs"
                    />
                </div>
            </div>

            {/* Drag hint */}
            <p className="flex-shrink-0 px-3 py-2 text-[10px] text-slate-400">
                Drag a node onto the canvas to add it
            </p>

            {/* Nodes list */}
            <div className="flex-1 overflow-y-auto px-1 pb-4">
                {filteredItems ? (
                    filteredItems.length > 0 ? (
                        <div className="space-y-0.5 px-1">
                            {filteredItems.map((item) => (
                                <DraggableNodeItem key={item.type} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Search className="mb-2 h-6 w-6 text-slate-300" />
                            <p className="text-xs text-slate-400">No nodes match "{search}"</p>
                        </div>
                    )
                ) : (
                    CATEGORIES.map((cat, i) => {
                        const items = cat.types
                            .map((t) => allItems.find((a) => a.type === t))
                            .filter(Boolean) as NodePaletteItem[];
                        return (
                            <CategorySection
                                key={cat.key}
                                category={cat}
                                items={items}
                                defaultOpen={i < 2}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}