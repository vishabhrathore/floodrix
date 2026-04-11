// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/edges/default-edge.tsx
//  Custom edge with data-type color awareness
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo } from "react";
import {
    BaseEdge,
    getSmoothStepPath,
    type EdgeProps,
    type EdgeTypes,
} from "@xyflow/react";

function DefaultEdgeInner({
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, style, selected,
}: EdgeProps) {
    const [edgePath] = getSmoothStepPath({
        sourceX, sourceY, targetX, targetY,
        sourcePosition, targetPosition,
        borderRadius: 12,
    });

    return (
        <BaseEdge
            id={id}
            path={edgePath}
            style={{
                stroke: selected ? "#3b82f6" : "#cbd5e1",
                strokeWidth: selected ? 2 : 1.5,
                transition: "stroke 0.15s, stroke-width 0.15s",
                ...style,
            }}
        />
    );
}

const DefaultEdge = memo(DefaultEdgeInner);

export const edgeTypes: EdgeTypes = {
    default: DefaultEdge,
};