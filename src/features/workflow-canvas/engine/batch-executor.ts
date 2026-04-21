// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/engine/batch-executor.ts
// ═══════════════════════════════════════════════════════════════════════════

import prisma from "@/lib/db";
import { WorkflowExecutor } from "./workflow-executor";
import { createRegistryResolver } from "./registry-resolver";
import { auditService } from "./audit-service";
import { Prisma } from "@/generated/prisma";
import { inngest } from "@/inngest/client";
import { createWorkflowExecutor } from "@/server/engine";
const executor = createWorkflowExecutor(prisma);
export const processBatchJob = inngest.createFunction(
    { id: "batch-process", name: "Process Calculator Batch" },
    { event: "batch/process" },
    async ({ event, step }) => {
        const { batchJobId } = event.data;

        const job = await step.run("fetch-job", async () => {
            const jobData = await prisma.batchJob.findUnique({
                where: { id: batchJobId },
                include: {
                    calcWorkflow: {
                        include: {
                            nodes: { where: { deletedAt: null } },
                            edges: { where: { deletedAt: null } },
                        },
                    },
                },
            });
            if (!jobData) throw new Error(`Batch job ${batchJobId} not found`);
            if (jobData.status !== "PENDING" && jobData.status !== "PROCESSING") {
                throw new Error(`Batch job ${batchJobId} has invalid status: ${jobData.status}`);
            }
            return jobData;
        });

        const { calcWorkflow } = job;

        await step.run("start-job", async () => {
            await prisma.batchJob.update({
                where: { id: batchJobId },
                data: { status: "PROCESSING", startedAt: new Date() },
            });
            await auditService.log(prisma, {
                actorId: job.actorId,
                resourceType: "WORKFLOW",
                resourceId: calcWorkflow.id,
                calcWorkflowId: calcWorkflow.id,
                action: "WORKFLOW_RUN_STARTED",
                changes: { batchJobId } as Prisma.InputJsonValue,
            });
        });

        const resolver = createRegistryResolver();
        await step.run("prefetch-registry", async () => {
            await resolver.prefetchForWorkflow(prisma, calcWorkflow.id);
        });

        const CHUNK_SIZE = 50;
        let processedCount = 0;
        let errorCount = 0;

        while (true) {
            const rows = await step.run(`fetch-rows-${processedCount}`, async () => {
                return prisma.batchRowExecution.findMany({
                    where: { batchJobId },
                    orderBy: { rowNumber: "asc" },
                    take: CHUNK_SIZE,
                    skip: processedCount,
                });
            });

            if (rows.length === 0) break;

            const results = await step.run(`process-chunk-${processedCount}`, async () => {
                const executor = createWorkflowExecutor(prisma);
                const chunkResults: {
                    rowId: string;
                    status: "COMPLETED" | "ERROR";
                    output?: Record<string, unknown>;
                    error?: string;
                }[] = [];

                for (const row of rows) {
                    try {
                        const result = await executor.startExecution(
                            calcWorkflow.id,
                            job.actorId,
                            row.inputData as any
                        );
                        chunkResults.push({ rowId: row.id, status: "COMPLETED", output: result.variables });
                    } catch (err) {
                        chunkResults.push({
                            rowId: row.id, status: "ERROR",
                            error: (err as Error).message || "Unknown error",
                        });
                    }
                }
                return chunkResults;
            });

            await step.run(`update-rows-${processedCount}`, async () => {
                await prisma.$transaction(
                    results.map((res) =>
                        prisma.batchRowExecution.update({
                            where: { id: res.rowId },
                            data: {
                                status: res.status === "COMPLETED" ? "SUCCESS" : "ERROR",
                                outputData: res.output
                                    ? (res.output as Prisma.InputJsonValue)
                                    : Prisma.JsonNull,
                                error: res.error ?? null,
                                updatedAt: new Date(),
                            },
                        })
                    )
                );
            });

            processedCount += rows.length;
            errorCount += results.filter((r) => r.status === "ERROR").length;

            await step.run(`report-progress-${processedCount}`, async () => {
                await prisma.batchJob.update({
                    where: { id: batchJobId },
                    data: {
                        processedRows: processedCount,
                        successRows: processedCount - errorCount,
                        errorRows: errorCount,
                    },
                });
            });
        }

        await step.run("finalize-job", async () => {
            const status = errorCount === processedCount ? "FAILED" : "COMPLETED";
            await prisma.batchJob.update({
                where: { id: batchJobId },
                data: {
                    status, completedAt: new Date(),
                    processedRows: processedCount,
                    successRows: processedCount - errorCount,
                    errorRows: errorCount,
                },
            });
            await auditService.log(prisma, {
                actorId: job.actorId,
                resourceType: "WORKFLOW",
                resourceId: calcWorkflow.id,
                calcWorkflowId: calcWorkflow.id,
                action: "WORKFLOW_RUN_COMPLETED",
                changes: {
                    batchJobId, processedTotal: processedCount,
                    errors: errorCount, finalStatus: status,
                } as Prisma.InputJsonValue,
            });
        });

        return { batchJobId, processedCount, errorCount };
    }
);