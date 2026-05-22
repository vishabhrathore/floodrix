// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/nodes/workspace-nodes.tsx
//  Fine-grained reactive custom React Flow nodes using MobX observer
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import {
  Handle,
  type NodeProps,
  type NodeTypes,
  Position,
} from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { observer } from "mobx-react-lite";

import { WORKSPACE_ICONS } from "../components/workspace-icons";
import { useWorkspaceCanvas } from "../store/workspace-canvas-store";

// ─── Folder Node Sub-Components ──────────────────────────────────────────

const FolderNodeIcon = observer(function FolderNodeIcon({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  return (
    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
      {node.icon ? (
        <span className="text-sm">{node.icon}</span>
      ) : (
        <WORKSPACE_ICONS.FOLDER size={16} className="text-slate-600" />
      )}
    </div>
  );
});

const FolderNodeContent = observer(function FolderNodeContent({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  const childIds = store.childIdMap.get(id) || [];
  let foldersCount = 0;
  let workflowsCount = 0;
  for (const childId of childIds) {
    const child = store.nodeMap.get(childId);
    if (child) {
      if (child.nodeType === "FOLDER") foldersCount++;
      if (child.nodeType === "WORKFLOW_LINK") workflowsCount++;
    }
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="text-[12px] font-semibold text-gray-800 truncate leading-tight">
        {node.name}
      </div>
      <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
        {foldersCount} folder{foldersCount !== 1 ? "s" : ""} · {workflowsCount}{" "}
        workflow{workflowsCount !== 1 ? "s" : ""}
      </div>
    </div>
  );
});

const FolderNodeBadge = observer(function FolderNodeBadge({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  const badge = (node.metadata?.badge as string) || null;
  if (!badge) return null;

  return (
    <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
      {badge}
    </span>
  );
});

// ─── Folder Node ─────────────────────────────────────────────────────────

export const WorkspaceFolderNode = observer(function WorkspaceFolderNode({
  id,
  selected,
}: NodeProps) {
  const store = useWorkspaceCanvas();

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
        <FolderNodeIcon id={id} />
        <FolderNodeContent id={id} />
        <FolderNodeBadge id={id} />

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this folder?")) {
              store.deleteNode(id);
            }
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 shadow-sm transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});

// ─── Workflow Link Node Sub-Components ───────────────────────────────────

const WorkflowLinkTargetHandle = observer(function WorkflowLinkTargetHandle({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  const isAttached = !!node.linkedWorkflowId;

  return (
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
  );
});

const WorkflowLinkIcon = observer(function WorkflowLinkIcon({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  return (
    <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
      {node.icon ? (
        <span className="text-xs">{node.icon}</span>
      ) : (
        <WORKSPACE_ICONS.WORKFLOW_LINK size={13} className="text-blue-500" />
      )}
    </div>
  );
});

const WorkflowLinkContent = observer(function WorkflowLinkContent({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  const isAttached = !!node.linkedWorkflowId;
  const linkedWorkflow = node.linkedWorkflow;

  return (
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-semibold text-gray-700 truncate leading-tight">
        {node.name}
      </div>
      {isAttached && linkedWorkflow && (
        <div className="text-[10px] text-blue-500 truncate leading-tight mt-0.5">
          {linkedWorkflow.name}
        </div>
      )}
    </div>
  );
});

const WorkflowLinkStatus = observer(function WorkflowLinkStatus({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  const isAttached = !!node.linkedWorkflowId;
  const status = (node.metadata as Record<string, string>)?.status ?? "active";
  const isComingSoon = status === "coming_soon";

  if (isComingSoon) {
    return (
      <span className="text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 border border-gray-100 flex-shrink-0">
        Soon
      </span>
    );
  }

  if (isAttached) {
    return (
      <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
    );
  }

  return (
    <div className="px-2 py-0.5 rounded bg-blue-500 text-white text-[9px] font-bold shadow-sm hover:bg-blue-600 cursor-pointer">
      Link
    </div>
  );
});

// ─── Workflow Link Node ──────────────────────────────────────────────────

export const WorkflowLinkNode = observer(function WorkflowLinkNode({
  id,
  selected,
}: NodeProps) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  const status = (node.metadata as Record<string, string>)?.status ?? "active";
  const isComingSoon = status === "coming_soon";

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
      <WorkflowLinkTargetHandle id={id} />

      {/* Content */}
      <div className="flex items-center gap-2 px-3 py-2">
        <WorkflowLinkIcon id={id} />
        <WorkflowLinkContent id={id} />
        <WorkflowLinkStatus id={id} />

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm("Are you sure you want to delete this link?")) {
              store.deleteNode(id);
            }
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 shadow-sm transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
        >
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
});

// ─── Note Node Sub-Components ────────────────────────────────────────────

const WorkspaceNoteContent = observer(function WorkspaceNoteContent({
  id,
}: {
  id: string;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  return <>{node.noteContent || "Add a note..."}</>;
});

// ─── Note Node ───────────────────────────────────────────────────────────

export const WorkspaceNoteNode = observer(function WorkspaceNoteNode({
  id,
  selected,
}: NodeProps) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(id);
  if (!node) return null;

  return (
    <div
      className="relative group"
      style={{
        minWidth: 140,
        maxWidth: 220,
        padding: "8px 10px",
        borderRadius: 6,
        backgroundColor: node.color || "#f9f9f9",
        border: `1.5px solid ${selected ? "#0a0a0a" : "#e8e8e8"}`,
        fontSize: 11,
        lineHeight: 1.5,
        color: "#525252",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <WorkspaceNoteContent id={id} />

      {/* Delete Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm("Are you sure you want to delete this note?")) {
            store.deleteNode(id);
          }
        }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 shadow-sm transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
      >
        <Trash2 size={10} />
      </button>
    </div>
  );
});

// ─── Node types export ───────────────────────────────────────────────────

export const workspaceNodeTypes: NodeTypes = {
  workspaceFolder: WorkspaceFolderNode,
  workflowLink: WorkflowLinkNode,
  workspaceNote: WorkspaceNoteNode,
};
