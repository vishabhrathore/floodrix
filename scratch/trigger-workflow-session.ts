import prisma from "../src/lib/db";
import { CalcContext } from "../src/server/engine/calc-context";
import { createWorkflowExecutor } from "../src/server/engine/bootstrap";
import { redisConnection } from "../src/lib/bullmq";

async function main() {
  const sessionId = "cmptdoz5t0007qt3btzcudz7i"; // The stuck/paused session ID we found
  
  // Set session back to PAUSED in DB
  console.log("Healing session status in DB to PAUSED...");
  await prisma.calcSession.update({
    where: { id: sessionId },
    data: {
      status: "PAUSED",
      currentNodeId: "smx7ewg1k7rbscvx54fmjpcq",
      currentIndex: 1,
    },
  });

  // Clear Redis Cache
  if (redisConnection) {
    console.log("Invalidating Redis session cache...");
    await redisConnection.del(`sess:${sessionId}:loaded`);
    await redisConnection.del(`session:${sessionId}:status`);
  }

  const orgId = "org_admin_personal";
  const calcCtx = new CalcContext(prisma, "actor_superadmin", orgId);
  const executor = createWorkflowExecutor(calcCtx, { liveUpdates: false });
  
  console.log("Triggering executor.resumeWithInput...");
  try {
    const outcome = await executor.resumeWithInput(
      sessionId,
      "smx7ewg1k7rbscvx54fmjpcq",
      { field_1: 250 }, // Use 250 instead of 50000 to keep memory low and run successfully
      { stepMode: false }
    );
    console.log("Execution finished successfully! Outcome:", outcome);
  } catch (err: any) {
    console.error("Execution failed with error:", err);
  }
}

main().finally(() => {
  prisma.$disconnect();
  redisConnection?.disconnect();
});
