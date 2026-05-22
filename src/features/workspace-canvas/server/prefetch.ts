// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/server/prefetch.ts
//  Server-side prefetch for workspace canvas pages (RSC hydration)
// ═══════════════════════════════════════════════════════════════════════════
import { prefetch, trpc } from "@/trpc/server";

export async function prefetchWorkspace(workspaceId: string) {
  return prefetch(trpc.workspaceCanvas.load.queryOptions({ workspaceId }));
}

export async function prefetchWorkspaceGet(workspaceId: string) {
  return prefetch(trpc.workspaceCanvas.get.queryOptions({ workspaceId }));
}

export async function prefetchWorkspaceList(organizationId: string) {
  return prefetch(trpc.workspaceCanvas.list.queryOptions({ organizationId }));
}
