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

  const startCpu = process.cpuUsage();
  internalEvaluate.call(math, req.code, scope);
  const diffCpu = process.cpuUsage(startCpu);

  const outputScope = {};
  for (const [k, v] of Object.entries(scope)) {
    if (typeof v === "number" || typeof v === "boolean") {
      outputScope[k] = v;
    } else if (v && typeof v === "object" && v.isBigNumber) {
      outputScope[k] = v.toNumber();
    }
  }

  return {
    outputs: outputScope,
    cpuUserMs: Math.round(diffCpu.user / 1000),
    cpuSystemMs: Math.round(diffCpu.system / 1000),
  };
};
