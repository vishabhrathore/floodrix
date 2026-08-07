import prisma from "../../src/lib/db";

async function main() {
  const lastSession = await prisma.calcSession.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      nodeExecutions: {
        orderBy: { stepNumber: "asc" }
      }
    }
  });

  if (!lastSession) {
    console.log("No sessions found.");
    return;
  }

  console.log(`Last Session: ${lastSession.id} (Workflow: ${lastSession.calcWorkflowId}, status: ${lastSession.status})`);
  console.log("Node Executions:");
  for (const exec of lastSession.nodeExecutions) {
    const node = await prisma.calcNode.findUnique({ where: { id: exec.calcNodeId } });
    console.log(`- Step ${exec.stepNumber}: ${exec.calcNodeId} "${node?.label}" (${exec.status})`);
    if (node?.type === "CHART") {
      const res = exec.result as any;
      console.log(`  Title: ${res?.title}`);
      console.log(`  Chart Type: ${res?.chartType}`);
      console.log(`  Output Var: ${res?.outputVar}`);
      console.log(`  SVG length: ${res?.svgChart?.length ?? 0}`);
      console.log(`  Markdown preview:\n${res?.markdown?.substring(0, 500)}\n`);
    }
  }
}

main().finally(() => prisma.$disconnect());
