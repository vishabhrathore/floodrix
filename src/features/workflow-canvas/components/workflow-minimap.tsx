"use client";

import { MiniMap } from "@xyflow/react";
import type { Node } from "@xyflow/react";
import type { CalcNodeType } from "@/generated/prisma";
import { NODE_ACCENTS } from "@/theme/calc-theme";

interface NodeData {
    type?: CalcNodeType;
    [key: string]: unknown;
}

function getNodeColor(node: Node<NodeData>): string {
    const nodeType = node.type as CalcNodeType | undefined;
    if (nodeType && NODE_ACCENTS[nodeType]) {
        return NODE_ACCENTS[nodeType].accent;
    }
    return "#94a3b8"; // slate-400 fallback
}

function getNodeStroke(node: Node<NodeData>): string {
    const nodeType = node.type as CalcNodeType | undefined;
    if (nodeType && NODE_ACCENTS[nodeType]) {
        return NODE_ACCENTS[nodeType].accent;
    }
    return "#64748b";
}

interface WorkflowMinimapProps {
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}

export function WorkflowMinimap({
    position = "bottom-right",
}: WorkflowMinimapProps) {
    // Map position string to React Flow MiniMap position
    const positionMap = {
        "top-left": { position: "top-left" as const },
        "top-right": { position: "top-right" as const },
        "bottom-left": { position: "bottom-left" as const },
        "bottom-right": { position: "bottom-right" as const },
    };

    return (
        <MiniMap
            {...positionMap[position]}
            nodeColor={getNodeColor}
            nodeStrokeColor={getNodeStroke}
            nodeStrokeWidth={2}
            pannable
            zoomable
            style={{
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
            }}
            maskColor="rgba(241, 245, 249, 0.7)"
        />
    );
}