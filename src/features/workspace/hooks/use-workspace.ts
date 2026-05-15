import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

import { useWorkspacesParams } from "./use-workspace-params";

/**
 * Hook to fetch all workspaces using suspense
 */
export const useSuspenseWorkspaces = () => {
  const trpc = useTRPC();
  const [params] = useWorkspacesParams();

  return useSuspenseQuery(trpc.workspaces.getMany.queryOptions(params));
};

/**
 * Hook to create a new workspace
 */
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.workspaces.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Workspace "${data.name}" created successfully`);
        queryClient.invalidateQueries(trpc.workspaces.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create workspace: ${error.message}`);
      },
    }),
  );
};
