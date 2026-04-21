// ═══════════════════════════════════════════════════════════════════════════
//  src/inngest/functions/session-ttl-sweeper.ts
//
//  Hourly cron that cleans up stale sessions.
//
//  Rules (per your config):
//    - PAUSED sessions updated > 30 days ago  → mark TIMED_OUT
//    - PENDING sessions updated >  6 hours ago → mark TIMED_OUT
//
//  Why two thresholds:
//    - PAUSED means the user deliberately left it and might come back.
//      30 days gives them a generous window before we reclaim the row.
//    - PENDING means the session was created but never started running.
//      That's almost certainly a crashed request or abandoned Inngest
//      event — no reason to wait long.
//
//  We mark TIMED_OUT instead of deleting so audit trails stay intact.
//  If you want hard deletion later, add a second sweeper that finds
//  TIMED_OUT rows older than e.g. 90 days and drops them.
//
//  Idempotent: re-running the sweeper is safe — the WHERE clause excludes
//  already-terminal rows.
// ═══════════════════════════════════════════════════════════════════════════

import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";

const PAUSED_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const PENDING_TTL_MS = 6 * 60 * 60 * 1000;       // 6 hours

/** Max rows we touch per run. Caps DB write amplification. */
const BATCH_LIMIT = 500;

export const calcSessionTtlSweeper = inngest.createFunction(
    {
        id: "calc-session-ttl-sweeper",
        name: "Mark stale calc sessions as TIMED_OUT",
        // If a single run fails, Inngest retries. But missing one run isn't
        // critical — the next hourly tick will catch anything.
        retries: 2,
    },
    // Run every hour on the hour
    { cron: "0 * * * *" },
    async ({ step, logger }) => {
        const now = Date.now();

        // ─── Stage 1: stale PAUSED sessions ────────────────────────────
        const pausedCutoff = new Date(now - PAUSED_TTL_MS);
        const pausedResult = await step.run("sweep-paused", async () => {
            // Find, then update — we return the count for logging
            const stale = await prisma.calcSession.findMany({
                where: {
                    status: "PAUSED",
                    updatedAt: { lt: pausedCutoff },
                },
                select: { id: true },
                take: BATCH_LIMIT,
            });
            if (stale.length === 0) return { count: 0 };

            await prisma.calcSession.updateMany({
                where: { id: { in: stale.map((s) => s.id) } },
                data: {
                    status: "TIMED_OUT",
                    completedAt: new Date(),
                },
            });

            // Also mark any still-running node executions as SKIPPED so the
            // UI shows something sensible if someone looks at a timed-out session
            await prisma.calcNodeExecution.updateMany({
                where: {
                    sessionId: { in: stale.map((s) => s.id) },
                    status: { in: ["PENDING", "WAITING", "RUNNING"] },
                },
                data: { status: "SKIPPED", completedAt: new Date() },
            });

            return { count: stale.length };
        });

        // ─── Stage 2: stale PENDING sessions ───────────────────────────
        const pendingCutoff = new Date(now - PENDING_TTL_MS);
        const pendingResult = await step.run("sweep-pending", async () => {
            const stale = await prisma.calcSession.findMany({
                where: {
                    status: "PENDING",
                    updatedAt: { lt: pendingCutoff },
                },
                select: { id: true },
                take: BATCH_LIMIT,
            });
            if (stale.length === 0) return { count: 0 };

            await prisma.calcSession.updateMany({
                where: { id: { in: stale.map((s) => s.id) } },
                data: {
                    status: "TIMED_OUT",
                    completedAt: new Date(),
                },
            });

            return { count: stale.length };
        });

        logger.info(
            `TTL sweep done: ${pausedResult.count} paused + ${pendingResult.count} pending timed out`
        );

        return {
            sweptPaused: pausedResult.count,
            sweptPending: pendingResult.count,
            pausedCutoff: pausedCutoff.toISOString(),
            pendingCutoff: pendingCutoff.toISOString(),
        };
    }
);