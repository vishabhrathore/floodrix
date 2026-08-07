import prisma from "../../src/lib/db";
import { CalcContext } from "../../src/server/engine/calc-context";
import { createRunOrchestrator, RunStrategy } from "../../src/server/engine/bootstrap";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz2";
  
  // 1. Fetch workflow to get organizationId
  const wf = await prisma.calcWorkflow.findUnique({
    where: { id: workflowId }
  });
  if (!wf) {
    console.error("Workflow not found!");
    return;
  }

  // 2. Fetch the last completed session to extract its inputs
  const lastSession = await prisma.calcSession.findFirst({
    where: { calcWorkflowId: workflowId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" }
  });

  let initialValues: Record<string, any> = {};
  if (lastSession) {
    console.log(`Found last completed session: ${lastSession.id}. Extracting variables...`);
    initialValues = lastSession.variables as Record<string, any>;
  } else {
    console.log("No completed sessions found. Fetching any session...");
    const anySession = await prisma.calcSession.findFirst({
      where: { calcWorkflowId: workflowId },
      orderBy: { createdAt: "desc" }
    });
    if (anySession) {
      initialValues = anySession.variables as Record<string, any>;
    }
  }

  // Find a valid CalcActor to act as the actor
  const actor = await prisma.calcActor.findFirst();
  const actorId = actor?.id ?? lastSession?.actorId ?? "test-actor-id";

  // 3. Create CalcContext
  const ctx = new CalcContext(prisma, actorId, wf.organizationId);

  // 4. Create RunOrchestrator
  const orchestrator = createRunOrchestrator(ctx);

  console.log(`Starting inline execution of Betwa River workflow with actorId: ${actorId}...`);
  const result = await orchestrator.start({
    calcWorkflowId: workflowId,
    actorId,
    initialValues,
    forceStrategy: RunStrategy.INLINE_SYNC
  });

  console.log(`Execution completed with status: ${result.status}`);
  console.log(`Session ID: ${result.sessionId}`);

  // Fetch full details of node executions for the session
  const execs = await prisma.calcNodeExecution.findMany({
    where: { sessionId: result.sessionId },
    orderBy: { stepNumber: "asc" }
  });

  console.log("\nNode Executions Summary:");
  for (const ex of execs) {
    const node = await prisma.calcNode.findUnique({ where: { id: ex.calcNodeId } });
    console.log(`- Step ${ex.stepNumber}: ${ex.calcNodeId} "${node?.label}" (${ex.status})`);
    
    // If it's a CHART node, print its outcome/markdown details!
    if (node?.type === "CHART") {
      const res = ex.result as any;
      console.log(`  Title: ${res?.title}`);
      console.log(`  Chart Type: ${res?.chartType}`);
      console.log(`  Output Var: ${res?.outputVar}`);
      console.log(`  SVG length: ${res?.svgChart?.length ?? 0}`);
      console.log(`  Markdown preview:\n${res?.markdown}\n`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
