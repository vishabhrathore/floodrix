import { Visibility } from "@/generated/prisma";
import { RequestContext } from "@/server/context/context.types";
import {
  isOrgAdmin,
  isPublicLibraryItem,
  isSuperAdmin,
} from "@/server/context/permission";

type RegistryItemContext = {
  visibility: Visibility;
  createdBy: string | null;
  isSystem: boolean;
};
export function canViewRegistryItem(
  ctx: RequestContext,
  item: RegistryItemContext,
): boolean {
  if (isPublicLibraryItem(item)) return true;
  if (isOrgAdmin(ctx)) return true;
  return ctx.actor !== null && item.createdBy === ctx.actor.id;
}

export function canEditRegistryItem(
  ctx: RequestContext,
  item: RegistryItemContext,
): boolean {
  if (item.isSystem) {
    return isSuperAdmin(ctx);
  }

  if (isOrgAdmin(ctx)) return true;
  return ctx.actor !== null && item.createdBy === ctx.actor.id;
}

export function canDeleteRegistryItem(
  ctx: RequestContext,
  item: RegistryItemContext,
): boolean {
  return canEditRegistryItem(ctx, item);
}
