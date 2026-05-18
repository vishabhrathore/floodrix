import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/trpc/client";

import { useAdminUsersParams } from "./use-admin-users-params";

/**
 * Hook to fetch all users using suspense
 */
export const useSuspenseAdminUsers = () => {
  const trpc = useTRPC();
  const [params] = useAdminUsersParams();

  return useSuspenseQuery(trpc.adminUsers.getMany.queryOptions(params));
};

/**
 * Hook to update a user's global role (Super Admin only)
 */
export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.adminUsers.updateRole.mutationOptions({
      onSuccess: () => {
        toast.success("User role updated successfully");
        queryClient.invalidateQueries(trpc.adminUsers.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to update role: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to delete a user account (Super Admin only)
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.adminUsers.deleteUser.mutationOptions({
      onSuccess: () => {
        toast.success("User deleted successfully");
        queryClient.invalidateQueries(trpc.adminUsers.getMany.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to delete user: ${error.message}`);
      },
    }),
  );
};
