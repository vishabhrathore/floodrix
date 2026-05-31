import { WorkerPoolTimeout } from "../src/server/engine/WorkerPoolTimeout";

async function main() {
  const pool = new WorkerPoolTimeout();
  console.log("Starting runMathEvaluation in Worker Thread...");
  try {
    const res = await pool.runMathEvaluation("D = sum(random([A,A]))", { A: 50000 });
    console.log("Success! Worker Thread result:", res);
  } catch (err) {
    console.error("Worker Thread crashed with error:", err);
  }
}

main();
