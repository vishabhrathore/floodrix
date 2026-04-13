import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { TRPCError } from "@trpc/server";
import { Visibility, TableType } from "@/generated/prisma";

export const tablesRouter = createTRPCRouter({
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
        prisma.tableRegistryItem.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.tableRegistryItem.count({ where: whereClause }),
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
      const item = await prisma.tableRegistryItem.findUnique({
        where: { id: input.id, deletedAt: null },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      return item;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        category: z.string().min(1),
        tableType: z.nativeEnum(TableType),
        columns: z.any(),
        data: z.any(),
        inputKeys: z.any().default([]),
        outputKey: z.any().default({}),
        description: z.string().optional(),
        visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
        isPublished: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = ctx.auth.organizationId;
      if (!organizationId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organization required" });
      }

      const existing = await prisma.tableRegistryItem.findUnique({
        where: {
          organizationId_slug: { organizationId, slug: input.slug },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already exists" });
      }

      return prisma.tableRegistryItem.create({
        data: {
          ...input,
          organizationId,
          isSystem: false,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
        description: z.string().optional(),
        visibility: z.nativeEnum(Visibility).optional(),
        isPublished: z.boolean().optional(),
        columns: z.any().optional(),
        data: z.any().optional(),
        inputKeys: z.any().optional(),
        outputKey: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId = ctx.auth.organizationId;

      const item = await prisma.tableRegistryItem.findUnique({
        where: { id, deletedAt: null },
      });

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Table not found" });
      }

      // Only owner org or super admin can update
      if (item.organizationId !== organizationId && ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Insufficient permissions" });
      }

      return prisma.tableRegistryItem.update({
        where: { id },
        data,
      });
    }),

  createSystemTable: protectedProcedure
    .input(
      z.object({
        slug: z.string().min(1, "Slug is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        category: z.string().min(1, "Category is required"),
        tableType: z.nativeEnum(TableType),
        columns: z.any(), // JSON
        data: z.any(), // JSON
        inputKeys: z.any(), // JSON
        outputKey: z.any(), // JSON
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can create system tables." });
      }

      // System organization fallback or specific ID
      const systemOrg = await prisma.organization.findFirst({
        where: { name: "System Registry" },
      });

      const organizationId = systemOrg?.id || ctx.auth.organizationId;

      if (!organizationId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Organization required for system tables" });
      }

      const existing = await prisma.tableRegistryItem.findUnique({
        where: {
          organizationId_slug: { organizationId, slug: input.slug },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already exists in system registry." });
      }

      return prisma.tableRegistryItem.create({
        data: {
          ...input,
          organizationId,
          isSystem: true,
          isPublished: true,
          visibility: Visibility.PUBLIC,
        },
      });
    }),
});