"use client";

import { useState } from "react";

import {
  Box,
  ChevronDown,
  ChevronRight,
  Folder,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { observer } from "mobx-react-lite";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { useWorkspaceCanvas } from "../store/workspace-canvas-store";
import { WORKSPACE_ICONS } from "./workspace-icons";

// ─── Main Sidebar Component ──────────────────────────────────────────────

export const WorkspaceTreeSidebar = observer(function WorkspaceTreeSidebar() {
  const store = useWorkspaceCanvas();
  const [isRootDragOver, setIsRootDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsRootDragOver(true);
  };

  const handleDragLeave = () => {
    setIsRootDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRootDragOver(false);
    const draggedId = e.dataTransfer.getData("text/plain");
    if (draggedId && store.rootId && draggedId !== store.rootId) {
      store.moveNode(draggedId, store.rootId);
    }
  };

  return (
    <div className="w-[240px] border-r border-[#e8e8e8] bg-white text-[#0a0a0a] flex flex-col h-full flex-shrink-0 z-20">
      <div className="h-[56px] px-4 border-b border-[#e8e8e8] flex flex-row items-center gap-2.5 bg-white flex-shrink-0">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[#0a0a0a]">
          <Box size={12} className="text-white" strokeWidth={3} />
        </div>
        <div className="flex items-center text-[13px] font-semibold tracking-tight text-[#0a0a0a]">
          <span>Workspace</span>
          <span className="mx-1 font-light text-[#d4d4d4]">/</span>
          <span className="font-normal text-[#a1a1a1]">Tree</span>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "scrollbar-hide flex-1 flex flex-col gap-0 py-2 overflow-y-auto transition-colors duration-200",
          isRootDragOver ? "bg-slate-50/50" : "bg-white",
        )}
      >
        <TreeSearchInput />

        <div className="flex-1 px-1 space-y-0.5">
          {store.rootId ? (
            <TreeChildrenList parentId={store.rootId} depth={0} />
          ) : null}
        </div>
      </div>

      <div className="p-3 border-t border-[#e8e8e8] bg-white flex flex-row gap-2 flex-shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            store.rootId && store.createFolder(store.rootId, "New folder")
          }
          className="flex-1 cursor-pointer"
        >
          <Plus size={11} /> Folder
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={() =>
            store.rootId &&
            store.createWorkflowLink(store.rootId, "New link", "")
          }
          className="flex-1 cursor-pointer"
        >
          <Plus size={11} /> Link
        </Button>
      </div>
    </div>
  );
});

// ─── Search Input Component ──────────────────────────────────────────────

const TreeSearchInput = observer(function TreeSearchInput() {
  const store = useWorkspaceCanvas();
  return (
    <div className="px-4 py-2 border-b border-[#e8e8e8] mb-2">
      <div className="relative">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#a1a1a1]"
        />
        <input
          type="text"
          value={store.treeSearchQuery}
          onChange={(e) => store.setTreeSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-[#fafafa] border border-[#e8e8e8] rounded-md outline-none focus:border-[#d4d4d4] focus:bg-white transition-all text-[#0a0a0a] placeholder:text-[#a1a1a1]"
        />
      </div>
    </div>
  );
});

// ─── Children List Component ─────────────────────────────────────────────

const TreeChildrenList = observer(function TreeChildrenList({
  parentId,
  depth,
}: {
  parentId: string | null;
  depth: number;
}) {
  const store = useWorkspaceCanvas();
  const childIds = store.childIdMap.get(parentId) || [];
  const searchMatches = store.searchMatches;

  const visibleIds = searchMatches
    ? childIds.filter((id) => searchMatches.has(id))
    : childIds;

  if (visibleIds.length === 0) return null;

  return (
    <>
      {visibleIds.map((id) => (
        <TreeNode key={id} nodeId={id} depth={depth} />
      ))}
    </>
  );
});

// ─── Individual Node Component ───────────────────────────────────────────

const TreeNode = observer(function TreeNode({
  nodeId,
  depth,
}: {
  nodeId: string;
  depth: number;
}) {
  const store = useWorkspaceCanvas();
  const node = store.nodeMap.get(nodeId);

  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!node) return null;

  const isFolder = node.nodeType === "FOLDER";
  const isLink = node.nodeType === "WORKFLOW_LINK";
  const isNote = node.nodeType === "NOTE";
  const isEditing = store.editingNodeId === node.id;
  const isSelected = store.selectedNodeId === node.id;
  const expanded = node.isExpanded;

  const handleRowClick = (e: React.MouseEvent) => {
    store.selectNode(node.id);
    if (isFolder) {
      node.isExpanded = !node.isExpanded;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!isFolder) return;
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const draggedId = e.dataTransfer.getData("text/plain");
    console.log("[TreeNode] handleDrop on target node:", node.id, "draggedId:", draggedId);
    if (draggedId && draggedId !== node.id) {
      store.moveNode(draggedId, node.id);
    } else {
      console.warn("[TreeNode] handleDrop skipped, draggedId is missing or identical to target.");
    }
  };

  if (isEditing) {
    return (
      <div className="px-4 py-1">
        <input
          autoFocus
          value={store.editingNodeValue}
          onChange={(e) => store.setEditValueUI(e.target.value)}
          onBlur={() => store.commitRenameUI()}
          onKeyDown={(e) => {
            if (e.key === "Enter") store.commitRenameUI();
            if (e.key === "Escape") {
              store.setEditValueUI("");
              store.commitRenameUI();
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full px-2 py-1 text-[12px] font-medium border border-[#d4d4d4] rounded bg-white outline-none focus:border-[#0a0a0a] transition-all"
        />
      </div>
    );
  }

  if (isLink || isNote) {
    return (
      <div className="relative">
        <div
          draggable={true}
          onDragStart={handleDragStart}
          className={cn(
            "group relative flex w-full items-center gap-2 py-1.5 pl-4 pr-4 text-[13px] transition-all cursor-pointer select-none",
            isSelected
              ? "bg-[#fafafa] text-[#0a0a0a] font-medium"
              : "text-[#525252] hover:text-[#0a0a0a] hover:bg-[#fafafa]",
          )}
          onClick={handleRowClick}
          onDoubleClick={() => store.startRenameUI(node.id, node.name)}
        >
          {isSelected && (
            <div className="absolute left-0 h-full w-[2px] bg-[#0a0a0a]" />
          )}

          {isLink ? (
            <WORKSPACE_ICONS.WORKFLOW_LINK
              size={14}
              className={cn(
                "shrink-0 transition-colors",
                isSelected ? "text-[#0a0a0a]" : "opacity-35",
              )}
            />
          ) : (
            <WORKSPACE_ICONS.NOTE
              size={14}
              className={cn(
                "shrink-0 transition-colors",
                isSelected ? "text-[#0a0a0a]" : "opacity-35",
              )}
            />
          )}

          <span className="truncate flex-1">
            {node.icon && <span className="mr-1">{node.icon}</span>}
            {node.name}
          </span>

          {isLink && node.linkedWorkflowId && (
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          )}

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#f0f0f0] transition-all"
            >
              <MoreHorizontal size={12} className="text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-6 bg-white border border-[#e8e8e8] rounded-md shadow-md p-1 z-50 min-w-[140px]">
                  <CtxButton
                    icon={<Pencil size={12} />}
                    label="Rename"
                    onClick={() => {
                      store.startRenameUI(node.id, node.name);
                      setMenuOpen(false);
                    }}
                  />
                  <CtxButton
                    icon={<Trash2 size={12} />}
                    label="Delete"
                    onClick={() => {
                      store.deleteNode(node.id);
                      setMenuOpen(false);
                    }}
                    danger
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div
        draggable={true}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group flex w-full items-center gap-2 py-1.5 pl-4 pr-4 text-[13px] transition-all cursor-pointer hover:bg-[#fafafa] select-none",
          isDragOver
            ? "bg-blue-50/70 text-blue-600 font-semibold border-l-2 border-blue-500 pl-[14px]"
            : expanded || isSelected
              ? "text-[#0a0a0a] font-medium"
              : "text-[#525252]",
        )}
        onClick={handleRowClick}
        onDoubleClick={() => store.startRenameUI(node.id, node.name)}
      >
        <WORKSPACE_ICONS.FOLDER
          size={14}
          className={cn(
            "shrink-0 transition-colors",
            expanded || isSelected ? "text-[#0a0a0a] opacity-90" : "opacity-40",
          )}
        />

        <span className="truncate flex-1 text-left">
          {node.icon && <span className="mr-1">{node.icon}</span>}
          {node.name}
        </span>

        {expanded ? (
          <ChevronDown size={12} className="opacity-30 shrink-0" />
        ) : (
          <ChevronRight size={12} className="opacity-30 shrink-0" />
        )}

        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-[#f0f0f0] transition-all"
          >
            <MoreHorizontal size={12} className="text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-6 bg-white border border-[#e8e8e8] rounded-md shadow-md p-1 z-50 min-w-[140px]">
                <CtxButton
                  icon={<Folder size={12} />}
                  label="Add subfolder"
                  onClick={() => {
                    store.createFolder(node.id, "New folder");
                    setMenuOpen(false);
                  }}
                />
                <CtxButton
                  icon={<WORKSPACE_ICONS.WORKFLOW_LINK size={12} />}
                  label="Add link"
                  onClick={() => {
                    store.createWorkflowLink(node.id, "New link", "");
                    setMenuOpen(false);
                  }}
                />
                <div className="h-px bg-[#e8e8e8] my-0.5" />
                <CtxButton
                  icon={<Pencil size={12} />}
                  label="Rename"
                  onClick={() => {
                    store.startRenameUI(node.id, node.name);
                    setMenuOpen(false);
                  }}
                />
                <CtxButton
                  icon={<Trash2 size={12} />}
                  label="Delete"
                  onClick={() => {
                    store.deleteNode(node.id);
                    setMenuOpen(false);
                  }}
                  danger
                />
              </div>
            </>
          )}
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-0.5 ml-3 border-l border-[#f0f0f0]">
          <TreeChildrenList parentId={node.id} depth={depth + 1} />
        </div>
      )}
    </div>
  );
});

// ─── Utility Components ──────────────────────────────────────────────────

function CtxButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-medium rounded transition-colors cursor-pointer",
        danger
          ? "text-red-500 hover:bg-red-50"
          : "text-gray-600 hover:bg-gray-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
