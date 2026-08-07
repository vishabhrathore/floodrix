import { AppCache } from "../../src/lib/cache";

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz2";
  console.log(`Invalidating cache for workflow: ${workflowId}...`);
  await AppCache.invalidateWorkflow(workflowId);
  console.log("Invalidation complete.");
}

main().catch(console.error);
