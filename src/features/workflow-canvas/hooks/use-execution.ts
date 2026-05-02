// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/hooks/use-execution.ts
//
//  CHUNK 3 CHANGES:
//    - startRun accepts { stepMode } option
//    - new methods: stepForward, stepBack
//    - state now carries stepOutput from the server response
//    - polling interval kept at 1.5s; only active when status = RUNNING
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { SessionStatus } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";
import { useExecutionHighlightStore } from "@/features/workflow-canvas/store/workflow-canvas-store";

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
    variables: Record<string, unknown>;
    error: string | null;
    completedAt: string | null;
}

const POLL_INTERVAL_MS = 1500;

const initialState: ExecutionState = {
    status: null, sessionId: null, currentNodeId: null,
    pauseReason: null, pausedNode: null, stepOutput: null,
    variables: {}, error: null, completedAt: null,
};

export function useExecution(workflowId: string) {
    const trpc = useTRPC();
    const [state, setState] = useState<ExecutionState>(initialState);
    const pollingRef = useRef(false);

    const syncHighlights = useExecutionHighlightStore((s) => s.syncExecutionHighlights);
    const setActiveNode = useExecutionHighlightStore((s) => s.setActiveExecutionNode);


    // Helper to absorb a server response into state
    const ingest = useCallback((data: any) => {
        setState((s) => ({
            ...s,
            status: data.status as SessionStatus,
            sessionId: data.sessionId ?? s.sessionId,
            currentNodeId: data.currentNodeId ?? (data.pausedNode?.nodeId ?? null),
            pauseReason: data.pauseReason ?? null,
            pausedNode: (data.pausedNode as PausedNode) ?? null,
            stepOutput: (data.stepOutput as StepOutput) ?? null,
            variables: (data.variables as Record<string, unknown>) ?? s.variables,
            completedAt: data.completedAt ?? null,
            error: data.error?.message ?? null,
        }));
        pollingRef.current = data.status === "RUNNING";
        // NEW: sync highlights
        if (Array.isArray(data.nodeExecutions)) {
            syncHighlights(data.nodeExecutions);
        }
        setActiveNode(data.currentNodeId ?? null);
    }, []);

    const startMutation = useMutation(
        trpc.calcExecution.startRun.mutationOptions({
            onSuccess: ingest,
            onError(err) {
                setState((s) => ({ ...s, status: "ERRORED", error: err.message }));
            },
        })
    );

    const submitInputMutation = useMutation(
        trpc.calcExecution.submitInput.mutationOptions({
            onSuccess: ingest,
            onError(err) {
                setState((s) => ({ ...s, error: err.message }));
            },
        })
    );

    const stepForwardMutation = useMutation(
        trpc.calcExecution.stepForward.mutationOptions({
            onSuccess: ingest,
            onError(err) {
                setState((s) => ({ ...s, error: err.message }));
            },
        })
    );

    const stepBackMutation = useMutation(
        trpc.calcExecution.stepBack.mutationOptions({
            onSuccess: ingest,
            onError(err) {
                setState((s) => ({ ...s, error: err.message }));
            },
        })
    );

    const cancelMutation = useMutation(
        trpc.calcExecution.cancelRun.mutationOptions({
            onSuccess() {
                pollingRef.current = false;
                setState((s) => ({ ...s, status: "CANCELLED" }));
            },
        })
    );

    // Poll the session while it's marked RUNNING. We use a sentinel ref
    // (not derived from state.status) so TanStack Query doesn't re-register
    // the interval on every render.
    const sessionQuery = useQuery(
        trpc.calcExecution.getSession.queryOptions(
            { sessionId: state.sessionId! },
            {
                enabled: !!state.sessionId && state.status === "RUNNING" && pollingRef.current,
                refetchInterval: POLL_INTERVAL_MS,
            }
        )
    );

    // When poll result comes back with a terminal status, absorb it
    // (Handled by the useEffect below to avoid render-time side effects)
    //     if (sessionQuery.data && sessionQuery.data.status !== "RUNNING" && pollingRef.current) {
    //     ingest(sessionQuery.data);
    // }

    const clearHighlights = useExecutionHighlightStore((s) => s.clearExecutionHighlights);

    // ─── Actions ──────────────────────────────────────────────────────────
    //todo:ai-check
    useEffect(() => {
        if (sessionQuery.data) {
            ingest(sessionQuery.data);
        }
    }, [sessionQuery.data, ingest]);

    const startRun = useCallback((opts: { stepMode?: boolean } = {}) => {
        if (!workflowId) return;
        clearHighlights();
        setState({ ...initialState, status: "RUNNING" });
        startMutation.mutate({
            workflowId,
            stepMode: opts.stepMode ?? false,
            liveUpdates: opts.stepMode ?? false,
        });
    }, [workflowId, startMutation, clearHighlights]);

    const submitInput = useCallback((values: Record<string, unknown>) => {
        if (!state.sessionId) return;
        submitInputMutation.mutate({ sessionId: state.sessionId, values });
    }, [state.sessionId, submitInputMutation]);

    const stepForward = useCallback(() => {
        if (!state.sessionId) return;
        stepForwardMutation.mutate({ sessionId: state.sessionId });
    }, [state.sessionId, stepForwardMutation]);

    const stepBack = useCallback((targetNodeId: string) => {
        if (!state.sessionId) return;
        stepBackMutation.mutate({ sessionId: state.sessionId, targetNodeId });
    }, [state.sessionId, stepBackMutation]);

    const cancel = useCallback(() => {
        if (!state.sessionId) return;
        pollingRef.current = false;
        cancelMutation.mutate({ sessionId: state.sessionId });
    }, [state.sessionId, cancelMutation]);

    const reset = useCallback(() => {
        pollingRef.current = false;
        clearHighlights();
        setState(initialState);
    }, [clearHighlights]);

    return {
        ...state,
        isRunning: state.status === "RUNNING",
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