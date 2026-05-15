import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PAGINATION } from "@/config/constants";
import { TableType, Visibility } from "@/generated/prisma";
import { loadContext } from "@/server/context/context.loader";
import { assertPolicy } from "@/server/context/guards";
import { isOrgAdmin, isSuperAdmin } from "@/server/context/permission";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";

export const tablesRouter = createTRPCRouter({
  // ──────────────────────────────────────────────────────────────────────────
  // GET MANY
  // ──────────────────────────────────────────────────────────────────────────
  getMany: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z.number().default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        category: z.string().nullish(),
        tableType: z.nativeEnum(TableType).nullish(),
        published: z.boolean().optional(),
        isSystem: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        search,
        category,
        tableType,
        published,
        isSystem,
      } = input;
      const { reqCtx } = ctx;

      // Visibility filter logic matched to your permission file
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
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" as const } },
              { slug: { contains: search, mode: "insensitive" as const } },
            ]
          : undefined,
        ...(category && category !== "all" ? { category } : {}),
        ...(tableType ? { tableType } : {}),
        ...(published !== undefined ? { isPublished: published } : {}),
        ...(isSystem !== undefined ? { isSystem } : {}),
      };

      const [items, totalCount] = await Promise.all([
        ctx.db.tableRegistryItem.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { updatedAt: "desc" },
          include: { _count: { select: { registryUsages: true } } }, // Show how many workflows use this table
        }),
        ctx.db.tableRegistryItem.count({ where: whereClause }),
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

  // ──────────────────────────────────────────────────────────────────────────
  // GET ONE
  // ──────────────────────────────────────────────────────────────────────────
  getOne: orgProcedure
    .input(z.object({ organizationId: z.string().optional(), id: z.string() }))
    .query(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId: input.organizationId,
        tableRegistryId: input.id,
      });

      if (!reqCtx.tableItem)
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });

      assertPolicy(reqCtx, "view", "table");
      return reqCtx.tableItem;
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE (Standard Users)
  // ──────────────────────────────────────────────────────────────────────────
  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        name: z.string().min(1),
        slug: z.string().min(1),
        category: z.string().min(1),
        subCategory: z.string().optional(),
        description: z.string().optional(),
        tableType: z.nativeEnum(TableType),
        inputKeys: z.any(),
        outputKey: z.any(),
        columns: z.any(),
        data: z.any(),
        interpolationConfig: z.any().optional(),
        fallbackMode: z.string().default("error"),
        fallbackValue: z.any().optional(),
        allowOverride: z.boolean().default(false),
        showInOutput: z.boolean().default(true),
        reference: z.string().optional(),
        sourceStandard: z.string().optional(),
        sourcePage: z.string().optional(),
        sourceImage: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { reqCtx } = ctx;
      if (!reqCtx.actor)
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Actor not found.",
        });

      const { organizationId, ...tableData } = input;

      return ctx.db.tableRegistryItem.create({
        data: {
          ...tableData,
          organizationId: organizationId || reqCtx.organization?.id,
          createdBy: reqCtx.actor.id,
          isSystem: false, // Strongly enforced
          isPublished: false,
        },
      });
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────
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
        tableType: z.nativeEnum(TableType).optional(),
        inputKeys: z.any().optional(),
        outputKey: z.any().optional(),
        columns: z.any().optional(),
        data: z.any().optional(),
        interpolationConfig: z.any().optional(),
        fallbackMode: z.string().optional(),
        fallbackValue: z.any().optional(),
        allowOverride: z.boolean().optional(),
        showInOutput: z.boolean().optional(),
        reference: z.string().optional(),
        sourceStandard: z.string().optional(),
        sourcePage: z.string().optional(),
        sourceImage: z.string().optional(),
        tags: z.array(z.string()).optional(),
        visibility: z.nativeEnum(Visibility).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, organizationId, ...data } = input;

      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId,
        tableRegistryId: id,
      });

      if (!reqCtx.tableItem)
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });

      assertPolicy(reqCtx, "edit", "table");

      return ctx.db.tableRegistryItem.update({
        where: { id },
        data,
      });
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE (Soft)
  // ──────────────────────────────────────────────────────────────────────────
  delete: orgProcedure
    .input(z.object({ organizationId: z.string().optional(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId: input.organizationId,
        tableRegistryId: input.id,
      });

      if (!reqCtx.tableItem)
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });

      assertPolicy(reqCtx, "delete", "table");

      return ctx.db.tableRegistryItem.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE SYSTEM TABLE (SUPER_ADMIN ONLY)
  // ──────────────────────────────────────────────────────────────────────────
  createSystemTable: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        slug: z.string().min(1),
        name: z.string().min(1),
        description: z.string().optional(),
        category: z.string().min(1),
        subCategory: z.string().optional(),
        tableType: z.nativeEnum(TableType),
        inputKeys: z.any(),
        outputKey: z.any(),
        columns: z.any(),
        data: z.any(),
        interpolationConfig: z.any().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { reqCtx } = ctx;

      // 1. Immediate Authorization Check
      if (!isSuperAdmin(reqCtx)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only super admins can create system tables.",
        });
      }

      const { organizationId, ...tableData } = input;

      // 2. Resolve Global System Organization
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

      // 3. Create Public System Record
      return ctx.db.tableRegistryItem.create({
        data: {
          ...tableData,
          organizationId: systemOrg.id,
          isSystem: true,
          isPublished: true,
          visibility: Visibility.PUBLIC,
        },
      });
    }),
});
