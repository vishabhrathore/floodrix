// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-tree-sidebar.tsx
//  Sidebar tree view — traditional folder tree for workspace navigation
//
//  This is the ALTERNATIVE view to the canvas — users can toggle between
//  the tree sidebar and the visual canvas for organizing their workflows.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useState, useCallback } from "react";
import {
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    FileText,
    ExternalLink,
    MoreHorizontal,
    Plus,
    Pencil,
    Trash2,
    Link,
    StickyNote,
    Search,
} from "lucide-react";
import { useWorkspaceCanvas } from "../store/workspace-canvas-store";
// import { useWorkspaceCanvas, type WorkspaceNodeData } from "../workspace-canvas-store";

// ─── Component ───────────────────────────────────────────────────────────

export function WorkspaceTreeSidebar() {
    const { dbNodes, rootId, createFolder, createWorkflowLink, deleteNode, renameNode } =
        useWorkspaceCanvas();
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    // Build tree structure in memory
    const childMap = new Map();
    for (const node of dbNodes) {
        if (node._isDeleted) continue;
        const parentId = node.parentId;
        if (!childMap.has(parentId)) childMap.set(parentId, []);
        childMap.get(parentId)!.push(node);
    }

    // Sort children by sortOrder
    for (const [, children] of childMap) {
        children.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    }

    const rootChildren = childMap.get(rootId || null) || [];

    const startRename = (id: string, currentName: string) => {
        setEditingId(id);
        setEditValue(currentName);
    };

    const commitRename = () => {
        if (editingId && editValue.trim()) {
            renameNode(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    // Filter for search
    const matchesSearch = (node: any): boolean => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        if (node.name.toLowerCase().includes(q)) return true;
        // Check descendants
        const children = childMap.get(node.id) || [];
        return children.some(matchesSearch);
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-gray-100">
            {/* Header */}
            <div className="px-3 py-3 border-b border-gray-100">
                <div className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">
                    Workspace
                </div>
                <div className="relative">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-300 focus:bg-white transition-colors"
                    />
                </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-1 py-2">
                {rootChildren.filter(matchesSearch).map((node: any) => (
                    <TreeNode
                        key={node.id}
                        node={node}
                        childMap={childMap}
                        depth={0}
                        editingId={editingId}
                        editValue={editValue}
                        setEditValue={setEditValue}
                        startRename={startRename}
                        commitRename={commitRename}
                        matchesSearch={matchesSearch}
                    />
                ))}
            </div>

            {/* Footer actions */}
            <div className="px-3 py-2.5 border-t border-gray-100 flex gap-1.5">
                <button
                    onClick={() => rootId && createFolder(rootId, "New folder", "📁")}
                    className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                    <Plus size={12} /> Folder
                </button>
                <button
                    onClick={() => rootId && createWorkflowLink(rootId, "New link", "")}
                    className="flex items-center gap-1.5 flex-1 px-2.5 py-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                >
                    <Link size={12} /> Link
                </button>
            </div>
        </div>
    );
}

// ─── Recursive tree node ─────────────────────────────────────────────────

function TreeNode({
    node,
    childMap,
    depth,
    editingId,
    editValue,
    setEditValue,
    startRename,
    commitRename,
    matchesSearch,
}: {
    node: any;
    childMap: Map<string | null, any[]>;
    depth: number;
    editingId: string | null;
    editValue: string;
    setEditValue: (v: string) => void;
    startRename: (id: string, name: string) => void;
    commitRename: () => void;
    matchesSearch: (n: any) => boolean;
}) {
    const { deleteNode, createFolder, createWorkflowLink } = useWorkspaceCanvas();
    const [expanded, setExpanded] = useState(node.isExpanded);
    const [menuOpen, setMenuOpen] = useState(false);

    const children = (childMap.get(node.id) || []).filter(matchesSearch);
    const isFolder = node.nodeType === "FOLDER";
    const isLink = node.nodeType === "WORKFLOW_LINK";
    const isNote = node.nodeType === "NOTE";
    const hasChildren = children.length > 0;
    const isEditing = editingId === node.id;
    const folderCount = children.filter((c) => c.nodeType === "FOLDER").length;
    const linkCount = children.filter((c) => c.nodeType === "WORKFLOW_LINK").length;

    const status = (node.metadata as Record<string, string>)?.status;
    const badge = (node.metadata as Record<string, string>)?.badge;

    return (
        <div>
            {/* Node row */}
            <div
                className="group flex items-center gap-1 px-1.5 py-[3px] rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                style={{ paddingLeft: depth * 16 + 6 }}
                onClick={() => isFolder && setExpanded(!expanded)}
                onDoubleClick={() => startRename(node.id, node.name)}
            >
                {/* Expand chevron */}
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    {isFolder && hasChildren ? (
                        expanded ? (
                            <ChevronDown size={12} className="text-gray-400" />
                        ) : (
                            <ChevronRight size={12} className="text-gray-400" />
                        )
                    ) : isFolder ? (
                        <div className="w-1 h-1 rounded-full bg-gray-200" />
                    ) : null}
                </div>

                {/* Icon */}
                <div className="flex-shrink-0">
                    {isFolder ? (
                        expanded ? (
                            <FolderOpen size={14} className="text-amber-400" />
                        ) : (
                            <Folder size={14} className="text-amber-400" />
                        )
                    ) : isLink ? (
                        <FileText size={14} className="text-blue-400" />
                    ) : isNote ? (
                        <StickyNote size={14} className="text-yellow-400" />
                    ) : (
                        <ExternalLink size={14} className="text-gray-400" />
                    )}
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0 ml-1">
                    {isEditing ? (
                        <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") commitRename();
                                if (e.key === "Escape") { setEditValue(""); commitRename(); }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-1 py-0 text-[11px] font-medium border border-blue-300 rounded bg-white outline-none"
                        />
                    ) : (
                        <span
                            className={`text-[11px] font-medium truncate block ${status === "coming_soon" ? "text-gray-300" : "text-gray-700"
                                }`}
                        >
                            {node.icon && <span className="mr-1">{node.icon}</span>}
                            {node.name}
                        </span>
                    )}
                </div>

                {/* Badge */}
                {badge && (
                    <span className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                        {badge}
                    </span>
                )}

                {/* Coming soon tag */}
                {status === "coming_soon" && (
                    <span className="text-[8px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-100 flex-shrink-0">
                        Soon
                    </span>
                )}

                {/* Count (for folders) */}
                {isFolder && !expanded && (folderCount > 0 || linkCount > 0) && (
                    <span className="text-[10px] text-gray-300 flex-shrink-0">
                        {folderCount + linkCount}
                    </span>
                )}

                {/* Status dot (for links) */}
                {isLink && node.linkedWorkflowId && (
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                )}

                {/* Context menu button */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                        className="w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    >
                        <MoreHorizontal size={12} className="text-gray-400" />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                            <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-50 min-w-[140px]">
                                {isFolder && (
                                    <>
                                        <CtxButton
                                            icon={<Folder size={12} />}
                                            label="Add subfolder"
                                            onClick={() => { createFolder(node.id, "New folder"); setMenuOpen(false); }}
                                        />
                                        <CtxButton
                                            icon={<Link size={12} />}
                                            label="Add link"
                                            onClick={() => { createWorkflowLink(node.id, "New link", ""); setMenuOpen(false); }}
                                        />
                                        <div className="h-px bg-gray-100 my-0.5" />
                                    </>
                                )}
                                <CtxButton
                                    icon={<Pencil size={12} />}
                                    label="Rename"
                                    onClick={() => { startRename(node.id, node.name); setMenuOpen(false); }}
                                />
                                <CtxButton
                                    icon={<Trash2 size={12} />}
                                    label="Delete"
                                    onClick={() => { deleteNode(node.id); setMenuOpen(false); }}
                                    danger
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Children */}
            {isFolder && expanded && children.length > 0 && (
                <div>
                    {children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            childMap={childMap}
                            depth={depth + 1}
                            editingId={editingId}
                            editValue={editValue}
                            setEditValue={setEditValue}
                            startRename={startRename}
                            commitRename={commitRename}
                            matchesSearch={matchesSearch}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

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
            className={`flex items-center gap-2 w-full px-2 py-1.5 text-[11px] font-medium rounded-md transition-colors ${danger ? "text-red-500 hover:bg-red-50" : "text-gray-600 hover:bg-gray-50"
                }`}
        >
            {icon}
            {label}
        </button>
    );
}
