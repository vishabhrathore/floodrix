import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

// Helper to ensure only super admins can access these routes
const superAdminMiddleware = async (ctx: any) => {
  if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only super admins can access the dashboard statistics.",
    });
  }
};

export const dashboardRouter = createTRPCRouter({
  /**
   * Fetches the top KPI numbers for the super admin dashboard
   */
  getSuperAdminStats: protectedProcedure.query(async ({ ctx }) => {
    await superAdminMiddleware(ctx);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalOrganizations,
      newOrgsThisMonth,
      totalCalcWorkflows,
      newWorkflowsThisMonth,
      activeSessionsToday,
      pendingLibrarySubmissions,
    ] = await Promise.all([
      // Organizations
      prisma.organization.count(),
      prisma.organization.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Calc Workflows
      prisma.calcWorkflow.count(),
      prisma.calcWorkflow.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Active Sessions Today (Running or Paused)
      prisma.calcSession.count({
        where: {
          startedAt: { gte: startOfDay },
          status: { in: ["RUNNING", "PAUSED"] },
        },
      }),
      // Awaiting Review Submissions
      prisma.librarySubmission.count({
        where: { status: "PENDING" },
      }),
    ]);

    return {
      organizations: {
        total: totalOrganizations,
        thisMonth: newOrgsThisMonth,
      },
      calcWorkflows: {
        total: totalCalcWorkflows,
        thisMonth: newWorkflowsThisMonth,
      },
      sessions: {
        activeToday: activeSessionsToday,
      },
      library: {
        pendingReview: pendingLibrarySubmissions,
      },
    };
  }),

  /**
   * Fetches the "System alerts" list (bottom right of the dashboard)
   */
  getSystemAlerts: protectedProcedure.query(async ({ ctx }) => {
    await superAdminMiddleware(ctx);

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [stuckBatchJobs, expiredBillings, idleSessions] = await Promise.all([
      // Batch jobs stuck in processing for more than 30 mins
      prisma.batchJob.findMany({
        where: {
          status: "PROCESSING",
          updatedAt: { lt: thirtyMinutesAgo },
        },
        select: { id: true },
      }),
      // Failed/Canceled payments (Orgs requiring contact)
      prisma.orgBilling.findMany({
        where: { status: "CANCELED" },
        include: { organization: { select: { name: true } } },
      }),
      // Sessions idle/paused for > 7 days
      prisma.calcSession.findMany({
        where: {
          status: "PAUSED",
          updatedAt: { lt: sevenDaysAgo },
        },
        select: { id: true },
      }),
    ]);

    return {
      stuckBatchJobsCount: stuckBatchJobs.length,
      failedPayments: expiredBillings.map((b) => b.organization.name),
      idleSessionsCount: idleSessions.length,
    };
  }),
});