import prisma from "../src/lib/db";

async function main() {
  const s = await prisma.calcSession.findFirst({
    orderBy: { createdAt: "desc" }
  });
  console.log(JSON.stringify(s, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
