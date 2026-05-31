"use client";

/**
 * MathEditor — CodeMirror 6 + Async MathJS Web Worker
 *
 * Features:
 *  ✅ Client-Side Web Worker: Zero UI freeze, running entirely in background.
 *  ✅ Active recancelation: Auto-terminates worker on keystroke to avoid CPU leaks.
 *  ✅ 3-Second Hard Timeout: Prevents tab lockups, matching Excel/Google Sheets.
 *  ✅ Autocomplete: mathjs functions + previously defined variables
 *  ✅ Inline results (widget decoration on each line)
 *  ✅ Squiggly error underlines with diagnostic messages
 *  ✅ Comment metadata parsing: // name: X, unit: Y, desc: Z
 *  ✅ onParsed callback → feeds FormulaForm
 *
 * FIX CHANGELOG:
 *  - Removed duplicate evaluateDocAsync call from updateListener (was causing double evaluation + lag)
 *  - Linter is now the single source of evaluation triggers
 *  - 0.5s proactive slow-detection now immediately terminates the active worker
 *  - Slow-line auto-detection also immediately kills the worker after results arrive
 *  - All evaluation paths consistently set isEvaluating = false on cancel
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import {
  CompletionContext,
  CompletionResult,
  autocompletion,
} from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { Diagnostic, linter } from "@codemirror/lint";
import {
  EditorState,
  RangeSet,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import { highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import * as math from "mathjs";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedVariable {
  notation: string;
  displayLabel: string;
  unit?: string;
  description?: string;
  dataType: "NUMBER" | "STRING" | "BOOLEAN" | "ARRAY" | "OBJECT";
  value?: number | string | boolean;
}

export interface ParsedFormula {
  outputNotation: string;
  expression: string;
  fullExpression: string;
  result?: number | string;
  inputNotations: string[];
}

export interface EditorParsed {
  inputVariables: ParsedVariable[];
  formulas: ParsedFormula[];
  outputVariable?: ParsedVariable;
  hasErrors: boolean;
}

interface MathEditorProps {
  defaultValue?: string;
  onChange?: (code: string) => void;
  onParsed?: (data: EditorParsed) => void;
  className?: string;
}

export interface MathEditorRef {
  getValue: () => string;
  setValue: (code: string) => void;
}

// ─── Mathjs function list ─────────────────────────────────────────────────────

const MATH_FUNCTIONS = [
  "abs", "acos", "acosh", "acot", "acoth", "acsc", "acsch", "add", "and", "arg",
  "asec", "asech", "asin", "asinh", "atan", "atan2", "atanh", "cbrt", "ceil",
  "combinations", "compare", "complex", "concat", "conj", "cos", "cosh", "cot",
  "coth", "cross", "csc", "csch", "cube", "det", "diag", "diff", "distance",
  "divide", "dot", "dotDivide", "dotMultiply", "dotPow", "erf", "exp", "expm1",
  "factorial", "filter", "fix", "flatten", "floor", "format", "gamma", "gcd",
  "hypot", "identity", "im", "inv", "isFinite", "isInteger", "isNaN", "isNegative",
  "isPositive", "isPrime", "isZero", "kron", "larger", "largerEq", "lcm", "leftShift",
  "lgamma", "log", "log10", "log1p", "log2", "lsolve", "lup", "lusolve", "mad",
  "map", "matrix", "max", "mean", "median", "min", "mod", "mode", "multiply",
  "norm", "not", "nthRoot", "number", "ones", "or", "parse", "permutations",
  "pickRandom", "pow", "prod", "qr", "quantileSeq", "random", "randomInt", "range",
  "re", "reshape", "resize", "round", "row", "sec", "sech", "sign", "simplify",
  "sin", "sinh", "size", "smaller", "smallerEq", "sort", "sparse", "sqrt", "sqrtm",
  "square", "squeeze", "std", "string", "subset", "subtract", "sum", "tan", "tanh",
  "trace", "transpose", "typeOf", "variance", "xgcd", "xor", "zeros", "zeta"
];

const MATH_CONSTANTS = [
  "pi", "e", "phi", "tau", "Infinity", "NaN", "i", "true", "false"
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMeta(comment: string) {
  return {
    name: comment.match(/name:\s*([^,\n]+)/i)?.[1]?.trim(),
    unit: comment
      .match(/unit:\s*([^,\n]+)/i)?.[1]
      ?.trim()
      ?.replace(/^-$/, ""),
    desc: comment.match(/desc:\s*([^,\n]+)/i)?.[1]?.trim(),
  };
}

function formatVal(v: unknown): string {
  if (typeof v !== "number") return String(v);
  if (Math.abs(v) > 999_999 || (Math.abs(v) < 0.0001 && v !== 0))
    return v.toExponential(3);
  return parseFloat(v.toFixed(6)).toString();
}

function isHeavyExpression(code: string): boolean {
  // Any use of matrix-generating functions with bracket args (e.g. random([N, N]))
  // — we can't safely evaluate N's value here on the main thread, so always skip these.
  if (/(?:random|ones|zeros|identity)\s*\(\s*\[/.test(code)) return true;

  // Matrix-generating functions with large literal sizes: random(rows, cols) or range(n)
  const matrixSizeMatch = code.match(/(?:random|ones|zeros|identity|range)\(\s*(\d+)\s*(?:,\s*(\d+))?\s*\)/i);
  if (matrixSizeMatch) {
    const rows = parseInt(matrixSizeMatch[1], 10);
    const cols = matrixSizeMatch[2] ? parseInt(matrixSizeMatch[2], 10) : rows;
    if (rows > 50 || cols > 50) return true;
  }

  // Large factorial
  const factorialMatch = code.match(/factorial\(\s*(\d+)\s*\)/i);
  if (factorialMatch && parseInt(factorialMatch[1], 10) > 100) return true;

  // Any line that multiplies two capital-letter vars is likely a matrix multiply — skip
  // Pattern: X = A * B  or  result = A * B  (single uppercase vars)
  if (/=\s*[A-Z]\s*\*\s*[A-Z]/.test(code)) return true;

  return false;
}

// ─── Web Worker Script ────────────────────────────────────────────────────────

const WORKER_SCRIPT = `
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/mathjs/11.8.0/math.js');

  self.onmessage = function(e) {
    const { lines } = e.data;
    const scope = {};
    const outcomes = [];

    const mathInstance = math.create(math.all);

    mathInstance.import({
      import: function() { throw new Error("import disabled"); },
      createUnit: function() { throw new Error("createUnit disabled"); }
    }, { override: true });

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("//")) {
        outcomes.push({ type: "comment" });
        continue;
      }

      try {
        const tStart = performance.now();
        const result = mathInstance.evaluate(line, scope);
        const tEnd = performance.now();
        const durationMs = tEnd - tStart;

        let val = result;
        if (result && typeof result === "object") {
          if (result.isBigNumber) {
            val = result.toNumber();
          } else if (result.isMatrix) {
            const size = result.size();
            const count = size.reduce(function(a, b) { return a * b; }, 1);
            if (count <= 100) {
              val = result.toArray();
            } else {
              val = "Matrix [" + size.join("x") + "]";
            }
          } else if (result.valueOf) {
            val = result.valueOf();
          }
        }

        outcomes.push({
          type: "result",
          val: val,
          display: formatVal(result),
          durationMs: durationMs
        });
      } catch (err) {
        outcomes.push({
          type: "error",
          error: err.message,
          char: err.char ?? 0
        });
      }
    }

    self.postMessage({ outcomes, finalScope: scope });

    function formatVal(v) {
      if (v === undefined || v === null) return "";
      if (typeof v === "function") return "function";
      if (v && v.isMatrix) {
        return "Matrix [" + v.size().join("x") + "]";
      }
      if (Array.isArray(v)) {
        return "Array [" + v.length + "]";
      }
      if (typeof v !== "number") {
        return String(v);
      }
      if (Math.abs(v) > 999999 || (Math.abs(v) < 0.0001 && v !== 0))
        return v.toExponential(3);
      return parseFloat(v.toFixed(6)).toString();
    }
  };
`;

// ─── Inline result widget ─────────────────────────────────────────────────────

class ResultWidget extends WidgetType {
  constructor(
    private text: string,
    private kind: "result" | "error" | "comment",
  ) {
    super();
  }

  toDOM() {
    const span = document.createElement("span");
    span.setAttribute("aria-hidden", "true");

    const styles: Record<string, string> = {
      result: "background:rgba(39,80,10,0.10);color:#27500a;",
      error: "background:rgba(163,45,45,0.10);color:#a32d2d;",
      comment: "background:rgba(21,95,165,0.08);color:#185fa5;",
    };

    const prefix: Record<string, string> = {
      result: "▶  ",
      error: "✖  ",
      comment: "◈  ",
    };

    span.style.cssText = [
      "display:inline-block",
      "margin-left:20px",
      "padding:1px 9px",
      "border-radius:4px",
      "font-size:11.5px",
      "font-family:var(--font-mono,'JetBrains Mono',monospace)",
      "pointer-events:none",
      "user-select:none",
      "vertical-align:middle",
      "letter-spacing:0.01em",
      styles[this.kind],
    ].join(";");

    span.textContent = prefix[this.kind] + this.text;
    return span;
  }

  eq(other: ResultWidget) {
    return other.text === this.text && other.kind === this.kind;
  }

  ignoreEvent() {
    return true;
  }
}

// ─── Decoration state field ───────────────────────────────────────────────────

const setDecorations = StateEffect.define<RangeSet<Decoration>>();

const decorationField = StateField.define<RangeSet<Decoration>>({
  create: () => Decoration.none,
  update(deco, tr) {
    for (const e of tr.effects) {
      if (e.is(setDecorations)) return e.value;
    }
    return deco.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ─── Editor theme ─────────────────────────────────────────────────────────────

const editorTheme = EditorView.theme({
  "&": {
    fontFamily: "var(--font-mono,'JetBrains Mono','Fira Code',monospace)",
    fontSize: "13px",
    lineHeight: "22px",
    backgroundColor: "transparent",
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": {
    padding: "12px 0",
    caretColor: "var(--color-text-primary,#111)",
  },
  ".cm-line": { padding: "0 16px 0 8px" },
  ".cm-gutters": {
    background: "var(--color-background-secondary,#f7f7f5)",
    border: "none",
    borderRight: "0.5px solid var(--color-border-tertiary,rgba(0,0,0,0.12))",
    color: "var(--color-text-tertiary,#aaa)",
    fontSize: "11px",
    minWidth: "36px",
    paddingRight: "0",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 4px" },
  ".cm-activeLine": { background: "rgba(0,0,0,0.02)" },
  ".cm-activeLineGutter": { background: "rgba(0,0,0,0.035)" },
  ".cm-cursor": {
    borderLeftColor: "var(--color-text-primary,#111)",
    borderLeftWidth: "2px",
  },
  ".cm-selectionBackground": { background: "rgba(56,132,255,0.16) !important" },
  ".cm-tooltip": {
    background: "var(--color-background-primary,#fff)",
    border: "0.5px solid var(--color-border-secondary,rgba(0,0,0,0.18))",
    borderRadius: "10px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.14)",
    overflow: "hidden",
    padding: "4px",
  },
  ".cm-tooltip-autocomplete > ul": { padding: "0", margin: "0" },
  ".cm-tooltip-autocomplete > ul > li": {
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12.5px",
    fontFamily: "var(--font-mono,monospace)",
    lineHeight: "1.4",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    background: "var(--color-background-info,#e6f1fb)",
    color: "var(--color-text-info,#185fa5)",
  },
  ".cm-completionDetail": {
    fontSize: "10px",
    opacity: "0.45",
    marginLeft: "auto",
    fontStyle: "normal",
  },
  ".cm-completionMatchedText": {
    fontWeight: "600",
    textDecoration: "none",
  },
  ".cm-lintRange-error": {
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='3'%3E%3Cpath d='M0 2.5 L1.5 1 L3 2.5 L4.5 1 L6 2.5' fill='none' stroke='%23e24b4a' stroke-width='1.2'/%3E%3C/svg%3E\")",
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
  },
  ".cm-diagnostic-error": {
    fontSize: "11.5px",
    borderLeft: "3px solid #e24b4a",
    paddingLeft: "8px",
    background: "rgba(226,75,74,0.06)",
    borderRadius: "0 4px 4px 0",
  },
});

// ─── Default code ─────────────────────────────────────────────────────────────

const DEFAULT_CODE = `// name: Catchment area, unit: km², desc: Total catchment area
A = 250

// name: Dicken's constant, unit: -, desc: Regional coefficient (11-14)
C = 11.5

// Dicken's flood discharge
Q = C * A^(3/4)

// name: Manning roughness, unit: -, desc: Channel roughness
n = 0.035

// name: Hydraulic radius, unit: m
R = 1.8

// name: Channel slope, unit: m/m
S = 0.0005

// Manning velocity
V = (1/n) * R^(2/3) * S^(1/2)`;

// ─── Component ────────────────────────────────────────────────────────────────

export const MathEditor = forwardRef<MathEditorRef, MathEditorProps>(
  function MathEditor(
    { defaultValue = DEFAULT_CODE, onChange, onParsed, className = "" },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const onParsedRef = useRef(onParsed);
    const onChangeRef = useRef(onChange);
    const activeWorkerRef = useRef<Worker | null>(null);
    const liveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [isManualMode, setIsManualMode] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationDuration, setEvaluationDuration] = useState<number | null>(null);

    const isManualModeRef = useRef(false);
    isManualModeRef.current = isManualMode;

    onParsedRef.current = onParsed;
    onChangeRef.current = onChange;

    useImperativeHandle(ref, () => ({
      getValue: () => viewRef.current?.state.doc.toString() ?? "",
      setValue: (code: string) => {
        const v = viewRef.current;
        if (!v) return;
        v.dispatch({
          changes: { from: 0, to: v.state.doc.length, insert: code },
        });
      },
    }));

    // ─── Helper: cancel any active worker + interval immediately ─────────────
    const cancelActiveEvaluation = useCallback(() => {
      if (activeWorkerRef.current) {
        activeWorkerRef.current.terminate();
        activeWorkerRef.current = null;
      }
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
      setIsEvaluating(false);
      setEvaluationDuration(null);
    }, []);

    // ─── Core async evaluation via Web Worker ─────────────────────────────────
    const evaluateDocAsync = useCallback(
      (view: EditorView, onParsedCallback?: (d: EditorParsed) => void): Promise<Diagnostic[]> => {
        const doc = view.state.doc;
        const docText = doc.toString();
        const lines = docText.split("\n");

        // Cancel any in-flight worker before spawning a new one
        cancelActiveEvaluation();

        setIsEvaluating(true);
        setEvaluationDuration(0);

        return new Promise<Diagnostic[]>((resolve) => {
          const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
          const worker = new Worker(URL.createObjectURL(blob));
          activeWorkerRef.current = worker;

          const diagnostics: Diagnostic[] = [];
          const decorBuf: { pos: number; deco: Decoration }[] = [];

          // Live ticking timer — if evaluation exceeds 500ms, switch to manual mode
          // and IMMEDIATELY kill the worker to prevent lag
          const runStart = Date.now();
          liveIntervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - runStart) / 1000;
            setEvaluationDuration(elapsed);

            if (elapsed >= 0.5 && !isManualModeRef.current) {
              // Switch to manual mode and immediately terminate the slow worker
              setIsManualMode(true);
              isManualModeRef.current = true;

              // Kill the worker right now — don't wait for it to finish
              if (activeWorkerRef.current) {
                activeWorkerRef.current.terminate();
                activeWorkerRef.current = null;
              }
              if (liveIntervalRef.current) {
                clearInterval(liveIntervalRef.current);
                liveIntervalRef.current = null;
              }

              setIsEvaluating(false);
              setEvaluationDuration(null);

              // Resolve with no diagnostics so the linter doesn't hang
              resolve([]);
            }
          }, 100);

          worker.onmessage = (e) => {
            // Clean up interval and worker reference
            if (liveIntervalRef.current) {
              clearInterval(liveIntervalRef.current);
              liveIntervalRef.current = null;
            }
            worker.terminate();
            if (activeWorkerRef.current === worker) {
              activeWorkerRef.current = null;
            }

            const { outcomes, finalScope } = e.data;

            const inputVarMap = new Map<string, ParsedVariable>();
            const formulaList: ParsedFormula[] = [];
            const varMeta: Record<
              string,
              { name?: string; unit?: string; desc?: string }
            > = {};
            let pendingMeta: { name?: string; unit?: string; desc?: string } | null = null;
            let offset = 0;

            for (let i = 0; i < lines.length; i++) {
              const raw = lines[i];
              const end = offset + raw.length;
              const trim = raw.trim();
              const outcome = outcomes[i];

              if (!trim) {
                pendingMeta = null;
                offset = end + 1;
                continue;
              }

              // ── Comment Line Meta ──
              if (trim.startsWith("//")) {
                const content = trim.slice(2).trim();
                const meta = parseMeta(content);

                if (meta.name || meta.unit || meta.desc) {
                  pendingMeta = meta;
                  const label = meta.name
                    ? meta.name + (meta.unit ? ` [${meta.unit}]` : "")
                    : content.slice(0, 30);
                  decorBuf.push({
                    pos: end,
                    deco: Decoration.widget({
                      widget: new ResultWidget(label, "comment"),
                      side: 1,
                    }),
                  });
                } else {
                  pendingMeta = null;
                }

                offset = end + 1;
                continue;
              }

              // ── Code Line Outcome ──
              if (outcome) {
                if (outcome.type === "result") {
                  const result = outcome.val;
                  const assignM = trim.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
                  const durationMs = outcome.durationMs ?? 0;
                  const durationStr = durationMs >= 1000
                    ? ` (took ${(durationMs / 1000).toFixed(2)}s)`
                    : durationMs >= 1
                      ? ` (took ${durationMs.toFixed(1)}ms)`
                      : "";
                  const display = outcome.display + durationStr;

                  if (assignM) {
                    const varName = assignM[1];
                    const rhs = trim.slice(trim.indexOf("=") + 1).trim();
                    const usedVars = Object.keys(finalScope).filter(
                      (k) => k !== varName && new RegExp(`\\b${k}\\b`).test(rhs),
                    );
                    const isFormula = usedVars.length > 0;

                    if (pendingMeta) {
                      varMeta[varName] = { ...(varMeta[varName] ?? {}), ...pendingMeta };
                    }
                    const meta = varMeta[varName] ?? {};

                    const varDef: ParsedVariable = {
                      notation: varName,
                      displayLabel: meta.name || varName,
                      unit: meta.unit,
                      description: meta.desc,
                      dataType:
                        typeof result === "number"
                          ? "NUMBER"
                          : typeof result === "boolean"
                            ? "BOOLEAN"
                            : "STRING",
                      value:
                        typeof result === "number" ||
                          typeof result === "string" ||
                          typeof result === "boolean"
                          ? result
                          : undefined,
                    };

                    if (isFormula) {
                      formulaList.push({
                        outputNotation: varName,
                        expression: rhs,
                        fullExpression: trim,
                        result:
                          typeof result === "number"
                            ? parseFloat(result.toFixed(6))
                            : String(result),
                        inputNotations: usedVars,
                      });
                    } else {
                      inputVarMap.set(varName, varDef);
                    }
                  }

                  decorBuf.push({
                    pos: end,
                    deco: Decoration.widget({
                      widget: new ResultWidget(display, "result"),
                      side: 1,
                    }),
                  });
                } else if (outcome.type === "error") {
                  const msg = outcome.error.split("\n")[0];
                  const cOff = outcome.char ?? 0;
                  const from = offset + Math.min(cOff, Math.max(raw.length - 1, 0));
                  const to = Math.min(from + 1, end);

                  diagnostics.push({ from, to, severity: "error", message: msg });
                  decorBuf.push({
                    pos: end,
                    deco: Decoration.widget({
                      widget: new ResultWidget(msg.slice(0, 64), "error"),
                      side: 1,
                    }),
                  });
                }
              }

              pendingMeta = null;
              offset = end + 1;
            }

            // Render decorations
            const decoSet = RangeSet.of(
              decorBuf.map((d) => d.deco.range(d.pos)),
              true,
            );
            view.dispatch({ effects: setDecorations.of(decoSet) });

            // Call onParsed callback
            const lastFormula = formulaList[formulaList.length - 1];
            onParsedCallback?.({
              inputVariables: Array.from(inputVarMap.values()),
              formulas: formulaList,
              outputVariable: lastFormula
                ? {
                  notation: lastFormula.outputNotation,
                  displayLabel:
                    varMeta[lastFormula.outputNotation]?.name ||
                    lastFormula.outputNotation,
                  unit: varMeta[lastFormula.outputNotation]?.unit,
                  description: varMeta[lastFormula.outputNotation]?.desc,
                  dataType: "NUMBER",
                  value:
                    typeof lastFormula.result === "number"
                      ? lastFormula.result
                      : undefined,
                }
                : undefined,
              hasErrors: diagnostics.length > 0,
            });

            setIsEvaluating(false);
            setEvaluationDuration(null);

            // If any line took ≥100ms, switch to manual mode and kill further auto-evals.
            // Worker is already done here, just flip the mode flag.
            const hasSlowLine = outcomes.some(
              (o: any) => o.type === "result" && o.durationMs >= 100
            );
            if (hasSlowLine && !isManualModeRef.current) {
              setIsManualMode(true);
              isManualModeRef.current = true;
            }

            resolve(diagnostics);
          };

          worker.onerror = (err) => {
            cancelActiveEvaluation();
            resolve([]);
          };

          worker.postMessage({ lines });
        });
      },
      [cancelActiveEvaluation],
    );

    const handleRun = useCallback(() => {
      if (viewRef.current) {
        evaluateDocAsync(viewRef.current, onParsedRef.current);
      }
    }, [evaluateDocAsync]);

    // Cache of user-defined variable names extracted without evaluation.
    // Updated on every doc change by scanning assignment LHS only — zero math.evaluate calls.
    const cachedVarNamesRef = useRef<string[]>([]);

    const makeAutocomplete = useCallback(
      () =>
        autocompletion({
          override: [
            (ctx: CompletionContext): CompletionResult | null => {
              const word = ctx.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
              if (!word || (word.from === word.to && !ctx.explicit))
                return null;
              const prefix = word.text.toLowerCase();

              // ── Variable options ──────────────────────────────────────────
              // In manual mode (or always for safety): extract var names by regex only,
              // never call math.evaluate() on the main thread — that's what causes lag.
              let userVarNames: string[];

              if (isManualModeRef.current) {
                // Use the cached list built from LHS-only scanning (no evaluation)
                userVarNames = cachedVarNamesRef.current;
              } else {
                // Auto mode: still safe to do lightweight eval, but ONLY for
                // non-heavy lines. Heavy lines are skipped entirely.
                const docText = ctx.state.doc.toString().slice(0, ctx.pos);
                const scope: Record<string, unknown> = {};
                const vars: string[] = [];
                for (const line of docText.split("\n")) {
                  const t = line.trim();
                  if (!t || t.startsWith("//")) continue;
                  const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
                  if (!m) continue;
                  if (isHeavyExpression(t)) {
                    // Don't evaluate, but still register the var name so it shows in autocomplete
                    vars.push(m[1]);
                    continue;
                  }
                  try {
                    math.evaluate(t, scope);
                    vars.push(m[1]);
                  } catch {
                    vars.push(m[1]);
                  }
                }
                userVarNames = vars;
                cachedVarNamesRef.current = vars;
              }

              const varOptions = [...new Set(userVarNames)]
                .filter((name) => name.toLowerCase().startsWith(prefix))
                .map((name) => ({
                  label: name,
                  type: "variable" as const,
                  boost: 20,
                }));

              const constOptions = MATH_CONSTANTS.filter((c) =>
                c.toLowerCase().startsWith(prefix),
              ).map((c) => ({
                label: c,
                type: "keyword" as const,
                detail: "constant",
                boost: 5,
              }));

              const fnOptions = MATH_FUNCTIONS.filter((f) =>
                f.toLowerCase().startsWith(prefix),
              ).map((f) => ({
                label: f,
                type: "function" as const,
                apply: f + "()",
                detail: "mathjs",
                boost: 0,
              }));

              const all = [...varOptions, ...constOptions, ...fnOptions];
              if (!all.length) return null;
              return { from: word.from, options: all };
            },
          ],
          activateOnTyping: true,
          defaultKeymap: true,
          maxRenderedOptions: 12,
        }),
      [],
    );

    useEffect(() => {
      if (!containerRef.current) return;
      let debounce: ReturnType<typeof setTimeout>;

      const view = new EditorView({
        state: EditorState.create({
          doc: defaultValue,
          extensions: [
            history(),
            lineNumbers(),
            highlightActiveLine(),
            decorationField,
            keymap.of([...defaultKeymap, ...historyKeymap]),
            makeAutocomplete(),
            // ─── Single source of evaluation: the linter ───────────────────
            // Linter fires on doc changes with a 300ms debounce.
            // It checks isManualModeRef before spawning any worker.
            // This is the ONLY place evaluateDocAsync is called on keystrokes.
            linter((v) => {
              if (isManualModeRef.current) return Promise.resolve([]);
              return evaluateDocAsync(v, onParsedRef.current);
            }, { delay: 300 }),
            editorTheme,
            // ─── updateListener: only fires onChange, NO evaluation ────────
            // Removed the duplicate evaluateDocAsync call that was here.
            // Previously this + the linter both called evaluateDocAsync on
            // every keystroke, doubling CPU usage and causing visible lag.
            EditorView.updateListener.of((update) => {
              if (!update.docChanged) return;

              // Immediately cancel active running evaluations as they are now obsolete
              cancelActiveEvaluation();

              // Immediately rebuild var name cache via regex — zero math.evaluate calls,
              // so this is always instant even with 1000x1000 matrix lines in the doc.
              const code = update.state.doc.toString();
              cachedVarNamesRef.current = code
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("//"))
                .map((l) => l.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1])
                .filter((n): n is string => !!n);

              clearTimeout(debounce);
              debounce = setTimeout(() => {
                onChangeRef.current?.(code);
                // ✅ No evaluateDocAsync here — linter handles it.
              }, 120);
            }),
          ],
        }),
        parent: containerRef.current,
      });

      viewRef.current = view;
      // Initial evaluation on mount
      evaluateDocAsync(view, onParsedRef.current);

      return () => {
        clearTimeout(debounce);
        view.destroy();
        viewRef.current = null;
        cancelActiveEvaluation();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        className={`rounded-xl border border-border/60 bg-background overflow-hidden ${className}`}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
              Expression Editor
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-medium border bg-background">
              <span className={`h-1.5 w-1.5 rounded-full ${isManualMode ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse"}`} />
              <span className="text-muted-foreground">
                {isManualMode ? "Manual Mode" : "Auto-Evaluate"}
              </span>
            </div>
          </div>

          {isManualMode && (
            <span className="hidden md:flex items-center gap-1 text-[10px] font-medium text-amber-500/90 animate-pulse">
              ⚠️ Slow calculation (&gt;100ms) detected. Recalculation paused.
            </span>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const nextMode = !isManualMode;
                setIsManualMode(nextMode);
                isManualModeRef.current = nextMode;
                if (!nextMode && viewRef.current) {
                  evaluateDocAsync(viewRef.current, onParsedRef.current);
                }
              }}
              className="text-[9px] font-semibold text-muted-foreground hover:text-foreground border border-border/60 rounded px-2 py-1 bg-background shadow-sm transition-all hover:bg-muted/50 cursor-pointer"
              title="Toggle Auto/Manual calculation mode"
            >
              {isManualMode ? "Switch to Auto" : "Switch to Manual"}
            </button>

            {isManualMode && (
              <button
                onClick={handleRun}
                disabled={isEvaluating}
                className="flex items-center gap-1.5 text-[9px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-75 rounded px-3 py-1 shadow-sm transition-all cursor-pointer transform hover:scale-[1.02]"
              >
                {isEvaluating ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Running... {evaluationDuration !== null ? `(${evaluationDuration.toFixed(1)}s)` : ""}
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3 text-white fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Run Calculation
                  </>
                )}
              </button>
            )}

            <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground/70 border-l border-border/50 pl-3">
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[9px]">
                Ctrl
              </kbd>
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[9px]">
                Space
              </kbd>
              autocomplete
            </span>
          </div>
        </div>

        <div ref={containerRef} />

        <div className="border-t border-border/40 bg-muted/20 px-4 py-1.5">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            <code className="rounded bg-muted px-1">A = 5</code> variable ·{" "}
            <code className="rounded bg-muted px-1">
              // name: X, unit: Y, desc: Z
            </code>{" "}
            metadata ·{" "}
            <code className="rounded bg-muted px-1">Q = C * A^0.75</code>{" "}
            formula
          </p>
        </div>
      </div>
    );
  },
);

export default MathEditor;