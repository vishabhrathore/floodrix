import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PAGINATION } from "@/config/constants";
import {
  CollaboratorPermission,
  LibraryStatus,
  Visibility,
  WorkflowStatus,
} from "@/generated/prisma";
import { loadContext } from "@/server/context/context.loader";
import { assertPolicy } from "@/server/context/guards";
import { isOrgAdmin } from "@/server/context/permission";
import {
  createTRPCRouter,
  orgProcedure,
  protectedProcedure,
} from "@/trpc/init";

export const calcWorkflowsRouter = createTRPCRouter({
  // ──────────────────────────────────────────────────────────────────────────
  // GET MANY (Private Organization Dashboard)
  // ──────────────────────────────────────────────────────────────────────────
  getMany: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        page: z.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        status: z.nativeEnum(WorkflowStatus).optional(),
        visibility: z.nativeEnum(Visibility).optional(),
        libraryStatus: z.nativeEnum(LibraryStatus).optional(),
        category: z.string().optional(),
        sortBy: z.enum(["createdAt", "updatedAt", "name"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        search,
        status,
        visibility,
        category,
        libraryStatus,
        sortBy,
        sortOrder,
      } = input;
      const { reqCtx } = ctx;

      const organizationId = input.organizationId || reqCtx.organization?.id;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization ID is required.",
        });
      }

      // todo fix visibility ---- for library, publish
      // Visibility filter: Admins see all. Members see PUBLIC or workflows where they are a collaborator.
      const visibilityFilter = isOrgAdmin(reqCtx)
        ? {}
        : {
            OR: [
              { visibility: Visibility.PUBLIC },
              { collaborators: { some: { actorId: reqCtx.actor?.id ?? "" } } },
            ],
          };

      const whereClause = {
        organizationId,
        deletedAt: null,
        ...visibilityFilter,
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                description: { contains: search, mode: "insensitive" as const },
              },
            ]
          : undefined,
        ...(status ? { status } : {}),
        ...(visibility ? { visibility } : {}),
        ...(libraryStatus ? { libraryStatus } : {}),
        ...(category && category !== "all" ? { category } : {}),
      };

      const [items, totalCount] = await Promise.all([
        ctx.db.calcWorkflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { [sortBy ?? "updatedAt"]: sortOrder ?? "desc" },
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
            // Include collaborators to show avatars in the UI
            collaborators: {
              include: { actor: { select: { displayName: true } } },
            },
          },
        }),
        ctx.db.calcWorkflow.count({ where: whereClause }),
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
      const organizationId =
        input.organizationId || ctx.reqCtx.organization?.id;
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId,
        workflowId: input.id,
      });

      if (!reqCtx.workflow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });
      }

      // The Policy Engine now automatically bypasses assertions if it is in the Public Library
      assertPolicy(reqCtx, "view", "workflow");

      return ctx.db.calcWorkflow.findUnique({
        where: { id: input.id },
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
          _count: {
            select: {
              nodes: true,
              edges: true,
              variables: true,
              sessions: true,
            },
          },
          currentVersion: { select: { version: true, publishedAt: true } },
          collaborators: {
            include: { actor: { select: { displayName: true } } },
          },
        },
      });
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────
  create: orgProcedure
    .input(
      z.object({
        organizationId: z.string().optional(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        category: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { reqCtx } = ctx;
      const organizationId = input.organizationId || reqCtx.organization?.id;
      if (!organizationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Organization ID is required.",
        });
      }
      if (!reqCtx.actor) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Actor not found.",
        });
      }

      // Auto-Slug generation logic
      const baseSlug = input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      const existingCount = await ctx.db.calcWorkflow.count({
        where: {
          organizationId: input.organizationId,
          slug: { startsWith: baseSlug },
        },
      });

      const slug =
        existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

      // Nested create: makes the workflow AND grants the creator ADMIN rights over it
      return ctx.db.calcWorkflow.create({
        data: {
          organizationId,
          name: input.name,
          slug,
          description: input.description,
          category: input.category ?? "Flood Discharge",
          status: WorkflowStatus.DRAFT,
          visibility: Visibility.PRIVATE,
          collaborators: {
            create: {
              actorId: reqCtx.actor.id,
              permission: CollaboratorPermission.ADMIN,
            },
          },
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
        description: z.string().optional(),
        category: z.string().optional(),
        visibility: z.nativeEnum(Visibility).optional(),
        status: z.nativeEnum(WorkflowStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const organizationId =
        input.organizationId || ctx.reqCtx.organization?.id;

      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId,
        workflowId: id,
      });

      if (!reqCtx.workflow)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });

      assertPolicy(reqCtx, "edit", "workflow");

      return ctx.db.calcWorkflow.update({
        where: { id },
        data,
      });
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────
  remove: orgProcedure
    .input(z.object({ organizationId: z.string().optional(), id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId =
        input.organizationId || ctx.reqCtx.organization?.id;
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId,
        workflowId: input.id,
      });

      if (!reqCtx.workflow)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow not found",
        });

      assertPolicy(reqCtx, "delete", "workflow");

      await ctx.db.calcWorkflow.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  // ──────────────────────────────────────────────────────────────────────────
  // GET PUBLIC LIBRARY WORKFLOWS (Cross-Organization)
  // ──────────────────────────────────────────────────────────────────────────
  getPublicLibrary: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .int()
          .min(1)
          .max(100)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        category: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search, category } = input;

      const whereClause = {
        deletedAt: null,
        status: WorkflowStatus.PUBLISHED, // Only show published workflows in the library
        // MUST be marked as listed or public
        OR: [
          { libraryStatus: LibraryStatus.LISTED },
          { visibility: Visibility.PUBLIC },
        ],
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                {
                  description: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
        ...(category && category !== "all" ? { category } : {}),
      };

      const [items, totalCount] = await Promise.all([
        ctx.db.calcWorkflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            publicSlug: true,
            description: true,
            category: true,
            tags: true,
            libraryStatus: true,
            publishedAt: true,
            ratingAggregate: {
              select: { averageRating: true, ratingCount: true },
            },
            // Includes the organization name to show who authored it in the marketplace
            organization: { select: { name: true } },
          },
        }),
        ctx.db.calcWorkflow.count({ where: whereClause }),
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
});
