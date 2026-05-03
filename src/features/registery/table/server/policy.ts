import * as perm from "@/server/context/permission";
import { ResourcePolicyMap } from "@/server/policy/policy.types";
import { canDeleteRegistryItem, canEditRegistryItem, canViewRegistryItem } from "../../formula/server/permission";

export const tablePolicies: ResourcePolicyMap = {
    view: (ctx) => !!ctx.tableItem && canViewRegistryItem(ctx, ctx.tableItem),
    edit: (ctx) => !!ctx.tableItem && canEditRegistryItem(ctx, ctx.tableItem),
    delete: (ctx) => !!ctx.tableItem && canDeleteRegistryItem(ctx, ctx.tableItem),
    create: (ctx) => perm.isOrgMember(ctx) && ctx.actor !== null,
};