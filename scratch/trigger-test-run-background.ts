import prisma from "../src/lib/db";
import { CalcContext } from "../src/server/engine/calc-context";
import { createRunOrchestrator } from "../src/server/engine/bootstrap";
import { RunStrategy } from "../src/server/engine/types";

// Start background workers
console.log("=== STARTING BACKGROUND WORKERS ===");
require("../src/workers/outboxRelayer");
require("../src/workers/calcWorker");

async function main() {
  const actorId = "actor_superadmin";
  const orgId = "org_admin_personal";
  const wfId = "cmpqr1gg0000vni3bt66kzp2w"; // Inglis Formula

  const calcCtx = new CalcContext(prisma, actorId, orgId);
  const orchestrator = createRunOrchestrator(calcCtx, { liveUpdates: false });

  console.log("\n=== STARTING NEW WORKFLOW SESSION (BACKGROUND STRATEGY) ===");
  const startResult = await orchestrator.start({
    calcWorkflowId: wfId,
    actorId,
    initialValues: {},
    forceStrategy: RunStrategy.BACKGROUND,
  });

  console.log(`New Session ID: ${startResult.sessionId}`);
  console.log(`Initial Status: ${startResult.status}`);
  console.log(`Async Pending Poll URL: ${startResult.asyncPending?.pollUrl}`);

  console.log("\nWaiting for outbox relayer and calc worker to process the job...");
  
  // Poll session status for up to 10 seconds
  for (let i = 0; i < 10; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const session = await prisma.calcSession.findUnique({
      where: { id: startResult.sessionId },
      include: {
        nodeExecutions: true,
      },
    });

    console.log(`[t=${i + 1}s] Session Status: ${session?.status}`);
    if (session?.status === "COMPLETED" || session?.status === "ERRORED") {
      console.log("\nFinal Session in DB:", JSON.stringify(session, null, 2));
      break;
    }
  }

  // Graceful shutdown of workers
  const { stopOutboxRelayer } = require("../src/workers/outboxRelayer");
  const { calcWorker } = require("../src/workers/calcWorker");
  
  stopOutboxRelayer();
  if (calcWorker) {
    await calcWorker.close();
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
