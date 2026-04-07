"use client";

import { useEffect, useState } from "react";
// Adjust these imports based on where your feature folder is located!
import { useWorkspaceCanvas } from "@/features/workspace-canvas/store/workspace-canvas-store";
// import { WorkspaceCanvas } from "@/features/workspace-canvas/components/workspace-canvas";
import { mockWorkspaceNodes } from "./mock-data";
import { WorkspaceCanvasEditor } from "./components/workspace-canvas";

export default function LocalWorkspaceDryRunPage() {
    const initialize = useWorkspaceCanvas((s) => s.initialize);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // 1. Inject the mock data into the Zustand store on mount
        initialize("ws_local_dev_123", mockWorkspaceNodes);
        setIsReady(true);
    }, [initialize]);

    // Prevent rendering the canvas until the store is hydrated with our mock data
    if (!isReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 text-sm text-gray-500">
                Loading local workspace...
            </div>
        );
    }

    return (
        <div className="h-screen w-full overflow-hidden">
            {/* This mounts your main canvas wrapper. 
        I am assuming your main exported component in workspace-canvas.tsx is called WorkspaceCanvas 
      */}
            <WorkspaceCanvasEditor
                workspaceId="ws_local_dev_123"
            />
        </div>
    );
}