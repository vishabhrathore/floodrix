import { TRPCError } from "@trpc/server";
import z from "zod";

import { PAGINATION } from "@/config/constants";
import { BillingStatus, GlobalRole } from "@/generated/prisma";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const organizationsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        status: z.string().default(""),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, status } = input;

      const whereClause = {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
        // If a status is provided, filter by the associated billing status
        ...(status && {
          billing: {
            some: {
              status: status as BillingStatus,
            },
          },
        }),
      };

      const [items, totalCount] = await Promise.all([
        prisma.organization.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          include: {
            // Count relations for the UI (e.g., "5 members · 18 workflows")
            _count: {
              select: {
                members: true,
                calcWorkflows: true,
              },
            },
            // Fetch the active billing plan for the badges
            billing: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                plan: {
                  select: { name: true },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.organization.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.organization.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          founder: { select: { name: true, email: true } },
          billing: { include: { plan: true } },
          _count: {
            select: { members: true, calcWorkflows: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Organization name is required"),
        isPersonal: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create org and automatically add the creator as an OWNER
      return prisma.organization.create({
        data: {
          name: input.name,
          isPersonal: input.isPersonal,
          founderId: ctx.auth.user.id,
          members: {
            create: {
              userId: ctx.auth.user.id,
              role: "OWNER",
            },
          },
          // Also create a default CalcActor for the founder in this org
          calcActors: {
            create: {
              userId: ctx.auth.user.id,
              displayName: ctx.auth.user.name || "Admin",
            },
          },
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(BillingStatus), // ACTIVE, CANCELED, EXPIRED
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== GlobalRole.SUPER_ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      const activeBilling = await prisma.orgBilling.findFirst({
        where: { organizationId: input.id },
        orderBy: { createdAt: "desc" },
      });

      if (!activeBilling) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No billing record found for this organization",
        });
      }

      return prisma.orgBilling.update({
        where: { id: activeBilling.id },
        data: { status: input.status },
      });
    }),
});
