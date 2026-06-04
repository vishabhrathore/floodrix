import prisma from "../src/lib/db";

async function main() {
  const workflows = await prisma.calcWorkflow.findMany({
    where: { deletedAt: null }
  });
  console.log(`Workflows: ${workflows.length}`);
  for (const w of workflows) {
    console.log(`- Name: "${w.name}", ID: "${w.id}"`);
  }
}

main().finally(() => prisma.$disconnect());
