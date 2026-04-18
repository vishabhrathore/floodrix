// hooks.ts
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTablesParams } from "./use-tables-params";

export const useSuspenseTables = () => {
  const trpc = useTRPC();
  const [params] = useTablesParams();
  return useSuspenseQuery(trpc.tables.getMany.queryOptions(params));
};

export const useTable = (id?: string) => {
  const trpc = useTRPC();
  return useQuery(
    trpc.tables.getOne.queryOptions(
      { id: id as string },
      { enabled: !!id }
    )
  );
};

export const useCreateTable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.tables.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Table "${data.name}" created`);
        queryClient.invalidateQueries(trpc.tables.getMany.queryOptions({}));
      },
      onError: (error: any) => {
        toast.error(`Failed to create table: ${error.message}`);
      },
    }),
  );
};

export const useUpdateTable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.tables.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Table "${data.name}" updated`);
        queryClient.invalidateQueries(trpc.tables.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.tables.getOne.queryOptions({ id: data.id }));
      },
      onError: (error: any) => {
        toast.error(`Failed to update table: ${error.message}`);
      },
    }),
  );
};

export const useCreateSystemTable = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.tables.createSystemTable.mutationOptions({
      onSuccess: (data) => {
        toast.success(`System table "${data.name}" created`);
        queryClient.invalidateQueries(trpc.tables.getMany.queryOptions({}));
      },
      onError: (error: any) => {
        toast.error(`Failed to create system table: ${error.message}`);
      },
    }),
  );
};