// hooks.ts
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTablesParams } from "./use-tables-params";

export const useSuspenseTables = () => {
  const trpc = useTRPC();
  const [params] = useTablesParams();
  return useSuspenseQuery(trpc.tables.getMany.queryOptions(params));
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
      onError: (error) => {
        toast.error(`Failed to create system table: ${error.message}`);
      },
    }),
  );
};