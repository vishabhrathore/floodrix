import prisma from "../src/lib/db";
import { CalcContext } from "../src/server/engine/calc-context";
import { createRunOrchestrator, createWorkflowExecutor } from "../src/server/engine/bootstrap";

async function main() {
  const actorId = "actor_superadmin";
  const orgId = "org_admin_personal";
  const wfId = "wf_dicken";

  const calcCtx = new CalcContext(prisma, actorId, orgId);
  const orchestrator = createRunOrchestrator(calcCtx, { liveUpdates: false });
  const executor = createWorkflowExecutor(calcCtx, { liveUpdates: false });

  console.log("=== STARTING Dicken Workflow SESSION ===");
  const startResult = await orchestrator.start({
    calcWorkflowId: wfId,
    actorId,
    initialValues: {},
  });

  console.log(`New Session ID: ${startResult.sessionId}`);
  console.log(`Initial Status: ${startResult.status}`);

  if (startResult.status !== "PAUSED") {
    console.error("Expected session to pause on the INPUT node!");
    return;
  }

  console.log("\n=== RESUMING SESSION WITH USER INPUT ===");
  const resumeResult = await executor.resumeWithInput(
    startResult.sessionId,
    startResult.pausedNode!.nodeId,
    {
      catchment_area: 250,
      dicken_c: 11.5,
    },
    { stepMode: false }
  );

  console.log("\nFinal Resume Result:", JSON.stringify(resumeResult, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
