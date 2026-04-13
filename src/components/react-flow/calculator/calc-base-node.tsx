// src/components/react-flow/calculator/calc-base-node.tsx

"use client";

import { memo, type ReactNode } from "react";
import { Position } from "@xyflow/react";
import {
    MoreHorizontal,
    Copy,
    Trash2,
    Settings,
    BookOpen,
    type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import { NODE_ACCENTS, NODE_HANDLES, type NodeTypeKey } from "@/theme/calc-theme";
import { NodeHandle } from "./calc-base-handle";
import { useWorkflowCanvasStore } from "@/features/workflow-canvas/store/workflow-canvas-store";

// ─── Props ───────────────────────────────────────────────────────────────

interface BaseNodeProps {
    id: string;
    nodeType: NodeTypeKey;
    label: string;
    selected?: boolean;
    children: ReactNode;
    subtitle?: string;
    footer?: ReactNode;
    width?: number;
    badge?: string;
    reference?: string;
    executionStatus?: "pending" | "running" | "completed" | "errored" | "waiting" | "skipped";
    // Optional explicit callbacks — if not provided, BaseNode reads from store
    onDelete?: () => void;
    onDuplicate?: () => void;
    onConfigure?: () => void;
}

// ─── Execution Status ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { dot: string; ring: string; label: string }> = {
    pending: { dot: "#d1d5db", ring: "transparent", label: "Pending" },
    running: { dot: "#f59e0b", ring: "rgba(245,158,11,0.3)", label: "Running" },
    completed: { dot: "#22c55e", ring: "transparent", label: "Done" },
    errored: { dot: "#ef4444", ring: "rgba(239,68,68,0.3)", label: "Error" },
    waiting: { dot: "#3b82f6", ring: "rgba(59,130,246,0.3)", label: "Waiting" },
    skipped: { dot: "#9ca3af", ring: "transparent", label: "Skipped" },
};

// ─── Component ───────────────────────────────────────────────────────────

function BaseNodeInner({
    id,
    nodeType,
    label,
    selected = false,
    children,
    subtitle,
    footer,
    width = 260,
    badge,
    reference,
    executionStatus,
    onDelete: onDeleteProp,
    onDuplicate: onDuplicateProp,
    onConfigure: onConfigureProp,
}: BaseNodeProps) {
    const accent = NODE_ACCENTS[nodeType];
    const handles = NODE_HANDLES[nodeType];
    const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[accent.icon];
    const status = executionStatus ? STATUS_STYLES[executionStatus] : null;

    // Get store actions — these work for all node types without explicit props
    const store = useWorkflowCanvasStore;
    const handleDelete = onDeleteProp ?? (() => store.getState().deleteNode(id));
    const handleDuplicate = onDuplicateProp ?? (() => store.getState().duplicateNode(id));

    // For configure, we dispatch a custom event that the canvas component listens to.
    // This avoids needing to thread the config drawer through every node type.
    const handleConfigure = onConfigureProp ?? (() => {
        window.dispatchEvent(new CustomEvent("floodrix:configure-node", { detail: { nodeId: id } }));
    });

    return (
        <div
            className="group/node"
            style={{
                width,
                borderRadius: 10,
                border: `1px solid ${selected ? accent.accent : "#e5e7eb"}`,
                borderLeft: `3px solid ${accent.accent}`,
                backgroundColor: "white",
                boxShadow: selected
                    ? `0 0 0 2px ${accent.accent}20, 0 4px 16px rgba(0,0,0,0.08)`
                    : "0 1px 4px rgba(0,0,0,0.06)",
                transition: "border-color 0.15s, box-shadow 0.15s",
                position: "relative",
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {/* Input Handles */}
            {handles.inputs.map((h) => (
                <NodeHandle
                    key={h.id}
                    id={h.id}
                    type="target"
                    dataType={h.dataType}
                    label={h.label}
                    position={Position.Left}
                    required={h.required}
                />
            ))}

            {/* Output Handles */}
            {handles.outputs.map((h) => (
                <NodeHandle
                    key={h.id}
                    id={h.id}
                    type="source"
                    dataType={h.dataType}
                    label={h.label}
                    position={Position.Right}
                />
            ))}

            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 10px",
                    borderBottom: "1px solid #f3f4f6",
                    backgroundColor: accent.bg,
                    borderRadius: "7px 10px 0 0",
                    minHeight: 40,
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        backgroundColor: "white",
                        border: `1px solid ${accent.accent}20`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    {IconComponent && (
                        <IconComponent size={14} color={accent.accent} strokeWidth={2} />
                    )}
                </div>

                {/* Label + subtitle */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#1e293b",
                            lineHeight: 1.2,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {label}
                    </div>
                    {subtitle && (
                        <div
                            style={{
                                fontSize: 10,
                                color: "#94a3b8",
                                lineHeight: 1.3,
                                marginTop: 1,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {subtitle}
                        </div>
                    )}
                </div>

                {/* Execution status dot */}
                {status && (
                    <div
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            backgroundColor: status.dot,
                            boxShadow: status.ring !== "transparent"
                                ? `0 0 0 3px ${status.ring}`
                                : "none",
                            flexShrink: 0,
                            animation: executionStatus === "running"
                                ? "pulse 1.2s ease-in-out infinite"
                                : undefined,
                        }}
                        title={status.label}
                    />
                )}

                {/* Type badge */}
                {badge && (
                    <div
                        style={{
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: 0.5,
                            color: accent.accent,
                            backgroundColor: `${accent.accent}10`,
                            border: `1px solid ${accent.accent}20`,
                            padding: "2px 6px",
                            borderRadius: 4,
                            textTransform: "uppercase",
                            flexShrink: 0,
                            whiteSpace: "nowrap",
                        }}
                    >
                        {badge}
                    </div>
                )}

                {/* 3-dot menu */}
                <div
                    className="opacity-0 group-hover/node:opacity-100"
                    style={{ transition: "opacity 0.1s", flexShrink: 0 }}
                >
                    <NodeMenu
                        onConfigure={handleConfigure}
                        onDuplicate={handleDuplicate}
                        onDelete={handleDelete}
                    />
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: "8px 10px" }}>
                {children}
            </div>

            {/* Footer */}
            {(footer || reference) && (
                <div
                    style={{
                        padding: "6px 10px",
                        borderTop: "1px solid #f3f4f6",
                        fontSize: 10,
                        color: "#94a3b8",
                        lineHeight: 1.4,
                    }}
                >
                    {reference && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <BookOpen size={10} strokeWidth={1.5} />
                            <span>{reference}</span>
                        </div>
                    )}
                    {footer}
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.3); }
                }
            `}</style>
        </div>
    );
}

export const BaseNode = memo(BaseNodeInner);

// ─── Node Menu (3-dot dropdown) ──────────────────────────────────────────

function NodeMenu({
    onDelete,
    onDuplicate,
    onConfigure,
}: {
    onDelete: () => void;
    onDuplicate: () => void;
    onConfigure: () => void;
}) {
    return (
        <div className="group/menu relative">
            <button
                className="nodrag"
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: "1px solid #e5e7eb",
                    backgroundColor: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                }}
            >
                <MoreHorizontal size={12} color="#94a3b8" />
            </button>

            {/* Dropdown — shows on hover */}
            <div
                className="nodrag hidden group-hover/menu:block"
                style={{
                    position: "absolute",
                    right: 0,
                    top: 26,
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                    padding: 4,
                    zIndex: 50,
                    minWidth: 140,
                }}
            >
                <MenuButton icon={Settings} label="Configure" onClick={onConfigure} />
                <MenuButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
                <div style={{ height: 1, backgroundColor: "#f3f4f6", margin: "2px 0" }} />
                <MenuButton icon={Trash2} label="Delete" onClick={onDelete} danger />
            </div>
        </div>
    );
}

function MenuButton({
    icon: Icon,
    label,
    onClick,
    danger,
}: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    danger?: boolean;
}) {
    return (
        <button
            className="nodrag"
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 8px",
                borderRadius: 4,
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: danger ? "#ef4444" : "#374151",
                fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = danger ? "#fef2f2" : "#f9fafb";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
            }}
        >
            <Icon size={13} strokeWidth={1.5} />
            {label}
        </button>
    );
}