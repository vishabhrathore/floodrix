import {
  CollaboratorPermission,
  LibraryStatus,
  Visibility,
  WorkflowStatus,
} from "@/generated/prisma";
import { RequestContext } from "@/server/context/context.types";
import { isOrgAdmin, isOrgMember } from "@/server/context/permission";

export function getCollaboratorPermission(
  ctx: RequestContext,
): CollaboratorPermission | null {
  if (!ctx.workflow || !ctx.actor) return null;
  const collab = ctx.workflow.collaborators?.find(
    (c) => c.actorId === ctx.actor?.id,
  );
  return collab?.permission ?? null;
}

export function canViewWorkflow(ctx: RequestContext): boolean {
  if (!ctx.workflow) return false;
  if (ctx.workflow.libraryStatus === LibraryStatus.LISTED) {
    return true;
  }
  if (isOrgAdmin(ctx)) return true;
  if (ctx.workflow.visibility === Visibility.PUBLIC) return isOrgMember(ctx);

  return getCollaboratorPermission(ctx) !== null;
}

export function canEditWorkflow(ctx: RequestContext): boolean {
  if (!ctx.workflow) return false;
  if (isOrgAdmin(ctx)) return true;
  const perm = getCollaboratorPermission(ctx);
  return (
    perm === CollaboratorPermission.EDIT ||
    perm === CollaboratorPermission.ADMIN
  );
}

export function canDeleteWorkflow(ctx: RequestContext): boolean {
  if (!ctx.workflow) return false;
  if (isOrgAdmin(ctx)) return true;
  return getCollaboratorPermission(ctx) === CollaboratorPermission.ADMIN;
}

export function canRunWorkflow(ctx: RequestContext): boolean {
  if (!ctx.workflow) return false;
  if (
    ctx.workflow.libraryStatus === LibraryStatus.LISTED &&
    ctx.workflow.status === WorkflowStatus.PUBLISHED
  ) {
    return true;
  }

  if (ctx.workflow.status !== WorkflowStatus.PUBLISHED) {
    return canEditWorkflow(ctx);
  }
  return false;
}
