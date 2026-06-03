import prisma from "../src/lib/db";
import handler from "../src/workers/piscinaWorker";

async function main() {
  const sessionId = "cmpvk1ohu0001b93bophs8x16";

  console.log("=== RESETTING DATABASE SESSION ===");
  await prisma.$transaction([
    prisma.calcSession.update({
      where: { id: sessionId },
      data: {
        status: "PENDING",
        lockVersion: 1,
        currentNodeId: null,
        pauseReason: null,
        updatedAt: new Date(),
      },
    }),
    prisma.calcNodeExecution.updateMany({
      where: { sessionId },
      data: {
        status: "PENDING",
        error: null,
        completedAt: null,
      },
    }),
  ]);
  console.log("Database session reset successfully.");

  console.log("\n=== RUNNING PISCINA WORKER TASK ===");
  const result = await handler({
    type: "calc",
    sessionId,
    reason: "background_batch",
  });
  console.log("Piscina Worker returned:", JSON.stringify(result, null, 2));

  console.log("\n=== VERIFYING DATABASE STATE ===");
  const session = await prisma.calcSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    console.error("Session not found after run!");
    return;
  }

  console.log("Session ID:", session.id);
  console.log("Final Status:", session.status);
  console.log("Final Lock Version:", session.lockVersion);
  console.log("Final Current Node ID:", session.currentNodeId);
  console.log("Final Pause Reason:", session.pauseReason);

  const nodeExecs = await prisma.calcNodeExecution.findMany({
    where: { sessionId },
  });
  console.log("\nNode Executions:");
  for (const exec of nodeExecs) {
    console.log(`- Node: ${exec.calcNodeId} | Status: ${exec.status} | Step: ${exec.stepNumber}`);
  }
}

main().catch(console.error);
