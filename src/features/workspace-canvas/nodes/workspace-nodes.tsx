// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-nodes.tsx
//  Custom React Flow nodes for the workspace organizer canvas
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps, type NodeTypes } from "@xyflow/react";
import {
    Folder,
    FileText,
    ExternalLink,
    ChevronRight,
    StickyNote,
} from "lucide-react";

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
    };

    const badge = (d.dbNode.metadata?.badge as string) || null;

    return (
        <div
            className="relative"
            style={{
                minWidth: 180,
                maxWidth: 240,
                borderRadius: 10,
                border: `1.5px solid ${selected ? "#f59e0b" : "#e5e7eb"}`,
                backgroundColor: "white",
                boxShadow: selected
                    ? "0 0 0 2px rgba(245,158,11,0.15), 0 4px 12px rgba(0,0,0,0.06)"
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
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: "#fbbf24", border: "2px solid #f59e0b",
                    top: -4,
                }}
            />

            {/* Output handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: "white", border: "2px solid #f59e0b",
                    bottom: -4,
                }}
            />

            {/* Content */}
            <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    {d.dbNode.icon ? (
                        <span className="text-sm">{d.dbNode.icon}</span>
                    ) : (
                        <Folder size={16} className="text-amber-500" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-gray-800 truncate leading-tight">
                        {d.dbNode.name}
                    </div>
                    <div className="text-[10px] text-gray-400 leading-tight mt-0.5">
                        {d.childCount} folder{d.childCount !== 1 ? "s" : ""} · {d.workflowCount} workflow{d.workflowCount !== 1 ? "s" : ""}
                    </div>
                </div>

                {badge && (
                    <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                        {badge}
                    </span>
                )}
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
    };

    const isAttached = !!d.dbNode.linkedWorkflowId;
    const isComingSoon = d.status === "coming_soon";

    return (
        <div
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
                    width: 8, height: 8, borderRadius: "50%",
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
                        <FileText size={13} className="text-blue-500" />
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
                    <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />
                )}
            </div>
        </div>
    );
}

export const WorkflowLinkNode = memo(WorkflowLinkInner);

// ─── Note Node ───────────────────────────────────────────────────────────

function WorkspaceNoteInner({ data, selected }: NodeProps) {
    const d = data as {
        dbNode: { noteContent: string | null; color: string | null };
    };

    return (
        <div
            style={{
                minWidth: 140,
                maxWidth: 220,
                padding: "8px 10px",
                borderRadius: 6,
                backgroundColor: d.dbNode.color || "#fef3c7",
                border: `1.5px solid ${selected ? "#f59e0b" : "transparent"}`,
                fontSize: 11,
                lineHeight: 1.5,
                color: "#78350f",
                fontFamily: "'Inter', system-ui, sans-serif",
            }}
        >
            {d.dbNode.noteContent || "Add a note..."}
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
