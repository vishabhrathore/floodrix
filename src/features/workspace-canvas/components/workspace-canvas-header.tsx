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
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface WorkspaceCanvasHeaderProps {
  onBack?: () => void;
  isSaving: boolean;
  isDirty: boolean;
  handleSave: () => void;
  lastSavedAt: Date | null;
  addFolderAtCenter: () => void;
  addLinkAtCenter: () => void;
}

export function WorkspaceCanvasHeader({
  onBack,
  isSaving,
  isDirty,
  handleSave,
  lastSavedAt,
  addFolderAtCenter,
  addLinkAtCenter,
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
          <div className="flex items-center gap-1 text-[11px] text-blue-500">
            <Loader2 size={12} className="animate-spin" /> Saving
          </div>
        ) : isDirty ? (
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            className="h-8 rounded-lg cursor-pointer bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
          >
            <Save size={11} /> Save Changes
          </Button>
        ) : lastSavedAt ? (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Check size={12} /> Saved
          </div>
        ) : null}
      </div>

      {/* Action buttons */}
      <Button
        variant="outline"
        size="sm"
        onClick={addFolderAtCenter}
        className="h-8 rounded-lg cursor-pointer border border-[#e8e8e8] bg-white text-gray-600 hover:bg-gray-50"
      >
        <FolderPlus size={13} /> Folder
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={addLinkAtCenter}
        className="h-8 rounded-lg cursor-pointer bg-[#0a0a0a] text-white hover:bg-[#1a1a1a]"
      >
        <LinkIcon size={13} /> Link workflow
      </Button>
    </div>
  );
}
