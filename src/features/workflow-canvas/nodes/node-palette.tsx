// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/node-palette.tsx
//  Draggable node palette — users drag nodes from here onto the canvas
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search, type LucideIcon } from "lucide-react";
import * as Icons from "lucide-react";
import { NODE_ACCENTS, type NodeTypeKey } from "@/theme/calc-theme";
// import { NODE_ACCENTS, type NodeTypeKey } from "../nodes/theme";

// ─── Node Categories ─────────────────────────────────────────────────────

interface PaletteCategory {
    label: string;
    nodes: { type: NodeTypeKey; available: boolean }[];
}

const CATEGORIES: PaletteCategory[] = [
    {
        label: "Data Input",
        nodes: [
            { type: "INPUT", available: true },
        ],
    },
    {
        label: "Computation",
        nodes: [
            { type: "FORMULA", available: true },
            { type: "MULTI_FORMULA", available: true },
            { type: "CUSTOM_CODE", available: true },
            { type: "UNIT_CONVERSION", available: true },
        ],
    },
    {
        label: "Lookup & Curves",
        nodes: [
            { type: "LOOKUP_TABLE", available: true },
            { type: "GRAPH_INTERPOLATION", available: true },
        ],
    },
    {
        label: "Logic",
        nodes: [
            { type: "DECISION", available: true },
            { type: "VALIDATION", available: true },
            { type: "LOOP", available: true },
            { type: "SUBWORKFLOW", available: true },
        ],
    },
    {
        label: "Output",
        nodes: [
            { type: "DISPLAY", available: true },
            { type: "CHART", available: true },
        ],
    },
    {
        label: "Annotation",
        nodes: [
            { type: "COMMENT", available: true },
            { type: "REFERENCE_IMAGE", available: true },
        ],
    },
];

// ─── Palette Component ───────────────────────────────────────────────────

export function NodePalette() {
    const [search, setSearch] = useState("");
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        "Data Input": true,
        "Computation": true,
        "Lookup & Curves": true,
    });

    const filteredCategories = CATEGORIES.map((cat) => ({
        ...cat,
        nodes: cat.nodes.filter((n) => {
            if (!search) return true;
            const accent = NODE_ACCENTS[n.type];
            return accent.label.toLowerCase().includes(search.toLowerCase());
        }),
    })).filter((cat) => cat.nodes.length > 0);

    return (
        <div
            style={{
                width: 220,
                maxHeight: "70vh",
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* Search */}
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #f3f4f6" }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 8px",
                    borderRadius: 6,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                }}>
                    <Search size={13} color="#94a3b8" />
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: 12,
                            color: "#374151",
                            width: "100%",
                            fontFamily: "inherit",
                        }}
                    />
                </div>
            </div>

            {/* Categories */}
            <div style={{ overflow: "auto", flex: 1, padding: "4px 0" }}>
                {filteredCategories.map((cat) => (
                    <div key={cat.label}>
                        {/* Category header */}
                        <button
                            onClick={() => setExpanded((e) => ({ ...e, [cat.label]: !e[cat.label] }))}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                width: "100%",
                                padding: "6px 10px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 0.8,
                                textTransform: "uppercase",
                                color: "#94a3b8",
                                fontFamily: "inherit",
                            }}
                        >
                            {expanded[cat.label] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {cat.label}
                        </button>

                        {/* Nodes */}
                        {expanded[cat.label] && cat.nodes.map((node) => (
                            <PaletteItem key={node.type} type={node.type} available={node.available} />
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Palette Item (draggable) ────────────────────────────────────────────

function PaletteItem({ type, available }: { type: NodeTypeKey; available: boolean }) {
    const accent = NODE_ACCENTS[type];
    const IconComponent = (Icons as Record<string, LucideIcon>)[accent.icon];

    const onDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData("application/reactflow-nodetype", type);
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            draggable={available}
            onDragStart={onDragStart}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 10px 5px 22px",
                cursor: available ? "grab" : "not-allowed",
                opacity: available ? 1 : 0.4,
                transition: "background 0.1s",
                fontSize: 12,
                color: "#374151",
                fontWeight: 500,
            }}
            onMouseEnter={(e) => { if (available) e.currentTarget.style.background = "#f9fafb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        >
            <div
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 5,
                    backgroundColor: accent.bg,
                    border: `1px solid ${accent.accent}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                }}
            >
                {IconComponent && <IconComponent size={12} color={accent.accent} strokeWidth={2} />}
            </div>
            <span>{accent.label}</span>
        </div>
    );
}