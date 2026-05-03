import {
    AdminDashboardContainer,
    AdminDashboardList,
    AdminDashboardLoading,
    AdminDashboardError,
} from "@/features/admin/dashboard/components";
import {
    prefetchSuperAdminStats,
    prefetchSystemAlerts
} from "@/features/admin/dashboard/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

const Page = async () => {
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
    )
};

export default Page;