// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/page.tsx
//  Real data workspace page — replaces the old mock-data demo
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { Loader2 } from "lucide-react";

import { WorkspaceCanvasEditor } from "./components/workspace-canvas";
import { useWorkspaceCanvasData } from "./hooks/use-workspace-canvas";

interface WorkspaceCanvasPageProps {
  workspaceId: string;
  onBack?: () => void;
  onOpenWorkflow?: (workflowId: string) => void;
}

export function WorkspaceCanvasPage({
  workspaceId,
  onBack,
  onOpenWorkflow,
}: WorkspaceCanvasPageProps) {
  const { isLoading, error } = useWorkspaceCanvasData(workspaceId);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Loading workspace...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-sm font-medium text-red-600 mb-1">
            Failed to load workspace
          </div>
          <div className="text-xs text-gray-400">{error.message}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden">
      <WorkspaceCanvasEditor
        workspaceId={workspaceId}
        onBack={onBack}
        onOpenWorkflow={onOpenWorkflow}
      />
    </div>
  );
}
