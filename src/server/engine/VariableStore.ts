// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/VariableStore.ts
//
//  CHUNK 5 ADDITION: enforce MAX_VARIABLE_BYTES and MAX_STORE_BYTES.
//
//  Rest of the file is unchanged from Chunk 1 \u2014 same deep-clone snapshot,
//  same $nodes/$results tracking. Just adds two guard calls in set() and
//  merge().
//
//  Why enforce:
//    - A future API_CALL handler could dump a 50MB response into the store
//    - That gets snapshotted, JSON-serialized, and written to the DB on
//      every subsequent node completion
//    - One bad node could blow up your DB writes, your memory, and your
//      event payloads all at once
//
//  Limits (from types.ts):
//    MAX_VARIABLE_BYTES = 5 MB \u2014 any single value
//    MAX_STORE_BYTES   = 20 MB \u2014 whole store combined
//
//  If a set() would exceed the limit, we throw. The executor catches the
//  throw via its try/catch in the dispatch loop and turns it into a
//  kind: "errored" outcome, so the session ends cleanly with a meaningful
//  error instead of OOM-crashing the process.
// ═══════════════════════════════════════════════════════════════════════════
import type {
  VariableMap,
  VariableSnapshot,
  VariableStore,
  VariableValue,
} from "./types";
import { MAX_STORE_BYTES, MAX_VARIABLE_BYTES } from "./types";

export class DefaultVariableStore implements VariableStore {
  /** Top-level variables visible to formulas. */
  private vars: VariableMap;
  /** Output by node id (reserved namespace). */
  private nodeOutputs: Record<string, VariableMap> = {};
  /** Output by node label (reserved namespace, human-readable). */
  private labelOutputs: Record<string, VariableMap> = {};
  /** Cached byte size of vars + nodeOutputs + labelOutputs, recomputed lazily. */
  private cachedSizeBytes: number | null = null;

  constructor(initial: VariableMap = {}) {
    this.vars = { ...initial };
  }

  get(key: string): VariableValue | undefined {
    return this.vars[key];
  }

  set(key: string, value: VariableValue): void {
    // CHUNK 5: size enforcement
    const valueBytes = estimateBytes(value);
    if (valueBytes > MAX_VARIABLE_BYTES) {
      throw new Error(
        `Variable "${key}" exceeds maximum size (${valueBytes} bytes > ${MAX_VARIABLE_BYTES} limit). ` +
          `Reduce the output size of the node producing this variable.`,
      );
    }

    // Project what the total will be after the set. If we're replacing an
    // existing key we don't double-count \u2014 estimate delta.
    const existingBytes =
      this.vars[key] !== undefined ? estimateBytes(this.vars[key]) : 0;
    const currentTotal = this.sizeBytes();
    const projectedTotal = currentTotal - existingBytes + valueBytes;

    if (projectedTotal > MAX_STORE_BYTES) {
      throw new Error(
        `Setting "${key}" would exceed store size limit ` +
          `(${projectedTotal} bytes > ${MAX_STORE_BYTES}). ` +
          `The variable store is already at ${currentTotal} bytes.`,
      );
    }

    this.vars[key] = value;
    this.cachedSizeBytes = null;
  }

  has(key: string): boolean {
    return key in this.vars;
  }

  merge(values: VariableMap): void {
    // Apply each one through set() so size enforcement happens per-key.
    for (const [k, v] of Object.entries(values)) {
      this.set(k, v);
    }
  }

  /**
   * Returns a DEEP CLONE of the current store state. Critical for Bug 7
   * fix: if we handed back a shared reference and the caller mutated it,
   * they'd corrupt the engine's state.
   */
  snapshot(): VariableSnapshot {
    return {
      ...deepClone(this.vars),
      $nodes: deepClone(this.nodeOutputs),
      $results: deepClone(this.labelOutputs),
    };
  }

  trackNodeOutput(
    nodeId: string,
    nodeLabel: string,
    outputs: VariableMap,
  ): void {
    // Each tracked output is also subject to the per-variable limit,
    // and contributes to the total store size. We enforce per-record
    // (not per-write) since node outputs can legitimately be somewhat
    // larger than individual variables (they bundle multiple vars).
    const outputBytes = estimateBytes(outputs);
    if (outputBytes > MAX_VARIABLE_BYTES) {
      throw new Error(
        `Node "${nodeLabel}" (${nodeId}) output exceeds size limit ` +
          `(${outputBytes} bytes > ${MAX_VARIABLE_BYTES}).`,
      );
    }

    const projectedTotal = this.sizeBytes() + outputBytes;
    if (projectedTotal > MAX_STORE_BYTES) {
      throw new Error(
        `Tracking output of "${nodeLabel}" would exceed store size ` +
          `(${projectedTotal} > ${MAX_STORE_BYTES}).`,
      );
    }

    this.nodeOutputs[nodeId] = { ...outputs };
    this.labelOutputs[nodeLabel] = { ...outputs };
    this.cachedSizeBytes = null;
  }

  sizeBytes(): number {
    if (this.cachedSizeBytes !== null) return this.cachedSizeBytes;
    const total =
      estimateBytes(this.vars) +
      estimateBytes(this.nodeOutputs) +
      estimateBytes(this.labelOutputs);
    this.cachedSizeBytes = total;
    return total;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Rough byte estimate via JSON.stringify length. Not perfectly accurate
 * (UTF-8 characters can exceed 1 byte each) but good enough as an upper
 * guardrail. We use .length * 2 as a conservative upper bound assuming
 * UTF-16 in-memory representation, matching V8's roughly-accurate accounting.
 *
 * Throws if the value isn't JSON-serializable \u2014 which is what we want, since
 * non-serializable values shouldn't be in the store anyway (they'd break
 * DB writes and network transport later).
 */
function estimateBytes(value: unknown): number {
  try {
    const str = JSON.stringify(value);
    return str ? str.length * 2 : 0;
  } catch {
    // Circular reference or other non-serializable. Return max to force
    // caller to reject; better than silently passing through.
    return Number.MAX_SAFE_INTEGER;
  }
}

function deepClone<T>(v: T): T {
  // structuredClone is in Node \u2265 17 and all modern runtimes. Fallback
  // to JSON.parse(JSON.stringify) if unavailable.
  if (typeof structuredClone === "function") {
    return structuredClone(v);
  }
  return JSON.parse(JSON.stringify(v));
}
