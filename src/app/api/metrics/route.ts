import { NextResponse } from "next/server";
import prisma from "../../../lib/db";
import { calcQueue, workflowQueue, batchQueue } from "../../../lib/bullmq";
import { getWorkflowPiscinaPool } from "../../../workers/piscinaWorkerPool";

export async function GET() {
  try {
    // 1. PostgreSQL Outbox Metrics
    const outboxCounts = await prisma.outboxJob.groupBy({
      by: ["status"],
      _count: true,
    });
    
    const outbox: Record<string, number> = { PENDING: 0, PROCESSING: 0, FAILED: 0 };
    for (const item of outboxCounts) {
      outbox[item.status] = item._count;
    }

    // Relayer lag calculation (time since oldest pending job was created)
    const oldestPending = await prisma.outboxJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const relayerLagMs = oldestPending ? Date.now() - oldestPending.createdAt.getTime() : 0;

    // DLQ count
    const dlqCount = await prisma.deadLetterJob.count();

    // 2. BullMQ Metrics
    const queues = [
      { name: "workflow-execution", queue: workflowQueue },
      { name: "calc-execution", queue: calcQueue },
      { name: "batch-process", queue: batchQueue },
    ];

    const queueMetrics = await Promise.all(
      queues.map(async ({ name, queue }) => {
        if (!queue) return { name, error: "Queue not initialized" };
        const [active, waiting, completed, failed, delayed] = await Promise.all([
          queue.getActiveCount(),
          queue.getWaitingCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
        ]);
        return {
          name,
          active,
          waiting,
          completed,
          failed,
          delayed,
          depth: active + waiting,
        };
      })
    );

    // 3. Piscina Thread Pool Metrics
    let piscinaMetrics = {};
    try {
      const pool = getWorkflowPiscinaPool();
      piscinaMetrics = {
        completed: pool.completed,
        queueSize: pool.queueSize,
      };
    } catch (err: any) {
      piscinaMetrics = { error: `Piscina pool not active: ${err.message}` };
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        outbox: {
          ...outbox,
          lagMs: relayerLagMs,
        },
        dlq: {
          count: dlqCount,
        },
        bullmq: queueMetrics,
        piscina: piscinaMetrics,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
