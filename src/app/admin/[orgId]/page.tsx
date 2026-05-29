import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ErrorBoundary } from "react-error-boundary";

import {
  AdminDashboardContainer,
  AdminDashboardError,
  AdminDashboardList,
  AdminDashboardLoading,
} from "@/features/admin/dashboard/components";
import {
  prefetchSuperAdminStats,
  prefetchSystemAlerts,
} from "@/features/admin/dashboard/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import db from "@/lib/db";
import { HydrateClient } from "@/trpc/server";

interface PageProps {
  params: Promise<{ orgId: string }>;
}

const Page = async ({ params }: PageProps) => {
  const { orgId } = await params;
  await requireAuth();

  // Prefetch data for the dashboard
  prefetchSuperAdminStats();
  prefetchSystemAlerts();

  return (
    <AdminDashboardContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<AdminDashboardError />}>
          <Suspense fallback={<AdminDashboardLoading />}>
            <AdminDashboardList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </AdminDashboardContainer>
  );
};

export default Page;
