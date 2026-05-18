import type { inferInput } from "@trpc/tanstack-react-query";

import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.adminUsers.getMany>;

/**
 * Prefetch all admin users based on Nuqs URL params
 */
export const prefetchAdminUsers = (params: Input) => {
  return prefetch(trpc.adminUsers.getMany.queryOptions(params));
};
