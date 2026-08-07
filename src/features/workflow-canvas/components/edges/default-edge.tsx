"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
  getBezierPath,
} from "@xyflow/react";

import { cn } from "@/lib/utils";

interface DefaultEdgeData {
  animated?: boolean;
  executionStatus?: "pending" | "running" | "completed" | "errored" | "skipped";
  label?: string;
  [key: string]: unknown;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#cbd5e1", // slate-300
  running: "#3b82f6", // blue-500
  completed: "#10b981", // emerald-500
  errored: "#ef4444", // red-500
  skipped: "#94a3b8", // slate-400
};

export function DefaultEdge({
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
}: EdgeProps<Edge<DefaultEdgeData>>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const status = data?.executionStatus ?? "pending";
  const isRunning = status === "running";
  const strokeColor = STATUS_COLORS[status] ?? STATUS_COLORS.pending;

  return (
    <>
      {/* Shadow / glow for selected or running */}
      {(selected || isRunning) && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: strokeColor,
            strokeWidth: 6,
            strokeOpacity: 0.2,
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
          strokeDasharray: isRunning ? "8 4" : undefined,
          animation: isRunning ? "flowDash 1s linear infinite" : undefined,
          fill: "none",
          transition: "stroke 0.2s",
        }}
      />

      {/* Inline style for dash animation */}
      <style>{`
        @keyframes flowDash {
          to { stroke-dashoffset: -12; }
        }
      `}</style>

      {/* Optional label */}
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 nodrag nopan",
              "rounded bg-white px-1.5 py-0.5 text-[10px] font-medium shadow-sm border border-slate-200",
              selected ? "text-slate-700" : "text-slate-500",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
