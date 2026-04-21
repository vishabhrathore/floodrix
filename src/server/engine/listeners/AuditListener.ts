// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/listeners/AuditListener.ts
//
//  Reacts to session-level events and writes audit log entries.
//
//  Why this exists rather than calling auditService.log() inline in the
//  executor: it inverts the dependency. The executor doesn't know auditing
//  exists. If you want to disable auditing for tests, swap this listener
//  for a no-op. If you want to audit to a different store, write a new listener.
//
//  Node-level events (node:completed/skipped/errored) are NOT audited here —
//  they're available via CalcNodeExecution rows. Audit logs are for the
//  session-level "what happened" view.
// ═══════════════════════════════════════════════════════════════════════════

import { Prisma, type PrismaClient } from "@/generated/prisma";
import type { ExecutionEvent } from "../types";
import { auditService } from "@/features/workflow-canvas/engine/audit-service";

export class AuditListener {
    constructor(private readonly db: PrismaClient) { }

    async handle(event: ExecutionEvent): Promise<void> {
        switch (event.type) {
            case "session:started":
                await auditService.log(this.db, {
                    actorId: event.actorId,
                    resourceType: "WORKFLOW",
                    resourceId: event.workflowId,
                    calcWorkflowId: event.workflowId,
                    sessionId: event.sessionId,
                    action: "WORKFLOW_RUN_STARTED",
                    changes: {
                        sessionId: event.sessionId,
                        nodeCount: event.nodeCount,
                    } as Prisma.InputJsonValue,
                });
                return;

            case "session:completed":
                await auditService.log(this.db, {
                    actorId: event.actorId,
                    resourceType: "WORKFLOW",
                    resourceId: event.workflowId,
                    calcWorkflowId: event.workflowId,
                    sessionId: event.sessionId,
                    action: "WORKFLOW_RUN_COMPLETED",
                    changes: {
                        sessionId: event.sessionId,
                        durationMs: event.durationMs,
                        finalVariables: event.finalVariables,
                    } as Prisma.InputJsonValue,
                });
                return;

            case "session:errored":
                await auditService.log(this.db, {
                    actorId: event.actorId,
                    resourceType: "WORKFLOW",
                    resourceId: event.workflowId,
                    calcWorkflowId: event.workflowId,
                    sessionId: event.sessionId,
                    action: "WORKFLOW_RUN_ERRORED",
                    changes: {
                        sessionId: event.sessionId,
                        nodeId: event.nodeId,
                        error: event.error,
                    } as Prisma.InputJsonValue,
                });
                return;

            case "session:cancelled":
                await auditService.log(this.db, {
                    actorId: event.actorId,
                    resourceType: "WORKFLOW",
                    resourceId: event.workflowId,
                    calcWorkflowId: event.workflowId,
                    sessionId: event.sessionId,
                    action: "WORKFLOW_RUN_CANCELLED",
                    changes: { sessionId: event.sessionId } as Prisma.InputJsonValue,
                });
                return;

            // No-ops: node-level events are tracked via CalcNodeExecution
            case "node:started":
            case "node:completed":
            case "node:skipped":
            case "node:errored":
            case "node:waiting":
            case "session:paused":
                return;
        }
    }
}