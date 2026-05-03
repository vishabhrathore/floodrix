// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/params.ts
//  URL search params shared between server (params-loader) and client (hook)
// ═══════════════════════════════════════════════════════════════════════════

import { parseAsString } from "nuqs";

export const workspaceCanvasParams = {
    view: parseAsString.withDefault("canvas"),
    search: parseAsString.withDefault(""),
};