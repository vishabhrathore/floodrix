import { type Job, Worker } from "bullmq";

import { auditService } from "@/features/workflow-canvas/engine/audit-service";
import { createRegistryResolver } from "@/features/workflow-canvas/engine/registry-resolver";
import { Prisma } from "@/generated/prisma";
import { redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { CalcContext, createWorkflowExecutor } from "@/server/engine";

if (redisConnection) {
  new Worker(
    "batch-process",
    async (job: Job) => {
      const { batchJobId } = job.data;
      console.log(`[batchWorker] 📦 Batch job started: batchJobId="${batchJobId}"`);

      const jobData = await prisma.batchJob.findUnique({
        where: { id: batchJobId },
        include: {
          calcWorkflow: {
            select: { id: true, organizationId: true },
          },
        },
      });

      if (!jobData) throw new Error(`Batch job ${batchJobId} not found`);
      if (jobData.status !== "PENDING" && jobData.status !== "PROCESSING") {
        throw new Error(
          `Batch job ${batchJobId} has invalid status: ${jobData.status}`,
        );
      }

      const { calcWorkflow } = jobData;

      // Start Job
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: { status: "PROCESSING", startedAt: new Date() },
      });

      await auditService.log(prisma, {
        organizationId: calcWorkflow.organizationId,
        actorId: jobData.actorId,
        resourceType: "WORKFLOW",
        resourceId: calcWorkflow.id,
        calcWorkflowId: calcWorkflow.id,
        action: "WORKFLOW_RUN_STARTED",
        changes: { batchJobId } as Prisma.InputJsonValue,
      });

      const resolver = createRegistryResolver();
      await resolver.prefetchForWorkflow(prisma, calcWorkflow.id);

      const CHUNK_SIZE = 50;
      let processedCount = 0;
      let errorCount = 0;

      while (true) {
        const rows = await prisma.batchRowExecution.findMany({
          where: { batchJobId },
          orderBy: { rowNumber: "asc" },
          take: CHUNK_SIZE,
          skip: processedCount,
        });

        if (rows.length === 0) break;

        const calcCtx = new CalcContext(
          prisma,
          jobData.actorId,
          calcWorkflow.organizationId,
        );
        const executor = createWorkflowExecutor(calcCtx);
        const results: {
          rowId: string;
          status: "COMPLETED" | "ERROR";
          output?: Record<string, unknown>;
          error?: string;
        }[] = [];

        for (const row of rows) {
          try {
            const result = await executor.startExecution(
              calcWorkflow.id,
              jobData.actorId,
              row.inputData as any,
            );
            results.push({
              rowId: row.id,
              status: "COMPLETED",
              output: result.variables,
            });
          } catch (err) {
            results.push({
              rowId: row.id,
              status: "ERROR",
              error: (err as Error).message || "Unknown error",
            });
          }
        }

        // Update Rows
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
            }),
          ),
        );

        processedCount += rows.length;
        errorCount += results.filter((r) => r.status === "ERROR").length;

        // Report Progress
        await prisma.batchJob.update({
          where: { id: batchJobId },
          data: {
            processedRows: processedCount,
            successRows: processedCount - errorCount,
            errorRows: errorCount,
          },
        });
      }

      // Finalize Job
      const status = errorCount === processedCount ? "FAILED" : "COMPLETED";
      await prisma.batchJob.update({
        where: { id: batchJobId },
        data: {
          status,
          completedAt: new Date(),
          processedRows: processedCount,
          successRows: processedCount - errorCount,
          errorRows: errorCount,
        },
      });

      await auditService.log(prisma, {
        organizationId: calcWorkflow.organizationId,
        actorId: jobData.actorId,
        resourceType: "WORKFLOW",
        resourceId: calcWorkflow.id,
        calcWorkflowId: calcWorkflow.id,
        action: "WORKFLOW_RUN_COMPLETED",
        changes: {
          batchJobId,
          processedTotal: processedCount,
          errors: errorCount,
          finalStatus: status,
        } as Prisma.InputJsonValue,
      });

      return { batchJobId, processedCount, errorCount };
    },
    { connection: redisConnection },
  );

  console.log("🚀 Batch Worker started");
}
