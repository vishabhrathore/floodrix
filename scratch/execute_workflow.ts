import * as dotenv from "dotenv";
dotenv.config();

import prisma from "../src/lib/db";
import { CalcContext, createRunOrchestrator } from "../src/server/engine";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz2";
  const actorId = "actor_superadmin";
  const orgId = "org_admin_personal";

  const calcCtx = new CalcContext(prisma, actorId, orgId);
  const orchestrator = createRunOrchestrator(calcCtx, { liveUpdates: false });

  console.log("Starting execution...");

  const initialValues = {
    catchment_area: 875.41,
    stream_length: 79.367,
    centroid_length: 76.044,
    loss_rate: 0.23,
    base_flow: 0.018,
    tr: 1,
    sub_zone: "3a",
    stream_profile: [
      { chainage: 0, rl: 497 },
      { chainage: 4.367, rl: 492 },
      { chainage: 11.867, rl: 468 },
      { chainage: 19.367, rl: 439 },
      { chainage: 26.867, rl: 425 },
      { chainage: 34.367, rl: 404 },
      { chainage: 41.867, rl: 391 },
      { chainage: 49.367, rl: 375 },
      { chainage: 56.867, rl: 365 },
      { chainage: 64.367, rl: 360 },
      { chainage: 71.867, rl: 355 },
      { chainage: 79.367, rl: 348 }
    ],
    isohyet_bands: [
      { area_sqkm: 178.60653743, iso_min_mm: 380, iso_max_mm: 390 },
      { area_sqkm: 687.136908761, iso_min_mm: 390, iso_max_mm: 400 },
      { area_sqkm: 9.66239761711, iso_min_mm: 400, iso_max_mm: 410 }
    ],
    storm_duration_hr: 72,
    clock_hour_corr: 1.15,
    mmf: 1.12,
    bell_pct_1st: 73
  };

  const runResult = await orchestrator.start({
    calcWorkflowId: workflowId,
    actorId,
    initialValues,
    stepMode: false,
    batchSize: 1
  });

  console.log("Run initiated! Session ID:", runResult.sessionId);
  console.log("Waiting for completion...");

  // Poll database until status is COMPLETED or FAILED
  let session = await prisma.calcSession.findUnique({
    where: { id: runResult.sessionId },
    include: { nodeExecutions: true }
  });

  const startTime = Date.now();
  while (session && (session.status === "RUNNING" || session.status === "PENDING" || session.status === "PAUSED")) {
    if (Date.now() - startTime > 30000) {
      console.log("Timeout waiting for execution to finish.");
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    session = await prisma.calcSession.findUnique({
      where: { id: runResult.sessionId },
      include: { nodeExecutions: true }
    });
  }

  console.log("Status:", session?.status);
  if (session?.error) {
    console.error("Error:", session.error);
  }

  // Print all node executions and their output variables
  if (session) {
    console.log("\n=== NODE EXECUTIONS ===");
    for (const execution of session.nodeExecutions) {
      console.log(`- Node ${execution.calcNodeId} (${execution.status}):`);
      console.log("  Output variables:", JSON.stringify(execution.outputVars, null, 2));
      if (execution.error) {
        console.log("  Error:", execution.error);
      }
    }

    console.log("\n=== GLOBAL SESSION VARIABLES ===");
    console.log(JSON.stringify(session.variables, null, 2));
  }
}

main()
  .catch((err) => {
    console.error("Uncaught error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
