import prisma from "../src/lib/db";

async function main() {
  const sessionId = "cmpzna2c9000l2y3b90zkgz0u";
  const session = await prisma.calcSession.findUnique({
    where: { id: sessionId },
    include: {
      nodeExecutions: {
        orderBy: { stepNumber: "asc" }
      },
      calcWorkflow: {
        include: {
          nodes: {
            where: { deletedAt: null }
          }
        }
      }
    }
  });

  if (!session) {
    console.log("Session not found:", sessionId);
    return;
  }

  console.log(`Session ${sessionId} (status: ${session.status}):`);
  for (const exec of session.nodeExecutions) {
    const node = session.calcWorkflow.nodes.find(n => n.id === exec.calcNodeId);
    console.log(`\n- Step ${exec.stepNumber}: Node ${exec.calcNodeId} "${node?.label}" (status: ${exec.status})`);
    console.log("  Node Config:", JSON.stringify(node?.config, null, 2));
    console.log("  Execution Result:", JSON.stringify(exec.result, null, 2));
    console.log("  Duration:", exec.durationMs, "ms");
  }
}

main().finally(() => prisma.$disconnect());
