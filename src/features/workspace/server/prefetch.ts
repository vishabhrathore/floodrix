import type { inferInput } from "@trpc/tanstack-react-query";

import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.workspaces.getMany>;

/**
 * Prefetch all workspaces based on Nuqs URL params
 */
export const prefetchWorkspaces = (params: Input) => {
  return prefetch(trpc.workspaces.getMany.queryOptions(params));
};
