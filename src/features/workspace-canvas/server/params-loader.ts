// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/server/params-loader.ts
//  Server-side URL params loader for workspace pages
// ═══════════════════════════════════════════════════════════════════════════
import { createLoader } from "nuqs/server";

import { workspaceCanvasParams } from "../params";

export const loadWorkspaceCanvasParams = createLoader(workspaceCanvasParams);
