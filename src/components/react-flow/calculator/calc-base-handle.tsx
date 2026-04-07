// ═══════════════════════════════════════════════════════════════════════════
//  nodes/base/node-handle.tsx
//  A single socket (handle) on a node.
//
//  Responsibilities:
//    - Renders a colored circle at the correct position
//    - Color is determined by the data type (number=blue, table=purple, etc.)
//    - Filled when connected, hollow when open
//    - Shows a tooltip label on hover with type dot
//
//  Does NOT own: position calculation (that's BaseNode's job)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { HANDLE_COLORS, NODE_LAYOUT, type HandleDataType } from "@/theme/calc-theme";
// import { HANDLE_COLORS, NODE_LAYOUT, type HandleDataType } from "../theme";

interface NodeHandleProps {
    id: string;
    type: "source" | "target";
    dataType: HandleDataType;
    label?: string;
    position: Position;
    offsetPercent?: number; // Vertical position as % (default 50)
    required?: boolean;
    connected?: boolean;
}

function NodeHandleInner({
    id,
    type,
    dataType,
    label,
    position,
    offsetPercent = 50,
    required = false,
    connected = false,
}: NodeHandleProps) {
    const c = HANDLE_COLORS[dataType];
    const size = NODE_LAYOUT.handleSize;
    const isLeft = position === Position.Left;

    return (
        <div
            className="group/h"
            style={{
                position: "absolute",
                top: `${offsetPercent}%`,
                [isLeft ? "left" : "right"]: -(size / 2),
                transform: "translateY(-50%)",
                zIndex: 10,
            }}
        >
            <Handle
                id={id}
                type={type}
                position={position}
                style={{
                    position: "relative",
                    width: size,
                    height: size,
                    borderRadius: "50%",
                    backgroundColor: connected ? c.bg : "#ffffff",
                    border: `2px solid ${c.border}`,
                    boxShadow: connected ? `0 0 0 3px ${c.ring}` : "none",
                    transition: "background-color 0.15s, box-shadow 0.15s",
                    cursor: "crosshair",
                    top: 0,
                    left: 0,
                    transform: "none",
                }}
            />

            {/* Hover tooltip */}
            {label && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        [isLeft ? "right" : "left"]: size + 6,
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        opacity: 0,
                        transition: "opacity 0.12s",
                        fontSize: 11,
                        fontWeight: 500,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        color: c.border,
                        backgroundColor: "#ffffff",
                        border: `1px solid ${c.ring}`,
                        borderRadius: 5,
                        padding: "2px 7px",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        zIndex: 50,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                    }}
                    className="group-hover/h:!opacity-100"
                >
                    <span
                        style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            backgroundColor: c.bg,
                            flexShrink: 0,
                        }}
                    />
                    {label}
                    {required && (
                        <span style={{ color: "#ef4444", fontSize: 10, marginLeft: 1 }}>*</span>
                    )}
                </div>
            )}
        </div>
    );
}

export const NodeHandle = memo(NodeHandleInner);
