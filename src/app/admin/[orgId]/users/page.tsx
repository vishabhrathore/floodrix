import { Suspense } from "react";

import { ErrorBoundary } from "react-error-boundary";

import {
  UsersContainer,
  UsersError,
  UsersList,
  UsersLoading,
} from "@/features/admin/users/components";
import { adminUserParamsLoader } from "@/features/admin/users/server/params-loader";
import { prefetchAdminUsers } from "@/features/admin/users/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<any>;
}

const Page = async ({ searchParams }: PageProps) => {
  // ── Permission Guard & Authentication check ──
  await requireAuth();

  // Load state params
  const params = await adminUserParamsLoader(searchParams);

  // Prefetch user listing query server-side
  await prefetchAdminUsers({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
  });

  return (
    <UsersContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<UsersError />}>
          <Suspense fallback={<UsersLoading />}>
            <UsersList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </UsersContainer>
  );
};

export default Page;
