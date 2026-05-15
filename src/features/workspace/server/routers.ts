import z from "zod";

import { PAGINATION } from "@/config/constants";
import { Visibility } from "@/generated/prisma";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const workspacesRouter = createTRPCRouter({
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
        organizationId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, organizationId } = input;

      const whereClause = {
        name: {
          contains: search,
          mode: "insensitive" as const,
        },
        ...(organizationId && { organizationId }),
      };

      const [items, totalCount] = await Promise.all([
        prisma.workspace.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          include: {
            organization: {
              select: { name: true },
            },
            _count: {
              select: { nodes: true },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.workspace.count({
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

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
        name: z.string().min(1, "Workspace name is required"),
        description: z.string().optional(),
        visibility: z.nativeEnum(Visibility).default("PRIVATE"),
        isTemplate: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const { organizationId, name, description, visibility, isTemplate } =
        input;

      return prisma.workspace.create({
        data: {
          organizationId,
          name,
          description,
          visibility,
          isTemplate,
          // Initialize with a root node for the canvas out of the box
          nodes: {
            create: {
              nodeType: "ROOT",
              name: "Canvas Root",
            },
          },
        },
      });
    }),
});
