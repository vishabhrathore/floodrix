import { TRPCError } from "@trpc/server";
import z from "zod";

import { Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";
import { AppCache } from "@/lib/cache";
import { redisCacheClient } from "@/lib/redis";
import { loadContext } from "@/server/context/context.loader";
import { assertCanRunWorkflow, assertSessionAccess } from "@/server/context/guards";
import {
  CalcContext,
  createRunOrchestrator,
  createSessionPoller,
  createWorkflowExecutor,
} from "@/server/engine";
import { logger } from "@/server/engine/logger";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

// ─────────────────────────────────────────────
// Telemetry and Profiling Helper
// ─────────────────────────────────────────────

class TimeTracker {
  private startTime: number;
  private laps: { label: string; durationMs: number }[] = [];

  constructor(private procedureName: string) {
    this.startTime = performance.now();
    logger.info({ procedure: this.procedureName }, `🚀 Starting execution procedure`);
  }

  async track<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const durationMs = Math.round(performance.now() - start);
      this.laps.push({ label, durationMs });
      if (durationMs >= 10) {
        logger.debug(
          { procedure: this.procedureName, label, durationMs },
          `⏱️ Telemetry tracking step completed`
        );
      }
      return result;
    } catch (error) {
      const durationMs = Math.round(performance.now() - start);
      this.laps.push({ label: `${label} (FAILED)`, durationMs });
      logger.error(
        { procedure: this.procedureName, label, durationMs, error: error instanceof Error ? error.message : String(error) },
        `❌ Telemetry tracking step failed`
      );
      throw error;
    }
  }

  end() {
    const totalDuration = Math.round(performance.now() - this.startTime);
    logger.info(
      {
        procedure: this.procedureName,
        totalDurationMs: totalDuration,
        steps: this.laps,
      },
      `📊 Telemetry execution summary finished`
    );
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

        assertCanRunWorkflow(reqCtx);

        const actorId = reqCtx.actor?.id;
        const orgId = reqCtx.organization?.id;

        if (!actorId || !orgId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Actor or Organization context not loaded",
          });
        }

        const calcCtx = new CalcContext(prisma, actorId, orgId);
        const orchestrator = createRunOrchestrator(calcCtx, {
          liveUpdates: input.stepMode ?? false,
        });

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
        
        assertSessionAccess(reqCtx);

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
        
        assertSessionAccess(reqCtx);

        let session = reqCtx.session!;

        if (session.status !== "PAUSED") {
          // Self-healing check for sessions stuck in RUNNING or PENDING due to previous crashes
          if ((session.status === "RUNNING" || session.status === "PENDING") && session.updatedAt) {
            const isStuck = new Date(session.updatedAt).getTime() < Date.now() - 120000;
            if (isStuck) {
              logger.info({ sessionId: session.id, status: session.status }, `[submitInput] 🩹 Stuck session detected on submission. Triggering automatic recovery...`);
              
              // Evict/Invalidate caches and update DB to PAUSED status
              await prisma.$transaction(async (tx) => {
                await tx.calcSession.update({
                  where: { id: session.id },
                  data: {
                    status: "PAUSED",
                    pauseReason: "stuck_execution_timeout",
                    lockVersion: { increment: 1 },
                  },
                });
                await tx.calcNodeExecution.updateMany({
                  where: {
                    sessionId: session.id,
                    status: "RUNNING",
                  },
                  data: {
                    status: "PENDING",
                  },
                });
              });

              // Purge cache to keep Redis in sync
              await AppCache.setSessionStatus(session.id, "PAUSED");
              await AppCache.invalidateSession(session.id);

              // Reload context/session so we have the freshly healed PAUSED state
              const updatedCtx = await loadContext(prisma, ctx.userId, {
                sessionId: input.sessionId,
              });
              session = updatedCtx.session!;
            }
          }
        }

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
        const metadata = (session.metadata ?? {}) as any;
        const isStepMode = metadata.stepMode ?? false;

        const executor = createWorkflowExecutor(calcCtx, { liveUpdates: isStepMode });
        return await tracker.track("executor.resumeWithInput", () =>
          executor.resumeWithInput(
            input.sessionId,
            session.currentNodeId!,
            input.values as Record<string, unknown>,
            { stepMode: isStepMode, liveUpdates: isStepMode }
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
        
        assertSessionAccess(reqCtx);

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
        
        assertSessionAccess(reqCtx);

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
        
        assertSessionAccess(reqCtx);

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
        
        assertSessionAccess(reqCtx);

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

  subscribeProgress: protectedProcedure
    .input(z.object({ executionId: z.string() }))
    .subscription(async function* (opts) {
      const { ctx, input } = opts;

      // 1. Security Check: Validate session exists, tenant ownership, and permissions
      const reqCtx = await loadContext(prisma, ctx.userId, {
        sessionId: input.executionId,
      });
      assertSessionAccess(reqCtx);

      // 2. Open Redis subscriber client
      if (!redisCacheClient) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Redis cache client is not configured",
        });
      }

      const subscriber = redisCacheClient.duplicate();
      const channel = `workflow:${input.executionId}`;

      try {
        await subscriber.subscribe(channel);

        const eventQueue: any[] = [];
        let resolveNext: ((value: any) => void) | null = null;
        let isClosed = false;

        subscriber.on("message", (chan, message) => {
          if (chan === channel) {
            try {
              const event = JSON.parse(message);
              if (resolveNext) {
                resolveNext({ value: event, done: false });
                resolveNext = null;
              } else {
                eventQueue.push(event);
              }
            } catch (err) {
              console.error("[tRPC Subscription] Failed to parse message:", err);
            }
          }
        });

        // Cleanup on disconnect
        opts.signal?.addEventListener("abort", () => {
          isClosed = true;
          if (resolveNext) {
            resolveNext({ done: true });
            resolveNext = null;
          }
          subscriber.quit().catch(() => {});
        });

        while (!isClosed) {
          if (eventQueue.length > 0) {
            yield eventQueue.shift();
          } else {
            const nextPromise = new Promise<any>((resolve) => {
              resolveNext = resolve;
            });
            const result = await nextPromise;
            if (result.done) {
              break;
            }
            yield result.value;
          }
        }
      } finally {
        await subscriber.quit().catch(() => {});
      }
    }),
});
