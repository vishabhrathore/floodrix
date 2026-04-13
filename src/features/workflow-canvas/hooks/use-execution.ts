// src/features/workflow-canvas/hooks/use-execution.ts

import { useState, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionStatus } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";

interface InputField {
    key: string;
    label: string;
    unit?: string | null;
    defaultValue?: unknown;
    dataType: string;
}

interface PausedNode {
    nodeId: string;
    nodeLabel: string;
    fields: InputField[];
}

interface ExecutionState {
    status: SessionStatus | null;
    sessionId: string | null;
    currentNodeId: string | null;
    pausedNode: PausedNode | null;
    error: string | null;
    completedAt: string | null;
}

const POLL_INTERVAL_MS = 1500;

export function useExecution(workflowId: string) {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const [state, setState] = useState<ExecutionState>({
        status: null,
        sessionId: null,
        currentNodeId: null,
        pausedNode: null,
        error: null,
        completedAt: null,
    });

    const pollingRef = useRef(false);

    const startMutation = useMutation(
        trpc.calcExecution.startRun.mutationOptions({
            onSuccess(data) {
                setState({
                    status: data.status as SessionStatus,
                    sessionId: data.sessionId,
                    currentNodeId: data.currentNodeId ?? null,
                    pausedNode: (data.pausedNode as PausedNode) ?? null,
                    error: null,
                    completedAt: null,
                });
                if (data.status === "RUNNING") {
                    pollingRef.current = true;
                }
            },
            onError(err) {
                setState((s) => ({ ...s, status: "ERRORED", error: err.message }));
            },
        })
    );

    const submitInputMutation = useMutation(
        trpc.calcExecution.submitInput.mutationOptions({
            onSuccess(data) {
                setState((s) => ({
                    ...s,
                    status: data.status as SessionStatus,
                    currentNodeId: data.currentNodeId ?? null,
                    pausedNode: (data.pausedNode as PausedNode) ?? null,
                    completedAt: data.completedAt ?? null,
                    error: null,
                }));
                if (data.status === "RUNNING") {
                    pollingRef.current = true;
                }
            },
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

    useQuery(
        trpc.calcExecution.getSession.queryOptions(
            { sessionId: state.sessionId! },
            {
                enabled: !!state.sessionId && state.status === "RUNNING" && pollingRef.current,
                refetchInterval: POLL_INTERVAL_MS,
            }
        )
    );

    const startRun = useCallback(() => {
        if (!workflowId) return;
        setState({
            status: "RUNNING",
            sessionId: null,
            currentNodeId: null,
            pausedNode: null,
            error: null,
            completedAt: null,
        });
        startMutation.mutate({ workflowId });
    }, [workflowId, startMutation]);

    const submitInput = useCallback(
        (values: Record<string, unknown>) => {
            if (!state.sessionId) return;
            submitInputMutation.mutate({
                sessionId: state.sessionId,
                values,
            });
        },
        [state.sessionId, submitInputMutation]
    );

    const cancel = useCallback(() => {
        if (!state.sessionId) return;
        pollingRef.current = false;
        cancelMutation.mutate({ sessionId: state.sessionId });
    }, [state.sessionId, cancelMutation]);

    const reset = useCallback(() => {
        pollingRef.current = false;
        setState({
            status: null,
            sessionId: null,
            currentNodeId: null,
            pausedNode: null,
            error: null,
            completedAt: null,
        });
    }, []);

    return {
        ...state,
        isRunning: state.status === "RUNNING",
        isPaused: state.status === "PAUSED",
        isComplete: state.status === "COMPLETED",
        isErrored: state.status === "ERRORED",
        startRun,
        submitInput,
        cancel,
        reset,
        isStarting: startMutation.isPending,
        isSubmitting: submitInputMutation.isPending,
        isCancelling: cancelMutation.isPending,
    };
}