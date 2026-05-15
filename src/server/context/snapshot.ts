import { CollaboratorPermission } from "@/generated/prisma";

import { RequestContext } from "./context.types";
import { getCollaboratorPermission, isOrgAdmin } from "./permission";

export interface ExecutionAuthSnapshot {
  actorId: string;
  workflowId: string;
  roleLevel:
    | "ADMIN"
    | "COLLABORATOR_ADMIN"
    | "COLLABORATOR_EDIT"
    | "COLLABORATOR_VIEW"
    | "NONE";
  capturedAt: string;
}

export function createExecutionSnapshot(
  ctx: RequestContext,
): ExecutionAuthSnapshot {
  if (!ctx.actor || !ctx.workflow) {
    throw new Error("Cannot create snapshot: missing actor or workflow");
  }

  let roleLevel: ExecutionAuthSnapshot["roleLevel"] = "NONE";

  if (isOrgAdmin(ctx)) {
    roleLevel = "ADMIN";
  } else {
    const perm = getCollaboratorPermission(ctx);
    if (perm === CollaboratorPermission.ADMIN) roleLevel = "COLLABORATOR_ADMIN";
    else if (perm === CollaboratorPermission.EDIT)
      roleLevel = "COLLABORATOR_EDIT";
    else if (perm === CollaboratorPermission.VIEW)
      roleLevel = "COLLABORATOR_VIEW";
  }

  return {
    actorId: ctx.actor.id,
    workflowId: ctx.workflow.id,
    roleLevel,
    capturedAt: new Date().toISOString(),
  };
}
