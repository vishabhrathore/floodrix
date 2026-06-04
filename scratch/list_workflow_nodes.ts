import prisma from "../src/lib/db";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz1";
  const nodes = await prisma.calcNode.findMany({
    where: { calcWorkflowId: workflowId }
  });

  console.log(`Nodes in workflow ${workflowId}:`);
  for (const node of nodes) {
    console.log(`- Node ${node.id} (${node.label}, type: ${node.type}):`);
    console.log("  Config:", JSON.stringify(node.config, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
