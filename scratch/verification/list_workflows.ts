import prisma from "../../src/lib/db";

async function main() {
  const workflows = await prisma.calcWorkflow.findMany({
    where: { deletedAt: null }
  });

  console.log("Workflows in Database:");
  for (const wf of workflows) {
    console.log(`- ID: ${wf.id}, Name: ${wf.name}, Status: ${wf.status}`);
  }
}

main().finally(() => prisma.$disconnect());
