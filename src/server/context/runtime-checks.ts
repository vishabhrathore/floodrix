import { TRPCError } from "@trpc/server";

import { BillingType, PrismaClient } from "@/generated/prisma";

import { RequestContext } from "./context.types";

export async function assertAndConsumeBillingQuota(
  db: PrismaClient,
  ctx: RequestContext,
  runsToConsume: number = 1,
): Promise<void> {
  if (ctx.user.globalRole === "SUPER_ADMIN") return;

  if (!ctx.billing) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active billing plan",
    });
  }

  const { billing, workflow } = ctx;

  await db.$transaction(async (tx) => {
    // 1. Subscription Logic
    if (billing.billingType === BillingType.SUBSCRIPTION) {
      if (!ctx.usage)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Usage record missing",
        });

      const updated = await tx.orgUsage.updateMany({
        where: {
          id: ctx.usage.id,
          totalRuns: { lte: billing.plan.maxRunsPerMonth - runsToConsume },
        },
        data: { totalRuns: { increment: runsToConsume } },
      });

      if (updated.count === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Monthly run limit exceeded",
        });
      }
    }

    // 2. One-Time Run Quota Logic
    if (billing.billingType === BillingType.ONE_TIME) {
      const updated = await tx.orgBilling.updateMany({
        where: {
          id: billing.id,
          remainingRuns: { gte: runsToConsume },
        },
        data: { remainingRuns: { decrement: runsToConsume } },
      });

      if (updated.count === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not enough remaining runs on one-time plan.",
        });
      }
    }

    // 3. Workflow-Level Caps
    if (workflow && workflow.maxRunsTotal !== null) {
      const updated = await tx.calcWorkflow.updateMany({
        where: {
          id: workflow.id,
          totalRuns: { lte: workflow.maxRunsTotal - runsToConsume },
        },
        data: { totalRuns: { increment: runsToConsume } },
      });

      if (updated.count === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Workflow total run limit exceeded",
        });
      }
    }
  });
}
