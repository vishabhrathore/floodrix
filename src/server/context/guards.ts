import { TRPCError } from "@trpc/server";

import { evaluatePolicy } from "../policy/policy.engine";
import { ActionType, ResourceType } from "../policy/policy.types";
import { RequestContext } from "./context.types";

export function assertPolicy(
  ctx: RequestContext,
  action: ActionType,
  resource: ResourceType,
) {
  const allowed = evaluatePolicy({ action, resource, context: ctx });

  const logPayload = {
    userId: ctx.user.id,
    actorId: ctx.actor?.id || null,
    orgId: ctx.organization?.id || null,
    action,
    resource,
    timestamp: new Date().toISOString(),
  };

  if (!allowed) {
    console.warn(JSON.stringify({ type: "DENY_AUDIT", ...logPayload }));
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `You do not have permission to ${action} this ${resource}.`,
    });
  } else {
    console.info(JSON.stringify({ type: "ALLOW_AUDIT", ...logPayload }));
  }
}

export function assertCanRunWorkflow(ctx: RequestContext) {
  if (ctx.workflow === null)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Workflow not found or deleted",
    });
  if (ctx.workflow === undefined)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Workflow context not loaded",
    });

  assertPolicy(ctx, "run", "workflow");
}

export function assertSessionAccess(ctx: RequestContext) {
  if (ctx.session === null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this session",
    });
  }
  if (ctx.session === undefined) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Session context not loaded",
    });
  }
}
