import { NodeType, ExecutionStatus, Prisma } from "@/generated/prisma";
import prisma from "@/lib/db";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { topologicalSort } from "@/lib/workflow-utils";
import { CalcContext, createWorkflowExecutor } from "@/server/engine";
import { auditService } from "@/features/workflow-canvas/engine/audit-service";
import { createRegistryResolver } from "@/features/workflow-canvas/engine/registry-resolver";
import { logger } from "@/server/engine/logger";

export interface WorkflowTask {
  type: "workflow";
  workflowId: string;
  executionId: string;
  initialData: any;
}

export interface BatchTask {
  type: "batch";
  batchJobId: string;
}

export interface CalcTask {
  type: "calc";
  sessionId: string;
  reason?: string;
}

type PiscinaTask = WorkflowTask | BatchTask | CalcTask;

export default async function handler(task: PiscinaTask) {
  logger.info({ taskType: task.type }, `[PiscinaWorker] Thread starting task`);
  if (task.type === "workflow") {
    return await runWorkflow(task);
  } else if (task.type === "batch") {
    return await runBatch(task);
  } else if (task.type === "calc") {
    return await runCalc(task);
  } else {
    throw new Error(`Unknown task type: ${(task as any).type}`);
  }
}

async function runWorkflow(task: WorkflowTask) {
  const { workflowId, executionId, initialData } = task;

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

  // 1. Load checkpoints
  const checkpoints = await prisma.executionNodeResult.findMany({
    where: { executionId },
  });
  const completedNodeMap = new Map<string, any>();
  for (const cp of checkpoints) {
    completedNodeMap.set(cp.nodeId, cp.result);
  }

  let context = initialData || {};

  // 2. Execute
  for (const node of sortedNodes) {
    if (completedNodeMap.has(node.id)) {
      logger.info(
        { nodeId: node.id, nodeName: node.name },
        `[PiscinaWorkflow] ⏭️ Skipping completed node — loading checkpoint result`
      );
      context = completedNodeMap.get(node.id);
      continue;
    }

    const executor = getExecutor(node.type as NodeType);
    context = await executor({
      data: node.data as Record<string, unknown>,
      nodeId: node.id,
      userId,
      context,
      step: {
        run: async <T>(id: string, fn: () => Promise<T>) => await fn(),
      } as any,
      publish: async () => {},
    });

    // 3. Save checkpoint
    await prisma.executionNodeResult.upsert({
      where: {
        executionId_nodeId: {
          executionId,
          nodeId: node.id,
        },
      },
      create: {
        executionId,
        nodeId: node.id,
        result: context as any,
      },
      update: {
        result: context as any,
      },
    });
    logger.info(
      { nodeId: node.id, nodeName: node.name },
      `[PiscinaWorkflow] 💾 Checkpointed node`
    );
  }

  return { workflowId, result: context };
}

async function runBatch(task: BatchTask) {
  const { batchJobId } = task;
  logger.info({ batchJobId }, `[PiscinaBatch] Batch job task running`);

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
    throw new Error(`Batch job ${batchJobId} has invalid status: ${jobData.status}`);
  }

  const { calcWorkflow } = jobData;

  // Check for existing batch checkpoint
  const checkpoint = await prisma.batchCheckpoint.findUnique({
    where: { batchJobId },
  });

  const CHUNK_SIZE = 50;
  let processedCount = checkpoint ? checkpoint.lastProcessedRow : 0;
  let currentChunk = checkpoint ? checkpoint.chunkNumber : 0;
  let errorCount = jobData.errorRows || 0;

  logger.info(
    { processedCount, currentChunk },
    `[PiscinaBatch] Resuming batch job`
  );

  // Start/resume batch job
  await prisma.batchJob.update({
    where: { id: batchJobId },
    data: { status: "PROCESSING", startedAt: jobData.startedAt || new Date() },
  });

  const resolver = createRegistryResolver();
  await resolver.prefetchForWorkflow(prisma, calcWorkflow.id);

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

    processedCount += rows.length;
    currentChunk += 1;
    const chunkErrors = results.filter((r) => r.status === "ERROR").length;
    errorCount += chunkErrors;

    // Update Rows, Checkpoint, and Progress atomically in one transaction
    await prisma.$transaction([
      ...results.map((res) =>
        prisma.batchRowExecution.update({
          where: { id: res.rowId },
          data: {
            status: res.status === "COMPLETED" ? "SUCCESS" : "ERROR",
            outputData: res.output ? (res.output as Prisma.InputJsonValue) : Prisma.JsonNull,
            error: res.error ?? null,
            updatedAt: new Date(),
          },
        }),
      ),
      prisma.batchCheckpoint.upsert({
        where: { batchJobId },
        create: {
          batchJobId,
          chunkNumber: currentChunk,
          lastProcessedRow: processedCount,
        },
        update: {
          chunkNumber: currentChunk,
          lastProcessedRow: processedCount,
        },
      }),
      prisma.batchJob.update({
        where: { id: batchJobId },
        data: {
          processedRows: processedCount,
          successRows: processedCount - errorCount,
          errorRows: errorCount,
        },
      }),
    ]);
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

  // Clean up checkpoint on success/failure complete
  await prisma.batchCheckpoint.delete({
    where: { batchJobId },
  }).catch(() => {});

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
}

async function runCalc(task: CalcTask) {
  const { sessionId } = task;

  const session = await prisma.calcSession.findUnique({
    where: { id: sessionId },
    select: {
      status: true,
      pauseReason: true,
      calcWorkflowId: true,
      actorId: true,
    },
  });

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const wf = await prisma.calcWorkflow.findUniqueOrThrow({
    where: { id: session.calcWorkflowId },
    select: { organizationId: true },
  });

  const calcCtx = new CalcContext(
    prisma,
    session.actorId,
    wf.organizationId,
  );
  const executor = createWorkflowExecutor(calcCtx, {
    liveUpdates: false,
  });

  const result = await executor.continueExecution(sessionId, {
    isBackgroundRun: true,
    liveUpdates: false,
  });

  return {
    status: result.status,
    pauseReason: result.pauseReason,
  };
}
