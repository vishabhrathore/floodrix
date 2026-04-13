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
        published: z.boolean().optional(),
        isSystem: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, category, published, isSystem } = input;

      const whereClause: any = {
        deletedAt: null,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
      };

      if (category && category !== "all") {
        whereClause.category = category;
      }

      if (published !== undefined) {
        whereClause.isPublished = published;
      }

      if (isSystem !== undefined) {
        whereClause.isSystem = isSystem;
      }

      const [items, totalCount] = await Promise.all([
        prisma.formulaRegistryItem.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { updatedAt: "desc" },
          include: {
            _count: {
              select: { registryUsages: true }
            }
          }
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

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.formulaRegistryItem.findUniqueOrThrow({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        category: z.string().min(1),
        subCategory: z.string().optional(),
        description: z.string().optional(),
        expressionNotation: z.string().min(1),
        displayExpression: z.string().optional(),
        inputVariables: z.any(),
        outputVariable: z.any(),
        reference: z.string().optional(),
        sourceStandard: z.string().optional(),
        yearIntroduced: z.number().int().optional().nullable(),
        region: z.string().optional(),
        applicability: z.string().optional(),
        limitations: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Find the user's personal organization or a default one
      // For now, let's assume we use the first organization they founder of
      const personalOrg = await prisma.organization.findFirst({
        where: { founderId: ctx.auth.user.id, isPersonal: true }
      });

      if (!personalOrg) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "User must have a personal organization." });
      }

      return prisma.formulaRegistryItem.create({
        data: {
          ...input,
          displayExpression: input.displayExpression || input.expressionNotation,
          organizationId: personalOrg.id,
          createdBy: ctx.auth.user.id,
          isSystem: false,
          isPublished: false,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
        subCategory: z.string().optional(),
        description: z.string().optional(),
        expressionNotation: z.string().optional(),
        displayExpression: z.string().optional(),
        inputVariables: z.any().optional(),
        outputVariable: z.any().optional(),
        reference: z.string().optional(),
        sourceStandard: z.string().optional(),
        yearIntroduced: z.number().int().optional().nullable(),
        region: z.string().optional(),
        applicability: z.string().optional(),
        limitations: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await prisma.formulaRegistryItem.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Only creator or super admin can update
      if (existing.createdBy !== ctx.auth.user.id && ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.formulaRegistryItem.update({
        where: { id },
        data,
      });
    }),

  createSystemFormula: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().min(1),
        expressionNotation: z.string().min(1),
        displayExpression: z.string().min(1),
        inputVariables: z.any(),
        outputVariable: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can create system formulas." });
      }

      // System formulas belong to a special system organization or we can use a hardcoded one
      // For now, find any organization where the user is an owner, or create a system one
      let systemOrg = await prisma.organization.findFirst({
        where: { name: "System Registry" }
      });

      if (!systemOrg) {
        systemOrg = await prisma.organization.create({
          data: {
            name: "System Registry",
            founderId: ctx.auth.user.id,
            isPersonal: false,
          }
        });
      }

      return prisma.formulaRegistryItem.create({
        data: {
          ...input,
          organizationId: systemOrg.id,
          isSystem: true,
          isPublished: true,
          visibility: Visibility.PUBLIC,
        },
      });
    }),
});