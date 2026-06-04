import prisma from "../src/lib/db";

async function main() {
  const formulaId = "cmptak0sn000ged3baxoc6ya6";
  const item = await prisma.formulaRegistryItem.findUnique({
    where: { id: formulaId }
  });
  console.log("FormulaRegistryItem DB Record:");
  console.log(JSON.stringify(item, null, 2));

  // Find the canvas node config from the active session's workflow
  const sessionId = "cmpzlkdk90012nk3bhy8lte0a";
  const session = await prisma.calcSession.findUnique({
    where: { id: sessionId },
    include: {
      calcWorkflow: {
        include: {
          nodes: true
        }
      }
    }
  });

  if (session && session.calcWorkflow) {
    const node = session.calcWorkflow.nodes.find(n => n.id === "j4puj9jig4mx62h9ucp97wox");
    console.log("\nCanvas Node DB Record:");
    console.log(JSON.stringify(node, null, 2));
  } else {
    console.log("\nSession or workflow not found for sessionId:", sessionId);
  }
}

main().finally(() => prisma.$disconnect());
