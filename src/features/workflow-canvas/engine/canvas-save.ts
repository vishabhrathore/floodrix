// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/engine/canvas-save.ts
//  Handles saving React Flow canvas state → database + publishing
// ═══════════════════════════════════════════════════════════════════════════

import { type PrismaClient, Prisma } from "@/generated/prisma";
import { createId } from "@paralleldrive/cuid2";
import { auditService } from "./audit-service";

// ─── Types ───────────────────────────────────────────────────────────────

interface RFNode {
    id: string;
    type: string;
    label: string;
    description?: string | null;
    positionX: number;
    positionY: number;
    config: Record<string, unknown>;
    style: Record<string, unknown>;
    sortOrder: number;
}

interface RFEdge {
    id: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle: string;
    targetHandle: string;
    condition?: unknown;
    label?: string | null;
    style: Record<string, unknown>;
    sortOrder: number;
}

interface CanvasSaveInput {
    db: PrismaClient;
    workflowId: string;
    actorId: string;
    nodes: RFNode[];
    edges: RFEdge[];
    viewport?: { x: number; y: number; zoom: number };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Save handler
// ═══════════════════════════════════════════════════════════════════════════

export async function saveCanvasOptimized(input: CanvasSaveInput) {
    const { db, workflowId, actorId, nodes: rfNodes, edges: rfEdges, viewport } = input;

    // 1. Load existing state
    const existing = await db.calcWorkflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
            nodes: { where: { deletedAt: null } },
            edges: { where: { deletedAt: null } },
        },
    });

    const oldNodeMap = new Map(existing.nodes.map((n) => [n.id, n]));
    const newNodeIds = new Set(rfNodes.map((n) => n.id));

    // 2. Compute diffs
    const addedNodes: { id: string; label: string; type: string }[] = [];
    const removedNodes: { id: string; label: string; type: string }[] = [];
    const modifiedNodes: {
        id: string; label: string; field: string; oldValue: unknown; newValue: unknown;
    }[] = [];
    const movedNodes: {
        id: string; label: string;
        oldPos: { x: number; y: number }; newPos: { x: number; y: number };
    }[] = [];

    for (const rfNode of rfNodes) {
        if (!oldNodeMap.has(rfNode.id)) {
            addedNodes.push({ id: rfNode.id, label: rfNode.label, type: rfNode.type });
        }
    }

    for (const [id, node] of oldNodeMap) {
        if (!newNodeIds.has(id)) {
            removedNodes.push({ id, label: node.label, type: node.type });
        }
    }

    for (const rfNode of rfNodes) {
        const old = oldNodeMap.get(rfNode.id);
        if (!old) continue;

        if (Math.abs(old.positionX - rfNode.positionX) > 1 || Math.abs(old.positionY - rfNode.positionY) > 1) {
            movedNodes.push({
                id: rfNode.id, label: rfNode.label,
                oldPos: { x: old.positionX, y: old.positionY },
                newPos: { x: rfNode.positionX, y: rfNode.positionY },
            });
        }
        if (old.label !== rfNode.label) {
            modifiedNodes.push({ id: rfNode.id, label: rfNode.label, field: "label", oldValue: old.label, newValue: rfNode.label });
        }
        if (JSON.stringify(old.config) !== JSON.stringify(rfNode.config)) {
            modifiedNodes.push({ id: rfNode.id, label: rfNode.label, field: "config", oldValue: old.config, newValue: rfNode.config });
        }
        if (old.type !== rfNode.type) {
            modifiedNodes.push({ id: rfNode.id, label: rfNode.label, field: "type", oldValue: old.type, newValue: rfNode.type });
        }
    }

    // 3. Apply in transaction
    await db.$transaction(async (tx) => {
        // Soft-delete removed nodes
        if (removedNodes.length > 0) {
            await tx.calcNode.updateMany({
                where: { id: { in: removedNodes.map((n) => n.id) }, calcWorkflowId: workflowId },
                data: { deletedAt: new Date() },
            });
        }

        // Upsert nodes
        for (const rfNode of rfNodes) {
            const configJson = rfNode.config as Prisma.InputJsonValue;
            const styleJson = rfNode.style as Prisma.InputJsonValue;

            await tx.calcNode.upsert({
                where: { id: rfNode.id },
                create: {
                    id: rfNode.id,
                    calcWorkflowId: workflowId,
                    type: rfNode.type as never,
                    label: rfNode.label,
                    description: rfNode.description ?? null,
                    positionX: rfNode.positionX,
                    positionY: rfNode.positionY,
                    config: configJson,
                    style: styleJson,
                    sortOrder: rfNode.sortOrder,
                },
                update: {
                    type: rfNode.type as never,
                    label: rfNode.label,
                    description: rfNode.description ?? null,
                    positionX: rfNode.positionX,
                    positionY: rfNode.positionY,
                    config: configJson,
                    style: styleJson,
                    sortOrder: rfNode.sortOrder,
                },
            });
        }

        // Soft-delete old edges, recreate
        // Hard-delete old edges, recreate fresh
        await tx.calcEdge.deleteMany({
            where: { calcWorkflowId: workflowId },
        });

        if (rfEdges.length > 0) {
            await tx.calcEdge.createMany({
                data: rfEdges.map((e) => ({
                    id: e.id || createId(),
                    calcWorkflowId: workflowId,
                    sourceNodeId: e.sourceNodeId,
                    targetNodeId: e.targetNodeId,
                    sourceHandle: e.sourceHandle || "output",
                    targetHandle: e.targetHandle || "input",
                    label: e.label ?? null,
                    condition: e.condition != null ? (e.condition as Prisma.InputJsonValue) : Prisma.JsonNull,
                    style: (e.style as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                    sortOrder: e.sortOrder,
                })),
                skipDuplicates: true,
            });
        }

        // Update workflow timestamp
        await tx.calcWorkflow.update({
            where: { id: workflowId },
            data: {
                canvasState: viewport
                    ? ({ viewport } as Prisma.InputJsonValue)
                    : (existing.canvasState ?? Prisma.JsonNull),
                updatedAt: new Date(),
            },
        });
    });

    // 4. Audit
    const hasChanges = addedNodes.length + removedNodes.length + modifiedNodes.length + movedNodes.length > 0;
    if (hasChanges) {
        await auditService.logNodeChanges(db, existing.organizationId, actorId, workflowId, {
            added: addedNodes,
            removed: removedNodes,
            modified: modifiedNodes,
            movedNodes,
        });
    }

    return {
        saved: true,
        changes: {
            added: addedNodes.length,
            removed: removedNodes.length,
            modified: modifiedNodes.length,
            moved: movedNodes.length,
        },
    };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Publish — creates an immutable version snapshot
// ═══════════════════════════════════════════════════════════════════════════

export async function publishWorkflow(input: {
    db: PrismaClient;
    workflowId: string;
    actorId: string;
    changelog?: string;
}) {
    const { db, workflowId, actorId, changelog } = input;

    const workflow = await db.calcWorkflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
            nodes: { where: { deletedAt: null } },
            edges: { where: { deletedAt: null } },
            variables: { where: { deletedAt: null } },
        },
    });

    // Compute next version from CalcVersion table
    const latestVersion = await db.calcVersion.findFirst({
        where: { calcWorkflowId: workflowId },
        orderBy: { version: "desc" },
        select: { version: true },
    });
    const newVersionNum = (latestVersion?.version ?? 0) + 1;

    const snapshot: Prisma.InputJsonValue = {
        nodes: workflow.nodes.map((n) => ({
            id: n.id, type: n.type, label: n.label, description: n.description,
            positionX: n.positionX, positionY: n.positionY,
            config: n.config, style: n.style, sortOrder: n.sortOrder,
        })),
        edges: workflow.edges.map((e) => ({
            id: e.id, sourceNodeId: e.sourceNodeId, targetNodeId: e.targetNodeId,
            sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
            condition: e.condition, label: e.label,
        })),
        variables: workflow.variables.map((v) => ({
            contextKey: v.contextKey, displayLabel: v.displayLabel, notation: v.notation,
            dataType: v.dataType, unit: v.unit, defaultValue: v.defaultValue,
            constraints: v.constraints,
        })),
        metadata: workflow.metadata,
        canvasState: workflow.canvasState,
    };

    const versionRecord = await db.$transaction(async (tx) => {
        const version = await tx.calcVersion.create({
            data: {
                calcWorkflowId: workflowId,
                version: newVersionNum,
                snapshot,
                changelog: changelog ?? null,
                publishedBy: actorId,
            },
        });

        await tx.calcWorkflow.update({
            where: { id: workflowId },
            data: {
                currentVersionId: version.id,
                status: "PUBLISHED",
                publishedAt: new Date(),
            },
        });

        return version;
    });

    await auditService.log(db, {
        organizationId: workflow.organizationId,
        actorId,
        resourceType: "WORKFLOW",
        resourceId: workflowId,
        calcWorkflowId: workflowId,
        action: "PUBLISHED",
        changes: {
            versionId: versionRecord.id,
            version: newVersionNum,
            changelog,
            nodeCount: workflow.nodes.length,
            edgeCount: workflow.edges.length,
        } as Prisma.InputJsonValue,
    });

    return { id: versionRecord.id, version: newVersionNum };
}