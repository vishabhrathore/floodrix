"use client";

/**
 * MathEditor — CodeMirror 6 + MathJS
 *
 * Features:
 *  ✅ Autocomplete: mathjs functions + previously defined variables
 *  ✅ Inline Quokka-style results (widget decoration on each line)
 *  ✅ Squiggly error underlines with diagnostic messages
 *  ✅ Comment metadata parsing: // name: X, unit: Y, desc: Z
 *  ✅ onParsed callback → feeds FormulaForm
 *
 * Install:
 *   npm install codemirror @codemirror/view @codemirror/state \
 *     @codemirror/language @codemirror/commands @codemirror/autocomplete \
 *     @codemirror/lint mathjs
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
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
  "abs",
  "acos",
  "acosh",
  "acot",
  "acoth",
  "acsc",
  "acsch",
  "add",
  "and",
  "arg",
  "asec",
  "asech",
  "asin",
  "asinh",
  "atan",
  "atan2",
  "atanh",
  "cbrt",
  "ceil",
  "combinations",
  "compare",
  "complex",
  "concat",
  "conj",
  "cos",
  "cosh",
  "cot",
  "coth",
  "cross",
  "csc",
  "csch",
  "cube",
  "det",
  "diag",
  "diff",
  "distance",
  "divide",
  "dot",
  "dotDivide",
  "dotMultiply",
  "dotPow",
  "erf",
  "exp",
  "expm1",
  "factorial",
  "filter",
  "fix",
  "flatten",
  "floor",
  "format",
  "gamma",
  "gcd",
  "hypot",
  "identity",
  "im",
  "inv",
  "isFinite",
  "isInteger",
  "isNaN",
  "isNegative",
  "isPositive",
  "isPrime",
  "isZero",
  "kron",
  "larger",
  "largerEq",
  "lcm",
  "leftShift",
  "lgamma",
  "log",
  "log10",
  "log1p",
  "log2",
  "lsolve",
  "lup",
  "lusolve",
  "mad",
  "map",
  "matrix",
  "max",
  "mean",
  "median",
  "min",
  "mod",
  "mode",
  "multiply",
  "norm",
  "not",
  "nthRoot",
  "number",
  "ones",
  "or",
  "parse",
  "permutations",
  "pickRandom",
  "pow",
  "prod",
  "qr",
  "quantileSeq",
  "random",
  "randomInt",
  "range",
  "re",
  "reshape",
  "resize",
  "round",
  "row",
  "sec",
  "sech",
  "sign",
  "simplify",
  "sin",
  "sinh",
  "size",
  "smaller",
  "smallerEq",
  "sort",
  "sparse",
  "sqrt",
  "sqrtm",
  "square",
  "squeeze",
  "std",
  "string",
  "subset",
  "subtract",
  "sum",
  "tan",
  "tanh",
  "trace",
  "transpose",
  "typeOf",
  "variance",
  "xgcd",
  "xor",
  "zeros",
  "zeta",
];

const MATH_CONSTANTS = [
  "pi",
  "e",
  "phi",
  "tau",
  "Infinity",
  "NaN",
  "i",
  "true",
  "false",
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

// ─── Evaluator ────────────────────────────────────────────────────────────────

function evaluateDoc(
  view: EditorView,
  onParsed?: (d: EditorParsed) => void,
): Diagnostic[] {
  const doc = view.state.doc;
  const lines = doc.toString().split("\n");

  const scope: Record<string, unknown> = {};
  const decorBuf: { pos: number; deco: Decoration }[] = [];
  const diagnostics: Diagnostic[] = [];

  const inputVarMap = new Map<string, ParsedVariable>();
  const formulaList: ParsedFormula[] = [];
  const varMeta: Record<
    string,
    { name?: string; unit?: string; desc?: string }
  > = {};
  let pendingMeta: { name?: string; unit?: string; desc?: string } | null =
    null;
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const end = offset + raw.length;
    const trim = raw.trim();

    if (!trim) {
      pendingMeta = null;
      offset = end + 1;
      continue;
    }

    // ── Comment line ──
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

    // ── Code line ──
    try {
      const result = math.evaluate(trim, scope);
      const assignM = trim.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      const display = formatVal(result);

      if (assignM) {
        const varName = assignM[1];
        const rhs = trim.slice(trim.indexOf("=") + 1).trim();
        const usedVars = Object.keys(scope).filter(
          (k) => k !== varName && new RegExp(`\\b${k}\\b`).test(rhs),
        );
        const isFormula = usedVars.length > 0;

        if (pendingMeta)
          varMeta[varName] = { ...(varMeta[varName] ?? {}), ...pendingMeta };
        const meta = varMeta[varName] ?? {};
        const val =
          typeof result === "number"
            ? result
            : ((result as { valueOf?: () => unknown })?.valueOf?.() ?? result);

        const varDef: ParsedVariable = {
          notation: varName,
          displayLabel: meta.name || varName,
          unit: meta.unit,
          description: meta.desc,
          dataType:
            typeof val === "number"
              ? "NUMBER"
              : typeof val === "boolean"
                ? "BOOLEAN"
                : "STRING",
          value:
            typeof val === "number" ||
            typeof val === "string" ||
            typeof val === "boolean"
              ? (val as number | string | boolean)
              : undefined,
        };

        if (isFormula) {
          formulaList.push({
            outputNotation: varName,
            expression: rhs,
            fullExpression: trim,
            result:
              typeof val === "number"
                ? parseFloat((val as number).toFixed(6))
                : String(val),
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
    } catch (e) {
      const msg = (e as Error).message.split("\n")[0];
      const cOff = (e as { char?: number }).char ?? 0;
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

    pendingMeta = null;
    offset = end + 1;
  }

  // Commit decorations
  const decoSet = RangeSet.of(
    decorBuf.map((d) => d.deco.range(d.pos)),
    true,
  );
  view.dispatch({ effects: setDecorations.of(decoSet) });

  // Fire callback
  const lastFormula = formulaList[formulaList.length - 1];
  onParsed?.({
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

  return diagnostics;
}

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
  // Autocomplete popup
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
  // Squiggly error underline
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

    const makeAutocomplete = useCallback(
      () =>
        autocompletion({
          override: [
            (ctx: CompletionContext): CompletionResult | null => {
              const word = ctx.matchBefore(/[A-Za-z_][A-Za-z0-9_]*/);
              if (!word || (word.from === word.to && !ctx.explicit))
                return null;
              const prefix = word.text.toLowerCase();

              // Collect user-defined vars up to cursor position
              const docText = ctx.state.doc.toString().slice(0, ctx.pos);
              const scope: Record<string, unknown> = {};
              const userVars: { name: string; value: unknown }[] = [];
              for (const line of docText.split("\n")) {
                const t = line.trim();
                if (!t || t.startsWith("//")) continue;
                const m = t.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
                if (m) {
                  try {
                    math.evaluate(t, scope);
                    userVars.push({ name: m[1], value: scope[m[1]] });
                  } catch {
                    /* skip */
                  }
                }
              }

              const varOptions = [
                ...new Map(userVars.map((v) => [v.name, v])).values(),
              ]
                .filter((v) => v.name.toLowerCase().startsWith(prefix))
                .map((v) => ({
                  label: v.name,
                  type: "variable" as const,
                  detail: `= ${formatVal(v.value)}`,
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
            linter((v) => evaluateDoc(v, onParsedRef.current), { delay: 200 }),
            editorTheme,
            EditorView.updateListener.of((update) => {
              if (!update.docChanged) return;
              clearTimeout(debounce);
              debounce = setTimeout(() => {
                const code = update.state.doc.toString();
                onChangeRef.current?.(code);
                evaluateDoc(update.view, onParsedRef.current);
              }, 120);
            }),
          ],
        }),
        parent: containerRef.current,
      });

      viewRef.current = view;
      evaluateDoc(view, onParsedRef.current);

      return () => {
        clearTimeout(debounce);
        view.destroy();
        viewRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        className={`rounded-xl border border-border/60 bg-background overflow-hidden ${className}`}
      >
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/30">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Expression Editor
          </span>
          <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/70">
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[9px]">
              Ctrl
            </kbd>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[9px]">
              Space
            </kbd>
            autocomplete
          </span>
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
