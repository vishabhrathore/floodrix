import { TRPCError } from "@trpc/server";
import z from "zod";

import { Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";
import { loadContext } from "@/server/context/context.loader";
import { assertCanRunWorkflow, assertSessionAccess } from "@/server/context/guards";
import {
  CalcContext,
  createRunOrchestrator,
  createSessionPoller,
  createWorkflowExecutor,
} from "@/server/engine";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

// ─────────────────────────────────────────────
// Telemetry and Profiling Helper
// ─────────────────────────────────────────────

class TimeTracker {
  private startTime: number;
  private laps: { label: string; durationMs: number }[] = [];

  constructor(private procedureName: string) {
    this.startTime = performance.now();
    console.log(`\n🚀 [TELEMETRY] Starting execution procedure: "${procedureName}"`);
  }

  async track<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.laps.push({ label, durationMs });
      console.log(`⏱️ [TELEMETRY] [${this.procedureName}] "${label}" took ${durationMs}ms`);
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      this.laps.push({ label: `${label} (FAILED)`, durationMs });
      console.log(`❌ [TELEMETRY] [${this.procedureName}] "${label}" FAILED after ${durationMs}ms`);
      throw error;
    }
  }

  end() {
    const totalDuration = Math.round(performance.now() - this.startTime);
    console.log(`\n📊 [TELEMETRY_SUMMARY] "${this.procedureName}" Finished.`);
    console.log(`┌────────────────────────────────────────────────────────┐`);
    this.laps.forEach((lap) => {
      const paddedLabel = lap.label.padEnd(35, ".");
      const paddedDuration = `${lap.durationMs}ms`.padStart(8, " ");
      console.log(`│  ${paddedLabel}${paddedDuration}  │`);
    });
    const paddedTotalLabel = "Total Duration".padEnd(35, ".");
    const paddedTotalDuration = `${totalDuration}ms`.padStart(8, " ");
    console.log(`├────────────────────────────────────────────────────────┤`);
    console.log(`│  ${paddedTotalLabel}${paddedTotalDuration}  │`);
    console.log(`└────────────────────────────────────────────────────────┘\n`);
  }
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
      const tracker = new TimeTracker("startRun");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            workflowId: input.workflowId,
          })
        );

        await tracker.track("assertCanRunWorkflow", async () => {
          assertCanRunWorkflow(reqCtx);
        });

        const actorId = reqCtx.actor?.id;
        const orgId = reqCtx.organization?.id;

        if (!actorId || !orgId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Actor or Organization context not loaded",
          });
        }

        const calcCtx = new CalcContext(prisma, actorId, orgId);
        const orchestrator = createRunOrchestrator(calcCtx);

        return await tracker.track("orchestrator.start", () =>
          orchestrator.start({
            calcWorkflowId: input.workflowId,
            actorId,
            initialValues: (input.initialValues as Record<string, never>) ?? {},
            stepMode: input.stepMode ?? false,
            idempotencyKey: input.idempotencyKey,
            batchSize: input.batchSize ?? 1,
          })
        );
      } finally {
        tracker.end();
      }
    }),

  poll: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tracker = new TimeTracker("poll");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            sessionId: input.sessionId,
          })
        );
        
        await tracker.track("assertSessionAccess", async () => {
          assertSessionAccess(reqCtx);
        });

        const session = reqCtx.session!;
        const orgId = reqCtx.organization!.id;

        const calcCtx = new CalcContext(
          prisma,
          session.actorId,
          orgId,
        );
        const poller = createSessionPoller(calcCtx);
        return await tracker.track("poller.poll", () =>
          poller.poll(input.sessionId)
        );
      } finally {
        tracker.end();
      }
    }),

  submitInput: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        values: z.record(z.string(), z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tracker = new TimeTracker("submitInput");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            sessionId: input.sessionId,
          })
        );
        
        await tracker.track("assertSessionAccess", async () => {
          assertSessionAccess(reqCtx);
        });

        const session = reqCtx.session!;

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

        const orgId = reqCtx.organization!.id;
        const calcCtx = new CalcContext(
          prisma,
          session.actorId,
          orgId,
        );
        const executor = createWorkflowExecutor(calcCtx);
        return await tracker.track("executor.resumeWithInput", () =>
          executor.resumeWithInput(
            input.sessionId,
            session.currentNodeId!,
            input.values as Record<string, unknown>,
          )
        );
      } finally {
        tracker.end();
      }
    }),

  stepForward: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tracker = new TimeTracker("stepForward");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            sessionId: input.sessionId,
          })
        );
        
        await tracker.track("assertSessionAccess", async () => {
          assertSessionAccess(reqCtx);
        });

        const session = reqCtx.session!;
        const orgId = reqCtx.organization!.id;

        const calcCtx = new CalcContext(
          prisma,
          session.actorId,
          orgId,
        );
        const executor = createWorkflowExecutor(calcCtx, { liveUpdates: true });
        return await tracker.track("executor.stepForward", () =>
          executor.stepForward(input.sessionId)
        );
      } finally {
        tracker.end();
      }
    }),

  stepBack: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        targetNodeId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tracker = new TimeTracker("stepBack");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            sessionId: input.sessionId,
          })
        );
        
        await tracker.track("assertSessionAccess", async () => {
          assertSessionAccess(reqCtx);
        });

        const session = reqCtx.session!;
        const orgId = reqCtx.organization!.id;

        const calcCtx = new CalcContext(
          prisma,
          session.actorId,
          orgId,
        );
        const executor = createWorkflowExecutor(calcCtx, { liveUpdates: true });
        return await tracker.track("executor.stepBack", () =>
          executor.stepBack(input.sessionId, input.targetNodeId)
        );
      } finally {
        tracker.end();
      }
    }),

  cancelRun: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tracker = new TimeTracker("cancelRun");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            sessionId: input.sessionId,
          })
        );
        
        await tracker.track("assertSessionAccess", async () => {
          assertSessionAccess(reqCtx);
        });

        const session = reqCtx.session!;
        const orgId = reqCtx.organization!.id;

        const calcCtx = new CalcContext(
          prisma,
          session.actorId,
          orgId,
        );
        const executor = createWorkflowExecutor(calcCtx);
        await tracker.track("executor.cancelExecution", () =>
          executor.cancelExecution(input.sessionId, session.actorId)
        );
        return { success: true };
      } finally {
        tracker.end();
      }
    }),

  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const reqCtx = await loadContext(prisma, ctx.userId, {
        sessionId: input.sessionId,
      });
      assertSessionAccess(reqCtx);

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
      const tracker = new TimeTracker("rerun");
      try {
        const reqCtx = await tracker.track("loadContext", () =>
          loadContext(prisma, ctx.userId, {
            sessionId: input.sessionId,
          })
        );
        
        await tracker.track("assertSessionAccess", async () => {
          assertSessionAccess(reqCtx);
        });

        const session = reqCtx.session!;
        const orgId = reqCtx.organization!.id;

        const calcCtx = new CalcContext(prisma, session.actorId, orgId);
        const orchestrator = createRunOrchestrator(calcCtx);

        return await tracker.track("orchestrator.start", () =>
          orchestrator.start({
            calcWorkflowId: session.calcWorkflowId,
            actorId: session.actorId,
            initialValues: (session.inputSnapshot as Record<string, never>) ?? {},
          })
        );
      } finally {
        tracker.end();
      }
    }),
});
