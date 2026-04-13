// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/server/prefetch.ts
//  Server-side prefetch for workspace canvas pages (RSC hydration)
// ═══════════════════════════════════════════════════════════════════════════

import { trpc } from "@/trpc/server";

export async function prefetchWorkspace(workspaceId: string) {
    return trpc.workspaceCanvas.load.prefetch({ workspaceId });
}

export async function prefetchWorkspaceGet(workspaceId: string) {
    return trpc.workspaceCanvas.get.prefetch({ workspaceId });
}

export async function prefetchWorkspaceList(organizationId: string) {
    return trpc.workspaceCanvas.list.prefetch({ organizationId });
}