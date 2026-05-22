import { RequestContext } from "@/server/context/context.types";
import { isOrgAdmin, isOrgMember } from "@/server/context/permission";

export function canViewWorkspace(ctx: RequestContext): boolean {
  if (!ctx.workspace) return false;
  return isOrgMember(ctx);
}

export function canEditWorkspace(ctx: RequestContext): boolean {
  if (!ctx.workspace) return false;
  return isOrgAdmin(ctx);
}

export function canDeleteWorkspace(ctx: RequestContext): boolean {
  return canEditWorkspace(ctx);
}
