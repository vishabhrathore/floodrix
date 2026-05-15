// ═══════════════════════════════════════════════════════════════════════════
//  CHUNK 3 — UI sync integration notes for DatabaseListener
//
//  Your existing DatabaseListener (from Chunk 1) writes node executions to
//  the DB. For the UI to show real-time highlighting, the RUNNER PAGE needs
//  to read those writes back via polling.
//
//  The simplest approach (which is what Chunk 3 does): the workflow-runner
//  polls getSession every 1.5s, and getSession returns the nodeExecutions
//  array. The runner's useEffect then calls store.syncExecutionHighlights().
//
//  You don't need to modify DatabaseListener itself. You just need to wire
//  the poll → store sync in the runner page or a small effect hook.
// ═══════════════════════════════════════════════════════════════════════════
// ─── Add this hook to workflow-runner.tsx or the run page ─────────────────
//
// This keeps canvas highlights in sync with what the server sees.
import { useEffect } from "react";

import { useQuery } from "@tanstack/react-query";

import { useExecutionHighlightStore } from "@/features/workflow-canvas/store/workflow-canvas-store";
import { useTRPC } from "@/trpc/client";

export function useExecutionHighlightSync(sessionId: string | null) {
  const trpc = useTRPC();
  const syncHighlights = useExecutionHighlightStore(
    (s) => s.syncExecutionHighlights,
  );
  const setActiveNode = useExecutionHighlightStore(
    (s) => s.setActiveExecutionNode,
  );
  const clearHighlights = useExecutionHighlightStore(
    (s) => s.clearExecutionHighlights,
  );

  const { data } = useQuery(
    trpc.calcExecution.getSession.queryOptions(
      { sessionId: sessionId! },
      {
        enabled: !!sessionId,
        refetchInterval: 1500,
      },
    ),
  );

  useEffect(() => {
    if (!data) return;
    syncHighlights(data.nodeExecutions);
    setActiveNode(data.currentNodeId);
  }, [data, syncHighlights, setActiveNode]);

  // Clear when sessionId becomes null (run ended / panel closed)
  useEffect(() => {
    if (!sessionId) clearHighlights();
  }, [sessionId, clearHighlights]);
}

// ─── Usage in the run page or runner component ────────────────────────────
//
//   const exec = useExecution(workflowId);
//   useExecutionHighlightSync(exec.sessionId);
//
// That's it. The canvas nodes will start glowing amber when running,
// green when completed, etc. — driven by the executionStatus field your
// calc-base-node reads from the store.

// ─── Side note on double-polling ──────────────────────────────────────────
//
// use-execution also polls getSession. That's wasteful. If you want to be
// efficient, move the sync call INTO use-execution's poll callback and
// skip the separate query in this hook. The structure above is clearer
// for learning; merge once you're comfortable.
