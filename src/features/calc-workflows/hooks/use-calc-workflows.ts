// src/features/calc-workflows/hooks/use-calc-workflows.ts

import { useTRPC } from "@/trpc/client";
import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCalcWorkflowsParams } from "./use-calc-workflows-params";

// ─── Queries ──────────────────────────────────────────────────────────────

export function useSuspenseCalcWorkflows() {
  const trpc = useTRPC();
  const [params] = useCalcWorkflowsParams();

  return useSuspenseQuery(
    trpc.calcWorkflows.getMany.queryOptions({
      ...params,
      search: params.search || undefined,
      status: params.status || undefined,
      visibility: params.visibility || undefined,
      libraryStatus: params.libraryStatus || undefined,
      category: params.category || undefined,
      organizationId: params.organizationId || undefined,
    })
  );
}

export function useCalcWorkflow(id: string) {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.calcWorkflows.getOne.queryOptions({ id })
  );
}

// ─── Mutations ────────────────────────────────────────────────────────────

export function useCreateCalcWorkflow() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.calcWorkflows.create.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: trpc.calcWorkflows.getMany.queryKey(),
        });
      },
    })
  );
}

export function useRemoveCalcWorkflow() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.calcWorkflows.remove.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: trpc.calcWorkflows.getMany.queryKey(),
        });
      },
    })
  );
}