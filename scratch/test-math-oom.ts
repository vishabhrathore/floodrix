import { WorkerPoolTimeout } from "../src/server/engine/WorkerPoolTimeout";

async function main() {
  console.log("=== INITIATING SAFE MATH EVALUATION BOUNDARY TESTS ===");
  const runner = new WorkerPoolTimeout();

  // Test Case 1: Exactly at limit boundary (10,000 x 10,000 = 100,000,000 elements)
  console.log("\n--- TEST CASE 1: Exactly at boundary (A = 10000) ---");
  try {
    console.log("Evaluating D = sum(ones([10000, 10000]))...");
    const result = await runner.runMathEvaluation("D = sum(ones([A, A]))", { A: 10000 }, {
      timeoutMs: 15000, // Large matrix takes slightly longer to generate and sum
      handlerType: "math_eval_test",
    });
    console.log("✅ SUCCESS: Execution succeeded cleanly!", JSON.stringify(result));
  } catch (err: any) {
    console.log("❌ FAILURE: Expected to succeed but caught error:", err.message);
  }

  // Test Case 2: Just above limit boundary (10,001 x 10,001 = 100,020,001 elements)
  console.log("\n--- TEST CASE 2: Just above boundary (A = 10001) ---");
  try {
    await runner.runMathEvaluation("D = sum(ones([A, A]))", { A: 10001 }, {
      timeoutMs: 5000,
      handlerType: "math_eval_test",
    });
    console.log("❌ FAILURE: Allowed execution above boundary!");
  } catch (err: any) {
    console.log("✅ SUCCESS: Correctly blocked and threw error:", err.message);
  }

  // Test Case 3: Extreme OOM size (A = 75000 = 5.625 Billion elements)
  console.log("\n--- TEST CASE 3: Extreme OOM protection (A = 75000) ---");
  try {
    await runner.runMathEvaluation("D = sum(ones([A, A]))", { A: 75000 }, {
      timeoutMs: 5000,
      handlerType: "math_eval_test",
    });
    console.log("❌ FAILURE: Allowed execution above boundary!");
  } catch (err: any) {
    console.log("✅ SUCCESS: Correctly blocked extreme OOM and threw error:", err.message);
  }
}

main().catch(console.error);
