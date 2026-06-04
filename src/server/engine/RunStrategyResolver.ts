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

    // 1. Batch executions always run in background queue
    if (input.batchSize && input.batchSize > 1) {
      return {
        strategy: RunStrategy.BACKGROUND,
        firstAsyncIndex: -1,
        reason: `batch size ${input.batchSize} is greater than 1`,
      };
    }

    // 2. If any node is inherently async (requires queuing/scheduling), route to background
    const firstAsyncIndex = input.nodeTypes.findIndex(isAsyncNodeType);
    if (firstAsyncIndex !== -1) {
      return {
        strategy: RunStrategy.BACKGROUND,
        firstAsyncIndex,
        reason: `workflow contains async node "${input.nodeTypes[firstAsyncIndex]}" at index ${firstAsyncIndex}`,
      };
    }

    // 3. Single-user, synchronous math executions (evaluated via Piscina worker pool)
    return {
      strategy: RunStrategy.INLINE_SYNC,
      firstAsyncIndex: -1,
      reason: "single execution run with sync nodes",
    };
  }
}

/**
 * Retained for backward compatibility with any existing imports.
 */
export const BATCH_THRESHOLD = 25;
