// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/hooks/use-workspace-params.ts
//  Client-side URL search params for workspace canvas pages
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useQueryStates } from "nuqs";

import { workspaceCanvasParams } from "../params";

export function useWorkspaceCanvasParams() {
  return useQueryStates(workspaceCanvasParams);
}
