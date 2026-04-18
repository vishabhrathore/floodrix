// hooks.ts
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFormulasParams } from "./use-formulas-params";

export const useSuspenseFormulas = () => {
  const trpc = useTRPC();
  const [params] = useFormulasParams();
  return useSuspenseQuery(trpc.formulas.getMany.queryOptions(params));
};

export const useFormula = (id?: string) => {
  const trpc = useTRPC();
  return useQuery(
    trpc.formulas.getOne.queryOptions(
      { id: id as string },
      { enabled: !!id }
    )
  );
};

export const useCreateFormula = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.formulas.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Formula "${data.name}" created`);
        queryClient.invalidateQueries(trpc.formulas.getMany.queryOptions({}));
      },
      onError: (error: any) => {
        toast.error(`Failed to create formula: ${error.message}`);
      },
    }),
  );
};

export const useUpdateFormula = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.formulas.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Formula "${data.name}" updated`);
        queryClient.invalidateQueries(trpc.formulas.getMany.queryOptions({}));
        queryClient.invalidateQueries(trpc.formulas.getOne.queryOptions({ id: data.id }));
      },
      onError: (error: any) => {
        toast.error(`Failed to update formula: ${error.message}`);
      },
    }),
  );
};

export const useCreateSystemFormula = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.formulas.createSystemFormula.mutationOptions({
      onSuccess: (data) => {
        toast.success(`System formula "${data.name}" created`);
        queryClient.invalidateQueries(trpc.formulas.getMany.queryOptions({}));
      },
      onError: (error: any) => {
        toast.error(`Failed to create system formula: ${error.message}`);
      },
    }),
  );
};