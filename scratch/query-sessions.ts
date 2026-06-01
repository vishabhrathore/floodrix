import prisma from "../src/lib/db";

async function main() {
  const sessions = await prisma.calcSession.findMany({
    include: {
      calcWorkflow: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  console.log("Sessions:", JSON.stringify(sessions.map(s => ({
    id: s.id,
    workflowName: s.calcWorkflow.name,
    workflowId: s.calcWorkflowId,
    status: s.status,
    currentNodeId: s.currentNodeId,
    currentIndex: s.currentIndex,
    duration: s.duration,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  })), null, 2));
}

main().finally(() => prisma.$disconnect());
