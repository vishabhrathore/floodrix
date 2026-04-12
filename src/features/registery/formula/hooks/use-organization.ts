// hooks.ts
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFormulasParams } from "./use-formulas-params";

export const useSuspenseFormulas = () => {
  const trpc = useTRPC();
  const [params] = useFormulasParams();
  return useSuspenseQuery(trpc.formulas.getMany.queryOptions(params));
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
      onError: (error) => {
        toast.error(`Failed to create system formula: ${error.message}`);
      },
    }),
  );
};