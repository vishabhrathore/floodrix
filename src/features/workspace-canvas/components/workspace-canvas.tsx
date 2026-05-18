// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-canvas-editor.tsx
//  Main workspace editor — visual canvas + toolbar
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
import { ChevronLeft, Loader2 } from "lucide-react";
import { observer } from "mobx-react-lite";

import { useTRPC } from "@/trpc/client";

import { WorkspaceEdge } from "../edges/workspace-edges";
import { workspaceNodeTypes } from "../nodes/workspace-nodes";
import { useWorkspaceCanvas } from "../store/workspace-canvas-store";
import { WorkspaceCanvasHeader } from "./workspace-canvas-header";

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

export const WorkspaceCanvasEditor = observer(function WorkspaceCanvasEditor({
  workspaceId,
  onBack,
  onOpenWorkflow,
}: WorkspaceCanvasEditorProps) {
  const rfInstance = useRef<ReactFlowInstance | null>(null);

  const trpc = useTRPC();
  const store = useWorkspaceCanvas();

  const rfNodes = store.rfNodes;
  const rfEdges = store.rfEdges;
  const onNodesChange = store.onNodesChange;
  const onEdgesChange = store.onEdgesChange;
  const onConnect = store.onConnect;
  const createFolder = store.createFolder;
  const createWorkflowLink = store.createWorkflowLink;
  const rootId = store.rootId;
  const isDirty = store.isDirty;
  const isSaving = store.isSaving;
  const lastSavedAt = store.lastSavedAt;
  const flushStore = store.flush;

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

  const attachWorkflow = store.attachWorkflow;

  // Mutation for saving
  const saveMutation = useMutation(
    trpc.workspaceCanvas.saveCanvas.mutationOptions(),
  );

  const handleSave = async () => {
    if (!isDirty || isSaving) return;

    // Extract changes from store
    const dbNodes = store.dbNodes;
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
      const node = rfNodes.find((n) => n.id === targetNodeId) as any;
      if (node?.data?.dbNode?.name === "New workflow link") {
        store.renameNode(targetNodeId, name);
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
    createFolder(rootId, "New folder", undefined, center);
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
    <div className="flex flex-col h-full bg-gray-50">
      {/* Standalone Toolbar Header */}
      <WorkspaceCanvasHeader
        onBack={onBack}
        isSaving={isSaving}
        isDirty={isDirty}
        handleSave={handleSave}
        lastSavedAt={lastSavedAt}
        addFolderAtCenter={addFolderAtCenter}
        addLinkAtCenter={addLinkAtCenter}
      />

      {/* ── Main area ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
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
});
