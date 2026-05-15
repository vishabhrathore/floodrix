import {
  CollaboratorPermission,
  GlobalRole,
  LibraryStatus,
  OrgRole,
  Visibility,
  WorkflowStatus,
} from "@/generated/prisma";

import { RequestContext } from "./context.types";

export function isSuperAdmin(ctx: RequestContext): boolean {
  return ctx.user.globalRole === GlobalRole.SUPER_ADMIN;
}

export function isOrgAdmin(ctx: RequestContext): boolean {
  if (isSuperAdmin(ctx)) return true;
  return (
    ctx.membership?.role === OrgRole.ADMIN ||
    ctx.membership?.role === OrgRole.OWNER
  );
}

export function isOrgMember(ctx: RequestContext): boolean {
  return isSuperAdmin(ctx) || ctx.membership !== null;
}

export function isPublicLibraryItem(item: {
  isSystem?: boolean;
  visibility?: Visibility;
  libraryStatus?: LibraryStatus;
}): boolean {
  if (item.isSystem) return true;
  if (item.visibility === Visibility.PUBLIC) return true;
  if (item.libraryStatus === LibraryStatus.LISTED) return true;
  return false;
}

export function getCollaboratorPermission(
  ctx: RequestContext,
): CollaboratorPermission | null {
  if (!ctx.workflow || !ctx.actor) return null;
  return (
    ctx.workflow.collaborators.find((c) => c.actorId === ctx.actor?.id)
      ?.permission ?? null
  );
}

export function canViewWorkflow(ctx: RequestContext): boolean {
  if (isOrgAdmin(ctx)) return true;
  if (ctx.workflow?.visibility === Visibility.PUBLIC) return isOrgMember(ctx);
  return getCollaboratorPermission(ctx) !== null;
}

export function canEditWorkflow(ctx: RequestContext): boolean {
  if (isOrgAdmin(ctx)) return true;
  const perm = getCollaboratorPermission(ctx);
  return (
    perm === CollaboratorPermission.EDIT ||
    perm === CollaboratorPermission.ADMIN
  );
}

export function canRunWorkflow(ctx: RequestContext): boolean {
  if (!ctx.workflow) return false;
  if (ctx.workflow.status !== WorkflowStatus.PUBLISHED) return false;
  if (ctx.workflow.deletedAt !== null) return false;
  return canEditWorkflow(ctx);
}

export function canAccessRegistryItem(
  ctx: RequestContext,
  item: { visibility: Visibility; createdBy: string | null },
): boolean {
  if (item.visibility === Visibility.PUBLIC) return isOrgMember(ctx);
  if (isOrgAdmin(ctx)) return true;
  return ctx.actor !== null && item.createdBy === ctx.actor.id;
}
