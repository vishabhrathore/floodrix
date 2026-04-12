import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.librarySubmissions.getMany>;

/**
 * Prefetch the library submissions review queue
 */
export const prefetchLibrarySubmissions = (params: Input) => {
  return prefetch(trpc.librarySubmissions.getMany.queryOptions(params));
};