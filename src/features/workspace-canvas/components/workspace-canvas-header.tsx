// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/components/workspace-canvas-header.tsx
//  Workspace visual editor header — extracted standalone toolbar
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import React from "react";

import {
  Check,
  ChevronLeft,
  FolderPlus,
  LayoutGrid,
  Link as LinkIcon,
  List,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkspaceCanvasHeaderProps {
  onBack?: () => void;
  isSaving: boolean;
  isDirty: boolean;
  handleSave: () => void;
  lastSavedAt: Date | null;
  addFolderAtCenter: () => void;
  addLinkAtCenter: () => void;
  onLayout?: () => void;
}

export function WorkspaceCanvasHeader({
  onBack,
  isSaving,
  isDirty,
  handleSave,
  lastSavedAt,
  addFolderAtCenter,
  addLinkAtCenter,
  onLayout,
}: WorkspaceCanvasHeaderProps) {
  return (
    <div className="h-[56px]  bg-white border-b border-gray-100 flex items-center px-3 gap-2 flex-shrink-0">
      {/* Back */}
      {onBack && (
        <>
          <button
            onClick={onBack}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} className="text-gray-400" />
          </button>
          <div className="w-px h-5 bg-gray-100" />
        </>
      )}

      {/* Title */}
      <h1 className="text-sm font-semibold text-gray-800">Workspace</h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save status */}
      <div className="flex items-center gap-1.5 mr-3">
        {isSaving ? (
          <Button
            variant="default"
            size="sm"
            disabled
            className="h-8 rounded-lg bg-[#0a0a0a] text-white opacity-80 flex items-center justify-center cursor-not-allowed"
          >
            <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            <span className="text-[11px]">Saving...</span>
          </Button>
        ) : isDirty ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="h-8 rounded-lg cursor-pointer bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] flex items-center justify-center"
          >
            <Save size={11} className="mr-1.5" /> Save Changes
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="h-8 rounded-lg border border-[#e8e8e8] bg-[#fafafa] text-gray-400 cursor-not-allowed flex items-center justify-center"
          >
            <Check size={11} className="mr-1.5" /> Saved
          </Button>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5">
        {onLayout && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onLayout}
                className="w-8 h-8 rounded-lg cursor-pointer border border-[#e8e8e8] bg-white text-gray-700 hover:bg-gray-50 hover:text-amber-600 transition-colors p-0 flex items-center justify-center"
              >
                <Sparkles size={15} className="text-amber-500 fill-amber-100" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center" className="text-[11px] bg-slate-900 text-white border border-slate-800 px-2 py-1 shadow-md">
              Auto Layout
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={addFolderAtCenter}
              className="w-8 h-8 rounded-lg cursor-pointer border border-[#e8e8e8] bg-white text-gray-600 hover:bg-gray-50 p-0 flex items-center justify-center"
            >
              <FolderPlus size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" className="text-[11px] bg-slate-900 text-white border border-slate-800 px-2 py-1 shadow-md">
            Add Folder
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="sm"
              onClick={addLinkAtCenter}
              className="w-8 h-8 rounded-lg cursor-pointer bg-[#0a0a0a] text-white hover:bg-[#1a1a1a] p-0 flex items-center justify-center"
            >
              <LinkIcon size={15} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center" className="text-[11px] bg-slate-900 text-white border border-slate-800 px-2 py-1 shadow-md">
            Link Workflow
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
