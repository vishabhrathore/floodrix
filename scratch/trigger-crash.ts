import prisma from "../src/lib/db";
import { CalcContext } from "../src/server/engine/calc-context";
import { createWorkflowExecutor } from "../src/server/engine/bootstrap";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz1";
  
  // Create a fresh session
  console.log("Creating new session...");
  const session = await prisma.calcSession.create({
    data: {
      calcWorkflowId: workflowId,
      versionNum: 1,
      actorId: "actor_superadmin",
      status: "PAUSED",
      currentNodeId: "ivtpxq7p1n4sg1m6n10vqrdm",
      executionOrder: ["ivtpxq7p1n4sg1m6n10vqrdm", "smx7ewg1k7rbscvx54fmjpcq"],
      currentIndex: 0,
      variables: {},
    },
  });

  const sessionId = session.id;
  const orgId = "org_admin_personal";
  const calcCtx = new CalcContext(prisma, "actor_superadmin", orgId);
  const executor = createWorkflowExecutor(calcCtx, { liveUpdates: false });

  // Advancing step 1: submit input for first node
  console.log(`Resuming session ${sessionId} with field_1 = 50000...`);
  try {
    const outcome = await executor.resumeWithInput(
      sessionId,
      "ivtpxq7p1n4sg1m6n10vqrdm",
      { field_1: 50000 },
      { stepMode: false }
    );
    console.log("Outcome:", outcome);
  } catch (err: any) {
    console.error("Crash captured:", err);
  }
}

main().finally(() => prisma.$disconnect());
