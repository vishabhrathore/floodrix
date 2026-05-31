// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/WorkerPoolTimeout.ts
//
//  True handler cancellation via Node.js worker_threads.
//
//  Problem this solves:
//    Promise.race with setTimeout DETECTS a timeout but can't CANCEL the
//    handler. A handler stuck in `while(true){}` or a pathological mathjs
//    expression like `factorial(99999)` will pin the event loop even after
//    we "timed out" \u2014 we just stop waiting on it, but the work keeps
//    burning CPU until the request process crashes or restarts.
//
//  Solution:
//    Run handlers in a short-lived worker_thread. If it takes too long,
//    we call worker.terminate() which ACTUALLY stops the thread.
//
//  Caveats you should know:
//    1. Worker threads have startup cost (~10-50ms). We don't want this on
//       every node \u2014 only on handlers that flagged useWorker: true or that
//       the executor knows might hang (CUSTOM_CODE, FORMULA with complex
//       expressions).
//    2. Workers can't share the PrismaClient, variable store, or other
//       stateful deps. This pool is for PURE COMPUTATION handlers only.
//       Database-touching handlers (anything using ctx.db or ctx.registry)
//       stay in-process with Promise.race.
//    3. We serialize inputs/outputs via structured clone. Non-cloneable
//       things (functions, class instances) will throw DataCloneError.
//       Handlers that need the full ctx shouldn't use this pool.
//
//  Usage pattern in executor:
//    const pool = new WorkerPoolTimeout();
//    if (handler.useWorker) {
//      outcome = await pool.runInWorker(handler.execute, serializableCtx);
//    } else {
//      outcome = await runHandlerWithTimeout(handler, ctx); // existing path
//    }
//
//  When to opt in:
//    - CUSTOM_CODE \u2014 user-supplied code, real runaway risk
//    - FORMULA \u2014 mathjs has its own timeout via safeEvaluate, but worker
//      isolation is a belt-and-suspenders approach for high-value deployments
//    - Any future handler that does heavy CPU math
// ═══════════════════════════════════════════════════════════════════════════
import { join } from "node:path";
import { Worker } from "node:worker_threads";

export interface WorkerTimeoutOptions {
  timeoutMs?: number;
  /** Label used in the timeout error message. */
  handlerType?: string;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Shape of messages exchanged with the worker. Kept small so serialization
 * is cheap and non-cloneable values can't sneak in.
 */
interface WorkerRequest {
  code: string;
  scope: Record<string, number | boolean | string>;
  timeoutMs: number;
}

interface WorkerResponse {
  ok: true;
  result: unknown;
}

interface WorkerError {
  ok: false;
  error: string;
  errorName?: string;
}

export class WorkerPoolTimeout {
  /**
   * Evaluate a piece of code (typically from CUSTOM_CODE or FORMULA) in
   * a worker_thread with a hard timeout. Returns the code's result or
   * throws if timed out / errored.
   *
   * The `code` string is evaluated as-is inside the worker via mathjs.
   * Do NOT pass arbitrary user-supplied JavaScript here \u2014 the worker
   * is isolated from your main memory but it's still executing in your
   * Node runtime. Only pass mathjs-expression strings.
   */
  async runMathEvaluation(
    code: string,
    scope: Record<string, number | boolean | string>,
    opts: WorkerTimeoutOptions = {},
  ): Promise<unknown> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const handlerType = opts.handlerType ?? "math_eval";

    // worker script path \u2014 see worker-mathjs-runner.js below
    const workerPath = resolveWorkerScriptPath();
    const worker = new Worker(workerPath);

    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      return await new Promise<unknown>((resolve, reject) => {
        timer = setTimeout(() => {
          // terminate() actually kills the thread, unlike Promise.race
          worker.terminate().catch(() => {
            /* best-effort */
          });
          reject(
            new Error(
              `${handlerType} worker timed out after ${timeoutMs}ms. Expression: ${code.slice(0, 80)}${code.length > 80 ? "..." : ""}`,
            ),
          );
        }, timeoutMs);

        worker.once("message", (msg: WorkerResponse | WorkerError) => {
          if (msg.ok) resolve(msg.result);
          else
            reject(
              new Error(`${msg.errorName ?? "WorkerError"}: ${msg.error}`),
            );
        });

        worker.once("error", (err) => {
          reject(err);
        });

        worker.once("exit", (code) => {
          if (code !== 0 && code !== null) {
            reject(new Error(`Worker exited with code ${code}`));
          }
        });

        const req: WorkerRequest = { code, scope, timeoutMs };
        worker.postMessage(req);
      });
    } finally {
      if (timer) clearTimeout(timer);
      // Ensure worker is terminated even on success path
      worker.terminate().catch(() => {
        /* best-effort */
      });
    }
  }
}

/**
 * Resolve the path to the worker script. This assumes you've placed
 * `worker-mathjs-runner.js` in the same directory. In Next.js projects
 * you may need to adjust this path to account for build output.
 *
 * If this path fails at runtime, check:
 *   - Is the worker script actually being copied to the build output?
 *   - Does Next.js's webpack config need externals: { 'worker_threads': 'commonjs worker_threads' }?
 *
 * A simpler fallback: inline the worker code via `new Worker(new URL('./worker-mathjs-runner.js', import.meta.url))`.
 */
function resolveWorkerScriptPath(): string {
  return join(process.cwd(), "src/server/engine/worker-mathjs-runner.js");
}
