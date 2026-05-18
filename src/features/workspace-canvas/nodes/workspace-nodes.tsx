// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-nodes.tsx
//  Custom React Flow nodes for the workspace organizer canvas
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo } from "react";

import {
  Handle,
  type NodeProps,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import { ChevronRight, ExternalLink, Trash2 } from "lucide-react";

import { WORKSPACE_ICONS } from "../components/workspace-icons";

// ─── Folder Node ─────────────────────────────────────────────────────────

function WorkspaceFolderInner({ data, selected }: NodeProps) {
  const d = data as {
    dbNode: {
      name: string;
      icon: string | null;
      metadata: Record<string, unknown>;
    };
    childCount: number;
    workflowCount: number;
    isExpanded: boolean;
    onDelete?: () => void;
  };

  const badge = (d.dbNode.metadata?.badge as string) || null;

  return (
    <div
      className="relative group"
      style={{
        minWidth: 180,
        maxWidth: 240,
        borderRadius: 10,
        border: `1.5px solid ${selected ? "#0a0a0a" : "#e5e7eb"}`,
        backgroundColor: "white",
        boxShadow: selected
          ? "0 0 0 2px rgba(10,10,10,0.1), 0 4px 12px rgba(0,0,0,0.06)"
          : "0 1px 4px rgba(0,0,0,0.04)",
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#0a0a0a",
          border: "2px solid #0a0a0a",
          top: -4,
        }}
      />

      {/* Output handle (bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "white",
          border: "2px solid #0a0a0a",
          bottom: -4,
        }}
      />

      {/* Content */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
          {d.dbNode.icon ? (
            <span className="text-sm">{d.dbNode.icon}</span>
          ) : (
            <WORKSPACE_ICONS.FOLDER size={16} className="text-slate-600" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-gray-800 truncate leading-tight">
            {d.dbNode.name}
          </div>
          <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
            {d.childCount} folder{d.childCount !== 1 ? "s" : ""} ·{" "}
            {d.workflowCount} workflow{d.workflowCount !== 1 ? "s" : ""}
          </div>
        </div>

        {badge && (
          <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
            {badge}
          </span>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this folder?")) {
              d.onDelete?.();
            }
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 shadow-sm transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export const WorkspaceFolderNode = memo(WorkspaceFolderInner);

// ─── Workflow Link Node ──────────────────────────────────────────────────

function WorkflowLinkInner({ data, selected }: NodeProps) {
  const d = data as {
    dbNode: {
      name: string;
      icon: string | null;
      linkedWorkflowId: string | null;
      metadata: Record<string, unknown>;
    };
    linkedWorkflow: { id: string; name: string; status: string } | null;
    status: string;
    onDelete?: () => void;
  };

  const isAttached = !!d.dbNode.linkedWorkflowId;
  const isComingSoon = d.status === "coming_soon";

  return (
    <div
      className="relative group"
      style={{
        minWidth: 160,
        maxWidth: 220,
        borderRadius: 8,
        border: `1.5px solid ${selected ? "#3b82f6" : isComingSoon ? "#e5e7eb" : "#bfdbfe"}`,
        backgroundColor: isComingSoon ? "#fafafa" : "white",
        boxShadow: selected
          ? "0 0 0 2px rgba(59,130,246,0.15), 0 4px 12px rgba(0,0,0,0.06)"
          : "0 1px 3px rgba(0,0,0,0.03)",
        fontFamily: "'Inter', system-ui, sans-serif",
        opacity: isComingSoon ? 0.5 : 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: isAttached ? "#3b82f6" : "white",
          border: "2px solid #3b82f6",
          top: -4,
        }}
      />

      {/* Content */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
          {d.dbNode.icon ? (
            <span className="text-xs">{d.dbNode.icon}</span>
          ) : (
            <WORKSPACE_ICONS.WORKFLOW_LINK
              size={13}
              className="text-blue-500"
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-semibold text-gray-700 truncate leading-tight">
            {d.dbNode.name}
          </div>
          {isAttached && d.linkedWorkflow && (
            <div className="text-[10px] text-blue-500 truncate leading-tight mt-0.5">
              {d.linkedWorkflow.name}
            </div>
          )}
        </div>

        {/* Status indicator */}
        {isComingSoon ? (
          <span className="text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 border border-gray-100 flex-shrink-0">
            Soon
          </span>
        ) : isAttached ? (
          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        ) : (
          <div className="px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold shadow-sm hover:bg-blue-600 cursor-pointer">
            Link
          </div>
        )}

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this link?")) {
              d.onDelete?.();
            }
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 shadow-sm transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}

export const WorkflowLinkNode = memo(WorkflowLinkInner);

// ─── Note Node ───────────────────────────────────────────────────────────

function WorkspaceNoteInner({ data, selected }: NodeProps) {
  const d = data as {
    dbNode: { noteContent: string | null; color: string | null };
    onDelete?: () => void;
  };

  return (
    <div
      className="relative group"
      style={{
        minWidth: 140,
        maxWidth: 220,
        padding: "8px 10px",
        borderRadius: 6,
        backgroundColor: d.dbNode.color || "#f9f9f9",
        border: `1.5px solid ${selected ? "#0a0a0a" : "#e8e8e8"}`,
        fontSize: 11,
        lineHeight: 1.5,
        color: "#525252",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {d.dbNode.noteContent || "Add a note..."}

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Are you sure you want to delete this note?")) {
            d.onDelete?.();
          }
        }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 shadow-sm transition-all opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
}

export const WorkspaceNoteNode = memo(WorkspaceNoteInner);

// ─── Node types export ───────────────────────────────────────────────────

export const workspaceNodeTypes: NodeTypes = {
  workspaceFolder: WorkspaceFolderNode,
  workflowLink: WorkflowLinkNode,
  workspaceNote: WorkspaceNoteNode,
};
