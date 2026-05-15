// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/DecisionHandler.ts
//
//  DECISION — evaluate a boolean condition. The taken branch's
//  set_variables get applied to the variable store. Nodes reachable ONLY
//  from the not-taken branch get returned as sideEffects.skipNodes so the
//  executor can skip them.
//
//  Skip-set computation: BFS from each not-taken edge target, but exclude
//  any node that's also reachable from the taken branch (or any other path
//  not via this decision). This is conservative — better to execute a node
//  twice than to incorrectly skip one that's needed downstream.
// ═══════════════════════════════════════════════════════════════════════════
import { safeEvaluate } from "@/features/workflow-canvas/engine/formula-validator";

import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import type { ExecutionContext, NodeOutcome, VariableMap } from "../types";

interface DecisionConfig {
  condition?: string;
  branches?: Record<
    string,
    { label?: string; set_variables?: Record<string, unknown> }
  >;
}

export class DecisionHandler implements NodeHandler {
  readonly type = "DECISION" as const;
  readonly timeoutMs = 5_000;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    try {
      const config = (ctx.node.config ?? {}) as DecisionConfig;
      if (!config.condition?.trim()) {
        return toErroredOutcome(
          new Error("DECISION has no condition configured"),
        );
      }

      // Build scope from current numeric/boolean vars
      const snap = ctx.variables.snapshot();
      const scope: Record<string, number | boolean> = {};
      for (const [k, v] of Object.entries(snap)) {
        if (k === "$nodes" || k === "$results") continue;
        if (typeof v === "number" || typeof v === "boolean") scope[k] = v;
      }

      // safeEvaluate enforces returning a number/finite — for a boolean
      // condition we wrap it: mathjs returns 1/0 for true/false comparisons.
      // We allow either: > 0 means truthy.
      let conditionResult: boolean;
      try {
        const numResult = safeEvaluate(config.condition, scope, {
          precision: 0,
          timeoutMs: this.timeoutMs,
        });
        conditionResult = numResult > 0;
      } catch (err) {
        return toErroredOutcome(err);
      }

      const branchTaken = conditionResult ? "true" : "false";
      const branchNotTaken = conditionResult ? "false" : "true";
      const branches = config.branches ?? {};
      const setVars = (branches[branchTaken]?.set_variables ??
        {}) as VariableMap;

      // Apply variables from the taken branch
      for (const [k, v] of Object.entries(setVars)) {
        ctx.variables.set(k, v as never);
      }

      // Compute skip-set: nodes reachable ONLY from the not-taken branch
      const skipNodes = computeSkipSet(ctx.node.id, branchNotTaken, ctx.edges);

      const outputs = setVars;
      ctx.variables.trackNodeOutput(ctx.node.id, ctx.node.label, outputs);

      return {
        kind: "completed",
        outputs,
        result: {
          condition: config.condition,
          evaluatedTo: conditionResult,
          branchTaken,
          varsSet: setVars,
          skippedNodes: skipNodes,
        },
        sideEffects: { skipNodes },
      };
    } catch (err) {
      return toErroredOutcome(err);
    }
  }
}

/**
 * BFS from the not-taken branch's outgoing edges. A node enters the skip set
 * if EVERY path reaching it goes through one of these edges. We approximate
 * this with: a node is skippable if all its inbound edges originate from
 * already-skipped nodes (or from the not-taken edge of the decision itself).
 *
 * Conservative: when in doubt, don't skip. False positives (running a node
 * that shouldn't have run) are recoverable; false negatives (skipping a
 * needed node) silently break results.
 */
function computeSkipSet(
  decisionNodeId: string,
  notTakenHandle: string,
  edges: { sourceNodeId: string; targetNodeId: string; sourceHandle: string }[],
): string[] {
  const notTakenSeeds = edges
    .filter(
      (e) =>
        e.sourceNodeId === decisionNodeId && e.sourceHandle === notTakenHandle,
    )
    .map((e) => e.targetNodeId);

  if (notTakenSeeds.length === 0) return [];

  const skipSet = new Set<string>();
  const queue = [...notTakenSeeds];

  while (queue.length > 0) {
    const candidate = queue.shift()!;
    if (skipSet.has(candidate)) continue;

    // Check inbound edges to candidate. If all of them originate from
    // either the decision's not-taken handle OR from already-skipped nodes,
    // candidate can be skipped.
    const inbound = edges.filter((e) => e.targetNodeId === candidate);
    const allInboundSkippable = inbound.every((e) => {
      if (e.sourceNodeId === decisionNodeId) {
        return e.sourceHandle === notTakenHandle;
      }
      return skipSet.has(e.sourceNodeId);
    });

    if (allInboundSkippable) {
      skipSet.add(candidate);
      // Enqueue downstream
      const downstream = edges
        .filter((e) => e.sourceNodeId === candidate)
        .map((e) => e.targetNodeId);
      for (const next of downstream) {
        if (!skipSet.has(next)) queue.push(next);
      }
    }
  }

  return [...skipSet];
}
