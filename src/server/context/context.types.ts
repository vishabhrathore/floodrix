import {
    User,
    Organization,
    OrganizationMember,
    CalcActor,
    CalcWorkflow,
    CalcSession,
    OrgBilling,
    OrgUsage,
    BatchJob,
    Workspace,
    CalcDraft,
    FormulaRegistryItem,
    TableRegistryItem,
    CalcVersion,
    CollaboratorPermission,
    BillingPlan,
} from "@/generated/prisma";

export type WorkflowWithCollaborators = CalcWorkflow & {
    collaborators: { actorId: string; permission: CollaboratorPermission }[];
};

export type BillingWithPlan = OrgBilling & { plan: BillingPlan };

/**
 * Strict Contract:
 * - undefined = The resource was NOT requested in LoadOptions.
 * - null      = The resource WAS requested, but not found (or soft-deleted).
 */
export interface RequestContext {
    user: User;
    organization?: Organization | null;
    membership: OrganizationMember | null;
    actor: CalcActor | null;

    workflow?: WorkflowWithCollaborators | null;
    session?: CalcSession | null;
    batchJob?: BatchJob | null;
    workspace?: Workspace | null;
    draft?: CalcDraft | null;
    formulaItem?: FormulaRegistryItem | null;
    tableItem?: TableRegistryItem | null;
    calcVersion?: CalcVersion | null;

    billing?: BillingWithPlan | null;
    usage?: OrgUsage | null;
}