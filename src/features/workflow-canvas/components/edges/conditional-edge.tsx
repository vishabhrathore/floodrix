"use client";

import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

interface ConditionalEdgeData {
    branch: "true" | "false";
    executionStatus?: "pending" | "active" | "skipped";
    [key: string]: unknown;
}

const BRANCH_CONFIG = {
    true: {
        color: "#10b981",   // emerald-500
        bgClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
        label: "True",
    },
    false: {
        color: "#f59e0b",   // amber-500
        bgClass: "bg-amber-50 text-amber-700 border-amber-200",
        label: "False",
    },
};

export function ConditionalEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
    markerEnd,
}: EdgeProps<ConditionalEdgeData>) {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 8,
    });

    const branch = data?.branch ?? "true";
    const config = BRANCH_CONFIG[branch];
    const isSkipped = data?.executionStatus === "skipped";
    const isActive = data?.executionStatus === "active";

    const strokeColor = isSkipped
        ? "#cbd5e1"
        : isActive
            ? config.color
            : config.color;

    const strokeOpacity = isSkipped ? 0.4 : 1;

    return (
        <>
            {/* Glow for selected / active */}
            {(selected || isActive) && !isSkipped && (
                <BaseEdge
                    id={`${id}-glow`}
                    path={edgePath}
                    style={{
                        stroke: config.color,
                        strokeWidth: 6,
                        strokeOpacity: 0.15,
                        fill: "none",
                    }}
                />
            )}

            {/* Main edge */}
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    stroke: strokeColor,
                    strokeWidth: selected ? 2 : 1.5,
                    strokeOpacity,
                    strokeDasharray: isSkipped ? "5 3" : undefined,
                    fill: "none",
                    transition: "stroke 0.2s, stroke-opacity 0.2s",
                }}
            />

            {/* Branch label pill */}
            <EdgeLabelRenderer>
                <div
                    className={cn(
                        "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 nodrag nopan",
                        "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        "shadow-sm transition-opacity",
                        config.bgClass,
                        isSkipped ? "opacity-30" : "opacity-100"
                    )}
                    style={{
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                    }}
                >
                    {config.label}
                </div>
            </EdgeLabelRenderer>
        </>
    );
}