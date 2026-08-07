import prisma from "../../src/lib/db";

async function main() {
  const nodes = await prisma.calcNode.findMany({
    where: { id: { in: ["node_cc_pmf", "node_cc_uh"] } }
  });

  for (const node of nodes) {
    console.log(`=========================================`);
    console.log(`Node ID: ${node.id}`);
    console.log(`Label: ${node.label}`);
    console.log(`Type: ${node.type}`);
    console.log(`Config:`, JSON.stringify(node.config, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
