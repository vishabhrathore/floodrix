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
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { useWorkspaceCanvas, type WorkspaceNodeData } from "../store/workspace-canvas-store";

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
            { staleTime: Infinity, refetchOnWindowFocus: false }
        )
    );

    // 2. Initialize store when data arrives
    useEffect(() => {
        if (query.data?.nodes && store.workspaceId !== workspaceId) {
            store.initialize(workspaceId, query.data.nodes as WorkspaceNodeData[]);
        }
    }, [query.data, workspaceId, store]);

    // 3. Wire flush → tRPC saveCanvas mutation
    const saveMutation = useMutation(
        trpc.workspaceCanvas.saveCanvas.mutationOptions({
            onError(err) {
                console.error("Workspace save failed:", err);
            },
        })
    );

    const saveRef = useRef(saveMutation.mutate);
    saveRef.current = saveMutation.mutate;

    useEffect(() => {
        // Override the store's flush() with a real tRPC call
        store.flush = async () => {
            const state = useWorkspaceCanvas.getState();
            if (!state.isDirty || state.isSaving || !state.workspaceId) return;

            useWorkspaceCanvas.setState({ isSaving: true });

            try {
                // Partition dbNodes into create/update/delete
                const nodesToCreate: {
                    id: string;
                    parentId: string;
                    nodeType: WorkspaceNodeData["nodeType"];
                    name: string;
                    icon: string | null;
                    sortOrder: number;
                    canvasX: number | null;
                    canvasY: number | null;
                    linkedWorkflowId: string | null;
                    metadata: Record<string, unknown>;
                }[] = [];

                const nodesToUpdate: { id: string; data: Record<string, unknown> }[] = [];
                const nodeIdsToDelete: string[] = [];

                for (const node of state.dbNodes) {
                    if (node._isDeleted) {
                        if (!node._isNew) nodeIdsToDelete.push(node.id);
                    } else if (node._isNew) {
                        nodesToCreate.push({
                            id: node.id,
                            parentId: node.parentId!,
                            nodeType: node.nodeType,
                            name: node.name,
                            icon: node.icon,
                            sortOrder: node.sortOrder,
                            canvasX: node.canvasX,
                            canvasY: node.canvasY,
                            linkedWorkflowId: node.linkedWorkflowId,
                            metadata: node.metadata ?? {},
                        });
                    } else if (node._isDirty) {
                        nodesToUpdate.push({
                            id: node.id,
                            data: {
                                parentId: node.parentId,
                                name: node.name,
                                icon: node.icon,
                                sortOrder: node.sortOrder,
                                canvasX: node.canvasX,
                                canvasY: node.canvasY,
                                linkedWorkflowId: node.linkedWorkflowId,
                                linkedVersion: node.linkedVersion,
                                metadata: node.metadata,
                            },
                        });
                    }
                }

                // Nothing to save
                if (
                    nodesToCreate.length === 0 &&
                    nodesToUpdate.length === 0 &&
                    nodeIdsToDelete.length === 0
                ) {
                    useWorkspaceCanvas.setState({ isDirty: false, isSaving: false });
                    return;
                }

                // ONE tRPC call with everything batched
                await new Promise<void>((resolve, reject) => {
                    saveRef.current(
                        {
                            workspaceId: state.workspaceId!,
                            create: nodesToCreate,
                            update: nodesToUpdate,
                            delete: nodeIdsToDelete,
                        },
                        { onSuccess: () => resolve(), onError: reject }
                    );
                });

                // Clear dirty flags
                useWorkspaceCanvas.setState((s) => ({
                    dbNodes: s.dbNodes
                        .filter((n) => !n._isDeleted)
                        .map((n) => ({ ...n, _isNew: false, _isDirty: false })),
                    isDirty: false,
                    pendingChanges: 0,
                    isSaving: false,
                    lastSavedAt: new Date(),
                }));
            } catch {
                useWorkspaceCanvas.setState({ isSaving: false });
                // Don't clear isDirty — will retry on next change
            }
        };

        // No cleanup needed — store.flush is overwritten each time
    }, [workspaceId]);

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
        trpc.workspaceCanvas.list.queryOptions({ organizationId })
    );

    const createMutation = useMutation(
        trpc.workspaceCanvas.create.mutationOptions()
    );

    const deleteMutation = useMutation(
        trpc.workspaceCanvas.delete.mutationOptions()
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