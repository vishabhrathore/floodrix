// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/server/execution-router.ts
// ═══════════════════════════════════════════════════════════════════════════

import z from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { WorkflowExecutor } from "../engine/workflow-executor";
import prisma from "@/lib/db";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function resolveActorId(userId: string, orgId: string): Promise<string> {
    const actor = await prisma.calcActor.findFirst({
        where: { userId, organizationId: orgId },
        select: { id: true },
    });
    if (!actor) throw new TRPCError({ code: "FORBIDDEN", message: "Actor not found" });
    return actor.id;
}

async function getWorkflowOrgId(workflowId: string): Promise<string> {
    const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: { organizationId: true },
    });
    return wf.organizationId;
}

// ─── Router ────────────────────────────────────────────────────────────────

export const calcExecutionRouter = createTRPCRouter({

    startRun: protectedProcedure
        .input(z.object({
            workflowId: z.string(),
            initialValues: z.record(z.string(), z.unknown()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const orgId = await getWorkflowOrgId(input.workflowId);
            const actorId = await resolveActorId(ctx.auth.user.id, orgId);

            const executor = new WorkflowExecutor(prisma);
            return executor.startExecution(
                input.workflowId,
                actorId,
                input.initialValues as Record<string, number | string | boolean> | undefined
            );
        }),

    submitInput: protectedProcedure
        .input(z.object({
            sessionId: z.string(),
            values: z.record(z.string(), z.unknown()),
        }))
        .mutation(async ({ ctx, input }) => {
            const session = await prisma.calcSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                select: { actorId: true, currentNodeId: true, status: true },
            });

            if (session.status !== "PAUSED") {
                throw new TRPCError({ code: "BAD_REQUEST", message: `Session is not paused (status: ${session.status})` });
            }
            if (!session.currentNodeId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Session has no current node to resume from" });
            }

            const executor = new WorkflowExecutor(prisma);
            return executor.resumeWithInput(
                input.sessionId,
                session.currentNodeId,
                input.values as Record<string, unknown>
            );
        }),

    cancelRun: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const session = await prisma.calcSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                select: { actorId: true, calcWorkflowId: true },
            });

            const actor = await prisma.calcActor.findFirst({
                where: { id: session.actorId, userId: ctx.auth.user.id },
                select: { id: true },
            });
            if (!actor) throw new TRPCError({ code: "FORBIDDEN", message: "Not your session" });

            const executor = new WorkflowExecutor(prisma);
            await executor.cancelExecution(input.sessionId, session.actorId);
            return { success: true };
        }),

    getSession: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .query(async ({ ctx, input }) => {
            const session = await prisma.calcSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: {
                    nodeExecutions: {
                        orderBy: { stepNumber: "asc" },
                        select: {
                            id: true, calcNodeId: true, status: true,
                            stepNumber: true, outputVars: true, result: true,
                            error: true, durationMs: true,
                        },
                    },
                },
            });

            return {
                sessionId: session.id,
                status: session.status,
                variables: session.variables,
                currentNodeId: session.currentNodeId,
                currentIndex: session.currentIndex,
                pauseReason: session.pauseReason,
                error: session.error,
                completedAt: session.completedAt?.toISOString() ?? null,
                duration: session.duration,
                nodeExecutions: session.nodeExecutions,
            };
        }),

    getHistory: protectedProcedure
        .input(z.object({
            workflowId: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(20),
            offset: z.number().int().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const actors = await prisma.calcActor.findMany({
                where: { userId: ctx.auth.user.id },
                select: { id: true },
            });
            const actorIds = actors.map((a) => a.id);
            if (actorIds.length === 0) return { sessions: [], total: 0, hasMore: false };

            const where: Record<string, unknown> = { actorId: { in: actorIds } };
            if (input.workflowId) where.calcWorkflowId = input.workflowId;
            if (input.status) where.status = input.status;

            const [sessions, total] = await Promise.all([
                prisma.calcSession.findMany({
                    where,
                    include: {
                        calcWorkflow: { select: { id: true, name: true, category: true } },
                        _count: { select: { nodeExecutions: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: input.limit,
                    skip: input.offset,
                }),
                prisma.calcSession.count({ where }),
            ]);

            return {
                sessions: sessions.map((s) => ({
                    id: s.id, workflow: s.calcWorkflow, status: s.status, runMode: s.runMode,
                    startedAt: s.startedAt?.toISOString() ?? null,
                    completedAt: s.completedAt?.toISOString() ?? null,
                    duration: s.duration, error: s.error,
                    nodeCount: s._count.nodeExecutions,
                })),
                total,
                hasMore: input.offset + sessions.length < total,
            };
        }),

    rerun: protectedProcedure
        .input(z.object({ sessionId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const oldSession = await prisma.calcSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                select: { calcWorkflowId: true, actorId: true, inputSnapshot: true },
            });

            const executor = new WorkflowExecutor(prisma);
            return executor.startExecution(
                oldSession.calcWorkflowId,
                oldSession.actorId,
                (oldSession.inputSnapshot as any) ?? undefined
            );
        }),
});