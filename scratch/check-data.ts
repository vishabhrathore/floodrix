import { PrismaClient } from "./src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany({
    select: { id: true, name: true, organizationId: true },
  });
  console.log("Workspaces:", JSON.stringify(workspaces, null, 2));

  const workflows = await prisma.calcWorkflow.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, organizationId: true, status: true },
  });
  console.log("Workflows:", JSON.stringify(workflows, null, 2));
}

main().finally(() => prisma.$disconnect());
