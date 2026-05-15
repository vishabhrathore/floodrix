import { Suspense } from "react";

import { ErrorBoundary } from "react-error-boundary";

import {
  TableRegistryContainer,
  TableRegistryError,
  TableRegistryList,
  TableRegistryLoading,
} from "@/features/registery/table/components";
import { tableParamsLoader } from "@/features/registery/table/server/params-loader";
import { prefetchTables } from "@/features/registery/table/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<any>;
}

const Page = async ({ searchParams }: PageProps) => {
  await requireAuth();

  const params = await tableParamsLoader(searchParams);

  // Prefetch data for the table listing
  await prefetchTables({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    category: params.category || undefined,
  });

  return (
    <TableRegistryContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<TableRegistryError />}>
          <Suspense fallback={<TableRegistryLoading />}>
            <TableRegistryList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </TableRegistryContainer>
  );
};

export default Page;
