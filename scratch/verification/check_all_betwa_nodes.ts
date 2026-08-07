import prisma from "../../src/lib/db";

async function main() {
  const workflows = await prisma.calcWorkflow.findMany({
    where: {
      OR: [
        { name: { contains: "Betwa" } },
        { name: { contains: "SUH" } }
      ],
      deletedAt: null
    },
    include: {
      nodes: {
        where: { deletedAt: null }
      }
    }
  });

  for (const wf of workflows) {
    console.log(`=========================================`);
    console.log(`Workflow: ${wf.name} (ID: ${wf.id})`);
    
    // Check nodes
    for (const node of wf.nodes) {
      const config = node.config as any;
      if (node.type === "CUSTOM_CODE") {
        const hasSvg = config?.code?.includes("svg") || config?.code?.includes("Svg");
        console.log(`- Node ${node.id} "${node.label}": CUSTOM_CODE, has SVG in code: ${hasSvg}`);
      }
    }
  }
}

main().finally(() => prisma.$disconnect());
