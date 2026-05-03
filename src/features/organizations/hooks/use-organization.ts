import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOrganizationsParams } from "./use-organization-params";

/**
 * Hook to fetch all organizations using suspense
 */
export const useSuspenseOrganizations = () => {
  const trpc = useTRPC();
  const [params] = useOrganizationsParams();

  return useSuspenseQuery(trpc.organizations.getMany.queryOptions(params));
};

/**
 * Hook to fetch a single organization using suspense
 */
export const useSuspenseOrganization = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.organizations.getOne.queryOptions({ id }));
};

/**
 * Hook to create a new organization
 */
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.organizations.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Organization "${data.name}" created`);
        queryClient.invalidateQueries(
          trpc.organizations.getMany.queryOptions({}),
        );
      },
      onError: (error) => {
        toast.error(`Failed to create organization: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to update an organization's status (Super Admin only)
 */
export const useUpdateOrganizationStatus = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.organizations.updateStatus.mutationOptions({
      onSuccess: (data, variables) => {
        toast.success(`Organization status updated to ${variables.status}`);
        // Invalidate both the list and the specific organization's details
        queryClient.invalidateQueries(trpc.organizations.getMany.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.organizations.getOne.queryOptions({ id: variables.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update status: ${error.message}`);
      },
    }),
  );
};