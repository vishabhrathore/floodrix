import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PAGINATION } from "@/config/constants";
import { Visibility } from "@/generated/prisma";
import { loadContext } from "@/server/context/context.loader";
import { assertPolicy } from "@/server/context/guards";
import { isOrgAdmin, isSuperAdmin } from "@/server/context/permission";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";

export const formulasRouter = createTRPCRouter({
  getMany: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, category, published, isSystem } = input;
      const { reqCtx } = ctx;

      const visibilityFilter = isOrgAdmin(reqCtx)
        ? {}
        : {
            OR: [
              { visibility: Visibility.PUBLIC },
              {
                visibility: Visibility.PRIVATE,
                createdBy: reqCtx.actor?.id ?? "",
              },
            ],
          };

      const whereClause = {
        organizationId: input.organizationId || reqCtx.organization?.id,
        deletedAt: null,
        ...visibilityFilter,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
        ...(category && category !== "all" ? { category } : {}),
        ...(published !== undefined ? { isPublished: published } : {}),
        ...(isSystem !== undefined ? { isSystem } : {}),
      };

      const [items, totalCount] = await Promise.all([
        ctx.db.formulaRegistryItem.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { registryUsages: true } } },
        }),
        ctx.db.formulaRegistryItem.count({ where: whereClause }),
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

  getOne: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        id: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId: input.organizationId,
        formulaRegistryId: input.id,
      });

      if (!reqCtx.formulaItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Formula not found",
        });
      }

      assertPolicy(reqCtx, "view", "formula");

      return reqCtx.formulaItem;
    }),

  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        name: z.string().min(1),
        slug: z.string().min(1),
        category: z.string().min(1),
        subCategory: z.string().optional(),
        description: z.string().optional(),
        expressionNotation: z.string().min(1),
        displayExpression: z.string().optional(),
        inputVariables: z.any(),
        outputVariable: z.any(),
        intermediateSteps: z.array(z.any()).optional(),
        reference: z.string().optional(),
        sourceStandard: z.string().optional(),
        yearIntroduced: z.number().int().optional().nullable(),
        region: z.string().optional(),
        applicability: z.string().optional(),
        limitations: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
        isSystem: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { reqCtx } = ctx;

      if (!reqCtx.actor) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "No actor found for this user in the organization.",
        });
      }

      const { organizationId, ...formulaData } = input;
      const finalOrgId = organizationId || reqCtx.organization?.id;

      return ctx.db.formulaRegistryItem.create({
        data: {
          ...formulaData,
          displayExpression:
            input.displayExpression || input.expressionNotation,
          organizationId: finalOrgId,
          createdBy: reqCtx.actor.id,
          isSystem: input.isSystem && isSuperAdmin(reqCtx) ? true : false,
          isPublished: input.isPublished ?? false,
        },
      });
    }),

  update: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        id: z.string(),
        name: z.string().optional(),
        slug: z.string().optional(),
        category: z.string().optional(),
        subCategory: z.string().optional(),
        description: z.string().optional(),
        expressionNotation: z.string().optional(),
        displayExpression: z.string().optional(),
        inputVariables: z.any().optional(),
        outputVariable: z.any().optional(),
        intermediateSteps: z.array(z.any()).optional(),
        reference: z.string().optional(),
        sourceStandard: z.string().optional(),
        yearIntroduced: z.number().int().optional().nullable(),
        region: z.string().optional(),
        applicability: z.string().optional(),
        limitations: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).optional(),
        isSystem: z.boolean().optional(),
        isPublished: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId,
        formulaRegistryId: id,
      });

      if (!reqCtx.formulaItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Formula not found",
        });
      }

      assertPolicy(reqCtx, "edit", "formula");

      const updateData = { ...data };
      if (updateData.isSystem !== undefined && !isSuperAdmin(reqCtx)) {
        delete updateData.isSystem;
      }

      return ctx.db.formulaRegistryItem.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId: input.organizationId,
        formulaRegistryId: input.id,
      });

      if (!reqCtx.formulaItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Formula not found",
        });
      }

      assertPolicy(reqCtx, "delete", "formula");

      return ctx.db.formulaRegistryItem.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  createSystemFormula: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().min(1),
        subCategory: z.string().optional(),
        expressionNotation: z.string().min(1),
        displayExpression: z.string().min(1),
        inputVariables: z.any(),
        outputVariable: z.any(),
        intermediateSteps: z.array(z.any()).optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { reqCtx } = ctx;

      if (!isSuperAdmin(reqCtx)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can create system formulas.",
        });
      }

      const { organizationId, ...formulaData } = input;

      let systemOrg = await ctx.db.organization.findFirst({
        where: { name: "System Registry" },
      });

      if (!systemOrg) {
        systemOrg = await ctx.db.organization.create({
          data: {
            name: "System Registry",
            founderId: reqCtx.user.id,
            isPersonal: false,
          },
        });
      }

      return ctx.db.formulaRegistryItem.create({
        data: {
          ...formulaData,
          organizationId: systemOrg.id,
          isSystem: true,
          isPublished: true,
          visibility: Visibility.PUBLIC,
        },
      });
    }),
});
