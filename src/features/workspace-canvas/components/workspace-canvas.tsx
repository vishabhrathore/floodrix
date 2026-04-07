// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-canvas-editor.tsx
//  Main workspace editor — tree sidebar + visual canvas + toolbar
//
//  Layout:
//  ┌──────────────────────────────────────────────────────────────┐
//  │ Toolbar: workspace name, view toggle, create buttons        │
//  ├──────────────┬──────────────────────────────────────────────┤
//  │ Tree sidebar │         React Flow Canvas                    │
//  │   (240px)    │  Folders and workflow links as visual nodes   │
//  │  (optional)  │                                               │
//  └──────────────┴──────────────────────────────────────────────┘
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type ReactFlowInstance,
    BackgroundVariant,
    Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
    ChevronLeft,
    LayoutGrid,
    List,
    Plus,
    FolderPlus,
    Link,
    Save,
    Loader2,
    Check,
} from "lucide-react";

import { useWorkspaceCanvas } from "../store/workspace-canvas-store";
import { WorkspaceTreeSidebar } from "./workspace-tree-panel";
import { workspaceNodeTypes } from "../nodes/workspace-nodes";

// ─── Props ───────────────────────────────────────────────────────────────

interface WorkspaceCanvasEditorProps {
    workspaceId: string;
    onBack?: () => void;
    onOpenWorkflow?: (workflowId: string) => void;
}

// ─── Component ───────────────────────────────────────────────────────────

export function WorkspaceCanvasEditor({
    workspaceId,
    onBack,
    onOpenWorkflow,
}: WorkspaceCanvasEditorProps) {
    const rfInstance = useRef<ReactFlowInstance | null>(null);
    const [view, setView] = useState<"canvas" | "tree">("canvas");
    const [sidebarVisible, setSidebarVisible] = useState(true);

    const rfNodes = useWorkspaceCanvas((s) => s.rfNodes);
    const rfEdges = useWorkspaceCanvas((s) => s.rfEdges);
    const onNodesChange = useWorkspaceCanvas((s) => s.onNodesChange);
    const onEdgesChange = useWorkspaceCanvas((s) => s.onEdgesChange);
    const onConnect = useWorkspaceCanvas((s) => s.onConnect);
    const createFolder = useWorkspaceCanvas((s) => s.createFolder);
    const createWorkflowLink = useWorkspaceCanvas((s) => s.createWorkflowLink);
    const rootId = useWorkspaceCanvas((s) => s.rootId);
    const isDirty = useWorkspaceCanvas((s) => s.isDirty);
    const isSaving = useWorkspaceCanvas((s) => s.isSaving);
    const lastSavedAt = useWorkspaceCanvas((s) => s.lastSavedAt);
    const flush = useWorkspaceCanvas((s) => s.flush);

    // Load workspace data
    // useEffect(() => {
    //   const data = await trpc.workspace.load.query({ workspaceId });
    //   store.initialize(workspaceId, data.nodes);
    // }, [workspaceId]);

    // Double-click workflow link → open workflow editor
    const onNodeDoubleClick = useCallback(
        (_e: React.MouseEvent, node: { type?: string; data?: Record<string, unknown> }) => {
            if (node.type === "workflowLink") {
                const dbNode = (node.data as Record<string, unknown>)?.dbNode as Record<string, unknown>;
                const linkedId = dbNode?.linkedWorkflowId as string;
                if (linkedId && onOpenWorkflow) {
                    onOpenWorkflow(linkedId);
                }
            }
        },
        [onOpenWorkflow]
    );

    // Add folder at canvas center
    const addFolderAtCenter = useCallback(() => {
        if (!rootId || !rfInstance.current) return;
        const center = rfInstance.current.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
        createFolder(rootId, "New folder", "📁", center);
    }, [rootId, createFolder]);

    // Add workflow link at canvas center
    const addLinkAtCenter = useCallback(() => {
        if (!rootId || !rfInstance.current) return;
        const center = rfInstance.current.screenToFlowPosition({
            x: window.innerWidth / 2,
            y: window.innerHeight / 2,
        });
        createWorkflowLink(rootId, "New workflow link", "", center);
    }, [rootId, createWorkflowLink]);

    // Save on unmount
    useEffect(() => {
        return () => { if (isDirty) flush(); };
    }, []);

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* ── Toolbar ─────────────────────────────────────────────── */}
            <div className="h-12 bg-white border-b border-gray-100 flex items-center px-3 gap-2 flex-shrink-0">
                {/* Back */}
                {onBack && (
                    <>
                        <button
                            onClick={onBack}
                            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                        >
                            <ChevronLeft size={16} className="text-gray-400" />
                        </button>
                        <div className="w-px h-5 bg-gray-100" />
                    </>
                )}

                {/* Title */}
                <h1 className="text-sm font-semibold text-gray-800">Workspace</h1>

                {/* View toggle */}
                <div className="flex bg-gray-100 rounded-md p-0.5 ml-2">
                    <button
                        onClick={() => setView("canvas")}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${view === "canvas" ? "bg-white text-gray-700 shadow-sm" : "text-gray-400"
                            }`}
                    >
                        <LayoutGrid size={11} /> Canvas
                    </button>
                    <button
                        onClick={() => setView("tree")}
                        className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${view === "tree" ? "bg-white text-gray-700 shadow-sm" : "text-gray-400"
                            }`}
                    >
                        <List size={11} /> Tree
                    </button>
                </div>

                {/* Sidebar toggle (canvas view only) */}
                {view === "canvas" && (
                    <button
                        onClick={() => setSidebarVisible(!sidebarVisible)}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <List size={11} />
                        {sidebarVisible ? "Hide tree" : "Show tree"}
                    </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Save status */}
                <div className="flex items-center gap-1.5 mr-3">
                    {isSaving ? (
                        <div className="flex items-center gap-1 text-[11px] text-blue-500">
                            <Loader2 size={12} className="animate-spin" /> Saving
                        </div>
                    ) : isDirty ? (
                        <div className="flex items-center gap-1 text-[11px] text-amber-500">
                            Unsaved changes
                        </div>
                    ) : lastSavedAt ? (
                        <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Check size={12} /> Saved
                        </div>
                    ) : null}
                </div>

                {/* Action buttons */}
                <button
                    onClick={addFolderAtCenter}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                    <FolderPlus size={13} /> Folder
                </button>
                <button
                    onClick={addLinkAtCenter}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow-sm"
                >
                    <Link size={13} /> Link workflow
                </button>
            </div>

            {/* ── Main area ───────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Tree sidebar */}
                {(view === "tree" || (view === "canvas" && sidebarVisible)) && (
                    <div className="w-[240px] flex-shrink-0">
                        <WorkspaceTreeSidebar />
                    </div>
                )}

                {/* Canvas (hidden in tree-only view) */}
                {view === "canvas" && (
                    <div className="flex-1">
                        <ReactFlow
                            nodes={rfNodes}
                            edges={rfEdges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeDoubleClick={onNodeDoubleClick}
                            onInit={(instance) => { rfInstance.current = instance; }}
                            nodeTypes={workspaceNodeTypes}
                            fitView
                            snapToGrid
                            snapGrid={[20, 20]}
                            defaultEdgeOptions={{
                                type: "smoothstep",
                                animated: false,
                                style: { strokeWidth: 1.5, stroke: "#e5e7eb" },
                            }}
                            proOptions={{ hideAttribution: true }}
                            className="bg-gray-50"
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
                            <Controls showZoom showFitView showInteractive={false} position="bottom-left" className="!bg-white !border-gray-200 !rounded-lg !shadow-sm" />
                            <MiniMap
                                position="bottom-right"
                                className="!bg-white !border-gray-200 !rounded-lg !shadow-sm"
                                maskColor="rgba(0,0,0,0.05)"
                                nodeColor={(n) => n.type === "workspaceFolder" ? "#fbbf24" : "#60a5fa"}
                            />

                            {rfNodes.length === 0 && (
                                <Panel position="top-center" className="pointer-events-none">
                                    <div className="text-center mt-32">
                                        <div className="text-lg font-semibold text-gray-300 mb-1">
                                            Create folders to organize your workflows
                                        </div>
                                        <div className="text-sm text-gray-300">
                                            Use the toolbar buttons above or right-click the canvas
                                        </div>
                                    </div>
                                </Panel>
                            )}
                        </ReactFlow>
                    </div>
                )}

                {/* Tree-only view (full width) */}
                {view === "tree" && !sidebarVisible && null}
            </div>
        </div>
    );
}
