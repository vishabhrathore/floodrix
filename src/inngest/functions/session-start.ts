// ═══════════════════════════════════════════════════════════════════════════
//  src/inngest/functions/session-start.ts
//
//  Inngest function to start a session entirely in the background.
//  Used when the orchestrator picks BACKGROUND_BATCH — the session is
//  already created (in RUNNING status with metadata.runStrategy set), and
//  this function just kicks off continueExecution.
//
//  Why separate from session-resume? Because on retry, resume is idempotent
//  from currentIndex, but start has an "already started" pre-check. Keeping
//  them separate makes the intent clear.
// ═══════════════════════════════════════════════════════════════════════════

import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { createWorkflowExecutor } from "@/server/engine";

/**
 * Event contract:
 *   name: "calc/session.start-background"
 *   data: { sessionId: string }
 */
export const calcSessionStart = inngest.createFunction(
    {
        id: "calc-session-start-background",
        name: "Start calc session in background",
        retries: 3,
        concurrency: {
            limit: 100,
            key: "event.data.sessionId",
        },
    },
    { event: "calc/session.start-background" },
    async ({ event, step, logger }) => {
        const { sessionId } = event.data as { sessionId: string };

        logger.info(`Starting background session ${sessionId}`);

        const session = await step.run("load-session", async () => {
            const s = await prisma.calcSession.findUnique({
                where: { id: sessionId },
                select: { status: true, currentIndex: true },
            });
            if (!s) throw new Error(`Session ${sessionId} not found`);
            return s;
        });

        // If this is a retry and we've already made progress, just fall through
        // to continueExecution — it resumes from currentIndex naturally.
        if (["COMPLETED", "ERRORED", "CANCELLED", "TIMED_OUT"].includes(session.status)) {
            logger.info(`Session ${sessionId} already ${session.status}, skipping start`);
            return { skipped: true, status: session.status };
        }

        const result = await step.run("continue-execution", async () => {
            const executor = createWorkflowExecutor(prisma, { liveUpdates: true });
            return executor.continueExecution(sessionId, {
                isBackgroundRun: true,
                liveUpdates: true,
            });
        });

        // Hit an async node — chain to the resume function
        if (result.status === "PAUSED" && result.pauseReason === "background_transition") {
            await step.sendEvent("chain-to-resume", {
                name: "calc/session.resume",
                data: { sessionId, reason: "async_node_hit" },
            });
            return { status: "PAUSED", chainedToResume: true };
        }

        return {
            status: result.status,
            pauseReason: result.pauseReason,
            completedAt: result.completedAt,
        };
    }
);