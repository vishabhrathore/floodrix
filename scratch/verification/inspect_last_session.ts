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

  console.log(`Last Session: ${lastSession.id} (Workflow: ${lastSession.calcWorkflow.name}, status: ${lastSession.status}):`);
  for (const exec of lastSession.nodeExecutions) {
    const node = lastSession.calcWorkflow.nodes.find(n => n.id === exec.calcNodeId);
    console.log(`\n- Step ${exec.stepNumber}: Node ${exec.calcNodeId} "${node?.label}" (${node?.type})`);
    if (exec.result && typeof exec.result === "object") {
      const resultObj = exec.result as any;
      if (resultObj.markdown) {
        console.log(`  Markdown length: ${resultObj.markdown.length}`);
        if (resultObj.markdown.includes("<svg")) {
          console.log(`  Contains SVG! Snippet:`);
          const idx = resultObj.markdown.indexOf("<svg");
          console.log(resultObj.markdown.substring(idx, idx + 200));
        } else {
          console.log(`  Does NOT contain SVG.`);
        }
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
