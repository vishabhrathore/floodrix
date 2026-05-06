import { isOrgMember } from "@/server/context/permission";
import { ResourcePolicyMap } from "@/server/policy/policy.types";
import { canDeleteWorkflow, canEditWorkflow, canRunWorkflow, canViewWorkflow } from "./permission";

export const workflowPolicies: ResourcePolicyMap = {
    view: (ctx) => canViewWorkflow(ctx),
    edit: (ctx) => canEditWorkflow(ctx),
    delete: (ctx) => canDeleteWorkflow(ctx),
    run: (ctx) => canRunWorkflow(ctx),
    create: (ctx) => isOrgMember(ctx) && ctx.actor !== null,
};