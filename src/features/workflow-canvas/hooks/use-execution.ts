// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/hooks/use-execution.ts
//
//  CHUNK 3 CHANGES:
//    - startRun accepts { stepMode } option
//    - new methods: stepForward, stepBack
//    - state now carries stepOutput from the server response
//    - polling interval kept at 1.5s; only active when status = RUNNING
// ═══════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useRef, useState } from "react";

import { useMutation, useQuery } from "@tanstack/react-query";

import { useExecutionHighlightStore } from "@/features/workflow-canvas/store/workflow-canvas-store";
import type { SessionStatus } from "@/generated/prisma";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useTRPC } from "@/trpc/client";

interface InputField {
  key: string;
  label: string;
  unit?: string | null;
  default?: unknown;
  hint?: string;
  data_type?: string;
  required?: boolean;
  constraints?: { min?: number; max?: number; step?: number };
}

interface PausedNode {
  nodeId: string;
  nodeLabel: string;
  fields: InputField[];
  message?: string;
}

interface StepOutput {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  outputs: Record<string, unknown>;
  result: Record<string, unknown>;
  durationMs: number;
  stepNumber: number;
  totalSteps: number;
}

interface ExecutionState {
  status: SessionStatus | null;
  sessionId: string | null;
  currentNodeId: string | null;
  pauseReason: string | null;
  pausedNode: PausedNode | null;
  stepOutput: StepOutput | null;
  nodeOutputs: Record<string, StepOutput>;
  variables: Record<string, unknown>;
  error: string | null;
  completedAt: string | null;
}

const POLL_INTERVAL_MS = 1500;

const initialState: ExecutionState = {
  status: null,
  sessionId: null,
  currentNodeId: null,
  pauseReason: null,
  pausedNode: null,
  stepOutput: null,
  nodeOutputs: {},
  variables: {},
  error: null,
  completedAt: null,
};

export function useExecution(workflowId: string) {
  const trpc = useTRPC();
  const [state, setState] = useState<ExecutionState>(initialState);
  const pollingRef = useRef(false);

  const highlightStore = useExecutionHighlightStore();

  // Helper to absorb a server response into state
  const ingest = useCallback(
    (data: any) => {
      setState((s) => {
        const nextOutputs = { ...s.nodeOutputs };
        if (data.stepOutput) {
          nextOutputs[data.stepOutput.nodeId] = data.stepOutput;
        }
        return {
          ...s,
          status: data.status as SessionStatus,
          sessionId: data.sessionId ?? s.sessionId,
          currentNodeId: data.currentNodeId ?? data.pausedNode?.nodeId ?? null,
          pauseReason: data.pauseReason ?? null,
          pausedNode: (data.pausedNode as PausedNode) ?? null,
          stepOutput: (data.stepOutput as StepOutput) ?? null,
          nodeOutputs: nextOutputs,
          variables: (data.variables as Record<string, unknown>) ?? s.variables,
          completedAt: data.completedAt ?? null,
          error: data.error?.message ?? null,
        };
      });
      pollingRef.current = data.status === "RUNNING" || data.status === "PENDING";
      // NEW: sync highlights
      if (Array.isArray(data.nodeExecutions)) {
        highlightStore.syncExecutionHighlights(data.nodeExecutions);
      }
      highlightStore.setActiveExecutionNode(data.currentNodeId ?? null);
    },
    [highlightStore],
  );

  const startMutation = useMutation(
    trpc.calcExecution.startRun.mutationOptions({
      onSuccess: ingest,
      onError(err) {
        setState((s) => ({ ...s, status: "ERRORED", error: err.message }));
      },
    }),
  );

  const submitInputMutation = useMutation(
    trpc.calcExecution.submitInput.mutationOptions({
      onSuccess: ingest,
      onError(err) {
        setState((s) => ({ ...s, error: err.message }));
      },
    }),
  );

  const stepForwardMutation = useMutation(
    trpc.calcExecution.stepForward.mutationOptions({
      onSuccess: ingest,
      onError(err) {
        setState((s) => ({ ...s, error: err.message }));
      },
    }),
  );

  const stepBackMutation = useMutation(
    trpc.calcExecution.stepBack.mutationOptions({
      onSuccess: ingest,
      onError(err) {
        setState((s) => ({ ...s, error: err.message }));
      },
    }),
  );

  const cancelMutation = useMutation(
    trpc.calcExecution.cancelRun.mutationOptions({
      onSuccess() {
        pollingRef.current = false;
        setState((s) => ({ ...s, status: "CANCELLED" }));
      },
    }),
  );

  // Poll the session while it's marked RUNNING. We use a sentinel ref
  // (not derived from state.status) so TanStack Query doesn't re-register
  // the interval on every render.
  const sessionQuery = useQuery(
    trpc.calcExecution.getSession.queryOptions(
      { sessionId: state.sessionId! },
      {
        enabled:
          !!state.sessionId &&
          (state.status === "RUNNING" || state.status === "PENDING") &&
          pollingRef.current,
        refetchInterval: POLL_INTERVAL_MS,
      },
    ),
  );

  // tRPC Subscription for real-time progress updates
  useSubscription(
    trpc.calcExecution.subscribeProgress.subscriptionOptions(
      { executionId: state.sessionId! },
      {
        enabled: !!state.sessionId,
        onData(event: any) {
          console.log("[tRPC Subscription] Real-time event received:", event);

          switch (event.type) {
            case "NODE_STARTED":
              highlightStore.setNodeExecutionStatus(event.nodeId, "RUNNING");
              highlightStore.setActiveExecutionNode(event.nodeId);
              setState((s) => ({
                ...s,
                currentNodeId: event.nodeId,
                status: "RUNNING" as SessionStatus,
              }));
              break;

            case "NODE_COMPLETED":
              highlightStore.setNodeExecutionStatus(event.nodeId, "COMPLETED");
              highlightStore.setActiveExecutionNode(null);
              setState((s) => {
                const updatedVars = {
                  ...s.variables,
                  ...(event.output as Record<string, unknown>),
                };

                const stepOut: StepOutput = {
                  nodeId: event.nodeId,
                  nodeLabel: event.nodeLabel ?? "",
                  nodeType: event.nodeType ?? "",
                  outputs: (event.output as Record<string, unknown>) ?? {},
                  result: (event.result as Record<string, unknown>) ?? {},
                  durationMs: event.durationMs ?? 0,
                  stepNumber: event.stepNumber ?? 0,
                  totalSteps: 0,
                };

                const nextOutputs = {
                  ...s.nodeOutputs,
                  [event.nodeId]: stepOut,
                };

                return {
                  ...s,
                  currentNodeId: null,
                  variables: updatedVars,
                  stepOutput: stepOut,
                  nodeOutputs: nextOutputs,
                };
              });
              break;

            case "NODE_FAILED":
              highlightStore.setNodeExecutionStatus(event.nodeId, "ERRORED");
              highlightStore.setActiveExecutionNode(null);
              setState((s) => ({
                ...s,
                currentNodeId: null,
                status: "ERRORED" as SessionStatus,
                error: event.error,
              }));
              break;

            case "WORKFLOW_STARTED":
              setState((s) => ({
                ...s,
                status: "RUNNING" as SessionStatus,
              }));
              break;

            case "WORKFLOW_COMPLETED":
              highlightStore.setActiveExecutionNode(null);
              setState((s) => ({
                ...s,
                status: "COMPLETED" as SessionStatus,
                completedAt: new Date().toISOString(),
              }));
              break;

            case "WORKFLOW_FAILED":
              highlightStore.setActiveExecutionNode(null);
              setState((s) => ({
                ...s,
                status: "ERRORED" as SessionStatus,
                error: event.error,
                completedAt: new Date().toISOString(),
              }));
              break;

            case "WORKFLOW_CANCELLED":
              highlightStore.setActiveExecutionNode(null);
              setState((s) => ({
                ...s,
                status: "CANCELLED" as SessionStatus,
                completedAt: new Date().toISOString(),
              }));
              break;
          }
        },
        onError(err) {
          console.error("[tRPC Subscription] Error in subscription:", err);
        },
      },
    ),
  );

  // ─── Actions ──────────────────────────────────────────────────────────
  //todo:ai-check
  useEffect(() => {
    if (sessionQuery.data) {
      ingest(sessionQuery.data);
    }
  }, [sessionQuery.data, ingest]);

  const startRun = useCallback(
    (opts: { stepMode?: boolean } = {}) => {
      if (!workflowId) return;
      highlightStore.clearExecutionHighlights();
      setState({ ...initialState, status: "RUNNING" });
      startMutation.mutate({
        workflowId,
        stepMode: opts.stepMode ?? false,
        liveUpdates: opts.stepMode ?? false,
      });
    },
    [workflowId, startMutation, highlightStore],
  );

  const submitInput = useCallback(
    (values: Record<string, unknown>) => {
      if (!state.sessionId) return;
      submitInputMutation.mutate({ sessionId: state.sessionId, values });
    },
    [state.sessionId, submitInputMutation],
  );

  const stepForward = useCallback(() => {
    if (!state.sessionId) return;
    stepForwardMutation.mutate({ sessionId: state.sessionId });
  }, [state.sessionId, stepForwardMutation]);

  const stepBack = useCallback(
    (targetNodeId: string) => {
      if (!state.sessionId) return;
      stepBackMutation.mutate({ sessionId: state.sessionId, targetNodeId });
    },
    [state.sessionId, stepBackMutation],
  );

  const cancel = useCallback(() => {
    if (!state.sessionId) return;
    pollingRef.current = false;
    cancelMutation.mutate({ sessionId: state.sessionId });
  }, [state.sessionId, cancelMutation]);

  const reset = useCallback(() => {
    pollingRef.current = false;
    highlightStore.clearExecutionHighlights();
    setState(initialState);
  }, [highlightStore]);

  return {
    ...state,
    nodeOutputs: state.nodeOutputs,
    isRunning: state.status === "RUNNING" || state.status === "PENDING",
    isPaused: state.status === "PAUSED",
    isComplete: state.status === "COMPLETED",
    isErrored: state.status === "ERRORED",
    // Pause reason shortcuts for the UI
    isStepPause: state.pauseReason === "step_complete",
    isInputPause: state.pauseReason === "awaiting_user_input",
    isValidationPause: state.pauseReason === "validation_error",

    // Actions
    startRun,
    submitInput,
    stepForward,
    stepBack,
    cancel,
    reset,

    // Loading flags
    isStarting: startMutation.isPending,
    isSubmitting: submitInputMutation.isPending,
    isStepping: stepForwardMutation.isPending || stepBackMutation.isPending,
    isCancelling: cancelMutation.isPending,
  };
}
