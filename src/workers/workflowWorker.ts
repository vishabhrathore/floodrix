import { type Job, Worker } from "bullmq";

import { getExecutor } from "@/features/executions/lib/executor-registry";
import { ExecutionStatus, NodeType } from "@/generated/prisma";
import { redisConnection } from "@/lib/bullmq";
import prisma from "@/lib/db";
import { topologicalSort } from "@/lib/workflow-utils";

// Re-using the logic from Inngest functions
// Note: Inngest "steps" are handled differently in BullMQ.
// For a direct migration, we can just run them sequentially.

if (redisConnection) {
  new Worker(
    "workflow-execution",
    async (job: Job) => {
      const { workflowId, initialData } = job.data;
      const jobId = job.id;

      if (!workflowId) {
        throw new Error("Workflow ID is missing");
      }

      // 1. Create Execution
      const execution = await prisma.execution.create({
        data: {
          workflowId,
          inngestEventId: jobId || "bullmq-" + Date.now(),
        },
      });

      try {
        // 2. Prepare Workflow
        const workflow = await prisma.workflow.findUniqueOrThrow({
          where: { id: workflowId },
          include: {
            nodes: true,
            connections: true,
          },
        });

        const sortedNodes = topologicalSort(
          workflow.nodes,
          workflow.connections,
        );
        const userId = workflow.userId;

        // 3. Execute
        let context = initialData || {};

        for (const node of sortedNodes) {
          const executor = getExecutor(node.type as NodeType);
          // Note: The executor might need adjustments if it relied on Inngest's `step` or `publish`
          // For now, we pass dummy versions or adapt them.
          context = await executor({
            data: node.data as Record<string, unknown>,
            nodeId: node.id,
            userId,
            context,
            step: {
              run: async <T>(id: string, fn: () => Promise<T>) => await fn(),
            } as any,
            publish: async () => {}, // Mock publish for now
          });
        }

        // 4. Update Execution Success
        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.SUCCESS,
            completedAt: new Date(),
            output: context,
          },
        });

        return { workflowId, result: context };
      } catch (error: any) {
        // Handle Failure
        await prisma.execution.update({
          where: { id: execution.id },
          data: {
            status: ExecutionStatus.FAILED,
            error: error.message,
            errorStack: error.stack,
          },
        });
        throw error;
      }
    },
    { connection: redisConnection },
  );

  console.log("🚀 Workflow Worker started");
}
