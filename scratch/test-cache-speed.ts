import { AppCache } from "../src/lib/cache";

async function main() {
  console.log("Benchmarking AppCache/Redis performance...");

  const key = "test-perf-key";
  const val = { ok: true, name: "Test Object", values: Array(100).fill(1) };

  // Warmup
  await AppCache.set(key, val, 60);
  await AppCache.get(key);

  const runs = 100;
  
  const setStart = performance.now();
  for (let i = 0; i < runs; i++) {
    await AppCache.set(key, val, 60);
  }
  const setEnd = performance.now();

  const getStart = performance.now();
  for (let i = 0; i < runs; i++) {
    await AppCache.get(key);
  }
  const getEnd = performance.now();

  console.log(`Average set time: ${((setEnd - setStart) / runs).toFixed(3)}ms`);
  console.log(`Average get time: ${((getEnd - getStart) / runs).toFixed(3)}ms`);
  
  await AppCache.del(key);
}

main().catch(console.error).finally(() => process.exit(0));
