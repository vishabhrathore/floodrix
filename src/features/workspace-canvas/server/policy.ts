import * as perm from "@/server/context/permission";
import { ResourcePolicyMap } from "@/server/policy/policy.types";

import {
  canDeleteWorkspace,
  canEditWorkspace,
  canViewWorkspace,
} from "./permission";

export const workspacePolicies: ResourcePolicyMap = {
  view: (ctx) => !!ctx.workspace && canViewWorkspace(ctx),
  edit: (ctx) => !!ctx.workspace && canEditWorkspace(ctx),
  delete: (ctx) => !!ctx.workspace && canDeleteWorkspace(ctx),
  create: (ctx) => perm.isOrgMember(ctx),
};
