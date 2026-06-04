import { WorkerPoolTimeout } from "../src/server/engine/WorkerPoolTimeout";

async function runTest(label: string, runLocally: boolean) {
  const pool = new WorkerPoolTimeout();
  console.log(`[${label}] Starting evaluation...`);
  try {
    const res = await pool.runMathEvaluation(
      "D = sum(random([A, A]))",
      { A: 50 },
      { timeoutMs: 5000, handlerType: "test" },
      runLocally
    );
    console.log(`[${label}] Success! Result:`, res);
  } catch (err) {
    console.error(`[${label}] Error:`, err);
  }
}

async function main() {
  // Test worker-based execution
  await runTest("Worker Execution", false);
  
  // Test local execution
  await runTest("Local Execution", true);
}

main();
