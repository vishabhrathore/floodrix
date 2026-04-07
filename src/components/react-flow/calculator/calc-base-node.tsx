// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/nodes/base/base-node.tsx
//  Shared wrapper for ALL node types
//
//  Every node renders:
//    ┌─ accent border (left)
//    ├─ header: icon + label + type badge + menu
//    ├─ body: type-specific content (children)
//    ├─ footer: optional (reference, status)
//    └─ handles: positioned based on NODE_HANDLES config
//
//  This component owns layout, selection, hover, and handles.
//  Each node type only renders its body content.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo, type ReactNode } from "react";
import { Position, useConnection } from "@xyflow/react";
import {
    MoreHorizontal,
    Copy,
    Trash2,
    Settings,
    type LucideIcon,
} from "lucide-react";
import * as Icons from "lucide-react";
import { NODE_ACCENTS, NODE_HANDLES, type NodeTypeKey } from "@/theme/calc-theme";
import { NodeHandle } from "./calc-base-handle";

// ─── Props ───────────────────────────────────────────────────────────────

interface BaseNodeProps {
    id: string;
    nodeType: NodeTypeKey;
    label: string;
    selected?: boolean;
    children: ReactNode;

    // Optional overrides
    subtitle?: string;
    footer?: ReactNode;
    width?: number;
    badge?: string;
    reference?: string;

    // Execution state (shown during workflow runs)
    executionStatus?: "pending" | "running" | "completed" | "errored" | "waiting" | "skipped";

    // Callbacks
    onDelete?: () => void;
    onDuplicate?: () => void;
    onConfigure?: () => void;
}

// ─── Execution Status Indicators ─────────────────────────────────────────

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
    onDelete,
    onDuplicate,
    onConfigure,
}: BaseNodeProps) {
    const accent = NODE_ACCENTS[nodeType];
    const handles = NODE_HANDLES[nodeType];
    const IconComponent = (Icons as unknown as Record<string, LucideIcon>)[accent.icon];
    const status = executionStatus ? STATUS_STYLES[executionStatus] : null;

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
            {/* ── Input Handles (left side) ────────────────────────────────── */}
            {handles.inputs.map((h, i) => (
                <NodeHandle
                    key={h.id}
                    id={h.id}
                    type="target"
                    dataType={h.dataType}
                    label={h.label}
                    position={Position.Left}
                    // index={i}
                    // total={handles.inputs.length}
                    required={h.required}
                />
            ))}

            {/* ── Output Handles (right side) ──────────────────────────────── */}
            {handles.outputs.map((h, i) => (
                <NodeHandle
                    key={h.id}
                    id={h.id}
                    type="source"
                    dataType={h.dataType}
                    label={h.label}
                    position={Position.Right}
                // index={i}
                // total={handles.outputs.length}
                />
            ))}

            {/* ── Header ───────────────────────────────────────────────────── */}
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

                {/* Menu button (visible on hover) */}
                <div
                    className="opacity-0 group-hover/node:opacity-100"
                    style={{
                        transition: "opacity 0.1s",
                        position: "relative",
                        flexShrink: 0,
                    }}
                >
                    <NodeMenu
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        onConfigure={onConfigure}
                    />
                </div>
            </div>

            {/* ── Body ─────────────────────────────────────────────────────── */}
            <div style={{ padding: "8px 10px" }}>
                {children}
            </div>

            {/* ── Footer (optional) ────────────────────────────────────────── */}
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
                            <Icons.BookOpen size={10} strokeWidth={1.5} />
                            <span>{reference}</span>
                        </div>
                    )}
                    {footer}
                </div>
            )}

            {/* ── Pulse animation ──────────────────────────────────────────── */}
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

// ─── Node Menu ───────────────────────────────────────────────────────────

function NodeMenu({
    onDelete,
    onDuplicate,
    onConfigure,
}: {
    onDelete?: () => void;
    onDuplicate?: () => void;
    onConfigure?: () => void;
}) {
    return (
        <div className="group/menu relative">
            <button
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

            <div
                className="hidden group-hover/menu:block"
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
                {onConfigure && (
                    <MenuButton icon={Settings} label="Configure" onClick={onConfigure} />
                )}
                {onDuplicate && (
                    <MenuButton icon={Copy} label="Duplicate" onClick={onDuplicate} />
                )}
                {onDelete && (
                    <MenuButton icon={Trash2} label="Delete" onClick={onDelete} danger />
                )}
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
            onClick={(e) => { e.stopPropagation(); onClick(); }}
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
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = danger ? "#fef2f2" : "#f9fafb"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
        >
            <Icon size={13} strokeWidth={1.5} />
            {label}
        </button>
    );
}
