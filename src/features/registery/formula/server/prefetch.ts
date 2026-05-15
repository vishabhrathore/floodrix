import type { inferInput } from "@trpc/tanstack-react-query";

import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.formulas.getMany>;

export const prefetchFormulas = (params: Input) => {
  return prefetch(trpc.formulas.getMany.queryOptions(params));
};
