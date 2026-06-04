// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/WorkerPoolTimeout.ts
//
//  True handler cancellation and thread reuse via Piscina.
//
//  Problem this solves:
//    Promise.race with setTimeout DETECTS a timeout but can't CANCEL the
//    handler. A handler stuck in `while(true){}` or a pathological mathjs
//    expression like `factorial(99999)` will pin the event loop even after
//    we "timed out" — we just stop waiting on it, but the work keeps
//    burning CPU until the request process crashes or restarts.
//
//  Solution:
//    Run handlers inside a Piscina worker thread drawn from the pool.
//    If execution exceeds the configured timeout, the task is terminated
//    via AbortController to release process resources immediately.
// ═══════════════════════════════════════════════════════════════════════════
import { join } from "node:path";
import * as os from "node:os";
import { Piscina } from "piscina";
// @ts-ignore
import evaluateLocal from "./worker-mathjs-runner.js";

export interface WorkerTimeoutOptions {
  timeoutMs?: number;
  /** Label used in the timeout error message. */
  handlerType?: string;
}

export interface MathEvaluationResult {
  outputs: Record<string, number>;
  cpuUserMs: number;
  cpuSystemMs: number;
}

const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds default timeout limit

// Module-level Piscina singleton to guarantee thread reuse across evaluations
let piscinaInstance: Piscina | null = null;

function getPiscinaInstance(): Piscina {
  if (!piscinaInstance) {
    piscinaInstance = new Piscina({
      filename: resolveWorkerScriptPath(),
      minThreads: 2,
      maxThreads: Math.max(2, os.cpus().length), // Scale to physical core count to prevent CPU thrashing
    });
  }
  return piscinaInstance;
}

export class WorkerPoolTimeout {
  /**
   * Evaluate a piece of code (typically from CUSTOM_CODE or FORMULA) in
   * a Piscina worker thread with a hard timeout. Returns the code's result
   * or throws if timed out / errored.
   */
  async runMathEvaluation(
    code: string,
    scope: Record<string, number | boolean | string>,
    opts: WorkerTimeoutOptions = {},
    runLocally = false,
  ): Promise<MathEvaluationResult> {
    if (runLocally) {
      // Evaluate synchronously on the current thread to avoid worker creation overhead
      return evaluateLocal({ code, scope });
    }

    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const handlerType = opts.handlerType ?? "math_eval";

    const piscina = getPiscinaInstance();
    const controller = new AbortController();

    const timer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      return await piscina.run(
        { code, scope },
        { signal: controller.signal }
      ) as MathEvaluationResult;
    } catch (err: any) {
      if (
        controller.signal.aborted ||
        err.name === "AbortError" ||
        err.message?.includes("aborted")
      ) {
        throw new Error(
          `${handlerType} worker timed out after ${timeoutMs}ms. Expression: ${code.slice(0, 80)}${code.length > 80 ? "..." : ""}`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Resolve the path to the worker script.
 */
function resolveWorkerScriptPath(): string {
  return join(process.cwd(), "src/server/engine/worker-mathjs-runner.js");
}
