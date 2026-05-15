import { useEffect } from "react";

import { useWorkflowCanvasStore } from "../store/workflow-canvas-store";

interface UseKeyboardShortcutsOptions {
  onSave: () => void;
  onDelete?: () => void;
  /** Pass true to disable all shortcuts (e.g. while a dialog is open) */
  disabled?: boolean;
}

function isInputTarget(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

/**
 * Registers global keyboard shortcuts for the workflow canvas.
 *
 * Shortcuts:
 *   Ctrl/Cmd + S          → save (calls onSave)
 *   Ctrl/Cmd + Z          → undo
 *   Ctrl/Cmd + Shift + Z  → redo
 *   Delete / Backspace    → delete selected node (when not focused in an input)
 */
export function useKeyboardShortcuts({
  onSave,
  onDelete,
  disabled = false,
}: UseKeyboardShortcutsOptions) {
  const { undo, redo, deleteSelectedNode, canUndo, canRedo } =
    useWorkflowCanvasStore();

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.ctrlKey || e.metaKey;

      // Save: Ctrl+S
      if (meta && e.key === "s") {
        e.preventDefault();
        onSave();
        return;
      }

      // Undo: Ctrl+Z
      if (meta && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }

      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((meta && e.shiftKey && e.key === "z") || (meta && e.key === "y")) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }

      // Delete / Backspace — only when NOT inside an input field
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isInputTarget(e.target)
      ) {
        e.preventDefault();
        onDelete ? onDelete() : deleteSelectedNode();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    disabled,
    onSave,
    onDelete,
    undo,
    redo,
    deleteSelectedNode,
    canUndo,
    canRedo,
  ]);
}
