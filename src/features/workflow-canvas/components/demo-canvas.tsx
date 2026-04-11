// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/demo-canvas.tsx
//  Demo version of the workflow canvas (no TRPC)
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

// Mock data for the demo
const MOCK_NODES = [
    {
        id: "node-1",
        type: "INPUT",
        position: { x: 100, y: 100 },
        data: { label: "Input Parameters", config: { fields: [] } },
    },
    {
        id: "node-2",
        type: "FORMULA",
        position: { x: 400, y: 100 },
        data: { label: "Main Calculation", config: { expression: "a + b" } },
    },
];

const MOCK_EDGES = [
    {
        id: "edge-1",
        source: "node-1",
        target: "node-2",
        type: "default",
    },
];

function WorkflowCanvasInternal() {
    const store = useWorkflowCanvas();
    const { screenToFlowPosition } = useReactFlow();

    // Initialize with mock data
    useEffect(() => {
        store.initialize("demo-id", MOCK_NODES as any, MOCK_EDGES as any);
    }, []);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData("application/reactflow-nodetype");
        if (!type) return;

        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        store.addNode(type as any, position);
    }, [screenToFlowPosition, store]);

    return (
        <div style={{ width: "100%", height: "100vh", position: "relative" }}>
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

                {/* Node palette */}
                <Panel position="top-left">
                    <NodePalette />
                </Panel>

                {/* Save indicator (mocked) */}
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
                            {store.isSaving ? "Saving..." : "Unsaved changes (Local)"}
                        </div>
                    )}
                </Panel>
            </ReactFlow>

            {/* 
                We skip VariableInspector in the demo or mock its data too 
                since it also uses TRPC internally currently.
             */}
            <div style={{
                position: 'absolute',
                right: 20,
                top: 20,
                padding: '12px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '12px',
                zIndex: 100
            }}>
                Demo Page: Static Mode
            </div>
        </div>
    );
}

export function WorkflowCanvasDemo() {
    return (
        <ReactFlowProvider>
            <WorkflowCanvasInternal />
        </ReactFlowProvider>
    );
}
