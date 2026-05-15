// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/worker-mathjs-runner.js
//
//  Runs inside a worker_thread. Isolated from the main event loop so a
//  runaway mathjs expression can be killed via worker.terminate() without
//  crashing your Node process.
//
//  This is plain .js (not .ts) so it doesn't need build pipeline support
//  to be used as a worker script. If you're using ts-node or tsx in dev
//  you can rename to .ts and it'll work, but for production build output
//  keeping it as .js avoids Next.js worker-loader shenanigans.
//
//  Contract with WorkerPoolTimeout:
//    Receives: { code, scope, timeoutMs }
//    Sends:    { ok: true, result }  |  { ok: false, error, errorName }
// ═══════════════════════════════════════════════════════════════════════════

const { parentPort } = require("node:worker_threads");

if (parentPort) {
  parentPort.on("message", (req) => {
    try {
      // Lazy-load mathjs inside the worker. Keeps cold-start lean and
      // ensures the worker's copy is isolated from the main thread's.
      const { create, all } = require("mathjs");

      // Use a limited math instance. Not full sandboxing (a determined
      // attacker could still access globals) but blocks the obvious
      // dangerous surface.
      // Use a limited math instance.
      const math = create(all);
      const internalEvaluate = math.evaluate;

      math.import(
        {
          import: function () {
            throw new Error("import disabled");
          },
          createUnit: function () {
            throw new Error("createUnit disabled");
          },
          // We don't override evaluate/parse/simplify here because we need
          // them to perform the calculation. Security is handled by the
          // validator in the main thread before the worker is spawned.
        },
        { override: true },
      );

      internalEvaluate.call(math, req.code, req.scope);

      // Filter and serialize the scope to return only the values we want.
      const outputScope = {};
      for (const [k, v] of Object.entries(req.scope)) {
        // Return numbers and booleans. Coerce others if possible or skip.
        if (typeof v === "number" || typeof v === "boolean") {
          outputScope[k] = v;
        } else if (v && typeof v === "object" && v.isBigNumber) {
          outputScope[k] = v.toNumber();
        }
      }

      parentPort.postMessage({ ok: true, result: outputScope });
    } catch (err) {
      parentPort.postMessage({
        ok: false,
        error: err && err.message ? err.message : String(err),
        errorName: err && err.name ? err.name : "UnknownError",
      });
    }
  });
}
