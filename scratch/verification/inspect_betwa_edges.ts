import prisma from "../../src/lib/db";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz2";
  const workflow = await prisma.calcWorkflow.findUnique({
    where: { id: workflowId },
    include: {
      nodes: { where: { deletedAt: null } },
      edges: { where: { deletedAt: null } }
    }
  });

  if (!workflow) {
    console.log("Workflow not found");
    return;
  }

  console.log(`Workflow: ${workflow.name}`);
  console.log(`\nNodes:`);
  for (const n of workflow.nodes) {
    console.log(`- ${n.id} (${n.type}): "${n.label}"`);
  }

  console.log(`\nEdges:`);
  for (const e of workflow.edges) {
    console.log(`- ${e.sourceNodeId} (${e.sourceHandle || "default"}) --> ${e.targetNodeId} (${e.targetHandle || "default"})`);
  }
}

main().finally(() => prisma.$disconnect());
