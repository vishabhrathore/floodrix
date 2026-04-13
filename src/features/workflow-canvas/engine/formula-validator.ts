// ═══════════════════════════════════════════════════════════════════════════
//  /engine/formula-engine.ts
//  Single source of truth for formula sandboxing and validation.
//  Merges formula-sandbox.ts, formula-validator.ts (two versions).
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
    // Arithmetic
    "abs", "ceil", "floor", "round", "sign", "trunc", "fix",
    "mod", "gcd", "lcm", "factorial",
    // Powers & roots
    "sqrt", "cbrt", "pow", "exp", "expm1", "square", "cube", "nthRoot",
    "log", "log2", "log10", "log1p",
    // Trigonometric
    "sin", "cos", "tan",
    "asin", "acos", "atan", "atan2",
    "sinh", "cosh", "tanh",
    "asinh", "acosh", "atanh",
    // Min / Max
    "min", "max",
    // Comparison
    "equal", "unequal", "larger", "smaller", "largerEq", "smallerEq",
    // Logical
    "and", "or", "not", "xor",
]);

const ALLOWED_SYMBOLS = new Set(["pi", "e", "Infinity"]);

const BLOCKED_NODE_TYPES = new Set([
    "AssignmentNode", "AccessorNode", "IndexNode",
    "FunctionAssignmentNode", "RangeNode", "BlockNode",
]);

const MAX_COMPLEXITY = 200;
const MAX_MULTILINE_LINES = 50;

// ─── Types ────────────────────────────────────────────────────────────────

export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    /** Variables referenced in the expression, with read/write usage. */
    variables: { name: string; usage: "read" | "write" }[];
    functions: string[];
    complexity: number;
}

// ─── Sandboxed mathjs Instance ────────────────────────────────────────────

let _safeMath: MathJsInstance | null = null;

export function getSafeMath(): MathJsInstance {
    if (_safeMath) return _safeMath;

    const instance = create(all);

    for (const fn of BLOCKED_FUNCTIONS) {
        try {
            delete (instance as unknown as Record<string, unknown>)[fn];
        } catch {
            // Some properties may not be configurable — safe to ignore.
        }
    }

    _safeMath = instance;
    return instance;
}

// ─── Validation ───────────────────────────────────────────────────────────

/**
 * Validate a single mathjs expression (no assignments).
 * Returns a full ValidationResult including extracted variable/function names.
 */
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

/**
 * Validate multi-line custom code (each line must be `variable = expression`).
 * Checks every RHS expression individually and tracks declared outputs.
 */
export function validateMultiLine(
    code: string,
    declaredOutputs: string[] = []
): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables: { name: string; usage: "read" | "write" }[] = [];
    const functions: string[] = [];
    let complexity = 0;

    const lines = code
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

/** Returns true if the expression passes validation with no errors. */
export function isSafe(expression: string): boolean {
    return validateExpression(expression).valid;
}

/** Returns the list of variable names read by the expression. */
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
 *
 * @param expression  The mathjs expression string.
 * @param variables   Variable name → numeric/boolean value map.
 * @param precision   Round result to N decimal places (default: 6).
 */
export function safeEvaluate(
    expression: string,
    variables: Record<string, number | boolean>,
    precision: number = 6
): number {
    const math = getSafeMath();
    const scope: Record<string, unknown> = { ...variables };

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
 * Evaluate multi-line custom code (`variable = expression` per line).
 * Returns only the declared output variables.
 *
 * @param code             Newline-separated assignment statements.
 * @param variables        Input variables passed into the scope.
 * @param outputVariables  Names of variables to extract from the final scope.
 */
export function safeEvaluateMultiLine(
    code: string,
    variables: Record<string, number | boolean>,
    outputVariables: string[]
): Record<string, number> {
    const math = getSafeMath();
    const scope: Record<string, unknown> = { ...variables };

    const lines = code
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("//") && !l.startsWith("#"));

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
    }

    const outputs: Record<string, number> = {};
    for (const key of outputVariables) {
        if (scope[key] !== undefined) {
            outputs[key] = scope[key] as number;
        }
    }
    return outputs;
}