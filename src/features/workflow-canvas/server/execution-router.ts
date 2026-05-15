// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/server/execution-router.ts
//
//  CHUNK 4 CHANGES vs Chunk 3:
//    1. startRun now goes through RunOrchestrator instead of the executor
//       directly. The orchestrator picks strategy and handles INLINE_ASYNC
//       / BACKGROUND_BATCH handoffs to Inngest.
//    2. New `poll` query — used by the client while a session is running
//       async. Returns PollResult with adaptive backoff hint.
//    3. getSession is kept (used by the step-mode UI); poll is a new,
//       purpose-built endpoint for async polling.
// ═══════════════════════════════════════════════════════════════════════════
import { TRPCError } from "@trpc/server";
import z from "zod";

import { Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";
import {
  CalcContext,
  createRunOrchestrator,
  createSessionPoller,
  createWorkflowExecutor,
} from "@/server/engine";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function resolveActorId(userId: string, orgId: string): Promise<string> {
  const [user, actor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    }),
    prisma.calcActor.findFirst({
      where: { userId, organizationId: orgId },
      select: { id: true },
    }),
  ]);

  if (actor) return actor.id;

  if (user?.globalRole === "SUPER_ADMIN") {
    // Fallback for Super Admin: use their seeded actor_superadmin or any actor they have
    const fallbackActor = await prisma.calcActor.findFirst({
      where: { userId },
      select: { id: true },
    });
    return fallbackActor?.id ?? "actor_superadmin";
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Actor not found for this organization",
  });
}

async function getWorkflowOrgId(workflowId: string): Promise<string> {
  const wf = await prisma.calcWorkflow.findUniqueOrThrow({
    where: { id: workflowId },
    select: { organizationId: true },
  });
  return wf.organizationId;
}

async function assertSessionAccess(sessionId: string, userId: string) {
  const session = await prisma.calcSession.findUniqueOrThrow({
    where: { id: sessionId },
    select: {
      id: true,
      actorId: true,
      calcWorkflowId: true,
      currentNodeId: true,
      status: true,
    },
  });

  const [user, actor] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { globalRole: true },
    }),
    prisma.calcActor.findFirst({
      where: { id: session.actorId, userId },
      select: { id: true },
    }),
  ]);

  if (user?.globalRole === "SUPER_ADMIN") return session;
  if (!actor) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Not your session" });
  }
  return session;
}

// ─── Router ────────────────────────────────────────────────────────────────

export const calcExecutionRouter = createTRPCRouter({
  startRun: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        initialValues: z.record(z.string(), z.unknown()).optional(),
        stepMode: z.boolean().optional(),
        liveUpdates: z.boolean().optional(),
        idempotencyKey: z.string().optional(),
        batchSize: z.number().int().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = await getWorkflowOrgId(input.workflowId);
      const actorId = await resolveActorId(ctx.auth.user.id, orgId);

      // CHUNK 4: go through the orchestrator. It picks strategy and
      // handles INLINE_ASYNC / BACKGROUND_BATCH handoffs automatically.
      const calcCtx = new CalcContext(prisma, actorId, orgId);
      const orchestrator = createRunOrchestrator(calcCtx);

      return orchestrator.start({
        calcWorkflowId: input.workflowId,
        actorId,
        initialValues: (input.initialValues as Record<string, never>) ?? {},
        stepMode: input.stepMode ?? false,
        idempotencyKey: input.idempotencyKey,
        batchSize: input.batchSize ?? 1,
      });
    }),

  // ── CHUNK 4: async polling ────────────────────────────────────────────

  poll: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const session = await assertSessionAccess(
        input.sessionId,
        ctx.auth.user.id,
      );
      const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: session.calcWorkflowId },
        select: { organizationId: true },
      });
      const calcCtx = new CalcContext(
        prisma,
        session.actorId,
        wf.organizationId,
      );
      const poller = createSessionPoller(calcCtx);
      return poller.poll(input.sessionId);
    }),

  // ── Existing endpoints (unchanged from Chunk 3) ───────────────────────

  submitInput: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        values: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await assertSessionAccess(
        input.sessionId,
        ctx.auth.user.id,
      );

      if (session.status !== "PAUSED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Session is not paused (status: ${session.status})`,
        });
      }
      if (!session.currentNodeId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Session has no current node to resume from",
        });
      }

      const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: session.calcWorkflowId },
        select: { organizationId: true },
      });

      const calcCtx = new CalcContext(
        prisma,
        session.actorId,
        wf.organizationId,
      );
      const executor = createWorkflowExecutor(calcCtx);
      return executor.resumeWithInput(
        input.sessionId,
        session.currentNodeId,
        input.values as Record<string, unknown>,
      );
    }),

  stepForward: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertSessionAccess(
        input.sessionId,
        ctx.auth.user.id,
      );
      const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: session.calcWorkflowId },
        select: { organizationId: true },
      });
      const calcCtx = new CalcContext(
        prisma,
        session.actorId,
        wf.organizationId,
      );
      const executor = createWorkflowExecutor(calcCtx, { liveUpdates: true });
      return executor.stepForward(input.sessionId);
    }),

  stepBack: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        targetNodeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = await assertSessionAccess(
        input.sessionId,
        ctx.auth.user.id,
      );
      const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: session.calcWorkflowId },
        select: { organizationId: true },
      });
      const calcCtx = new CalcContext(
        prisma,
        session.actorId,
        wf.organizationId,
      );
      const executor = createWorkflowExecutor(calcCtx, { liveUpdates: true });
      return executor.stepBack(input.sessionId, input.targetNodeId);
    }),

  cancelRun: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertSessionAccess(
        input.sessionId,
        ctx.auth.user.id,
      );
      const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: session.calcWorkflowId },
        select: { organizationId: true },
      });
      const calcCtx = new CalcContext(
        prisma,
        session.actorId,
        wf.organizationId,
      );
      const executor = createWorkflowExecutor(calcCtx);
      await executor.cancelExecution(input.sessionId, session.actorId);
      return { success: true };
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertSessionAccess(input.sessionId, ctx.auth.user.id);

      const session = await prisma.calcSession.findUniqueOrThrow({
        where: { id: input.sessionId },
        include: {
          nodeExecutions: {
            orderBy: { stepNumber: "asc" },
            select: {
              id: true,
              calcNodeId: true,
              status: true,
              stepNumber: true,
              outputVars: true,
              result: true,
              error: true,
              durationMs: true,
              startedAt: true,
              completedAt: true,
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
        stepMode:
          (session.metadata as { stepMode?: boolean } | null)?.stepMode ??
          false,
      };

      // Hydrate paused node info if needed
      if (session.status === "PAUSED" && session.currentNodeId) {
        const wf = await prisma.calcWorkflow.findUnique({
          where: { id: session.calcWorkflowId },
          include: { nodes: true },
        });
        const node = wf?.nodes.find((n) => n.id === session.currentNodeId);
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

  getHistory: protectedProcedure
    .input(
      z.object({
        workflowId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isAdmin = ctx.auth.user.globalRole === "SUPER_ADMIN";
      const where: Prisma.CalcSessionWhereInput = {};

      if (!isAdmin) {
        const actors = await prisma.calcActor.findMany({
          where: { userId: ctx.auth.user.id },
          select: { id: true },
        });
        const actorIds = actors.map((a) => a.id);
        if (actorIds.length === 0)
          return { sessions: [], total: 0, hasMore: false };
        where.actorId = { in: actorIds };
      }

      if (input.workflowId) where.calcWorkflowId = input.workflowId;
      if (input.status) where.status = input.status as any;

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

  rerun: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const session = await assertSessionAccess(
        input.sessionId,
        ctx.auth.user.id,
      );
      const old = await prisma.calcSession.findUniqueOrThrow({
        where: { id: input.sessionId },
        select: { calcWorkflowId: true, actorId: true, inputSnapshot: true },
      });
      const wf = await prisma.calcWorkflow.findUniqueOrThrow({
        where: { id: old.calcWorkflowId },
        select: { organizationId: true },
      });
      const calcCtx = new CalcContext(prisma, old.actorId, wf.organizationId);
      const orchestrator = createRunOrchestrator(calcCtx);
      return orchestrator.start({
        calcWorkflowId: old.calcWorkflowId,
        actorId: old.actorId,
        initialValues: (old.inputSnapshot as Record<string, never>) ?? {},
      });
    }),
});
