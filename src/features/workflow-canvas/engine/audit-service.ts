// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/engine/audit-service.ts
//  Central audit logging — tracks every change and execution event
// ═══════════════════════════════════════════════════════════════════════════
import { createId } from "@paralleldrive/cuid2";

import {
  type AuditAction,
  type AuditResourceType,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma";

// ─── Types ───────────────────────────────────────────────────────────────

interface AuditLogInput {
  organizationId: string;
  actorId: string;
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

interface AuditQueryFilters {
  organizationId?: string;
  calcWorkflowId?: string;
  actorId?: string;
  resourceType?: AuditResourceType;
  resourceId?: string;
  action?: AuditAction;
  actions?: AuditAction[];
  startDate?: Date;
  endDate?: Date;
  batchId?: string;
  limit?: number;
  offset?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────

class AuditService {
  async log(db: PrismaClient, input: AuditLogInput) {
    return db.auditLog.create({
      data: {
        id: createId(),
        organizationId: input.organizationId,
        actorId: input.actorId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        calcWorkflowId: input.calcWorkflowId ?? null,
        action: input.action,
        changes: input.changes ?? Prisma.JsonNull,
        beforeSnapshot: input.beforeSnapshot ?? Prisma.JsonNull,
        afterSnapshot: input.afterSnapshot ?? Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        sessionId: input.sessionId ?? null,
        batchId: input.batchId ?? null,
      },
    });
  }

  async logBatch(db: PrismaClient, entries: AuditLogInput[]) {
    const batchId = createId();

    return db.auditLog.createMany({
      data: entries.map((input) => ({
        id: createId(),
        organizationId: input.organizationId,
        actorId: input.actorId,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        calcWorkflowId: input.calcWorkflowId ?? null,
        action: input.action,
        changes: input.changes ?? Prisma.JsonNull,
        beforeSnapshot: input.beforeSnapshot ?? Prisma.JsonNull,
        afterSnapshot: input.afterSnapshot ?? Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        sessionId: input.sessionId ?? null,
        batchId,
      })),
    });
  }

  async logNodeChanges(
    db: PrismaClient,
    organizationId: string,
    actorId: string,
    calcWorkflowId: string,
    changes: {
      added: { id: string; label: string; type: string }[];
      removed: { id: string; label: string; type: string }[];
      modified: {
        id: string;
        label: string;
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }[];
      movedNodes: {
        id: string;
        label: string;
        oldPos: { x: number; y: number };
        newPos: { x: number; y: number };
      }[];
    },
  ) {
    const batchId = createId();
    const entries: AuditLogInput[] = [];

    for (const node of changes.added) {
      entries.push({
        organizationId,
        actorId,
        resourceType: "NODE",
        resourceId: node.id,
        calcWorkflowId,
        action: "NODE_ADDED",
        changes: {
          nodeLabel: node.label,
          nodeType: node.type,
        } as Prisma.InputJsonValue,
        batchId,
      });
    }

    for (const node of changes.removed) {
      entries.push({
        organizationId,
        actorId,
        resourceType: "NODE",
        resourceId: node.id,
        calcWorkflowId,
        action: "NODE_REMOVED",
        changes: {
          nodeLabel: node.label,
          nodeType: node.type,
        } as Prisma.InputJsonValue,
        batchId,
      });
    }

    for (const mod of changes.modified) {
      entries.push({
        organizationId,
        actorId,
        resourceType: "NODE",
        resourceId: mod.id,
        calcWorkflowId,
        action: "NODE_CONFIG_CHANGED",
        changes: {
          nodeLabel: mod.label,
          field: mod.field,
        } as Prisma.InputJsonValue,
        batchId,
      });
    }

    for (const moved of changes.movedNodes) {
      entries.push({
        organizationId,
        actorId,
        resourceType: "NODE",
        resourceId: moved.id,
        calcWorkflowId,
        action: "NODE_MOVED",
        changes: {
          nodeLabel: moved.label,
          oldPosition: moved.oldPos,
          newPosition: moved.newPos,
        } as Prisma.InputJsonValue,
        batchId,
      });
    }

    if (entries.length > 0) {
      await this.logBatch(db, entries);
    }

    return { batchId, count: entries.length };
  }

  async query(db: PrismaClient, filters: AuditQueryFilters) {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.calcWorkflowId) where.calcWorkflowId = filters.calcWorkflowId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.resourceId) where.resourceId = filters.resourceId;
    if (filters.batchId) where.batchId = filters.batchId;

    if (filters.action) {
      where.action = filters.action;
    } else if (filters.actions && filters.actions.length > 0) {
      where.action = { in: filters.actions };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          actor: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      db.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      hasMore: (filters.offset ?? 0) + logs.length < total,
    };
  }

  async getWorkflowTimeline(
    db: PrismaClient,
    calcWorkflowId: string,
    options: {
      limit?: number;
      offset?: number;
      excludePositionChanges?: boolean;
    } = {},
  ) {
    const where: Prisma.AuditLogWhereInput = { calcWorkflowId };
    if (options.excludePositionChanges) {
      where.action = { not: "NODE_MOVED" };
    }

    const logs = await db.auditLog.findMany({
      where,
      include: {
        actor: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
    });

    // Group by batchId
    const batchMap = new Map<string, typeof logs>();
    const singles: typeof logs = [];

    for (const log of logs) {
      if (log.batchId) {
        if (!batchMap.has(log.batchId)) batchMap.set(log.batchId, []);
        batchMap.get(log.batchId)!.push(log);
      } else {
        singles.push(log);
      }
    }

    const grouped: {
      batchId: string | null;
      actor: { id: string; name: string; image: string | null } | null;
      timestamp: Date;
      entries: typeof logs;
      summary: string;
    }[] = [];

    for (const [batchId, entries] of batchMap) {
      const first = entries[0];
      const actor = first.actor?.user
        ? {
            id: first.actor.user.id,
            name: first.actor.user.name ?? "Unknown",
            image: first.actor.user.image,
          }
        : null;

      grouped.push({
        batchId,
        actor,
        timestamp: first.createdAt,
        entries,
        summary: this.summarizeBatch(entries),
      });
    }

    for (const entry of singles) {
      const actor = entry.actor?.user
        ? {
            id: entry.actor.user.id,
            name: entry.actor.user.name ?? "Unknown",
            image: entry.actor.user.image,
          }
        : null;

      grouped.push({
        batchId: null,
        actor,
        timestamp: entry.createdAt,
        entries: [entry],
        summary: this.summarizeAction(entry),
      });
    }

    grouped.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return grouped;
  }

  async getExecutionHistory(
    db: PrismaClient,
    actorId: string,
    options: {
      calcWorkflowId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const where: Prisma.CalcSessionWhereInput = { actorId };
    if (options.calcWorkflowId) where.calcWorkflowId = options.calcWorkflowId;
    if (options.status) where.status = options.status as any;

    const [sessions, total] = await Promise.all([
      db.calcSession.findMany({
        where,
        include: {
          calcWorkflow: { select: { id: true, name: true, category: true } },
          nodeExecutions: {
            select: {
              id: true,
              calcNodeId: true,
              status: true,
              durationMs: true,
              result: true,
            },
            orderBy: { stepNumber: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        take: options.limit ?? 20,
        skip: options.offset ?? 0,
      }),
      db.calcSession.count({ where }),
    ]);

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        workflow: s.calcWorkflow,
        status: s.status,
        runMode: s.runMode,
        variables: s.variables,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        duration: s.duration,
        error: s.error,
        nodeCount: s.nodeExecutions.length,
        completedNodes: s.nodeExecutions.filter((n) => n.status === "COMPLETED")
          .length,
        erroredNodes: s.nodeExecutions.filter((n) => n.status === "ERRORED")
          .length,
        nodeExecutions: s.nodeExecutions,
      })),
      total,
      hasMore: (options.offset ?? 0) + sessions.length < total,
    };
  }

  async getSessionDetail(db: PrismaClient, sessionId: string) {
    return db.calcSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: {
        calcWorkflow: {
          select: { id: true, name: true, category: true, metadata: true },
        },
        actor: {
          include: { user: { select: { id: true, name: true, image: true } } },
        },
        nodeExecutions: {
          include: {
            node: {
              select: { id: true, label: true, type: true, config: true },
            },
          },
          orderBy: { stepNumber: "asc" },
        },
      },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────

  private summarizeBatch(entries: { action: string }[]): string {
    const added = entries.filter((e) => e.action === "NODE_ADDED").length;
    const removed = entries.filter((e) => e.action === "NODE_REMOVED").length;
    const modified = entries.filter(
      (e) => e.action === "NODE_CONFIG_CHANGED",
    ).length;
    const moved = entries.filter((e) => e.action === "NODE_MOVED").length;

    const parts: string[] = [];
    if (added) parts.push(`added ${added} node${added > 1 ? "s" : ""}`);
    if (removed) parts.push(`removed ${removed} node${removed > 1 ? "s" : ""}`);
    if (modified)
      parts.push(`modified ${modified} node${modified > 1 ? "s" : ""}`);
    if (moved) parts.push(`repositioned ${moved} node${moved > 1 ? "s" : ""}`);

    return parts.length > 0
      ? `Workflow updated: ${parts.join(", ")}`
      : `${entries.length} changes`;
  }

  private summarizeAction(entry: { action: string; changes: unknown }): string {
    const changes = entry.changes as Record<string, unknown> | null;

    const summaries: Record<string, string> = {
      CREATED: "Workflow created",
      PUBLISHED: "Workflow published",
      ARCHIVED: "Workflow archived",
      WORKFLOW_RUN_STARTED: `Execution started`,
      WORKFLOW_RUN_COMPLETED: `Execution completed${changes?.durationMs ? ` in ${Math.round(changes.durationMs as number)}ms` : ""}`,
      WORKFLOW_RUN_ERRORED: `Execution failed${changes?.error ? `: ${changes.error}` : ""}`,
      WORKFLOW_RUN_CANCELLED: "Execution cancelled",
      USER_INPUT_SUBMITTED: "User input submitted",
      REGISTRY_ITEM_CREATED: "Registry item created",
      REGISTRY_VERSION_PUBLISHED: "Registry version published",
      FOLDER_CREATED: `Folder created`,
      WORKFLOW_LINKED: "Workflow linked to workspace",
    };

    return (
      summaries[entry.action] || entry.action.toLowerCase().replace(/_/g, " ")
    );
  }
}

export const auditService = new AuditService();
