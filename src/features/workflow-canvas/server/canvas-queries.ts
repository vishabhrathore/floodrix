// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/server/canvas-queries.ts
//  Optimized database operations for React Flow canvas save/load
// ═══════════════════════════════════════════════════════════════════════════

import { type PrismaClient, Prisma } from "@/generated/prisma";
import { createId } from "@paralleldrive/cuid2";

// ─── Types ───────────────────────────────────────────────────────────────

interface CanvasSaveNode {
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

interface CanvasSaveEdge {
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

// ═══════════════════════════════════════════════════════════════════════════
//  Optimized canvas save — diffs in memory, minimal DB operations
// ═══════════════════════════════════════════════════════════════════════════

export async function saveCanvasOptimizedQueries(
    db: PrismaClient,
    workflowId: string,
    incomingNodes: CanvasSaveNode[],
    incomingEdges: CanvasSaveEdge[]
) {
    const [existingNodes, existingEdges] = await Promise.all([
        db.calcNode.findMany({
            where: { calcWorkflowId: workflowId, deletedAt: null },
            select: {
                id: true, type: true, label: true,
                positionX: true, positionY: true,
                config: true, style: true,
            },
        }),
        db.calcEdge.findMany({
            where: { calcWorkflowId: workflowId, deletedAt: null },
            select: {
                id: true, sourceNodeId: true, targetNodeId: true,
                sourceHandle: true, targetHandle: true,
                label: true, condition: true,
            },
        }),
    ]);

    const oldNodeMap = new Map(existingNodes.map((n) => [n.id, n]));
    const newNodeMap = new Map(incomingNodes.map((n) => [n.id, n]));

    const nodesToCreate: CanvasSaveNode[] = [];
    const nodesToUpdate: { id: string; changes: Prisma.CalcNodeUpdateInput }[] = [];
    const nodeIdsToSoftDelete: string[] = [];

    for (const node of incomingNodes) {
        const old = oldNodeMap.get(node.id);
        if (!old) {
            nodesToCreate.push(node);
            continue;
        }

        const changes: Prisma.CalcNodeUpdateInput = {};
        let isDirty = false;

        if (old.type !== node.type) { changes.type = node.type as never; isDirty = true; }
        if (old.label !== node.label) { changes.label = node.label; isDirty = true; }
        if (Math.abs(old.positionX - node.positionX) > 0.5 || Math.abs(old.positionY - node.positionY) > 0.5) {
            changes.positionX = node.positionX;
            changes.positionY = node.positionY;
            isDirty = true;
        }
        if (JSON.stringify(old.config) !== JSON.stringify(node.config)) {
            changes.config = node.config as Prisma.InputJsonValue;
            isDirty = true;
        }

        if (isDirty) nodesToUpdate.push({ id: node.id, changes });
    }

    for (const [id] of oldNodeMap) {
        if (!newNodeMap.has(id)) nodeIdsToSoftDelete.push(id);
    }

    // Diff edges
    const edgeKey = (e: { sourceNodeId: string; targetNodeId: string; sourceHandle: string; targetHandle: string }) =>
        `${e.sourceNodeId}|${e.targetNodeId}|${e.sourceHandle}|${e.targetHandle}`;

    const oldEdgeByKey = new Map(existingEdges.map((e) => [edgeKey(e), e]));
    const newEdgeByKey = new Map(incomingEdges.map((e) => [edgeKey(e), e]));

    const edgesToCreate: CanvasSaveEdge[] = [];
    const edgeIdsToSoftDelete: string[] = [];

    for (const [key, edge] of newEdgeByKey) {
        if (!oldEdgeByKey.has(key)) edgesToCreate.push(edge);
    }
    for (const [key, oldEdge] of oldEdgeByKey) {
        if (!newEdgeByKey.has(key)) edgeIdsToSoftDelete.push(oldEdge.id);
    }

    // Execute
    const stats = {
        nodesCreated: nodesToCreate.length,
        nodesUpdated: nodesToUpdate.length,
        nodesDeleted: nodeIdsToSoftDelete.length,
        edgesCreated: edgesToCreate.length,
        edgesDeleted: edgeIdsToSoftDelete.length,
        totalQueries: 0,
    };

    await db.$transaction(async (tx) => {
        const queries: Promise<unknown>[] = [];

        if (nodeIdsToSoftDelete.length > 0) {
            queries.push(
                tx.calcNode.updateMany({
                    where: { id: { in: nodeIdsToSoftDelete }, calcWorkflowId: workflowId },
                    data: { deletedAt: new Date() },
                })
            );
        }

        if (nodesToCreate.length > 0) {
            queries.push(
                tx.calcNode.createMany({
                    data: nodesToCreate.map((n) => ({
                        id: n.id || createId(),
                        calcWorkflowId: workflowId,
                        type: n.type as never,
                        label: n.label,
                        description: n.description ?? null,
                        positionX: n.positionX,
                        positionY: n.positionY,
                        config: (n.config as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                        style: (n.style as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                        sortOrder: n.sortOrder,
                    })),
                })
            );
        }

        for (const { id, changes } of nodesToUpdate) {
            queries.push(tx.calcNode.update({ where: { id }, data: changes }));
        }

        if (edgeIdsToSoftDelete.length > 0) {
            queries.push(
                tx.calcEdge.updateMany({
                    where: { id: { in: edgeIdsToSoftDelete } },
                    data: { deletedAt: new Date() },
                })
            );
        }

        if (edgesToCreate.length > 0) {
            queries.push(
                tx.calcEdge.createMany({
                    data: edgesToCreate.map((e) => ({
                        id: e.id || createId(),
                        calcWorkflowId: workflowId,
                        sourceNodeId: e.sourceNodeId,
                        targetNodeId: e.targetNodeId,
                        sourceHandle: e.sourceHandle || "output",
                        targetHandle: e.targetHandle || "input",
                        label: e.label ?? null,
                        condition: e.condition != null
                            ? (e.condition as Prisma.InputJsonValue)
                            : Prisma.JsonNull,
                        style: (e.style as Prisma.InputJsonValue) ?? Prisma.JsonNull,
                        sortOrder: e.sortOrder,
                    })),
                })
            );
        }

        queries.push(
            tx.calcWorkflow.update({
                where: { id: workflowId },
                data: { updatedAt: new Date() },
            })
        );

        await Promise.all(queries);
        stats.totalQueries = queries.length;
    });

    return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Load workflow for execution
// ═══════════════════════════════════════════════════════════════════════════

export async function loadWorkflowForExecution(
    db: PrismaClient,
    workflowId: string
) {
    const [workflow, nodes, edges, variables] = await Promise.all([
        db.calcWorkflow.findUniqueOrThrow({
            where: { id: workflowId },
            select: {
                id: true, name: true, metadata: true,
                currentVersionId: true, organizationId: true,
            },
        }),
        db.calcNode.findMany({
            where: { calcWorkflowId: workflowId, deletedAt: null },
            select: { id: true, type: true, label: true, sortOrder: true, config: true },
            orderBy: { sortOrder: "asc" },
        }),
        db.calcEdge.findMany({
            where: { calcWorkflowId: workflowId, deletedAt: null },
            select: { sourceNodeId: true, targetNodeId: true, sourceHandle: true },
        }),
        db.calcVariable.findMany({
            where: { calcWorkflowId: workflowId, deletedAt: null },
            select: { contextKey: true, defaultValue: true },
        }),
    ]);

    return { workflow, nodes, edges, variables };
}

// ═══════════════════════════════════════════════════════════════════════════
//  Node execution bulk operations
// ═══════════════════════════════════════════════════════════════════════════

export async function createNodeExecutionsBatch(
    db: PrismaClient,
    sessionId: string,
    nodeIds: string[]
) {
    return db.calcNodeExecution.createMany({
        data: nodeIds.map((calcNodeId, idx) => ({
            sessionId,
            calcNodeId,
            stepNumber: idx,
            status: "PENDING" as const,
        })),
    });
}

export async function completeNodeExecution(
    db: PrismaClient,
    sessionId: string,
    calcNodeId: string,
    data: {
        status: "COMPLETED" | "SKIPPED" | "ERRORED" | "WAITING";
        outputVars?: Record<string, unknown>;
        result?: Record<string, unknown>;
        error?: string;
        errorType?: string;
        userInput?: Record<string, unknown>;
        durationMs?: number;
    }
) {
    return db.calcNodeExecution.updateMany({
        where: {
            sessionId,
            calcNodeId,
            status: { in: ["PENDING", "RUNNING", "WAITING"] },
        },
        data: {
            status: data.status,
            outputVars: data.outputVars
                ? (data.outputVars as Prisma.InputJsonValue)
                : undefined,
            result: data.result
                ? (data.result as Prisma.InputJsonValue)
                : undefined,
            error: data.error ?? undefined,
            errorType: data.errorType ?? undefined,
            userInput: data.userInput
                ? (data.userInput as Prisma.InputJsonValue)
                : undefined,
            durationMs: data.durationMs ?? undefined,
            completedAt: new Date(),
        },
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Session progress buffer
// ═══════════════════════════════════════════════════════════════════════════

export class SessionStateBuffer {
    private dirty = false;
    private variables: Record<string, unknown>;
    private currentIndex: number;
    private lastFlush: number = 0;
    private flushInterval: number;

    constructor(
        private db: PrismaClient,
        private sessionId: string,
        initialVars: Record<string, unknown>,
        initialIndex: number,
        flushEveryNNodes: number = 5
    ) {
        this.variables = { ...initialVars };
        this.currentIndex = initialIndex;
        this.flushInterval = flushEveryNNodes;
    }

    updateProgress(variables: Record<string, unknown>, currentIndex: number) {
        this.variables = variables;
        this.currentIndex = currentIndex;
        this.dirty = true;

        if (currentIndex - this.lastFlush >= this.flushInterval) {
            return this.flush();
        }
        return Promise.resolve();
    }

    async flush() {
        if (!this.dirty) return;

        await this.db.calcSession.update({
            where: { id: this.sessionId },
            data: {
                variables: this.variables as Prisma.InputJsonValue,
                currentIndex: this.currentIndex,
            },
        });

        this.lastFlush = this.currentIndex;
        this.dirty = false;
    }

    getVariables() {
        return this.variables;
    }
}