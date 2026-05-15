import { type Job, Worker } from "bullmq";

import { addJob, calcQueue, redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { CalcContext, createWorkflowExecutor } from "@/server/engine";

if (redisConnection) {
  // Worker for "calc-execution" queue
  new Worker(
    "calc-execution",
    async (job: Job) => {
      const { sessionId, reason, type } = job.data;

      if (type === "calc/session.start-background") {
        console.log(`Starting background session ${sessionId}`);
        await addJob(calcQueue, "resume", {
          sessionId,
          reason: "background_batch",
          type: "calc/session.resume",
        });
        return { started: true };
      }

      if (type === "calc/session.resume") {
        console.log(
          `Resuming session ${sessionId} (reason: ${reason ?? "unspecified"})`,
        );

        // Load session status
        const session = await prisma.calcSession.findUnique({
          where: { id: sessionId },
          select: {
            status: true,
            pauseReason: true,
            calcWorkflowId: true,
            actorId: true,
          },
        });

        if (!session) {
          throw new Error(`Session ${sessionId} not found`);
        }

        // Terminal statuses — nothing to do
        if (
          ["COMPLETED", "ERRORED", "CANCELLED", "TIMED_OUT"].includes(
            session.status,
          )
        ) {
          return { skipped: true, status: session.status };
        }

        // If paused for awaiting_user_input or validation_error, we're NOT
        // the ones who should resume — the user is. Bail gracefully.
        if (
          session.status === "PAUSED" &&
          session.pauseReason !== "background_transition" &&
          session.pauseReason !== "step_complete"
        ) {
          return { skipped: true, reason: session.pauseReason };
        }

        // Resume via executor
        const wf = await prisma.calcWorkflow.findUniqueOrThrow({
          where: { id: session.calcWorkflowId },
          select: { organizationId: true },
        });

        const calcCtx = new CalcContext(
          prisma,
          session.actorId,
          wf.organizationId,
        );
        const executor = createWorkflowExecutor(calcCtx, {
          liveUpdates: true,
        });

        const result = await executor.continueExecution(sessionId, {
          isBackgroundRun: true,
          liveUpdates: true,
        });

        // If we hit ANOTHER async node, re-enqueue
        if (
          result.status === "PAUSED" &&
          result.pauseReason === "background_transition"
        ) {
          await addJob(calcQueue, "resume", {
            sessionId,
            reason: "chained_async",
            type: "calc/session.resume",
          });
          return { status: "PAUSED", chainedToNextAsync: true };
        }

        return {
          status: result.status,
          pauseReason: result.pauseReason,
        };
      }
    },
    { connection: redisConnection },
  );

  console.log("🚀 Calc Worker started");
}
