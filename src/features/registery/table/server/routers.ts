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

  createSystemTable: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
        slug: z.string().min(1, "Slug is required"),
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        category: z.string().min(1, "Category is required"),
        tableType: z.nativeEnum(TableType),
        inputKeys: z.any(), // JSON
        outputKey: z.any(), // JSON
        columns: z.any(), // JSON
        data: z.any(), // JSON
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only super admins can create system tables." });
      }

      const existing = await prisma.tableRegistryItem.findUnique({
        where: {
          organizationId_slug: { organizationId: input.organizationId, slug: input.slug },
        },
      });

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already exists in this organization." });
      }

      return prisma.tableRegistryItem.create({
        data: {
          ...input,
          isSystem: true,
          isPublished: true,
          visibility: Visibility.PUBLIC,
        },
      });
    }),
});