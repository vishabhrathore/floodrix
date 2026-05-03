import { type PrismaClient, type AuditAction, type AuditResourceType, Prisma } from "@/generated/prisma";
import { createId } from "@paralleldrive/cuid2";

export interface AuditLogPayload {
    resourceType: AuditResourceType;
    resourceId: string;
    calcWorkflowId?: string;
    action: AuditAction;
    changes?: Prisma.InputJsonValue;
    beforeSnapshot?: Prisma.InputJsonValue;
    afterSnapshot?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    batchId?: string;
}

/**
 * AuditLogger - A scoped logger that automatically injects organizationId and actorId
 * into every log entry. This ensures multi-tenant isolation and developer ergonomics.
 */
export class AuditLogger {
    constructor(
        private readonly db: PrismaClient,
        private readonly actorId: string | null,
        private readonly organizationId: string
    ) {}

    async log(payload: AuditLogPayload) {
        return this.db.auditLog.create({
            data: {
                id: createId(),
                organizationId: this.organizationId,
                actorId: this.actorId,
                resourceType: payload.resourceType,
                resourceId: payload.resourceId,
                calcWorkflowId: payload.calcWorkflowId ?? null,
                action: payload.action,
                changes: payload.changes ?? Prisma.JsonNull,
                beforeSnapshot: payload.beforeSnapshot ?? Prisma.JsonNull,
                afterSnapshot: payload.afterSnapshot ?? Prisma.JsonNull,
                ipAddress: payload.ipAddress ?? null,
                userAgent: payload.userAgent ?? null,
                sessionId: payload.sessionId ?? null,
                batchId: payload.batchId ?? null,
            },
        });
    }

    async logBatch(payloads: AuditLogPayload[]) {
        const batchId = createId();
        return this.db.auditLog.createMany({
            data: payloads.map((payload) => ({
                id: createId(),
                organizationId: this.organizationId,
                actorId: this.actorId,
                resourceType: payload.resourceType,
                resourceId: payload.resourceId,
                calcWorkflowId: payload.calcWorkflowId ?? null,
                action: payload.action,
                changes: payload.changes ?? Prisma.JsonNull,
                beforeSnapshot: payload.beforeSnapshot ?? Prisma.JsonNull,
                afterSnapshot: payload.afterSnapshot ?? Prisma.JsonNull,
                ipAddress: payload.ipAddress ?? null,
                userAgent: payload.userAgent ?? null,
                sessionId: payload.sessionId ?? null,
                batchId: payload.batchId ?? batchId,
            })),
        });
    }
}
