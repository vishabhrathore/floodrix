// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workspace-canvas/server/router.ts
//  tRPC router for workspace canvas — tree + visual organizer for workflows
// ═══════════════════════════════════════════════════════════════════════════
import { TRPCError } from "@trpc/server";
import z from "zod";

import { Prisma, WorkspaceNodeType } from "@/generated/prisma";
import db from "@/lib/db";
import { loadContext } from "@/server/context/context.loader";
import { assertPolicy } from "@/server/context/guards";
import { isOrgMember } from "@/server/context/permission";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

// ─── Router ────────────────────────────────────────────────────────────────

export const workspaceCanvasRouter = createTRPCRouter({
  /**
   * Load all nodes for a workspace (ONE query — client derives RF state).
   * Includes linked workflow name/status for display.
   */
  load: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        organizationId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
      });

      if (!reqCtx.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      assertPolicy(reqCtx, "view", "workspace");

      const nodes = await db.workspaceNode.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          linkedWorkflow: {
            select: { id: true, name: true, status: true, category: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }],
      });

      return { nodes };
    }),

  /**
   * Batched save — create/update/delete workspace nodes in ONE transaction.
   * The client pre-computes parentId, sortOrder, position — server just persists.
   */
  saveCanvas: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        organizationId: z.string().optional(),
        create: z.array(
          z.object({
            id: z.string(),
            parentId: z.string(),
            nodeType: z.nativeEnum(WorkspaceNodeType),
            name: z.string(),
            icon: z.string().nullable().optional(),
            sortOrder: z.number(),
            canvasX: z.number().nullable().optional(),
            canvasY: z.number().nullable().optional(),
            linkedWorkflowId: z.string().nullable().optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          }),
        ),
        update: z.array(
          z.object({
            id: z.string(),
            data: z.record(z.string(), z.unknown()),
          }),
        ),
        delete: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
      });

      if (!reqCtx.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      assertPolicy(reqCtx, "edit", "workspace");

      await db.$transaction(async (tx) => {
        // 1. Delete first
        if (input.delete.length > 0) {
          await tx.workspaceNode.deleteMany({
            where: {
              id: { in: input.delete },
              workspaceId: input.workspaceId,
            },
          });
        }

        // 2. Create new nodes
        if (input.create.length > 0) {
          await tx.workspaceNode.createMany({
            data: input.create.map((n) => ({
              id: n.id,
              workspaceId: input.workspaceId,
              parentId: n.parentId,
              nodeType: n.nodeType,
              name: n.name,
              icon: n.icon ?? null,
              sortOrder: n.sortOrder,
              canvasX: n.canvasX ?? null,
              canvasY: n.canvasY ?? null,
              linkedWorkflowId:
                n.linkedWorkflowId && n.linkedWorkflowId !== ""
                  ? n.linkedWorkflowId
                  : null,
              metadata:
                (n.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            })),
            skipDuplicates: true,
          });
        }

        // 3. Update modified nodes
        for (const { id, data } of input.update) {
          // Sanitize: only allow fields that exist on WorkspaceNode
          const allowed: Record<string, unknown> = {};
          const allowedKeys = [
            "parentId",
            "name",
            "description",
            "icon",
            "color",
            "sortOrder",
            "isExpanded",
            "canvasX",
            "canvasY",
            "linkedWorkflowId",
            "linkedVersion",
            "externalUrl",
            "noteContent",
            "isLocked",
          ];
          for (const key of allowedKeys) {
            if (key in data) allowed[key] = data[key];
          }
          // Handle metadata separately (needs JSON cast)
          if ("metadata" in data) {
            allowed.metadata = data.metadata
              ? (data.metadata as Prisma.InputJsonValue)
              : Prisma.JsonNull;
          }
          if ("linkedWorkflowId" in data) {
            allowed.linkedWorkflowId =
              data.linkedWorkflowId && data.linkedWorkflowId !== ""
                ? data.linkedWorkflowId
                : null;
          }

          await tx.workspaceNode.updateMany({
            where: { id, workspaceId: input.workspaceId },
            data: { ...allowed, updatedAt: new Date() },
          });
        }
      });

      return {
        created: input.create.length,
        updated: input.update.length,
        deleted: input.delete.length,
      };
    }),

  /**
   * Get single workspace metadata.
   */
  get: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        organizationId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
      });

      if (!reqCtx.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      assertPolicy(reqCtx, "view", "workspace");

      return reqCtx.workspace;
    }),

  /**
   * List workspaces for an organization (paginated).
   */
  list: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        limit: z.number().int().min(1).max(50).default(20),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId: input.organizationId,
      });

      if (!isOrgMember(reqCtx)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must be a member of this organization",
        });
      }

      const items = await db.workspace.findMany({
        where: {
          organizationId: input.organizationId,
        },
        orderBy: { updatedAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          visibility: true,
          isTemplate: true,
          updatedAt: true,
          _count: { select: { nodes: true } },
        },
      });

      const hasMore = items.length > input.limit;
      const data = hasMore ? items.slice(0, input.limit) : items;

      return {
        items: data,
        nextCursor: hasMore ? data[data.length - 1]?.id : null,
      };
    }),

  /**
   * Create workspace with auto-generated ROOT node.
   */
  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        organizationId: input.organizationId,
      });

      assertPolicy(reqCtx, "create", "workspace");

      return db.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            organizationId: input.organizationId,
            name: input.name,
            description: input.description,
            icon: input.icon,
          },
        });

        // Every workspace gets an invisible ROOT node as the tree root
        await tx.workspaceNode.create({
          data: {
            workspaceId: workspace.id,
            nodeType: "ROOT",
            name: "Root",
            sortOrder: 0,
            isExpanded: true,
          },
        });

        return { id: workspace.id, name: workspace.name };
      });
    }),

  /**
   * Update workspace metadata (name, description, icon, etc).
   */
  update: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        organizationId: z.string().optional(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).nullable().optional(),
        icon: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
      });

      if (!reqCtx.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      assertPolicy(reqCtx, "edit", "workspace");

      const { workspaceId, organizationId, ...data } = input;
      return db.workspace.update({
        where: { id: workspaceId },
        data,
        select: { id: true, name: true, updatedAt: true },
      });
    }),

  /**
   * Delete workspace (cascade deletes all nodes via Prisma relation).
   */
  delete: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        organizationId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const reqCtx = await loadContext(ctx.db, ctx.userId, {
        workspaceId: input.workspaceId,
        organizationId: input.organizationId,
      });

      if (!reqCtx.workspace) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workspace not found",
        });
      }

      assertPolicy(reqCtx, "delete", "workspace");

      await db.workspace.delete({ where: { id: input.workspaceId } });
      return { success: true };
    }),
});
