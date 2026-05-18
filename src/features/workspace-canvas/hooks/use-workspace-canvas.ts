// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/hooks/use-workspace-canvas.ts
//  Client hook that connects the Zustand store to tRPC
//
//  - Loads workspace nodes via tRPC query
//  - Initializes the store when data arrives
//  - Overrides store.flush() to call tRPC saveCanvas mutation
//  - Cleans up dirty flags after successful save
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useEffect, useRef } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

import {
  type WorkspaceNodeData,
  useWorkspaceCanvas,
} from "../store/workspace-canvas-store";

/**
 * Loads workspace data from server and wires the store's flush()
 * to the tRPC saveCanvas mutation.
 *
 * Usage in a page/component:
 *   const { isLoading, error } = useWorkspaceCanvasData(workspaceId);
 */
export function useWorkspaceCanvasData(workspaceId: string) {
  const trpc = useTRPC();
  const store = useWorkspaceCanvas();

  // 1. Load workspace nodes (ONE query)
  const query = useQuery(
    trpc.workspaceCanvas.load.queryOptions(
      { workspaceId },
      { staleTime: Infinity, refetchOnWindowFocus: false },
    ),
  );

  // 2. Initialize store when data arrives
  useEffect(() => {
    if (query.data?.nodes && store.workspaceId !== workspaceId) {
      store.initialize(
        workspaceId,
        query.data.nodes as unknown as WorkspaceNodeData[],
      );
    }
  }, [query.data, workspaceId, store]);

  // No longer overwriting flush here since workspace-canvas.tsx handles save natively.

  return {
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for workspace list page — list + create + delete.
 */
export function useWorkspaceList(organizationId: string) {
  const trpc = useTRPC();

  const query = useQuery(
    trpc.workspaceCanvas.list.queryOptions({ organizationId }),
  );

  const createMutation = useMutation(
    trpc.workspaceCanvas.create.mutationOptions(),
  );

  const deleteMutation = useMutation(
    trpc.workspaceCanvas.delete.mutationOptions(),
  );

  return {
    workspaces: query.data?.items ?? [],
    nextCursor: query.data?.nextCursor,
    isLoading: query.isLoading,
    createWorkspace: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteWorkspace: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
