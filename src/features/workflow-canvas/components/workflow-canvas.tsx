// src/features/workflow-canvas/components/workflow-canvas.tsx

"use client";

import { useCallback, useEffect, useRef } from "react";
import {
    ReactFlow,
    Background,
    Panel,
    useReactFlow,
    type NodeTypes,
    type Node,
    type Edge,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

import { useWorkflowCanvasStore } from "../store/workflow-canvas-store";
import { nodeTypes } from "../nodes";
import { edgeTypes } from "./edges";
import { WorkflowToolbar } from "./workflow-toolbar";
import { WorkflowSidebar } from "./workflow-sidebar";
import { WorkflowInspector } from "./workflow-inspector";
import { WorkflowMinimap } from "./workflow-minimap";
import { useAutoSave } from "../hooks/use-auto-save";
import { useExecution } from "../hooks/use-execution";
import { useNodeConfig } from "../hooks/use-node-config";
import { useKeyboardShortcuts } from "../hooks/use-keyboard-shortcuts";
import { useConfigDrawer } from "../config";
import type { CalcNodeType } from "@/generated/prisma";

const DRAG_KEY = "application/reactflow-node-type";

interface WorkflowCanvasProps {
    workflowId: string;
    workflowName: string;
    workflowStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "DEPRECATED";
    organizationId: string;
}

// ─── Transform DB → React Flow ─────────────────────────────────────────────

function dbNodesToRFNodes(dbNodes: {
    id: string; type: string; label: string; description?: string | null;
    positionX: number; positionY: number; config: unknown; style: unknown;
}[]): Node[] {
    return dbNodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: { x: n.positionX, y: n.positionY },
        data: {
            label: n.label,
            description: n.description ?? "",
            config: (n.config as Record<string, unknown>) ?? {},
        },
        style: (n.style as Record<string, unknown>) ?? {},
    }));
}

function dbEdgesToRFEdges(dbEdges: {
    id: string; sourceNodeId: string; targetNodeId: string;
    sourceHandle: string; targetHandle: string;
    label?: string | null; condition?: unknown; style: unknown;
}[]): Edge[] {
    return dbEdges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: e.condition ? "conditional" : "default",
        label: e.label ?? undefined,
        data: e.condition ? { condition: e.condition } : undefined,
        style: (e.style as Record<string, unknown>) ?? {},
    }));
}

// ─── Inner canvas ───────────────────────────────────────────────────────────

function WorkflowCanvasInternal({
    workflowId,
    workflowName,
    workflowStatus,
    organizationId,
}: WorkflowCanvasProps) {
    const store = useWorkflowCanvasStore();
    const { screenToFlowPosition } = useReactFlow();
    const trpc = useTRPC();

    // ── Fetch workflow data ───────────────────────────────────────────────
    const workflowQuery = useQuery(
        trpc.calcWorkflowCanvas.get.queryOptions(
            { workflowId },
            { staleTime: 30_000 }
        )
    );

    // ── Initialize store when data arrives ────────────────────────────────
    const initializedRef = useRef(false);



    useEffect(() => {
        if (workflowQuery.data && !initializedRef.current) {
            const rfNodes = dbNodesToRFNodes(workflowQuery.data.nodes);
            const rfEdges = dbEdgesToRFEdges(workflowQuery.data.edges);
            store.initialize(workflowId, rfNodes, rfEdges);
            initializedRef.current = true;
        }
    }, [workflowQuery.data, workflowId, store]);

    useEffect(() => {
        initializedRef.current = false;
    }, [workflowId]);

    // ── Config drawer ─────────────────────────────────────────────────────
    const { drawer: configDrawer, openDrawer: openConfigDrawer } =
        useConfigDrawer(workflowId);

    // ── Save canvas mutation ──────────────────────────────────────────────
    const saveCanvasMutation = useMutation(
        trpc.calcWorkflowCanvas.saveCanvas.mutationOptions({
            onError(err) { console.error("Canvas save failed:", err); },
        })
    );

    const saveRef = useRef(saveCanvasMutation.mutateAsync);
    saveRef.current = saveCanvasMutation.mutateAsync;

    useEffect(() => {
        const originalFlush = store.flush;
        store.flush = async () => {
            const { isDirty, isPositionOnlyDirty, isSaving, workflowId: wfId, nodes, edges } =
                useWorkflowCanvasStore.getState();
            if ((!isDirty && !isPositionOnlyDirty) || isSaving || !wfId) return;
            useWorkflowCanvasStore.setState({ isSaving: true });
            try {
                await saveRef.current({
                    workflowId: wfId,
                    nodes: nodes.map((n) => ({
                        id: n.id, type: n.type ?? "FORMULA",
                        label: (n.data?.label as string) ?? "",
                        positionX: n.position.x, positionY: n.position.y,
                        config: (n.data?.config as Record<string, unknown>) ?? {},
                        style: (n.style as Record<string, unknown>) ?? {},
                        sortOrder: 0,
                    })),
                    edges: edges.map((e) => ({
                        id: e.id, sourceNodeId: e.source, targetNodeId: e.target,
                        sourceHandle: e.sourceHandle ?? "output",
                        targetHandle: e.targetHandle ?? "input",
                        label: (e.label as string | undefined) ?? undefined,
                        style: (e.style as Record<string, unknown>) ?? {},
                        sortOrder: 0,
                    })),
                });
                useWorkflowCanvasStore.setState({ isDirty: false, isPositionOnlyDirty: false, isSaving: false });
            } catch { useWorkflowCanvasStore.setState({ isSaving: false }); }
        };
        return () => { store.flush = originalFlush; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflowId]);

    // ── Hooks ──────────────────────────────────────────────────────────────
    const { saveNow } = useAutoSave({ disabled: false });
    const execution = useExecution(workflowId);
    const nodeConfig = useNodeConfig(workflowId);

    const publishMutation = useMutation(
        trpc.calcWorkflowCanvas.publish.mutationOptions()
    );

    useKeyboardShortcuts({ onSave: saveNow, disabled: false });

    // ── Canvas event handlers ──────────────────────────────────────────────
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData(DRAG_KEY);
        if (!type) return;
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        store.addNode(type as CalcNodeType, position);
    }, [screenToFlowPosition, store]);

    const onNodeClick = useCallback((_e: React.MouseEvent, node: { id: string }) => {
        store.selectNode(node.id);
        nodeConfig.openInspector(node.id);
    }, [store, nodeConfig]);

    // Double-click → open config drawer
    const onNodeDoubleClick = useCallback((_e: React.MouseEvent, node: { id: string }) => {
        openConfigDrawer(node.id);
    }, [openConfigDrawer]);

    const onPaneClick = useCallback(() => {
        store.selectNode(null);
        nodeConfig.closeInspector();
    }, [store, nodeConfig]);

    // ── Flush on unmount ───────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            const s = useWorkflowCanvasStore.getState();
            if (s.isDirty || s.isPositionOnlyDirty) s.flush();
        };
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            const nodeId = (e as CustomEvent).detail?.nodeId;
            if (nodeId) openConfigDrawer(nodeId);
        };
        window.addEventListener("floodrix:configure-node", handler);
        return () => window.removeEventListener("floodrix:configure-node", handler);
    }, [openConfigDrawer]);

    const saveState = store.isSaving
        ? "saving"
        : saveCanvasMutation.isError
            ? "error"
            : store.isDirty || store.isPositionOnlyDirty
                ? "unsaved"
                : "saved";

    // ── Loading / error ────────────────────────────────────────────────────
    if (workflowQuery.isLoading) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-red-500" />
                    <p className="text-sm text-slate-500">Loading canvas...</p>
                </div>
            </div>
        );
    }

    if (workflowQuery.isError) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="mb-3 text-3xl">⚠️</div>
                    <p className="text-sm font-semibold text-slate-700">Failed to load workflow</p>
                    <p className="mt-1 text-xs text-slate-400">{workflowQuery.error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Config drawer (renders as Sheet overlay) */}
            {configDrawer}

            <div className="flex h-full w-full flex-col overflow-hidden">
                <WorkflowToolbar
                    workflowId={workflowId}
                    workflowName={workflowName}
                    status={workflowStatus}
                    saveState={saveState}
                    onRun={execution.startRun}
                    onPublish={() => publishMutation.mutate({ workflowId })}
                    onSave={saveNow}
                    onRename={(name) => console.log("Rename to:", name)}
                    onDuplicate={() => console.log("Duplicate")}
                    onDelete={() => console.log("Delete")}
                    onSettings={() => console.log("Settings")}
                    isRunning={execution.isRunning}
                    canUndo={store.canUndo}
                    canRedo={store.canRedo}
                />

                <div className="flex flex-1 overflow-hidden">
                    <WorkflowSidebar />

                    <div className="relative flex-1" style={{ background: "#f8fafc" }}>
                        <ReactFlow
                            nodes={store.nodes}
                            edges={store.edges}
                            onNodesChange={store.onNodesChange}
                            onEdgesChange={store.onEdgesChange}
                            onConnect={store.onConnect}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onNodeClick={onNodeClick}
                            onNodeDoubleClick={onNodeDoubleClick}
                            onPaneClick={onPaneClick}
                            nodeTypes={nodeTypes as NodeTypes}
                            edgeTypes={edgeTypes as any}
                            fitView
                            snapToGrid
                            snapGrid={[16, 16]}
                            defaultEdgeOptions={{ type: "default" }}
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background gap={16} size={1} color="#e2e8f0" />
                            <WorkflowMinimap position="bottom-right" />

                            <Panel position="bottom-center">
                                {(store.isDirty || store.isPositionOnlyDirty) && (
                                    <div className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-500 shadow-sm">
                                        {store.isSaving ? "Saving…" : "Unsaved changes"}
                                    </div>
                                )}
                            </Panel>
                        </ReactFlow>
                    </div>

                    {nodeConfig.isInspectorOpen && (
                        <WorkflowInspector
                            selectedNode={nodeConfig.selectedNode}
                            variables={workflowQuery.data?.variables ?? []}
                            onClose={nodeConfig.closeInspector}
                            onOpenNodeConfig={(nodeId) => openConfigDrawer(nodeId)}
                            onAddVariable={() => console.log("Add variable")}
                            onEditVariable={(id) => console.log("Edit var", id)}
                            onDeleteVariable={(id) => console.log("Delete var", id)}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInternal {...props} />
        </ReactFlowProvider>
    );
}