import prisma from "../../src/lib/db";

async function main() {
  const nodeIds = ["node_cc_uh", "node_cc_pmf"];
  const nodes = await prisma.calcNode.findMany({
    where: { id: { in: nodeIds } }
  });

  for (const node of nodes) {
    console.log(`=========================================`);
    console.log(`Node: ${node.id} (${node.label})`);
    const config = node.config as any;
    console.log(`Code:\n${config?.code}`);
    console.log(`\nMarkdown Template:\n${config?.markdownTemplate}`);
  }
}

main().finally(() => prisma.$disconnect());
