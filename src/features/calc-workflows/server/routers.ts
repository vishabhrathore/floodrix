import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import z from "zod";
import { PAGINATION } from "@/config/constants";
import { WorkflowStatus, Visibility } from "@/generated/prisma";
import { TRPCError } from "@trpc/server";

export const calcWorkflowsRouter = createTRPCRouter({
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
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, organizationId, status } = input;

      const whereClause = {
        deletedAt: null, // Only fetch workflows that haven't been soft-deleted
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { slug: { contains: search, mode: "insensitive" as const } },
        ],
        ...(organizationId && { organizationId }),
        ...(status && { status: status as WorkflowStatus }),
      };

      const [items, totalCount] = await Promise.all([
        prisma.calcWorkflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          include: {
            organization: { select: { name: true } },
            currentVersion: { select: { version: true, publishedAt: true } },
            _count: { select: { nodes: true, sessions: true } },
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.calcWorkflow.count({ where: whereClause }),
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
      return prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: input.id, deletedAt: null },
        include: {
          organization: { select: { name: true, isPersonal: true } },
          currentVersion: true,
          _count: {
            select: { versions: true, nodes: true, edges: true, sessions: true },
          },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().min(1, "Organization ID is required"),
        name: z.string().min(1, "Name is required"),
        slug: z.string().min(1, "Slug is required"),
        description: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Check for slug uniqueness within the organization
      const existing = await prisma.calcWorkflow.findUnique({
        where: {
          organizationId_slug: {
            organizationId: input.organizationId,
            slug: input.slug,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A workflow with this slug already exists in this organization.",
        });
      }

      return prisma.calcWorkflow.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          category: input.category,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        status: z.nativeEnum(WorkflowStatus).optional(),
        visibility: z.nativeEnum(Visibility).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return prisma.calcWorkflow.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      // Soft delete implementation based on your schema's `deletedAt` field
      return prisma.calcWorkflow.update({
        where: { id: input.id },
        data: {
          deletedAt: new Date(),
          status: "ARCHIVED", // Automatically archive on delete
        },
      });
    }),
});