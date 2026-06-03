import prisma from "../src/lib/db";
import { SessionRepository } from "../src/server/engine/SessionRepository";

async function main() {
  console.log("=== RUNNING STUCK SESSION RECOVERY ===");
  const repo = new SessionRepository(prisma);
  const recoveredCount = await repo.recoverStuckSessions(0); // 0ms threshold to recover ALL RUNNING sessions immediately
  console.log(`Recovered ${recoveredCount} stuck sessions successfully!`);
}

main().catch(console.error);
