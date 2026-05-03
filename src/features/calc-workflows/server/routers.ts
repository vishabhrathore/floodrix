// src/features/calc-workflows/server/routers.ts

import z from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";
import { PAGINATION } from "@/config/constants";

export const calcWorkflowsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
        page: z.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
        pageSize: z.number().int().min(1).max(100).default(PAGINATION.DEFAULT_PAGE_SIZE),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const { organizationId, search, status, page, pageSize } = input;

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { globalRole: true },
      });

      if (organizationId) {
        if (user.globalRole !== "SUPER_ADMIN") {
          const member = await prisma.organizationMember.findUnique({
            where: {
              userId_organizationId: { userId, organizationId },
            },
          });
          if (!member) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
          }
        }
      } else {
        // If no organizationId provided, only SUPER_ADMIN can see all
        if (user.globalRole !== "SUPER_ADMIN") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "organizationId is required" });
        }
      }

      const where: Prisma.CalcWorkflowWhereInput = {
        ...(organizationId ? { organizationId } : {}),
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(search
          ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
          : {}),
      };

      const [items, totalItems] = await Promise.all([
        prisma.calcWorkflow.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          take: pageSize,
          skip: (page - 1) * pageSize,
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            category: true,
            tags: true,
            status: true,
            visibility: true,
            publishedAt: true,
            updatedAt: true,
            createdAt: true,
            _count: { select: { nodes: true, sessions: true } },
            ratingAggregate: {
              select: { averageRating: true, ratingCount: true },
            },
          },
        }),
        prisma.calcWorkflow.count({ where }),
      ]);

      const totalPages = Math.ceil(totalItems / pageSize);

      return { items, totalItems, totalPages, page };
    }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const isAdmin = ctx.auth.user.globalRole === "SUPER_ADMIN";

      const where: Prisma.CalcWorkflowWhereInput = {
        id: input.id,
        deletedAt: null,
      };

      if (!isAdmin) {
        where.organization = { members: { some: { userId } } };
      }

      return prisma.calcWorkflow.findFirstOrThrow({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          tags: true,
          status: true,
          visibility: true,
          organizationId: true,
          publishedAt: true,
          updatedAt: true,
          createdAt: true,
          metadata: true,
          _count: { select: { nodes: true, edges: true, variables: true, sessions: true } },
          currentVersion: { select: { version: true, publishedAt: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { globalRole: true },
      });

      if (user.globalRole !== "SUPER_ADMIN") {
        const member = await prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: { userId, organizationId: input.organizationId },
          },
        });
        if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
      }

      const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const existing = await prisma.calcWorkflow.count({
        where: { organizationId: input.organizationId, slug: { startsWith: baseSlug } },
      });
      const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

      return prisma.calcWorkflow.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          slug,
          description: input.description,
          category: input.category ?? "Flood Discharge",
          status: "DRAFT",
          visibility: "PRIVATE",
        },
      });
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.auth.user.id;
      const isAdmin = ctx.auth.user.globalRole === "SUPER_ADMIN";

      const where: Prisma.CalcWorkflowWhereInput = {
        id: input.id,
        deletedAt: null,
      };

      if (!isAdmin) {
        where.organization = { members: { some: { userId } } };
      }

      const wf = await prisma.calcWorkflow.findFirst({
        where,
      });
      if (!wf) throw new TRPCError({ code: "NOT_FOUND" });

      await prisma.calcWorkflow.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),
});