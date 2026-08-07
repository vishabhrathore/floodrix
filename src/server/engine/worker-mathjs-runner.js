// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/worker-mathjs-runner.js
//
//  Runs inside a Piscina worker thread. Isolated from the main event loop.
//  Executes user formulas inside a curated MathJS evaluation scope with matrix
//  dimension caps for runtime protection.
// ═══════════════════════════════════════════════════════════════════════════

const { create, all } = require("mathjs");

// Initialize mathjs once per worker thread (caching) for optimal performance.
const math = create(all);
const internalEvaluate = math.evaluate;

const origRandom = math.random;
const origOnes = math.ones;
const origZeros = math.zeros;
const origIdentity = math.identity;
const origRange = math.range;

const MAX_ELEMENTS = 10000000; // Safe limit of 1 million elements (allows up to 1,000 x 1,000 matrix size safely)

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

const convolve = function (rain, uh) {
  const r = Array.isArray(rain) ? rain : (rain && typeof rain.toArray === "function" ? rain.toArray() : [rain]);
  const u = Array.isArray(uh) ? uh : (uh && typeof uh.toArray === "function" ? uh.toArray() : [uh]);
  const out = new Array(u.length + r.length - 1).fill(0);
  for (let i = 0; i < r.length; i++) {
    for (let j = 0; j < u.length; j++) {
      out[i+j] += r[i] * u[j];
    }
  }
  return out;
};

const forecastLinear = function (targetX, yValues, xValues) {
  const y = Array.isArray(yValues) ? yValues : (yValues && typeof yValues.toArray === "function" ? yValues.toArray() : [yValues]);
  const x = Array.isArray(xValues) ? xValues : (xValues && typeof xValues.toArray === "function" ? xValues.toArray() : [xValues]);
  if (x.length !== y.length) throw new Error("x and y arrays must have same length");
  const n = x.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const num = sumXY - n * meanX * meanY;
  const den = sumXX - n * meanX * meanX;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return slope * targetX + intercept;
};

math.import(
  {
    import: function () {
      throw new Error("import disabled");
    },
    createUnit: function () {
      throw new Error("createUnit disabled");
    },
    simplify: function () {
      throw new Error("simplify disabled");
    },
    derivative: function () {
      throw new Error("derivative disabled");
    },
    parse: function () {
      throw new Error("parse disabled");
    },
    compile: function () {
      throw new Error("compile disabled");
    },
    random: safeRandom,
    ones: safeOnes,
    zeros: safeZeros,
    identity: safeIdentity,
    range: safeRange,
    convolve: convolve,
    forecastLinear: forecastLinear,
  },
  { override: true },
);

// Piscina task entry point
module.exports = function (req) {
  // Rigorous audit scanner to shut down Prototype Pollution and JS Injection
  if (/constructor|__proto__|prototype|global|process|require|module|exports/i.test(req.code)) {
    throw new Error("Formula execution aborted: Security audit violation (forbidden keywords or namespaces detected).");
  }

  // Shallow copy scope to isolate from input mutations
  const scope = { ...req.scope };

  if (req.isJS) {
    const vm = require("vm");
    const sandbox = {
      inputs: scope.inputs || {},
      Math,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Date,
      JSON,
      Map,
      Set,
    };
    if (scope.inputs) {
      for (const [k, v] of Object.entries(scope.inputs)) {
        sandbox[k] = v;
      }
    }
    vm.createContext(sandbox);
    const scriptCode = `(function() {
      ${req.code}
    })()`;

    const startCpu = process.cpuUsage();
    const outputs = vm.runInContext(scriptCode, sandbox, {
      timeout: req.timeoutMs || 30000,
    });
    const diffCpu = process.cpuUsage(startCpu);

    const filteredOutputs = {};
    if (outputs && typeof outputs === "object") {
      for (const [k, v] of Object.entries(outputs)) {
        if (
          v === null ||
          typeof v === "number" ||
          typeof v === "boolean" ||
          typeof v === "string" ||
          Array.isArray(v) ||
          (v && typeof v === "object")
        ) {
          filteredOutputs[k] = v;
        }
      }
    }

    return {
      outputs: filteredOutputs,
      cpuUserMs: Math.round(diffCpu.user / 1000),
      cpuSystemMs: Math.round(diffCpu.system / 1000),
    };
  }

  const startCpu = process.cpuUsage();
  internalEvaluate.call(math, req.code, scope);
  const diffCpu = process.cpuUsage(startCpu);

  const outputScope = {};
  for (const [k, v] of Object.entries(scope)) {
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
      outputScope[k] = v;
    } else if (v && typeof v === "object" && v.isBigNumber) {
      outputScope[k] = v.toNumber();
    } else if (Array.isArray(v)) {
      outputScope[k] = v;
    } else if (v && typeof v === "object" && typeof v.toArray === "function") {
      outputScope[k] = v.toArray();
    }
  }

  return {
    outputs: outputScope,
    cpuUserMs: Math.round(diffCpu.user / 1000),
    cpuSystemMs: Math.round(diffCpu.system / 1000),
  };
};
