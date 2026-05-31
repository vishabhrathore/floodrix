import prisma from "../src/lib/db";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz1";
  const sessions = await prisma.calcSession.findMany({
    where: { calcWorkflowId: workflowId },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
  console.log("Sessions:", JSON.stringify(sessions, null, 2));
}

main().finally(() => prisma.$disconnect());
