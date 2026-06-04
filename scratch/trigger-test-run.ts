import prisma from "../src/lib/db";
import { CalcContext } from "../src/server/engine/calc-context";
import { createRunOrchestrator } from "../src/server/engine/bootstrap";

async function main() {
  const wfId = "wf_dicken";
  const wf = await prisma.calcWorkflow.findUnique({
    where: { id: wfId },
    include: {
      nodes: true,
    },
  });

  if (!wf) {
    console.log(`Workflow with ID ${wfId} not found!`);
    return;
  }

  console.log(`\nUsing workflow: "${wf.name}" (ID: ${wf.id})`);
  console.log("Nodes:");
  for (const node of wf.nodes) {
    console.log(`- ${node.label} (${node.type})`);
  }

  const actorId = "actor_superadmin";
  const orgId = wf.organizationId;
  const calcCtx = new CalcContext(prisma, actorId, orgId);
  const orchestrator = createRunOrchestrator(calcCtx, { liveUpdates: false });

  console.log("\nStarting run...");
  const result = await orchestrator.start({
    calcWorkflowId: wf.id,
    actorId,
    initialValues: {
      M: 250, // Catchment area in km2
      C: 11.5, // Dicken's constant
    },
  });

  console.log("\nStart execution result:", JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
