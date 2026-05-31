import prisma from "@/lib/db";
import { createWorkflowExecutor } from "@/server/engine";
import { loadContext } from "@/server/context/context.loader";

async function main() {
  const session = await prisma.calcSession.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: 'desc' }
  });
  
  if (!session) {
    console.log("No pending session found");
    return;
  }
  
  console.log(`Found pending session ${session.id}`);
  
  const ctx = await loadContext(prisma, session.actorId, { sessionId: session.id });
  const executor = createWorkflowExecutor(ctx, { liveUpdates: false });
  
  console.log("Calling resumeWithInput...");
  try {
    const res = await executor.resumeWithInput(
      session.id,
      session.currentNodeId || "missing",
      {},
      { stepMode: false, liveUpdates: false }
    );
    console.log("Result:", res);
  } catch (err) {
    console.error("Caught error:", err);
  }
  console.log("Done");
}

main().catch(console.error).finally(() => process.exit(0));
