// // ═══════════════════════════════════════════════════════════════════════════
// //  src/server/engine/RunStrategyResolver.ts
// //
// //  Decides HOW a run should execute. The decision happens once, at run start,
// //  and is persisted to session.metadata.runStrategy. Inngest resume functions
// //  read this back so they know whether they should keep running or bail.
// //
// //  Decision matrix:
// //    1. If batchSize >= BATCH_THRESHOLD → BACKGROUND_BATCH
// //    2. Else if the workflow contains ANY async node  → INLINE_ASYNC
// //    3. Else → INLINE_SYNC
// //
// //  That's it. No heuristics, no "might be slow" guessing. The resolver
// //  operates on node types alone.
// // ═══════════════════════════════════════════════════════════════════════════
// import type { CalcNodeType } from "@/generated/prisma";
// import { RunStrategy, isAsyncNodeType } from "./types";
// /**
//  * Batch size at which we always go to background — even if every node is
//  * sync. Protects HTTP timeouts and keeps request capacity healthy.
//  */
// export const BATCH_THRESHOLD = 25;
// export interface ResolveInput {
//     /** Ordered list of node types in this workflow. */
//     nodeTypes: CalcNodeType[];
//     /** Number of input rows if this is a batch run. Default 1 for single runs. */
//     batchSize?: number;
//     /** Force a specific strategy (admin override / testing). */
//     forceStrategy?: RunStrategy;
// }
// export interface ResolveResult {
//     strategy: RunStrategy;
//     /** Index of the first async node in nodeTypes, or -1 if none. */
//     firstAsyncIndex: number;
//     /** Human-readable reason this strategy was chosen. For logs / UI / debugging. */
//     reason: string;
// }
// export class RunStrategyResolver {
//     resolve(input: ResolveInput): ResolveResult {
//         const batchSize = input.batchSize ?? 1;
//         // Admin / test override
//         if (input.forceStrategy) {
//             const firstAsyncIndex = input.nodeTypes.findIndex(isAsyncNodeType);
//             return {
//                 strategy: input.forceStrategy,
//                 firstAsyncIndex,
//                 reason: "forced by caller",
//             };
//         }
//         // Batch threshold — wins over everything else
//         if (batchSize >= BATCH_THRESHOLD) {
//             return {
//                 strategy: RunStrategy.BACKGROUND_BATCH,
//                 firstAsyncIndex: input.nodeTypes.findIndex(isAsyncNodeType),
//                 reason: `batch size ${batchSize} ≥ ${BATCH_THRESHOLD} threshold`,
//             };
//         }
//         // Does the workflow contain any async node?
//         const firstAsyncIndex = input.nodeTypes.findIndex(isAsyncNodeType);
//         if (firstAsyncIndex !== -1) {
//             return {
//                 strategy: RunStrategy.INLINE_ASYNC,
//                 firstAsyncIndex,
//                 reason: `workflow contains async node "${input.nodeTypes[firstAsyncIndex]}" at index ${firstAsyncIndex}`,
//             };
//         }
//         // All sync, small batch size
//         return {
//             strategy: RunStrategy.INLINE_SYNC,
//             firstAsyncIndex: -1,
//             reason: "all nodes sync, single run",
//         };
//     }
// }
// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/RunStrategyResolver.ts
//
//  SIMPLIFIED POLICY (per your direction):
//
//    1. If the workflow contains ANY async node → BACKGROUND_BATCH
//    2. Otherwise → INLINE_SYNC
//
//  INLINE_ASYNC is no longer returned. The enum value still exists in
//  types.ts so existing consumers don't break, but this resolver will
//  never pick it.
//
//  Why simpler:
//    - One decision instead of three
//    - No race conditions around "ran sync prefix inline then Inngest
//      picked up" — either the whole run is in-request, or the whole
//      run is in Inngest from the start
//    - Easier to reason about when debugging "why is my session stuck?"
//
//  Trade-off: a workflow with 10 fast sync nodes followed by 1 API_CALL
//  now pays a ~100ms Inngest hop before ANY node runs. Fine for most
//  use cases; revisit if UX complaints come in.
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

    const firstAsyncIndex = input.nodeTypes.findIndex(isAsyncNodeType);

    if (firstAsyncIndex !== -1) {
      return {
        strategy: RunStrategy.BACKGROUND_BATCH,
        firstAsyncIndex,
        reason: `workflow contains async node "${input.nodeTypes[firstAsyncIndex]}" at index ${firstAsyncIndex}`,
      };
    }

    return {
      strategy: RunStrategy.INLINE_SYNC,
      firstAsyncIndex: -1,
      reason: "all nodes are sync",
    };
  }
}

/**
 * Retained for backward compatibility with any existing imports.
 * Not actually used by this simpler resolver — kept so Chunk 4's bootstrap
 * export doesn't break if anything imports BATCH_THRESHOLD.
 *
 * If you want batch-size based routing later, you can re-introduce it by
 * adding a check here. For now, BACKGROUND_BATCH is triggered purely by
 * node type, not batch size.
 */
export const BATCH_THRESHOLD = 25;
