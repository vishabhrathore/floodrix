// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/workflow-canvas.tsx
//  Main React Flow canvas for calculation workflow editing
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useCallback, useEffect } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    Panel,
    useReactFlow,
    type NodeTypes,
    ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useWorkflowCanvas } from "../store/workflow-canvas-store";
import { VariableInspector } from "./workflow-inspector";
import { NodePalette } from "../nodes/node-palette";
import { nodeTypes } from "../nodes";
import { edgeTypes } from "./edges/default-edge";

interface WorkflowCanvasProps {
    workflowId: string;
}

function WorkflowCanvasInternal({ workflowId }: WorkflowCanvasProps) {
    const store = useWorkflowCanvas();
    const { screenToFlowPosition } = useReactFlow();

    // Initialize store with workflowId only (empty canvas for dry run)
    useEffect(() => {
        if (store.workflowId !== workflowId) {
            store.initialize(workflowId, [], []);
        }
    }, [workflowId, store]);

    // Drop handler for palette drag
    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/reactflow-nodetype");
        if (!type) return;

        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        store.addNode(type as never, position);
    }, [screenToFlowPosition, store]);

    // Save on unmount (will just update local store state)
    useEffect(() => {
        return () => { if (store.isDirty) store.flush(); };
    }, [store]);

    return (
        <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <ReactFlow
                nodes={store.nodes}
                edges={store.edges}
                onNodesChange={store.onNodesChange}
                onEdgesChange={store.onEdgesChange}
                onConnect={store.onConnect}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes as NodeTypes}
                edgeTypes={edgeTypes}
                fitView
                snapToGrid
                snapGrid={[16, 16]}
                defaultEdgeOptions={{ type: "default" }}
                proOptions={{ hideAttribution: true }}
            >
                <Background gap={16} size={1} color="#f1f5f9" />
                <Controls position="bottom-right" />
                <MiniMap
                    position="bottom-left"
                    style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}
                    maskColor="rgba(0,0,0,0.05)"
                />

                {/* Node palette (left panel) */}
                <Panel position="top-left">
                    <NodePalette />
                </Panel>

                {/* Save indicator */}
                <Panel position="bottom-center">
                    {store.isDirty && (
                        <div style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            background: "white",
                            border: "1px solid #e5e7eb",
                            fontSize: 12,
                            color: "#64748b",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                        }}>
                            {store.isSaving ? "Saving..." : "Unsaved changes (Dry Run)"}
                        </div>
                    )}
                </Panel>
            </ReactFlow>

            {/* Variable inspector (right panel) */}
            <VariableInspector workflowId={workflowId} />
        </div>
    );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInternal {...props} />
        </ReactFlowProvider>
    );
}
