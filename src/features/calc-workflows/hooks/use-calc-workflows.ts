import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCalcWorkflowsParams } from "./use-organization-params";
// import { useCalcWorkflowsParams } from "./use-calc-workflows-params";

/**
 * Hook to fetch all calc workflows using suspense
 */
export const useSuspenseCalcWorkflows = () => {
  const trpc = useTRPC();
  const [params] = useCalcWorkflowsParams();

  return useSuspenseQuery(trpc.calcWorkflows.getMany.queryOptions(params));
};

/**
 * Hook to fetch a single calc workflow using suspense
 */
export const useSuspenseCalcWorkflow = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.calcWorkflows.getOne.queryOptions({ id }));
};

/**
 * Hook to create a new calc workflow
 */
export const useCreateCalcWorkflow = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.calcWorkflows.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Calc workflow "${data.name}" created`);
        queryClient.invalidateQueries(
          trpc.calcWorkflows.getMany.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create workflow: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to update a calc workflow
 */
export const useUpdateCalcWorkflow = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.calcWorkflows.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Calc workflow "${data.name}" updated`);
        queryClient.invalidateQueries(
          trpc.calcWorkflows.getMany.queryOptions({}),
        );
        queryClient.invalidateQueries(
          trpc.calcWorkflows.getOne.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update workflow: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to soft-delete a calc workflow
 */
export const useRemoveCalcWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.calcWorkflows.delete.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Calc workflow "${data.name}" removed`);
        queryClient.invalidateQueries(trpc.calcWorkflows.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.calcWorkflows.getOne.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to remove workflow: ${error.message}`);
      }
    })
  );
}