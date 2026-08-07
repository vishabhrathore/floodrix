import prisma from "../src/lib/db";

async function main() {
  const session = await prisma.calcSession.findFirst({
    orderBy: { createdAt: "desc" },
    include: { nodeExecutions: true }
  });

  if (!session) {
    console.log("No sessions found");
    return;
  }

  console.log("Session ID:", session.id);
  console.log("Status:", session.status);
  console.log("Variables:", JSON.stringify(session.variables, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
