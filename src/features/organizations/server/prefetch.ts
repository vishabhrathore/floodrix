import type { inferInput } from "@trpc/tanstack-react-query";

import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.organizations.getMany>;

/**
 * Prefetch all organizations based on Nuqs URL params
 */
export const prefetchOrganizations = (params: Input) => {
  return prefetch(trpc.organizations.getMany.queryOptions(params));
};

/**
 * Prefetch a single organization's details
 */
export const prefetchOrganization = (id: string) => {
  return prefetch(trpc.organizations.getOne.queryOptions({ id }));
};
