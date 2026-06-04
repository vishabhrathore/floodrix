import { WorkerPoolTimeout } from "../src/server/engine/WorkerPoolTimeout";

async function main() {
  const pool = new WorkerPoolTimeout();
  console.log("Starting math evaluation of random([1000, 1000])...");
  try {
    const result = await pool.runMathEvaluation("result = random([1000, 1000])", {}, {
      timeoutMs: 30000,
      handlerType: "TEST",
    });
    console.log("Evaluation completed successfully!", Object.keys(result as any));
  } catch (err) {
    console.error("Evaluation caught error:", err);
  }
}

main().catch(console.error);
