import prisma from "../src/lib/db";

async function main() {
  const sessions = await prisma.calcSession.findMany({
    where: {
      status: "ERRORED",
    },
  });
  console.log(`Total errored sessions found: ${sessions.length}`);
  let found = false;
  for (const s of sessions) {
    const errStr = JSON.stringify(s.error);
    if (errStr && errStr.includes("zone_factor")) {
      console.log(`- Found session ${s.id} with zone_factor error:`, errStr);
      found = true;
    }
  }
  if (!found) {
    console.log("No sessions with zone_factor in the error message found in the database.");
  }
}

main().finally(() => prisma.$disconnect());
