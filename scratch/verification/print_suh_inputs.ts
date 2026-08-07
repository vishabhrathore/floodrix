import prisma from "../src/lib/db";

async function main() {
  const session = await prisma.calcSession.findFirst({
    orderBy: { createdAt: "desc" }
  });

  if (!session) {
    console.log("No session found");
    return;
  }

  const vars = session.variables as any;
  const suh_keys = ["qp", "Qp", "tp", "Tm", "TB", "W50", "W75", "WR50", "WR75", "uh_depth_cm"];
  console.log("=== SUH Variable Values in Session ===");
  for (const key of suh_keys) {
    console.log(`${key}:`, vars[key]);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
