// // ═══════════════════════════════════════════════════════════════════════════
// //  src/server/engine/SessionPoller.ts
// //
// //  Server-side polling logic. The UI calls this via tRPC every N ms while
// //  a session is in RUNNING or PAUSED(background_transition) state.
// //
// //  Adaptive backoff:
// //    - First 5 seconds after session start: 1000 ms
// //    - 5-30 seconds: 2000 ms
// //    - 30+ seconds: 5000 ms
// //
// //  This is cheap to implement and keeps long-running sessions from
// //  hammering the server. The UI should ALWAYS use the nextPollIntervalMs
// //  from the response — don't hardcode on the client side.
// //
// //  Cancel detection: if the session is terminal (COMPLETED/ERRORED/CANCELLED),
// //  nextPollIntervalMs is 0 which signals the client to stop polling.
// // ═══════════════════════════════════════════════════════════════════════════

// import type { PrismaClient } from "@/generated/prisma";
// import type { Clock, PollResult, VariableSnapshot } from "./types";
// import { SessionRepository } from "./SessionRepository";

// const POLL_INTERVALS = {
//     initial: 1000,
//     medium: 2000,
//     long: 5000,
//     stop: 0,
// };

// /** After this many ms since session start, use medium interval. */
// const MEDIUM_THRESHOLD_MS = 5_000;
// /** After this many ms since session start, use long interval. */
// const LONG_THRESHOLD_MS = 30_000;

// export class SessionPoller {
//     constructor(
//         private readonly db: PrismaClient,
//         private readonly repo: SessionRepository,
//         private readonly clock: Clock
//     ) { }

//     async poll(sessionId: string): Promise<PollResult> {
//         const session = await this.repo.loadSession(sessionId);
//         const totalSteps = session.executionOrder.length;

//         // Compute next poll interval based on age of the run
//         const ageMs = session.startedAt
//             ? this.clock.now() - session.startedAt.getTime()
//             : 0;

//         let nextPollIntervalMs: number;

//         if (isTerminalStatus(session.status)) {
//             nextPollIntervalMs = POLL_INTERVALS.stop;
//         } else if (ageMs < MEDIUM_THRESHOLD_MS) {
//             nextPollIntervalMs = POLL_INTERVALS.initial;
//         } else if (ageMs < LONG_THRESHOLD_MS) {
//             nextPollIntervalMs = POLL_INTERVALS.medium;
//         } else {
//             nextPollIntervalMs = POLL_INTERVALS.long;
//         }

//         // Build error field if present
//         const errorField = session.status === "ERRORED" && session.variables !== null
//             ? await this.extractErrorDetail(sessionId)
//             : undefined;

//         // Build completedAt if terminal
//         const completedAt = isTerminalStatus(session.status)
//             ? await this.getCompletedAt(sessionId)
//             : null;

//         return {
//             sessionId: session.id,
//             status: session.status,
//             pauseReason: (session.metadata.stepPauseReason ?? null) as PollResult["pauseReason"],
//             variables: session.variables as VariableSnapshot,
//             currentIndex: session.currentIndex,
//             totalSteps,
//             nextPollIntervalMs,
//             error: errorField,
//             completedAt,
//         };
//     }

//     /**
//      * Extract the structured error from the session.error JSON column.
//      * We go through Prisma directly here because the repo doesn't expose
//      * the raw error field (and probably shouldn't — it's a PollResult-only concern).
//      */
//     private async extractErrorDetail(sessionId: string) {
//         const row = await this.db.calcSession.findUnique({
//             where: { id: sessionId },
//             select: { error: true },
//         });
//         if (!row?.error || typeof row.error !== "object") return undefined;
//         const e = row.error as Record<string, unknown>;
//         return {
//             nodeId: String(e.nodeId ?? ""),
//             nodeLabel: String(e.nodeLabel ?? ""),
//             message: String(e.message ?? "Unknown error"),
//             type: String(e.type ?? "unknown"),
//         };
//     }

//     private async getCompletedAt(sessionId: string): Promise<string | null> {
//         const row = await this.db.calcSession.findUnique({
//             where: { id: sessionId },
//             select: { completedAt: true },
//         });
//         return row?.completedAt?.toISOString() ?? null;
//     }
// }

// function isTerminalStatus(s: string): boolean {
//     return s === "COMPLETED" || s === "ERRORED" || s === "CANCELLED" || s === "TIMED_OUT";
// }


// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/SessionPoller.ts
//
//  SIMPLIFIED POLLING POLICY (per your direction):
//
//    - Non-terminal session (RUNNING or PAUSED) → return 1500 ms
//    - Terminal session (COMPLETED/ERRORED/CANCELLED/TIMED_OUT) → return 0
//
//  The client treats nextPollIntervalMs === 0 as the signal to stop polling.
//
//  Why simpler:
//    - No time-since-start math, no edge cases with PAUSED sessions that
//      wait on user input (those would have drifted to 5s backoff in the
//      adaptive version, making resume feel sluggish)
//    - Predictable load on the server: always 1 poll per ~1.5s per active
//      session, regardless of session age
//    - Matches the UI's existing use-execution.ts default interval
//
//  Trade-off: long-running background jobs (minutes) generate more poll
//  requests than they strictly need. If that becomes a real load problem
//  you can add a simple cap later (e.g. slow to 5s after 2 minutes).
// ═══════════════════════════════════════════════════════════════════════════

import type { PrismaClient } from "@/generated/prisma";
import type { Clock, PollResult, VariableSnapshot } from "./types";
import { SessionRepository } from "./SessionRepository";

/** How often the client should poll while a session is non-terminal. */
const POLL_INTERVAL_MS = 1500;

/** Sentinel the client checks for "stop polling". */
const STOP_POLLING = 0;

export class SessionPoller {
    constructor(
        private readonly db: PrismaClient,
        private readonly repo: SessionRepository,
        private readonly clock: Clock
    ) { }

    async poll(sessionId: string): Promise<PollResult> {
        const session = await this.repo.loadSession(sessionId);
        const totalSteps = session.executionOrder.length;

        const nextPollIntervalMs = isTerminalStatus(session.status)
            ? STOP_POLLING
            : POLL_INTERVAL_MS;

        const errorField = session.status === "ERRORED"
            ? await this.extractErrorDetail(sessionId)
            : undefined;

        const completedAt = isTerminalStatus(session.status)
            ? await this.getCompletedAt(sessionId)
            : null;

        const result: PollResult = {
            sessionId: session.id,
            status: session.status,
            pauseReason: (session.metadata.stepPauseReason ?? null) as PollResult["pauseReason"],
            variables: session.variables as VariableSnapshot,
            currentIndex: session.currentIndex,
            totalSteps,
            nextPollIntervalMs,
            error: errorField,
            completedAt,
        };

        // Hydrate paused node info if needed (CHUNK 4: for input nodes waiting on user)
        if (session.status === "PAUSED" && session.currentNodeId) {
            const wf = await this.repo.loadWorkflow(session.calcWorkflowId);
            const node = wf.nodes.find(n => n.id === session.currentNodeId);
            if (node && node.type === "INPUT") {
                const config = (node.config ?? {}) as any;
                (result as any).pausedNode = {
                    nodeId: node.id,
                    nodeLabel: node.label,
                    fields: config.fields ?? [],
                    message: config.description ?? "",
                };
            }
        }

        return result;
    }

    /**
     * Extract the structured error from the session.error JSON column.
     * This goes through Prisma directly because the repo's LoadedSession
     * doesn't carry the raw error field — it's a PollResult-only concern.
     */
    private async extractErrorDetail(sessionId: string) {
        const row = await this.db.calcSession.findUnique({
            where: { id: sessionId },
            select: { error: true },
        });
        if (!row?.error || typeof row.error !== "object") return undefined;
        const e = row.error as Record<string, unknown>;
        return {
            nodeId: String(e.nodeId ?? ""),
            nodeLabel: String(e.nodeLabel ?? ""),
            message: String(e.message ?? "Unknown error"),
            type: String(e.type ?? "unknown"),
        };
    }

    private async getCompletedAt(sessionId: string): Promise<string | null> {
        const row = await this.db.calcSession.findUnique({
            where: { id: sessionId },
            select: { completedAt: true },
        });
        return row?.completedAt?.toISOString() ?? null;
    }
}

function isTerminalStatus(s: string): boolean {
    return s === "COMPLETED" || s === "ERRORED" || s === "CANCELLED" || s === "TIMED_OUT";
}