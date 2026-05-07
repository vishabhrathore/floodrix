import z from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";
import { createWorkflowExecutor, createRunOrchestrator, createSessionPoller, CalcContext } from "@/server/engine";
import { Prisma } from "@/generated/prisma";
import { loadContext } from "@/server/context/context.loader";
import { assertPolicy } from "@/server/context/guards";
import { isOrgAdmin } from "@/server/context/permission";

export const calcExecutionRouter = createTRPCRouter({

    // ─────────────────────────────────────────────────────────────────────────
    // START RUN
    // ─────────────────────────────────────────────────────────────────────────
    startRun: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            workflowId: z.string(),
            initialValues: z.record(z.string(), z.unknown()).optional(),
            stepMode: z.boolean().optional(),
            liveUpdates: z.boolean().optional(), // Restored
            idempotencyKey: z.string().optional(),
            batchSize: z.number().int().min(1).optional(), // Restored
        }))
        .mutation(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                workflowId: input.workflowId,
            });

            if (!reqCtx.workflow) throw new TRPCError({ code: "NOT_FOUND", message: "Workflow not found" });
            if (!reqCtx.actor) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Actor not found." });

            assertPolicy(reqCtx, "run", "workflow");

            const calcCtx = new CalcContext(ctx.db, reqCtx.actor.id, reqCtx.organization!.id);
            const orchestrator = createRunOrchestrator(calcCtx);

            return orchestrator.start({
                calcWorkflowId: reqCtx.workflow.id,
                actorId: reqCtx.actor.id,
                initialValues: (input.initialValues as Record<string, never>) ?? {},
                stepMode: input.stepMode ?? false,
                idempotencyKey: input.idempotencyKey,
                batchSize: input.batchSize ?? 1, // Restored default
            });
        }),

    // ─────────────────────────────────────────────────────────────────────────
    // ASYNC POLLING
    // ─────────────────────────────────────────────────────────────────────────
    poll: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });

            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found or access denied" });

            const calcCtx = new CalcContext(ctx.db, reqCtx.session.actorId, reqCtx.organization!.id);
            const poller = createSessionPoller(calcCtx);
            return poller.poll(input.sessionId);
        }),

    // ─────────────────────────────────────────────────────────────────────────
    // INTERACTIVE EXECUTION
    // ─────────────────────────────────────────────────────────────────────────
    submitInput: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string(),
            values: z.record(z.string(), z.unknown()),
        }))
        .mutation(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });

            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND" });
            const session = reqCtx.session;

            if (session.status !== "PAUSED") {
                throw new TRPCError({ code: "BAD_REQUEST", message: `Session is not paused (status: ${session.status})` });
            }
            if (!session.currentNodeId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Session has no current node to resume from" });
            }

            const calcCtx = new CalcContext(ctx.db, session.actorId, reqCtx.organization!.id);
            const executor = createWorkflowExecutor(calcCtx);
            
            // Fixed: Restored currentNodeId as second argument
            return executor.resumeWithInput(
                input.sessionId,
                session.currentNodeId,
                input.values as Record<string, any>
            );
        }),

    stepForward: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });
            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND" });

            const calcCtx = new CalcContext(ctx.db, reqCtx.session.actorId, reqCtx.organization!.id);
            const executor = createWorkflowExecutor(calcCtx, { liveUpdates: true });
            return executor.stepForward(input.sessionId);
        }),

    stepBack: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string(),
            targetNodeId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });
            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND" });

            const calcCtx = new CalcContext(ctx.db, reqCtx.session.actorId, reqCtx.organization!.id);
            const executor = createWorkflowExecutor(calcCtx, { liveUpdates: true });
            return executor.stepBack(input.sessionId, input.targetNodeId);
        }),

    cancelRun: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });
            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND" });

            const calcCtx = new CalcContext(ctx.db, reqCtx.session.actorId, reqCtx.organization!.id);
            const executor = createWorkflowExecutor(calcCtx);
            await executor.cancelExecution(input.sessionId, reqCtx.session.actorId);
            return { success: true };
        }),

    // ─────────────────────────────────────────────────────────────────────────
    // DATA RETRIEVAL
    // ─────────────────────────────────────────────────────────────────────────
    getSession: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string()
        }))
        .query(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });

            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND" });

            // Fetch with specific field selection as per original code
            const session = await ctx.db.calcSession.findUniqueOrThrow({
                where: { id: input.sessionId },
                include: {
                    nodeExecutions: {
                        orderBy: { stepNumber: "asc" },
                        select: {
                            id: true, calcNodeId: true, status: true,
                            stepNumber: true, outputVars: true, result: true,
                            error: true, durationMs: true,
                            startedAt: true, completedAt: true,
                        },
                    },
                },
            });

            const result: any = {
                sessionId: session.id,
                status: session.status,
                variables: session.variables,
                currentNodeId: session.currentNodeId,
                currentIndex: session.currentIndex,
                pauseReason: session.pauseReason,
                executionOrder: session.executionOrder,
                error: session.error,
                completedAt: session.completedAt?.toISOString() ?? null,
                duration: session.duration,
                nodeExecutions: session.nodeExecutions,
                stepMode: (session.metadata as { stepMode?: boolean } | null)?.stepMode ?? false,
            };

            // Hydrate paused node info if needed (INPUT node specific labels/fields)
            if (session.status === "PAUSED" && session.currentNodeId) {
                const wf = await ctx.db.calcWorkflow.findUnique({
                    where: { id: session.calcWorkflowId },
                    include: { nodes: true },
                });
                const node = wf?.nodes.find(n => n.id === session.currentNodeId);
                if (node && node.type === "INPUT") {
                    const config = (node.config ?? {}) as any;
                    result.pausedNode = {
                        nodeId: node.id,
                        nodeLabel: node.label,
                        fields: config.fields ?? [],
                        message: config.description ?? "",
                    };
                }
            }

            return result;
        }),

    getHistory: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            workflowId: z.string().optional(),
            status: z.string().optional(),
            limit: z.number().int().min(1).max(100).default(20),
            offset: z.number().int().min(0).default(0),
        }))
        .query(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId
            });
            const orgId = reqCtx.organization!.id;

            const where: Prisma.CalcSessionWhereInput = {
                calcWorkflow: {
                    organizationId: orgId,
                    deletedAt: null
                },
                ...(input.workflowId ? { calcWorkflowId: input.workflowId } : {}),
                ...(input.status ? { status: input.status as any } : {}),
                ...(isOrgAdmin(reqCtx) ? {} : { actorId: reqCtx.actor?.id })
            };

            const [sessions, total] = await Promise.all([
                ctx.db.calcSession.findMany({
                    where,
                    include: {
                        calcWorkflow: { select: { id: true, name: true, category: true } },
                        _count: { select: { nodeExecutions: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    take: input.limit,
                    skip: input.offset,
                }),
                ctx.db.calcSession.count({ where }),
            ]);

            return {
                sessions: sessions.map((s) => ({
                    id: s.id, 
                    workflow: s.calcWorkflow, 
                    status: s.status, 
                    runMode: s.runMode,
                    startedAt: s.startedAt?.toISOString() ?? null,
                    completedAt: s.completedAt?.toISOString() ?? null,
                    duration: s.duration, 
                    error: s.error,
                    nodeCount: s._count.nodeExecutions,
                })),
                total,
                hasMore: input.offset + sessions.length < total,
            };
        }),

    rerun: orgProcedure
        .input(z.object({
            organizationId: z.string().optional(),
            sessionId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const reqCtx = await loadContext(ctx.db, ctx.userId, {
                organizationId: input.organizationId,
                sessionId: input.sessionId
            });
            if (!reqCtx.session) throw new TRPCError({ code: "NOT_FOUND" });

            const old = reqCtx.session;
            const calcCtx = new CalcContext(ctx.db, old.actorId, reqCtx.organization!.id);
            const orchestrator = createRunOrchestrator(calcCtx);
            
            return orchestrator.start({
                calcWorkflowId: old.calcWorkflowId,
                actorId: old.actorId,
                initialValues: (old.inputSnapshot as Record<string, never>) ?? {},
            });
        }),
});