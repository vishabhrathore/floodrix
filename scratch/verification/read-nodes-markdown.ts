import prisma from "../src/lib/db";

async function main() {
  const wfId = "cmprtvv6l00075n3bzb7i7vz2";
  const nodes = await prisma.calcNode.findMany({
    where: { calcWorkflowId: wfId },
    orderBy: { sortOrder: "asc" }
  });

  for (const node of nodes) {
    const config = node.config as any;
    console.log(`=========================================`);
    console.log(`Node ID: ${node.id}`);
    console.log(`Label: ${node.label}`);
    console.log(`Type: ${node.type}`);
    if (config?.markdownTemplate) {
      console.log(`Markdown Template:\n${config.markdownTemplate}`);
    } else {
      console.log(`No Markdown Template defined.`);
    }
  }
}

main().finally(() => prisma.$disconnect());
