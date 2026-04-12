import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { TRPCError } from "@trpc/server";
import { Visibility } from "@/generated/prisma";

export const formulasRouter = createTRPCRouter({
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
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, category } = input;

      const whereClause = {
        deletedAt: null,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
        ...(category && { category }),
      };

      const [items, totalCount] = await Promise.all([
        prisma.formulaRegistryItem.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.formulaRegistryItem.count({ where: whereClause }),
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

  createSystemFormula: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
        slug: z.string().min(1, "Slug is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        category: z.string().min(1, "Category is required"),
        expressionNotation: z.string().min(1, "Expression notation is required"),
        displayExpression: z.string().min(1, "Display expression is required"),
        inputVariables: z.any(), // JSON
        outputVariable: z.any(), // JSON
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can create system formulas." });
      }

      const existing = await prisma.formulaRegistryItem.findUnique({
        where: {
          organizationId_slug: { organizationId: input.organizationId, slug: input.slug },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already exists in this organization." });
      }

      return prisma.formulaRegistryItem.create({
        data: {
          ...input,
          isSystem: true,
          isPublished: true,
          visibility: Visibility.PUBLIC,
        },
      });
    }),
});