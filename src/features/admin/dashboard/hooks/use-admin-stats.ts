import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";

/**
 * Hook to fetch top KPI stats for the Super Admin dashboard
 */
export const useSuspenseSuperAdminStats = () => {
    const trpc = useTRPC();
    return useSuspenseQuery(trpc.dashboard.getSuperAdminStats.queryOptions());
};

/**
 * Hook to fetch system alerts for the Super Admin dashboard
 */
export const useSuspenseSystemAlerts = () => {
    const trpc = useTRPC();
    return useSuspenseQuery(trpc.dashboard.getSystemAlerts.queryOptions());
};