// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/server/router.ts
// ═══════════════════════════════════════════════════════════════════════════

import z from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { saveCanvasOptimized, publishWorkflow } from "../engine/canvas-save";
import { loadWorkflowForExecution } from "./canvas-queries";
import { WorkflowStatus, Visibility, Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";

// ─── Input schemas ─────────────────────────────────────────────────────────

const workflowIdSchema = z.object({ workflowId: z.string() });

const nodeSchema = z.object({
    id: z.string(),
    type: z.string(),
    label: z.string(),
    description: z.string().optional().nullable(),
    positionX: z.number(),
    positionY: z.number(),
    config: z.record(z.string(), z.unknown()).default({}),
    style: z.record(z.string(), z.unknown()).default({}),
    sortOrder: z.number().default(0),
});

const edgeSchema = z.object({
    id: z.string(),
    sourceNodeId: z.string(),
    targetNodeId: z.string(),
    sourceHandle: z.string().default("output"),
    targetHandle: z.string().default("input"),
    condition: z.unknown().optional().nullable(),
    label: z.string().optional().nullable(),
    style: z.record(z.string(), z.unknown()).default({}),
    sortOrder: z.number().default(0),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

async function assertWorkflowAccess(workflowId: string, userId: string) {
    const workflow = await prisma.calcWorkflow.findFirst({
        where: {
            id: workflowId,
            deletedAt: null,
            organization: { members: { some: { userId } } },
        },
        select: { id: true, organizationId: true, status: true },
    });
    if (!workflow) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
    }
    return workflow;
}

async function resolveActorId(userId: string, workflowId: string): Promise<string> {
    const actor = await prisma.calcActor.findFirst({
        where: {
            userId,
            organization: { calcWorkflows: { some: { id: workflowId } } },
        },
        select: { id: true },
    });
    if (!actor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Actor not found for this organization" });
    }
    return actor.id;
}

// ─── Router ────────────────────────────────────────────────────────────────

export const calcWorkflowCanvasRouter = createTRPCRouter({

    list: protectedProcedure
        .input(z.object({
            organizationId: z.string(),
            status: z.nativeEnum(WorkflowStatus).optional(),
            visibility: z.nativeEnum(Visibility).optional(),
            category: z.string().optional(),
            search: z.string().optional(),
            cursor: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(24),
        }))
        .query(async ({ ctx, input }) => {
            const { organizationId, status, visibility, category, search, cursor, limit } = input;

            const items = await prisma.calcWorkflow.findMany({
                where: {
                    organizationId,
                    deletedAt: null,
                    ...(status ? { status } : {}),
                    ...(visibility ? { visibility } : {}),
                    ...(category ? { category } : {}),
                    ...(search ? {
                        OR: [
                            { name: { contains: search, mode: "insensitive" as const } },
                            { description: { contains: search, mode: "insensitive" as const } },
                        ],
                    } : {}),
                    ...(cursor ? { id: { lt: cursor } } : {}),
                },
                orderBy: { updatedAt: "desc" },
                take: limit + 1,
                select: {
                    id: true, name: true, slug: true, description: true,
                    category: true, tags: true, status: true, visibility: true,
                    libraryStatus: true, publishedAt: true, updatedAt: true, createdAt: true,
                    _count: { select: { nodes: true } },
                    ratingAggregate: { select: { averageRating: true, ratingCount: true } },
                },
            });

            const hasMore = items.length > limit;
            const data = hasMore ? items.slice(0, limit) : items;
            return { items: data, nextCursor: hasMore ? data[data.length - 1]?.id : null };
        }),

    get: protectedProcedure
        .input(workflowIdSchema)
        .query(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);

            const workflow = await prisma.calcWorkflow.findUnique({
                where: { id: input.workflowId },
                include: {
                    nodes: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
                    edges: { where: { deletedAt: null } },
                    variables: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
                    currentVersion: { select: { version: true, publishedAt: true } },
                    collaborators: {
                        include: {
                            actor: { include: { user: { select: { id: true, name: true, image: true } } } },
                        },
                    },
                },
            });
            if (!workflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
            return workflow;
        }),

    create: protectedProcedure
        .input(z.object({
            organizationId: z.string(),
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            category: z.string().optional(),
            tags: z.array(z.string()).default([]),
            visibility: z.nativeEnum(Visibility).default("PRIVATE"),
        }))
        .mutation(async ({ ctx, input }) => {
            const userId = ctx.auth.user.id;
            const member = await prisma.organizationMember.findUnique({
                where: { userId_organizationId: { userId, organizationId: input.organizationId } },
            });
            if (!member) throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });

            const baseSlug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const existing = await prisma.calcWorkflow.count({
                where: { organizationId: input.organizationId, slug: { startsWith: baseSlug } },
            });
            const slug = existing > 0 ? `${baseSlug}-${existing + 1}` : baseSlug;

            return prisma.calcWorkflow.create({
                data: {
                    organizationId: input.organizationId,
                    name: input.name, slug,
                    description: input.description,
                    category: input.category,
                    tags: input.tags as Prisma.InputJsonValue,
                    visibility: input.visibility,
                    status: "DRAFT",
                },
                select: { id: true, name: true, slug: true, status: true, createdAt: true },
            });
        }),

    update: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(500).nullable().optional(),
            category: z.string().nullable().optional(),
            tags: z.array(z.string()).optional(),
            visibility: z.nativeEnum(Visibility).optional(),
            maxRunsPerUser: z.number().int().positive().nullable().optional(),
            maxRunsTotal: z.number().int().positive().nullable().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            const { workflowId, tags, ...rest } = input;
            return prisma.calcWorkflow.update({
                where: { id: workflowId },
                data: { ...rest, ...(tags !== undefined ? { tags: tags as Prisma.InputJsonValue } : {}) },
                select: { id: true, name: true, updatedAt: true },
            });
        }),

    saveCanvas: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            nodes: z.array(nodeSchema),
            edges: z.array(edgeSchema),
        }))
        .mutation(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            const actorId = await resolveActorId(ctx.auth.user.id, input.workflowId);

            // engine functions accept `db: PrismaClient` — pass our prisma instance
            await saveCanvasOptimized({
                db: prisma,
                workflowId: input.workflowId,
                actorId,
                nodes: input.nodes,
                edges: input.edges,
            });
            return { success: true, savedAt: new Date().toISOString() };
        }),

    publish: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            changelog: z.string().max(500).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            const actorId = await resolveActorId(ctx.auth.user.id, input.workflowId);

            const version = await publishWorkflow({
                db: prisma,
                workflowId: input.workflowId,
                actorId,
                changelog: input.changelog,
            });
            return { versionId: version.id, versionNumber: version.version };
        }),

    delete: protectedProcedure
        .input(workflowIdSchema)
        .mutation(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            await prisma.calcWorkflow.update({
                where: { id: input.workflowId },
                data: { deletedAt: new Date() },
            });
            return { success: true };
        }),

    duplicate: protectedProcedure
        .input(workflowIdSchema)
        .mutation(async ({ ctx, input }) => {
            const source = await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            const original = await prisma.calcWorkflow.findUnique({
                where: { id: input.workflowId },
                include: {
                    nodes: { where: { deletedAt: null } },
                    edges: { where: { deletedAt: null } },
                    variables: { where: { deletedAt: null } },
                },
            });
            if (!original) throw new TRPCError({ code: "NOT_FOUND" });

            return prisma.$transaction(async (tx) => {
                const newSlug = `${original.slug}-copy-${Date.now()}`;
                const newWorkflow = await tx.calcWorkflow.create({
                    data: {
                        organizationId: source.organizationId,
                        name: `${original.name} (Copy)`, slug: newSlug,
                        description: original.description, category: original.category,
                        tags: original.tags ?? Prisma.JsonNull,
                        visibility: "PRIVATE", status: "DRAFT",
                        metadata: original.metadata ?? Prisma.JsonNull,
                    },
                });

                const nodeIdMap = new Map<string, string>();
                for (const node of original.nodes) {
                    const n = await tx.calcNode.create({
                        data: {
                            calcWorkflowId: newWorkflow.id, type: node.type,
                            label: node.label, description: node.description,
                            positionX: node.positionX, positionY: node.positionY,
                            config: node.config ?? Prisma.JsonNull,
                            style: node.style ?? Prisma.JsonNull,
                            sortOrder: node.sortOrder,
                        },
                    });
                    nodeIdMap.set(node.id, n.id);
                }

                for (const edge of original.edges) {
                    const s = nodeIdMap.get(edge.sourceNodeId);
                    const t = nodeIdMap.get(edge.targetNodeId);
                    if (!s || !t) continue;
                    await tx.calcEdge.create({
                        data: {
                            calcWorkflowId: newWorkflow.id,
                            sourceNodeId: s, targetNodeId: t,
                            sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle,
                            condition: edge.condition ?? undefined,
                            label: edge.label,
                            style: edge.style ?? Prisma.JsonNull,
                            sortOrder: edge.sortOrder,
                        },
                    });
                }

                return { id: newWorkflow.id, name: newWorkflow.name, slug: newWorkflow.slug };
            });
        }),

    getNode: protectedProcedure
        .input(z.object({ workflowId: z.string(), nodeId: z.string() }))
        .query(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            const node = await prisma.calcNode.findFirst({
                where: { id: input.nodeId, calcWorkflowId: input.workflowId, deletedAt: null },
            });
            if (!node) throw new TRPCError({ code: "NOT_FOUND", message: "Node not found" });
            return node;
        }),

    updateNodeConfig: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            nodeId: z.string(),
            config: z.record(z.string(), z.unknown()),
        }))
        .mutation(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            const updated = await prisma.calcNode.updateMany({
                where: { id: input.nodeId, calcWorkflowId: input.workflowId, deletedAt: null },
                data: { config: input.config as Prisma.InputJsonValue },
            });
            if (updated.count === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Node not found" });
            return { success: true };
        }),

    loadForExecution: protectedProcedure
        .input(workflowIdSchema)
        .query(async ({ ctx, input }) => {
            await assertWorkflowAccess(input.workflowId, ctx.auth.user.id);
            return loadWorkflowForExecution(prisma, input.workflowId);
        }),
});