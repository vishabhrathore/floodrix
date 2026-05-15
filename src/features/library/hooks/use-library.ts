import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

import { useLibraryParams } from "./use-library-params";

/**
 * Hook to fetch library submissions (review queue)
 */
export const useSuspenseLibrarySubmissions = () => {
  const trpc = useTRPC();
  const [params] = useLibraryParams();

  return useSuspenseQuery(trpc.librarySubmissions.getMany.queryOptions(params));
};

/**
 * Hook to approve a library submission
 */
export const useApproveSubmission = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.librarySubmissions.approve.mutationOptions({
      onSuccess: () => {
        toast.success(`Submission approved and published to the library`);
        // Refresh the queue
        queryClient.invalidateQueries(
          trpc.librarySubmissions.getMany.queryOptions({}),
        );
        // Refresh dashboard stats (pending count)
        queryClient.invalidateQueries(
          trpc.dashboard.getSuperAdminStats.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to approve submission: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to reject a library submission
 */
export const useRejectSubmission = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.librarySubmissions.reject.mutationOptions({
      onSuccess: () => {
        toast.success(`Submission rejected with feedback`);
        // Refresh the queue
        queryClient.invalidateQueries(
          trpc.librarySubmissions.getMany.queryOptions({}),
        );
        // Refresh dashboard stats (pending count)
        queryClient.invalidateQueries(
          trpc.dashboard.getSuperAdminStats.queryOptions(),
        );
      },
      onError: (error) => {
        toast.error(`Failed to reject submission: ${error.message}`);
      },
    }),
  );
};
