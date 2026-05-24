import { useCallback, useState } from "react";

// import { useTRPC } from "@/lib/trpc-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CalcNodeType } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";

import { useWorkflowCanvasStore } from "../store/workflow-canvas-store";

interface NodeConfig {
  [key: string]: unknown;
}

interface SelectedNodeInfo {
  id: string;
  type: CalcNodeType;
  label: string;
  config: NodeConfig;
}

/**
 * Manages the inspector panel:
 * - Tracks which node is selected
 * - Loads its full config via tRPC (the canvas store only holds a partial snapshot)
 * - Provides a patch function to save config changes back
 */
export function useNodeConfig(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const store = useWorkflowCanvasStore();
  const { selectedNodeId, selectNode } = store;
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const openInspector = useCallback(
    (nodeId: string) => {
      selectNode(nodeId);
      setIsInspectorOpen(true);
    },
    [selectNode],
  );

  const closeInspector = useCallback(() => {
    setIsInspectorOpen(false);
  }, []);

  const nodeQuery = useQuery(
    trpc.calcWorkflowCanvas.getNode.queryOptions(
      { workflowId, nodeId: selectedNodeId! },
      { enabled: !!selectedNodeId && isInspectorOpen },
    ),
  );

  const patchMutation = useMutation(
    trpc.calcWorkflowCanvas.updateNodeConfig.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: trpc.calcWorkflowCanvas.getNode.queryKey({
            workflowId,
            nodeId: selectedNodeId!,
          }),
        });
        store.markDirty();
      },
    }),
  );

  const saveConfig = useCallback(
    (config: NodeConfig) => {
      if (!selectedNodeId) return;
      patchMutation.mutate({ workflowId, nodeId: selectedNodeId, config });
    },
    [selectedNodeId, workflowId, patchMutation],
  );

  // ... rest stays the same

  const selectedNode: SelectedNodeInfo | null = nodeQuery.data
    ? {
        id: nodeQuery.data.id,
        type: nodeQuery.data.type as CalcNodeType,
        label: nodeQuery.data.label,
        config: (nodeQuery.data.config as NodeConfig) ?? {},
      }
    : null;

  return {
    isInspectorOpen,
    selectedNodeId,
    selectedNode,
    isLoading: nodeQuery.isLoading,
    isSaving: patchMutation.isPending,
    openInspector,
    closeInspector,
    saveConfig,
  };
}
