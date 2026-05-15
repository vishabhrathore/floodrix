// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/edges/workspace-edges.tsx
//  Custom React Flow edges with delete functionality
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import React from "react";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from "@xyflow/react";
import { X } from "lucide-react";

import { useWorkspaceCanvas } from "../store/workspace-canvas-store";

export function WorkspaceEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  target,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const store = useWorkspaceCanvas();

  const onEdgeClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    if (confirm("Disconnect these nodes?")) {
      // Deleting an edge means moving the target node back to the root
      if (store.rootId) {
        store.moveNode(target, store.rootId);
      }
    }
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ ...style, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: "all",
          }}
          className="nodrag nopan group"
        >
          <button
            className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 shadow-sm transition-all hover:bg-red-50 hover:text-red-500 hover:border-red-100"
            onClick={onEdgeClick}
          >
            <X size={10} strokeWidth={3} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
