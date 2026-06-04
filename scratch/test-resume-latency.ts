import prisma from "../src/lib/db";
import { createWorkflowExecutor, CalcContext } from "../src/server/engine";
import { loadContext } from "../src/server/context/context.loader";
import { AppCache } from "../src/lib/cache";

async function main() {
  const sessionId = "cmpu5j63b0001o03bzvfo03pp";
  const currentNodeId = "ivtpxq7p1n4sg1m6n10vqrdm";
  const workflowId = "cmprtvv6l00075n3bzb7i7vz1";
  const formulaId = "cmptak0sn000ged3baxoc6ya6";

  // Reset session to PAUSED
  console.log("Resetting session to PAUSED...");
  await prisma.calcSession.update({
    where: { id: sessionId },
    data: {
      status: "PAUSED",
      currentNodeId: currentNodeId,
      currentIndex: 0,
    },
  });
  await AppCache.invalidateSession(sessionId);
  await AppCache.setSessionStatus(sessionId, "PAUSED");
  
  // Clear registry prefetch cache to reload with use_worker selected
  await AppCache.del(`wf:${workflowId}:registry-prefetch`);
  await AppCache.del(`f:${formulaId}`);
  await prisma.formulaRegistryItem.update({
    where: { id: formulaId },
    data: { useWorker: false },
  });

  const session = await prisma.calcSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: { actor: true },
  });

  const userId = session.actor.userId;
  console.log("Measuring resume latency for session:", sessionId, "User ID:", userId);
  
  const start = performance.now();

  const ctxStart = performance.now();
  const reqCtx = await loadContext(prisma, userId, { sessionId });
  console.log(`loadContext took: ${Math.round(performance.now() - ctxStart)}ms`);

  const calcCtx = new CalcContext(prisma, session.actorId, reqCtx.organization!.id);

  const executorStart = performance.now();
  const executor = createWorkflowExecutor(calcCtx, { liveUpdates: false });
  console.log(`createWorkflowExecutor took: ${Math.round(performance.now() - executorStart)}ms`);

  console.log("Calling resumeWithInput...");
  const resumeStart = performance.now();
  try {
    const res = await executor.resumeWithInput(
      sessionId,
      currentNodeId,
      { field_1: 100 }, // input
      { stepMode: false, liveUpdates: false }
    );
    console.log(`resumeWithInput took: ${Math.round(performance.now() - resumeStart)}ms`);
    console.log("Total time:", Math.round(performance.now() - start), "ms");
    console.log("Result status:", res.status);
  } catch (err) {
    console.error("Caught error:", err);
  }
}

main().finally(() => prisma.$disconnect());
