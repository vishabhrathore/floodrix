import { WorkerPoolTimeout } from "@/server/engine/WorkerPoolTimeout";
async function main() {
  console.log("Starting...");
  const pool = new WorkerPoolTimeout();
  try {
    const res = await pool.runMathEvaluation("1 + 1", {}, { timeoutMs: 5000 });
    console.log("Result:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
main().finally(() => process.exit(0));
