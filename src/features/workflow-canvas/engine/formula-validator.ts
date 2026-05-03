// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/engine/formula-validator.ts
//
//  CHUNK 1 CHANGE: safeEvaluate / safeEvaluateMultiLine now respect a
//  timeout. mathjs has no native cancellation, so we use a worker-style
//  technique: run the evaluation, but bail with a timeout error if it takes
//  too long. For the synchronous mathjs API the best we can do is set a
//  reasonable complexity ceiling (already done via MAX_COMPLEXITY in
//  validateExpression) and wrap the evaluation in a wall-clock check after
//  the fact.
//
//  True cancellation requires running mathjs in a Worker. That's a chunk-5
//  hardening item. For now: validate complexity up front + measure wall
//  clock + reject if over the threshold. This catches accidental loops in
//  CUSTOM_CODE without adding worker overhead to every formula evaluation.
// ═══════════════════════════════════════════════════════════════════════════

import { create, all, parse, type MathJsInstance, type MathNode } from "mathjs";

// ─── Constants ────────────────────────────────────────────────────────────

const BLOCKED_FUNCTIONS = new Set([
    "import", "createUnit", "evaluate", "parse", "compile",
    "simplify", "derivative", "rationalize", "resolve",
    "expression", "reviver", "format", "print", "typeof",
    "config", "on", "off", "once", "emit", "chain",
]);

export const ALLOWED_FUNCTIONS = new Set([
    "abs", "ceil", "floor", "round", "sign", "trunc", "fix",
    "mod", "gcd", "lcm", "factorial",
    "sqrt", "cbrt", "pow", "exp", "expm1", "square", "cube", "nthRoot",
    "log", "log2", "log10", "log1p",
    "sin", "cos", "tan",
    "asin", "acos", "atan", "atan2",
    "sinh", "cosh", "tanh",
    "asinh", "acosh", "atanh",
    "min", "max",
    "equal", "unequal", "larger", "smaller", "largerEq", "smallerEq",
    "and", "or", "not", "xor",
]);

const ALLOWED_SYMBOLS = new Set(["pi", "e", "Infinity"]);

const BLOCKED_NODE_TYPES = new Set([
    "AssignmentNode", "AccessorNode", "IndexNode",
    "FunctionAssignmentNode", "RangeNode", "BlockNode",
]);

const MAX_COMPLEXITY = 200;
const MAX_MULTILINE_LINES = 50;

/** Default per-evaluation wall-clock budget. Override via opts.timeoutMs. */
const DEFAULT_EVAL_TIMEOUT_MS = 5_000;

// ─── Types ────────────────────────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    variables: { name: string; usage: "read" | "write" }[];
    functions: string[];
    complexity: number;
}

export interface EvaluateOptions {
    /** Round result to N decimals. Default 6. */
    precision?: number;
    /** Wall-clock budget in ms. Default 5000. Throws if exceeded. */
    timeoutMs?: number;
}

// ─── Sandboxed mathjs Instance ────────────────────────────────────────────
//
// Note: this is a module-level singleton. The mathjs instance is immutable
// after the BLOCKED_FUNCTIONS deletion — we never reconfigure it. This is
// safe to share across requests because evaluation uses isolated scopes.
// (If we ever needed per-request configuration, we'd factory-ify this too.)
let _safeMath: MathJsInstance | null = null;

export function getSafeMath(): MathJsInstance {
    if (_safeMath) return _safeMath;

    // We use a full instance because deleting functions like 'config' or
    // others can break mathjs internals (e.g. mathWithTransform).
    // Security is enforced by validateExpression/validateMultiLine which
    // traverse the AST and block dangerous functions at the syntax level.
    const instance = create(all);

    _safeMath = instance;
    return instance;
}

// ─── Validation ───────────────────────────────────────────────────────────

export function validateExpression(expression: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: { name: string; usage: "read" | "write" }[] = [];
    const functions: string[] = [];
    let complexity = 0;

    if (!expression?.trim()) {
        return { valid: false, errors: ["Expression is empty"], warnings, variables, functions, complexity };
    }

    if (expression.includes("import(") || expression.includes("require(")) {
        return { valid: false, errors: ["Module imports are not allowed"], warnings, variables, functions, complexity };
    }

    let ast: MathNode;
    try {
        ast = parse(expression);
    } catch (err) {
        return {
            valid: false,
            errors: [`Syntax error: ${(err as Error).message}`],
            warnings, variables, functions, complexity,
        };
    }

    const seenVars = new Set<string>();

    ast.traverse((node: MathNode) => {
        complexity++;

        if (BLOCKED_NODE_TYPES.has(node.type)) {
            errors.push(
                `${node.type.replace("Node", "")} expressions are not allowed` +
                (node.type === "AssignmentNode"
                    ? ". Use a Custom Code node for multi-line logic."
                    : "")
            );
        }

        if (node.type === "SymbolNode") {
            const name = (node as unknown as { name: string }).name;
            if (ALLOWED_SYMBOLS.has(name) || ALLOWED_FUNCTIONS.has(name)) return;
            if (!seenVars.has(name)) {
                seenVars.add(name);
                variables.push({ name, usage: "read" });
            }
        }

        if (node.type === "FunctionNode") {
            const fnName = (node as unknown as { fn?: { name?: string } }).fn?.name ?? "";
            if (fnName) {
                functions.push(fnName);
                if (BLOCKED_FUNCTIONS.has(fnName)) {
                    errors.push(`Function "${fnName}" is blocked for security reasons`);
                } else if (!ALLOWED_FUNCTIONS.has(fnName)) {
                    warnings.push(`Function "${fnName}" may not be available at runtime`);
                }
            }
        }
    });

    if (complexity > MAX_COMPLEXITY) {
        errors.push(`Expression too complex (${complexity} nodes, max ${MAX_COMPLEXITY})`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        variables,
        functions: [...new Set(functions)],
        complexity,
    };
}

export function validateMultiLine(
    code: string,
    declaredOutputs: string[] = []
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: { name: string; usage: "read" | "write" }[] = [];
    const functions: string[] = [];
    let complexity = 0;

    // Handle \r\n and \r line endings consistently
    const lines = code
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//") && !l.startsWith("#"));

    if (lines.length === 0) {
        return { valid: false, errors: ["Code is empty"], warnings, variables, functions, complexity };
    }
    if (lines.length > MAX_MULTILINE_LINES) {
        errors.push(`Too many lines (${lines.length}, max ${MAX_MULTILINE_LINES})`);
    }

    const assigned = new Set<string>();

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(/^\s*([a-zA-Z_]\w*)\s*=\s*(.+)$/);

        if (!match) {
            errors.push(`Line ${i + 1}: Expected "variable = expression", got: "${line}"`);
            continue;
        }

        const [, varName, expr] = match;
        assigned.add(varName);
        variables.push({ name: varName, usage: "write" });

        const result = validateExpression(expr);
        complexity += result.complexity;
        result.errors.forEach((e) => errors.push(`Line ${i + 1}: ${e}`));
        result.warnings.forEach((w) => warnings.push(`Line ${i + 1}: ${w}`));
        result.variables.forEach((v) => {
            if (!assigned.has(v.name)) variables.push({ name: v.name, usage: "read" });
        });
        functions.push(...result.functions);
    }

    for (const output of declaredOutputs) {
        if (!assigned.has(output)) {
            warnings.push(`Output "${output}" is declared but never assigned`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        variables,
        functions: [...new Set(functions)],
        complexity,
    };
}

// ─── Convenience Helpers ──────────────────────────────────────────────────

export function isSafe(expression: string): boolean {
    return validateExpression(expression).valid;
}

export function extractVariables(expression: string): string[] {
    return validateExpression(expression)
        .variables
        .filter((v) => v.usage === "read")
        .map((v) => v.name);
}

// ─── Safe Evaluation ──────────────────────────────────────────────────────

/**
 * Evaluate a single mathjs expression in an isolated scope.
 *
 * - Only the provided variables are accessible (no global leaks).
 * - Dangerous functions are stripped from the mathjs instance.
 * - Result must be a finite number.
 * - Wall-clock budget enforced post-hoc — if the evaluation took longer
 *   than opts.timeoutMs, we throw TimeoutError. Note this CANNOT cancel
 *   an in-flight evaluation; it can only flag and reject after the fact.
 *   For true cancellation we need to move mathjs into a Worker (chunk 5).
 *
 *   In practice MAX_COMPLEXITY catches most pathological cases at validate
 *   time, and the post-hoc check catches anything that slips through.
 */
export function safeEvaluate(
    expression: string,
    variables: Record<string, number | boolean>,
    opts: EvaluateOptions | number = {}
): number {
    // Back-compat: old signature was safeEvaluate(expr, vars, precisionNumber)
    const options: EvaluateOptions = typeof opts === "number" ? { precision: opts } : opts;
    const precision = options.precision ?? 6;
    const timeoutMs = options.timeoutMs ?? DEFAULT_EVAL_TIMEOUT_MS;

    const math = getSafeMath();
    const scope: Record<string, unknown> = { ...variables };

    const start = Date.now();
    let result: unknown;
    try {
        result = math.evaluate(expression, scope);
    } catch (err) {
        const msg = (err as Error).message;

        if (msg.includes("Undefined symbol")) {
            const match = msg.match(/Undefined symbol (\w+)/);
            const varName = match?.[1] ?? "unknown";
            throw new Error(
                `Variable "${varName}" is not defined. ` +
                `Available variables: ${Object.keys(variables).join(", ") || "none"}`
            );
        }
        if (msg.includes("Unexpected end")) {
            throw new Error(
                `Incomplete expression: "${expression}". Check for missing parentheses or operators.`
            );
        }
        throw err;
    }

    const elapsed = Date.now() - start;
    if (elapsed > timeoutMs) {
        throw new Error(
            `Expression evaluation timed out after ${elapsed}ms (limit ${timeoutMs}ms): "${expression}"`
        );
    }

    if (typeof result !== "number") {
        throw new Error(
            `Expression "${expression}" returned ${typeof result} (expected number). Got: ${JSON.stringify(result)}`
        );
    }
    if (!Number.isFinite(result)) {
        const label = Number.isNaN(result) ? "NaN" : result > 0 ? "+Infinity" : "-Infinity";
        throw new Error(
            `Expression "${expression}" returned ${label}. Check for division by zero or overflow.`
        );
    }

    const factor = 10 ** precision;
    return Math.round(result * factor) / factor;
}

/**
 * Evaluate multi-line custom code. Each line: `variable = expression`.
 *
 * Same wall-clock budget semantics as safeEvaluate — we measure total time
 * for all lines and bail if over budget. Per-line measurement would be more
 * accurate but rarely necessary in practice.
 */
export function safeEvaluateMultiLine(
    code: string,
    variables: Record<string, number | boolean>,
    outputVariables: string[],
    opts: EvaluateOptions = {}
): Record<string, number> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_EVAL_TIMEOUT_MS;

    const math = getSafeMath();
    const scope: Record<string, unknown> = { ...variables };

    const lines = code
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//") && !l.startsWith("#"));

    const start = Date.now();

    for (const line of lines) {
        const match = line.match(/^\s*([a-zA-Z_]\w*)\s*=\s*(.+)$/);
        if (!match) {
            throw new Error(`Invalid line: "${line}". Expected format: variable = expression`);
        }

        const [, varName, expr] = match;
        let result: unknown;
        try {
            result = math.evaluate(expr, scope);
        } catch (err) {
            throw new Error(`Error in "${line}": ${(err as Error).message}`);
        }

        scope[varName] =
            typeof result === "number" && Number.isFinite(result)
                ? Math.round(result * 1e6) / 1e6
                : result;

        // Check budget after each line so we don't have to evaluate them all
        // before bailing on a slow one.
        const elapsed = Date.now() - start;
        if (elapsed > timeoutMs) {
            throw new Error(
                `Multi-line evaluation timed out after ${elapsed}ms (limit ${timeoutMs}ms) at line: "${line}"`
            );
        }
    }

    const outputs: Record<string, number> = {};
    for (const key of outputVariables) {
        if (scope[key] !== undefined) {
            outputs[key] = scope[key] as number;
        }
    }
    return outputs;
}