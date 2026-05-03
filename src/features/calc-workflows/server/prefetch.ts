import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.calcWorkflows.getMany>;

/**
 * Prefetch all calc workflows based on Nuqs URL params
 */
export const prefetchCalcWorkflows = (params: Input) => {
  return prefetch(trpc.calcWorkflows.getMany.queryOptions(params));
};

/**
 * Prefetch a single calc workflow's details
 */
export const prefetchCalcWorkflow = (id: string) => {
  return prefetch(trpc.calcWorkflows.getOne.queryOptions({ id }));
};