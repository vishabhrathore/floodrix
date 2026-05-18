import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PAGINATION } from "@/config/constants";
import { GlobalRole } from "@/generated/prisma";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const adminUsersRouter = createTRPCRouter({
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
      }),
    )
    .query(async ({ ctx, input }) => {
      // ── Permission Policy Guard ──
      if (ctx.auth.user.globalRole !== GlobalRole.SUPER_ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access Denied: Super Admin role required",
        });
      }

      const { page, pageSize, search } = input;

      const whereClause = search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const [items, totalCount] = await Promise.all([
        prisma.user.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          include: {
            _count: {
              select: {
                workflows: true,
                credentials: true,
              },
            },
            organizationMembers: {
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.user.count({
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

  updateRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.nativeEnum(GlobalRole),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // ── Permission Policy Guard ──
      if (ctx.auth.user.globalRole !== GlobalRole.SUPER_ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access Denied: Super Admin role required",
        });
      }

      // Self demotion safety check
      if (
        input.userId === ctx.userId &&
        input.role !== GlobalRole.SUPER_ADMIN
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Security Protection: You cannot demote yourself from Super Admin",
        });
      }

      return prisma.user.update({
        where: { id: input.userId },
        data: { globalRole: input.role },
      });
    }),

  deleteUser: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // ── Permission Policy Guard ──
      if (ctx.auth.user.globalRole !== GlobalRole.SUPER_ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access Denied: Super Admin role required",
        });
      }

      // Self deletion check
      if (input.userId === ctx.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Security Protection: You cannot delete your own account",
        });
      }

      return prisma.user.delete({
        where: { id: input.userId },
      });
    }),
});
