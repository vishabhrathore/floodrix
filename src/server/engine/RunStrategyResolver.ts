// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/RunStrategyResolver.ts
//
//  SIMPLIFIED POLICY (per your direction):
//
//    1. If the workflow contains ANY async node → BACKGROUND_BATCH
//    2. If the workflow contains ANY Formula/CustomCode node with use_worker = true → BACKGROUND_BATCH
//    3. If the workflow contains any Formula node referencing a heavy registry formula → BACKGROUND_BATCH
//    4. Otherwise → INLINE_SYNC
//
// ═══════════════════════════════════════════════════════════════════════════
import type { CalcNodeType } from "@/generated/prisma";

import { RunStrategy, isAsyncNodeType } from "./types";

export interface ResolveInput {
  /** Ordered list of node types in this workflow. */
  nodeTypes: CalcNodeType[];
  /** Optional full list of nodes to check their configs for use_worker flags. */
  nodes?: { type: CalcNodeType; config: any }[];
  /** Optional flag if any referenced registry formulas are marked heavy. */
  hasHeavyRegistryFormula?: boolean;
  /** Number of input rows if this is a batch run. Default 1 for single runs. */
  batchSize?: number;
  /** Force a specific strategy (admin override / testing). */
  forceStrategy?: RunStrategy;
}

export interface ResolveResult {
  strategy: RunStrategy;
  /** Index of the first async node in nodeTypes, or -1 if none. */
  firstAsyncIndex: number;
  /** Human-readable reason this strategy was chosen. For logs / UI / debugging. */
  reason: string;
}

export class RunStrategyResolver {
  resolve(input: ResolveInput): ResolveResult {
    // Admin / test override wins
    if (input.forceStrategy) {
      const firstAsyncIndex = input.nodeTypes.findIndex(isAsyncNodeType);
      return {
        strategy: input.forceStrategy,
        firstAsyncIndex,
        reason: "forced by caller",
      };
    }

    // 1. If any node is inherently async, route to background
    const firstAsyncIndex = input.nodeTypes.findIndex(isAsyncNodeType);
    if (firstAsyncIndex !== -1) {
      return {
        strategy: RunStrategy.BACKGROUND_BATCH,
        firstAsyncIndex,
        reason: `workflow contains async node "${input.nodeTypes[firstAsyncIndex]}" at index ${firstAsyncIndex}`,
      };
    }

    // 2. If any node is explicitly configured as a heavy worker task, route to background
    if (input.nodes) {
      const heavyNodeIndex = input.nodes.findIndex((node) => {
        const config = (node.config ?? {}) as any;
        if (node.type === "FORMULA" || node.type === "CUSTOM_CODE") {
          return config.use_worker === true;
        }
        return false;
      });

      if (heavyNodeIndex !== -1) {
        return {
          strategy: RunStrategy.BACKGROUND_BATCH,
          firstAsyncIndex: heavyNodeIndex,
          reason: `workflow contains a background heavy math node "${input.nodes[heavyNodeIndex].type}" configured with use_worker`,
        };
      }
    }

    // 3. If any referenced registry formula is heavy, route to background
    if (input.hasHeavyRegistryFormula) {
      return {
        strategy: RunStrategy.BACKGROUND_BATCH,
        firstAsyncIndex: input.nodeTypes.indexOf("FORMULA"),
        reason: "workflow contains a formula node referencing a heavy registry formula",
      };
    }

    // 4. Lightweight synchronous execution
    return {
      strategy: RunStrategy.INLINE_SYNC,
      firstAsyncIndex: -1,
      reason: "all nodes are sync and lightweight",
    };
  }
}

/**
 * Retained for backward compatibility with any existing imports.
 */
export const BATCH_THRESHOLD = 25;
