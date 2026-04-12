import { prefetch, trpc } from "@/trpc/server";

/**
 * Prefetch super admin stats
 */
export const prefetchSuperAdminStats = () => {
  return prefetch(trpc.dashboard.getSuperAdminStats.queryOptions());
};

/**
 * Prefetch system alerts
 */
export const prefetchSystemAlerts = () => {
  return prefetch(trpc.dashboard.getSystemAlerts.queryOptions());
};