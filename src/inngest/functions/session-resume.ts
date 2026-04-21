// ═══════════════════════════════════════════════════════════════════════════
//  src/inngest/functions/session-resume.ts
//
//  Inngest function that continues a paused session in the background.
//  Triggered by the orchestrator after an INLINE_ASYNC pause, or by
//  session-start directly for BACKGROUND_BATCH runs.
//
//  Idempotency: Inngest will retry on failure. Because we use
//  session.currentIndex as the resume point and the status-guarded updates
//  in SessionRepository (Bug 1 fix), a retry picks up from the right node
//  and doesn't double-process completed ones.
//
//  Cancel safety: the executor checks session.status between every node
//  via getStatus(). If the user clicked Cancel while we were mid-flight,
//  the next iteration bails cleanly.
// ═══════════════════════════════════════════════════════════════════════════

import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { createWorkflowExecutor } from "@/server/engine";

/**
 * Event name contract:
 *   name:  "calc/session.resume"
 *   data:  { sessionId: string; reason: "async_node_hit" | "background_batch" | "stale_recovery" }
 */
export const calcSessionResume = inngest.createFunction(
    {
        id: "calc-session-resume",
        name: "Resume paused calc session",
        // Inngest retries 4 times by default; sensible for network blips but
        // bounded so a genuinely broken workflow doesn't retry forever.
        retries: 3,
        // Rate limit protection — don't let one workflow's pathological retries
        // eat all the concurrency.
        concurrency: {
            limit: 100,
            key: "event.data.sessionId",
        },
    },
    { event: "calc/session.resume" },
    async ({ event, step, logger }) => {
        const { sessionId, reason } = event.data as {
            sessionId: string;
            reason?: string;
        };

        logger.info(`Resuming session ${sessionId} (reason: ${reason ?? "unspecified"})`);

        // Step 1: check session is actually paused with background_transition
        // and not already completed / cancelled. Wrapping in step.run gives
        // us durable retry boundaries.
        const check = await step.run("load-session-status", async () => {
            const session = await prisma.calcSession.findUnique({
                where: { id: sessionId },
                select: { status: true, pauseReason: true, calcWorkflowId: true },
            });
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            return session;
        });

        // Terminal statuses — nothing to do
        if (["COMPLETED", "ERRORED", "CANCELLED", "TIMED_OUT"].includes(check.status)) {
            logger.info(`Session ${sessionId} already ${check.status}, skipping`);
            return { skipped: true, status: check.status };
        }

        // If paused for awaiting_user_input or validation_error, we're NOT
        // the ones who should resume — the user is. Bail gracefully.
        if (
            check.status === "PAUSED" &&
            check.pauseReason !== "background_transition" &&
            check.pauseReason !== "step_complete"
        ) {
            logger.info(
                `Session ${sessionId} is paused for "${check.pauseReason}", ` +
                `not background_transition. Skipping.`
            );
            return { skipped: true, reason: check.pauseReason };
        }

        // Step 2: resume via executor. The executor re-enters its loop from
        // session.currentIndex, no special handling needed.
        const result = await step.run("continue-execution", async () => {
            const executor = createWorkflowExecutor(prisma, {
                liveUpdates: true, // Background runs always liveUpdate so client polling sees progress
            });
            return executor.continueExecution(sessionId, {
                isBackgroundRun: true,
                liveUpdates: true,
            });
        });

        logger.info(
            `Session ${sessionId} resume complete — status: ${result.status}, ` +
            `pauseReason: ${result.pauseReason ?? "none"}`
        );

        // If we hit ANOTHER async node (pause_reason === "background_transition"),
        // the executor already persisted the pause. Emit another resume event
        // so Inngest picks it up and runs the next segment.
        if (result.status === "PAUSED" && result.pauseReason === "background_transition") {
            await step.sendEvent("re-enqueue-resume", {
                name: "calc/session.resume",
                data: { sessionId, reason: "chained_async" },
            });
            return { status: "PAUSED", chainedToNextAsync: true };
        }

        return {
            status: result.status,
            pauseReason: result.pauseReason,
            completedAt: result.completedAt,
        };
    }
);