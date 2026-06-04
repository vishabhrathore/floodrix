import prisma from "../src/lib/db";

async function main() {
  const wf = await prisma.calcWorkflow.findUnique({
    where: { id: "wf_dicken" },
    include: {
      nodes: true,
      edges: true,
    },
  });

  console.log("Nodes:");
  console.log(JSON.stringify(wf?.nodes, null, 2));
  console.log("Edges:");
  console.log(JSON.stringify(wf?.edges, null, 2));
}

main().finally(() => prisma.$disconnect());
