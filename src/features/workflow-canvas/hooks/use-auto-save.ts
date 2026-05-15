import { useCallback, useEffect, useRef } from "react";

import { useWorkflowCanvasStore } from "../store/workflow-canvas-store";

const DEFAULT_DEBOUNCE_MS = 1500;
const POSITION_ONLY_DEBOUNCE_MS = 3000;

type ChangeKind = "full" | "position-only";

interface UseAutoSaveOptions {
  /** Disable auto-save (e.g. while running) */
  disabled?: boolean;
}

/**
 * Watches the canvas store's dirty flag and flushes on inactivity.
 *
 * - Full changes (config, add, delete): flush after 1.5 s
 * - Position-only moves: flush after 3 s  (avoids thundering-herd on drag)
 */
export function useAutoSave({ disabled = false }: UseAutoSaveOptions = {}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isDirty, isPositionOnlyDirty, flush } = useWorkflowCanvasStore();

  const schedule = useCallback(
    (kind: ChangeKind) => {
      if (disabled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      const delay =
        kind === "position-only"
          ? POSITION_ONLY_DEBOUNCE_MS
          : DEFAULT_DEBOUNCE_MS;
      timerRef.current = setTimeout(() => {
        flush();
        timerRef.current = null;
      }, delay);
    },
    [disabled, flush],
  );

  // React to dirty flag changes
  useEffect(() => {
    if (!isDirty && !isPositionOnlyDirty) return;
    if (isDirty) {
      schedule("full");
    } else if (isPositionOnlyDirty) {
      schedule("position-only");
    }
  }, [isDirty, isPositionOnlyDirty, schedule]);

  // Force-flush on unmount if dirty
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (isDirty || isPositionOnlyDirty) {
        flush();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Call this from the Ctrl+S handler */
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    flush();
  }, [flush]);

  return { saveNow };
}
