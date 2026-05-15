import type { inferInput } from "@trpc/tanstack-react-query";

import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.tables.getMany>;

export const prefetchTables = (params: Input) => {
  return prefetch(trpc.tables.getMany.queryOptions(params));
};
