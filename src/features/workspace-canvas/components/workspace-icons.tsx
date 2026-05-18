// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-icons.tsx
//  Icon constants used consistently across tree sidebar and visual canvas
// ═══════════════════════════════════════════════════════════════════════════
import { Box, Sigma, StickyNote } from "lucide-react";

export const WORKSPACE_ICONS = {
  FOLDER: Box,
  WORKFLOW_LINK: Sigma,
  NOTE: StickyNote,
} as const;
