import * as perm from "@/server/context/permission";
import { ResourcePolicyMap } from "@/server/policy/policy.types";

import {
  canDeleteRegistryItem,
  canEditRegistryItem,
  canViewRegistryItem,
} from "./permission";

export const formulaPolicies: ResourcePolicyMap = {
  view: (ctx) => !!ctx.formulaItem && canViewRegistryItem(ctx, ctx.formulaItem),
  edit: (ctx) => !!ctx.formulaItem && canEditRegistryItem(ctx, ctx.formulaItem),
  delete: (ctx) =>
    !!ctx.formulaItem && canDeleteRegistryItem(ctx, ctx.formulaItem),
  create: (ctx) => perm.isOrgMember(ctx) && ctx.actor !== null,
};
