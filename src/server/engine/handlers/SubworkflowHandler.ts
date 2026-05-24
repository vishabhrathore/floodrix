// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/handlers/SubworkflowHandler.ts
//
//  SUBWORKFLOW node — executes a child workflow session inline.
// ═══════════════════════════════════════════════════════════════════════════
import type { NodeHandler } from "../NodeHandler";
import { toErroredOutcome } from "../NodeHandler";
import { createWorkflowExecutor } from "../bootstrap";
import { CalcContext } from "../calc-context";
import type { ExecutionContext, NodeOutcome } from "../types";

interface SubworkflowNodeConfig {
  linkedWorkflowId?: string;
  linkedVersion?: number | null;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  inheritSharedVariables?: boolean;
  writeBackMode?: "PARENT_SESSION" | "SHARED_SESSION" | "BOTH";
  timeoutMs?: number;
  retryOnError?: boolean;
}

export class SubworkflowHandler implements NodeHandler {
  readonly type = "SUBWORKFLOW" as const;

  async execute(ctx: ExecutionContext): Promise<NodeOutcome> {
    try {
      const config = (ctx.node.config ?? {}) as SubworkflowNodeConfig;

      // 1. RESOLVE — linkedWorkflowId
      const childWorkflowId = config.linkedWorkflowId;
      if (!childWorkflowId) {
        return toErroredOutcome(
          new Error("SUBWORKFLOW node is missing linkedWorkflowId in config"),
        );
      }

      // Fetch parent session metadata to get ancestor chain
      const parentSession = await ctx.db.calcSession.findUnique({
        where: { id: ctx.sessionId },
        select: { metadata: true },
      });
      const metadata = (parentSession?.metadata ?? {}) as Record<string, any>;
      const ancestorChain = (metadata.ancestorWorkflowChain ?? []) as string[];

      // Guard circular references
      if (ancestorChain.includes(childWorkflowId)) {
        return toErroredOutcome(
          new Error(
            `CircularSubworkflowError: workflow "${childWorkflowId}" already in ancestor chain: ${ancestorChain.join(" → ")}`,
          ),
        );
      }

      // Depth limit guard
      if (ancestorChain.length >= 10) {
        return toErroredOutcome(
          new Error(
            "SubworkflowDepthLimitError: Max nesting depth of 10 levels exceeded",
          ),
        );
      }

      // Resolve parent Organization ID from the linked workflow
      const targetWorkflow = await ctx.db.calcWorkflow.findUnique({
        where: { id: childWorkflowId },
        select: { organizationId: true },
      });
      if (!targetWorkflow) {
        return toErroredOutcome(
          new Error(
            `SubworkflowError: linked workflow "${childWorkflowId}" not found`,
          ),
        );
      }
      const organizationId = targetWorkflow.organizationId;

      // Fetch WorkspaceSession to get sharedVariables
      const run = await ctx.db.workspaceSessionRun.findFirst({
        where: { calcSessionId: ctx.sessionId },
        include: { workspaceSession: true },
      });
      const workspaceSession = run?.workspaceSession;
      const sharedVariables = (workspaceSession?.sharedVariables ??
        {}) as Record<string, any>;

      // 2. BUILD — construct child input variables from inputMapping + sharedVariables
      const childInputVars: Record<string, any> = {};

      // Step 1: Inherit shared variables if configured
      if (config.inheritSharedVariables !== false) {
        Object.assign(childInputVars, sharedVariables);
      }

      // Step 2: Apply explicit inputMapping (overrides shared vars)
      const inputMapping = config.inputMapping ?? {};
      const parentVars = ctx.variables.snapshot();

      for (const [childKey, parentKey] of Object.entries(inputMapping)) {
        let value: any;
        if (parentKey.startsWith("__literal__")) {
          // __literal__ prefix convention for hardcoded inputs
          const literalStr = parentKey.slice("__literal__".length);
          try {
            value = JSON.parse(literalStr);
          } catch {
            value = literalStr;
          }
        } else {
          value = parentVars[parentKey] ?? sharedVariables[parentKey];
        }

        if (value === undefined) {
          return toErroredOutcome(
            new Error(
              `SubworkflowInputError: parent variable "${parentKey}" not found in parent session or workspace shared memory`,
            ),
          );
        }

        // Deep clone input variable to prevent reference mutations (Pitfall #2)
        childInputVars[childKey] = JSON.parse(JSON.stringify(value));
      }

      // 3. SPAWN & EXECUTE — run child session recursively using a nested WorkflowExecutor
      const isLive = ctx.liveUpdates ?? false;
      const childCtx = new CalcContext(ctx.db, ctx.actorId, organizationId);
      const childExecutor = createWorkflowExecutor(childCtx, {
        skipHandlerValidation: true,
        liveUpdates: isLive,
      });

      // Run execution
      const childResult = await childExecutor.startExecution(
        childWorkflowId,
        ctx.actorId,
        childInputVars,
        {
          stepMode: false,
          liveUpdates: isLive,
          parentSessionId: ctx.sessionId,
          ancestorWorkflowChain: [...ancestorChain, ctx.workflowId],
        },
      );

      // Handle child session errors
      if (childResult.status === "ERRORED") {
        return toErroredOutcome(
          new Error(
            `Child session ${childResult.sessionId} failed: ${childResult.error?.message}`,
          ),
        );
      }

      if (childResult.status === "PAUSED") {
        return {
          kind: "paused",
          reason: childResult.pauseReason ?? "awaiting_user_input",
          fields: childResult.pausedNode?.fields,
          nodeLabel: childResult.pausedNode?.nodeLabel,
          pauseMessage: childResult.pausedNode?.message,
        };
      }

      // Fetch completed child variables
      const completedChild = await ctx.db.calcSession.findUniqueOrThrow({
        where: { id: childResult.sessionId },
      });
      const childVars = (completedChild.variables ?? {}) as Record<string, any>;

      // 4. EXTRACT & WRITE — map child outputs back to parent
      const outputMapping = config.outputMapping ?? {};
      const outputVars: Record<string, any> = {};

      for (const [parentKey, childKey] of Object.entries(outputMapping)) {
        const value = childVars[childKey];
        if (value === undefined) {
          return toErroredOutcome(
            new Error(
              `SubworkflowOutputError: child output "${childKey}" not found in finished session`,
            ),
          );
        }
        outputVars[parentKey] = value;
      }

      // Write-back modes (PARENT_SESSION, SHARED_SESSION, BOTH)
      const writeBackMode = config.writeBackMode ?? "PARENT_SESSION";

      // PARENT_SESSION or BOTH: outputs are returned to parent variables
      const parentSessionOutputs: Record<string, any> = {};
      if (writeBackMode === "PARENT_SESSION" || writeBackMode === "BOTH") {
        for (const [parentKey, val] of Object.entries(outputVars)) {
          ctx.variables.set(parentKey, val);
          parentSessionOutputs[parentKey] = val;
        }
      }

      // SHARED_SESSION or BOTH: write directly to workspace shared variables
      if (
        (writeBackMode === "SHARED_SESSION" || writeBackMode === "BOTH") &&
        workspaceSession
      ) {
        await ctx.db.workspaceSession.update({
          where: { id: workspaceSession.id },
          data: {
            sharedVariables: {
              ...sharedVariables,
              ...outputVars,
            },
          },
        });
      }

      return {
        kind: "completed",
        outputs: parentSessionOutputs,
        result: {
          childSessionId: childResult.sessionId,
          childStatus: childResult.status,
          durationMs: completedChild.duration ?? 0,
        },
      };
    } catch (err) {
      return toErroredOutcome(err);
    }
  }
}
