import prisma from "../../src/lib/db";

async function main() {
  const lastSession = await prisma.calcSession.findFirst({
    orderBy: { createdAt: "desc" },
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

  if (!lastSession) {
    console.log("No sessions found.");
    return;
  }

  const pmfExec = lastSession.nodeExecutions.find(exec => exec.calcNodeId === "node_cc_pmf");
  if (pmfExec) {
    console.log("PMF Node Execution Result:", JSON.stringify(pmfExec.result, null, 2));
  } else {
    console.log("node_cc_pmf execution not found.");
  }

  const uhExec = lastSession.nodeExecutions.find(exec => exec.calcNodeId === "node_cc_uh");
  if (uhExec) {
    console.log("UH Node Execution Result:", JSON.stringify(uhExec.result, null, 2));
  } else {
    console.log("node_cc_uh execution not found.");
  }
}

main().finally(() => prisma.$disconnect());
