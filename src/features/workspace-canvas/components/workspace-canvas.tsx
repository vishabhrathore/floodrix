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

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Check,
  ChevronLeft,
  FolderPlus,
  LayoutGrid,
  Link,
  List,
  Loader2,
  Plus,
  Save,
} from "lucide-react";

import { useTRPC } from "@/trpc/client";

import { WorkspaceEdge } from "../edges/workspace-edges";
import { workspaceNodeTypes } from "../nodes/workspace-nodes";
import { useWorkspaceCanvas } from "../store/workspace-canvas-store";
import { WorkspaceTreeSidebar } from "./workspace-tree-panel";

// ─── Props ───────────────────────────────────────────────────────────────

interface WorkspaceCanvasEditorProps {
  workspaceId: string;
  onBack?: () => void;
  onOpenWorkflow?: (workflowId: string) => void;
}

const edgeTypes = {
  workspaceEdge: WorkspaceEdge,
};

// ─── Component ───────────────────────────────────────────────────────────

export function WorkspaceCanvasEditor({
  workspaceId,
  onBack,
  onOpenWorkflow,
}: WorkspaceCanvasEditorProps) {
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const [view, setView] = useState<"canvas" | "tree">("canvas");
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const trpc = useTRPC();
  const store = useWorkspaceCanvas();

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
  const flushStore = useWorkspaceCanvas((s) => s.flush);

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [searchAllOrgs, setSearchAllOrgs] = useState(false);

  // Fetch workspace metadata (for organizationId)
  const { data: workspaceMetadata } = useQuery(
    trpc.workspaceCanvas.get.queryOptions({ workspaceId }),
  );
  const organizationId = workspaceMetadata?.organizationId;

  // Fetch organization name
  const { data: orgData } = useQuery({
    ...trpc.organizations.getOne.queryOptions({ id: organizationId! }),
    enabled: !!organizationId,
  });

  // Fetch workflows for the link selector
  const [workflowSearch, setWorkflowSearch] = useState("");
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery({
    ...trpc.calcWorkflows.getMany.queryOptions({
      organizationId: searchAllOrgs ? undefined : organizationId!,
      search: workflowSearch,
    }),
    enabled: !!organizationId,
  });

  const attachWorkflow = useWorkspaceCanvas((s) => s.attachWorkflow);

  // Mutation for saving
  const saveMutation = useMutation(
    trpc.workspaceCanvas.saveCanvas.mutationOptions(),
  );

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    // Extract changes from store
    const dbNodes = useWorkspaceCanvas.getState().dbNodes;
    const create = dbNodes
      .filter((n) => n._isNew && !n._isDeleted)
      .map((n) => ({
        id: n.id,
        parentId: n.parentId!,
        nodeType: n.nodeType,
        name: n.name,
        icon: n.icon,
        sortOrder: n.sortOrder,
        canvasX: n.canvasX,
        canvasY: n.canvasY,
        linkedWorkflowId: n.linkedWorkflowId,
        metadata: n.metadata,
      }));
    const update = dbNodes
      .filter((n) => n._isDirty && !n._isNew && !n._isDeleted)
      .map((n) => ({
        id: n.id,
        data: {
          parentId: n.parentId,
          name: n.name,
          icon: n.icon,
          sortOrder: n.sortOrder,
          canvasX: n.canvasX,
          canvasY: n.canvasY,
          linkedWorkflowId: n.linkedWorkflowId,
          metadata: n.metadata,
        },
      }));
    const deleteIds = dbNodes
      .filter((n) => n._isDeleted && !n._isNew)
      .map((n) => n.id);

    try {
      await saveMutation.mutateAsync({
        workspaceId,
        create,
        update,
        delete: deleteIds,
      });
      // Successfully saved, now clear dirty flags in store
      flushStore();
    } catch (err) {
      console.error("Failed to save workspace:", err);
    }
  };

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isDirty) handleSave();
    };
  }, [isDirty]);

  const handleSelectWorkflow = (workflowId: string, name: string) => {
    if (targetNodeId) {
      attachWorkflow(targetNodeId, workflowId);
      // Optionally rename the node to the workflow name if it's still default
      const node = rfNodes.find((n) => n.id === targetNodeId);
      if (node?.data?.dbNode?.name === "New workflow link") {
        useWorkspaceCanvas.getState().renameNode(targetNodeId, name);
      }
    }
    setSelectorOpen(false);
    setTargetNodeId(null);
  };

  // Double-click workflow link → open workflow editor OR select if unlinked
  const onNodeDoubleClick = useCallback(
    (_e: React.MouseEvent, node: any) => {
      if (node.type === "workflowLink") {
        const dbNode = node.data?.dbNode;
        const linkedId = dbNode?.linkedWorkflowId;
        if (linkedId && onOpenWorkflow) {
          onOpenWorkflow(linkedId);
        } else {
          setTargetNodeId(node.id);
          setSelectorOpen(true);
        }
      }
    },
    [onOpenWorkflow],
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
    createWorkflowLink(rootId, "New workflow link", null as any, center);
  }, [rootId, createWorkflowLink]);

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
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
              view === "canvas"
                ? "bg-white text-gray-700 shadow-sm"
                : "text-gray-400"
            }`}
          >
            <LayoutGrid size={11} /> Canvas
          </button>
          <button
            onClick={() => setView("tree")}
            className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
              view === "tree"
                ? "bg-white text-gray-700 shadow-sm"
                : "text-gray-400"
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
            <button
              onClick={() => handleSave()}
              className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-white bg-amber-500 rounded-md hover:bg-amber-600 shadow-sm transition-all"
            >
              <Save size={11} /> Save Changes
            </button>
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
              onInit={(instance) => {
                rfInstance.current = instance;
              }}
              nodeTypes={workspaceNodeTypes}
              edgeTypes={edgeTypes}
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
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="#e2e8f0"
              />
              <Controls
                showZoom
                showFitView
                showInteractive={false}
                position="bottom-left"
                className="!bg-white !border-gray-200 !rounded-lg !shadow-sm"
              />
              <MiniMap
                position="bottom-right"
                className="!bg-white !border-gray-200 !rounded-lg !shadow-sm"
                maskColor="rgba(0,0,0,0.05)"
                nodeColor={(n) =>
                  n.type === "workspaceFolder" ? "#fbbf24" : "#60a5fa"
                }
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

      {/* Workflow Selection Dialog */}
      {selectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] max-h-[500px] flex flex-col border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div>
                <h2 className="text-sm font-bold text-gray-800">
                  Select Workflow to Link
                </h2>
                <p className="text-[10px] text-gray-500">
                  {searchAllOrgs
                    ? "Searching across all organizations"
                    : `In ${orgData?.name || "Organization"}`}
                </p>
              </div>
              <button
                onClick={() => setSelectorOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <ChevronLeft size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-3 border-b border-gray-50 space-y-2">
              <input
                type="text"
                placeholder="Search workflows..."
                value={workflowSearch}
                onChange={(e) => setWorkflowSearch(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                autoFocus
              />

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={searchAllOrgs}
                    onChange={(e) => setSearchAllOrgs(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500/20"
                  />
                  <span className="text-[10px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                    Search all organizations (Admin)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 bg-white">
              {workflowsLoading ? (
                <div className="flex items-center justify-center py-10 text-gray-400 text-xs">
                  <Loader2 size={16} className="animate-spin mr-2" /> Loading
                  workflows...
                </div>
              ) : workflowsData?.items.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-xs italic">
                  No workflows found in this organization.
                </div>
              ) : (
                workflowsData?.items.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => handleSelectWorkflow(wf.id, wf.name)}
                    className="w-full text-left p-3 rounded-lg hover:bg-blue-50 transition-colors group"
                  >
                    <div className="text-[12px] font-semibold text-gray-800 group-hover:text-blue-700">
                      {wf.name}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {wf.category || "General"} · {wf.status}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setSelectorOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
