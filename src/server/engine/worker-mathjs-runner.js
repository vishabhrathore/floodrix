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
      const math = create(all);
      const internalEvaluate = math.evaluate;

      // Safe memory-safeguard wrappers for array/matrix creation functions
      const origRandom = math.random;
      const origOnes = math.ones;
      const origZeros = math.zeros;
      const origIdentity = math.identity;
      const origRange = math.range;

      const MAX_ELEMENTS = 25000000; // Limit to 1 million elements (e.g., 1000x1000 matrix)

      function checkDimensions(args) {
        let size = 1;
        let dims = [];

        if (Array.isArray(args)) {
          dims = args;
        } else if (args && typeof args === "object" && typeof args.toArray === "function") {
          dims = args.toArray();
        } else if (typeof args === "number") {
          dims = [args];
        } else {
          return;
        }

        const flatDims = [];
        function extract(val) {
          if (Array.isArray(val)) {
            val.forEach(extract);
          } else if (typeof val === "number") {
            flatDims.push(val);
          }
        }
        extract(dims);

        if (flatDims.length === 0) return;

        for (const d of flatDims) {
          if (d < 0) throw new Error("Dimensions must be non-negative");
          size *= d;
        }

        if (size > MAX_ELEMENTS) {
          throw new Error(`Matrix size (${size.toLocaleString()}) exceeds the limit of ${MAX_ELEMENTS.toLocaleString()} elements.`);
        }
      }

      function validateMatrixCreationArgs(args) {
        if (args.length > 0) {
          const first = args[0];
          if (Array.isArray(first) || (first && typeof first === "object" && first.isMatrix)) {
            checkDimensions(first);
            return;
          }
        }
        const allNumbers = args.every(x => typeof x === "number");
        if (allNumbers && args.length > 0) {
          let size = 1;
          for (const d of args) {
            size *= d;
          }
          if (size > MAX_ELEMENTS) {
            throw new Error(`Matrix size exceeds limit of ${MAX_ELEMENTS.toLocaleString()} elements.`);
          }
        }
      }

      const safeRandom = function (...args) {
        validateMatrixCreationArgs(args);
        return origRandom.apply(math, args);
      };

      const safeOnes = function (...args) {
        validateMatrixCreationArgs(args);
        return origOnes.apply(math, args);
      };

      const safeZeros = function (...args) {
        validateMatrixCreationArgs(args);
        return origZeros.apply(math, args);
      };

      const safeIdentity = function (...args) {
        validateMatrixCreationArgs(args);
        return origIdentity.apply(math, args);
      };

      const safeRange = function (start, end, step = 1) {
        if (typeof start === "number" && typeof end === "number" && typeof step === "number") {
          if (step === 0) throw new Error("Step cannot be zero");
          const count = Math.abs((end - start) / step);
          if (count > MAX_ELEMENTS) {
            throw new Error(`Range size (${Math.round(count).toLocaleString()}) exceeds the limit of ${MAX_ELEMENTS.toLocaleString()} elements.`);
          }
        }
        return origRange.apply(math, arguments);
      };

      math.import(
        {
          import: function () {
            throw new Error("import disabled");
          },
          createUnit: function () {
            throw new Error("createUnit disabled");
          },
          random: safeRandom,
          ones: safeOnes,
          zeros: safeZeros,
          identity: safeIdentity,
          range: safeRange,
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
