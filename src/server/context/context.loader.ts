import { PrismaClient, GlobalRole } from "@/generated/prisma";
import { RequestContext } from "./context.types";
import { TRPCError } from "@trpc/server";

export interface LoadOptions {
    organizationId?: string;
    actorId?: string;
    workflowId?: string;
    sessionId?: string;
    batchJobId?: string;
    workspaceId?: string;
    loadDraftForWorkflow?: boolean;
    formulaRegistryId?: string;
    tableRegistryId?: string;
    calcVersionId?: string;
    loadBilling?: boolean;
}

/**
 * Robust Context Loader
 * 1. Resolves organizationId (either from opts or by looking up the resource)
 * 2. Fetches user membership/actor for that organization
 * 3. Loads all requested resources within that organization boundary
 */
export async function loadContext(
    db: PrismaClient,
    userId: string,
    opts: LoadOptions
): Promise<RequestContext> {

    // ─── 1. Resolve Organization Boundary ──────────────────────────────────
    
    // If organizationId is missing, try to resolve it from the resource itself
    if (!opts.organizationId) {
        if (opts.workflowId) {
            const wf = await db.calcWorkflow.findUnique({ where: { id: opts.workflowId }, select: { organizationId: true } });
            if (wf) opts.organizationId = wf.organizationId;
        } else if (opts.sessionId) {
            const sess = await db.calcSession.findUnique({ 
                where: { id: opts.sessionId }, 
                select: { calcWorkflow: { select: { organizationId: true } } } 
            });
            if (sess) opts.organizationId = sess.calcWorkflow.organizationId;
        } else if (opts.workspaceId) {
            const ws = await db.workspace.findUnique({ where: { id: opts.workspaceId }, select: { organizationId: true } });
            if (ws) opts.organizationId = ws.organizationId;
        }
    }

    // ─── 2. Fetch User & Organization Relations ─────────────────────────────
    
    let userWithRelations: any;

    if (opts.organizationId) {
        userWithRelations = await db.user.findUnique({
            where: { id: userId },
            include: {
                organizationMembers: { where: { organizationId: opts.organizationId } },
                calcActors: { where: { organizationId: opts.organizationId } },
            },
        });
    } else {
        // Fallback to default/primary org if still no ID resolved
        const bareUser = await db.user.findUnique({ where: { id: userId } });
        if (!bareUser) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });

        userWithRelations = { ...bareUser, organizationMembers: [], calcActors: [] };

        const defaultOrg = await db.organization.findFirst({
            where: {
                OR: [
                    { founderId: bareUser.id },
                    { members: { some: { userId: bareUser.id } } }
                ]
            },
            orderBy: { createdAt: 'asc' }
        });

        if (defaultOrg) {
            opts.organizationId = defaultOrg.id;
            const [members, actors] = await Promise.all([
                db.organizationMember.findMany({ where: { userId: bareUser.id, organizationId: defaultOrg.id } }),
                db.calcActor.findMany({ where: { userId: bareUser.id, organizationId: defaultOrg.id } })
            ]);
            userWithRelations.organizationMembers = members;
            userWithRelations.calcActors = actors;
        }
    }

    if (!userWithRelations) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const organization = opts.organizationId
        ? await db.organization.findUnique({ where: { id: opts.organizationId } })
        : null;

    if (opts.organizationId && !organization) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    }

    const membership = userWithRelations.organizationMembers?.[0] ?? null;
    if (opts.organizationId && !membership && userWithRelations.globalRole !== GlobalRole.SUPER_ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a member of this organization" });
    }

    // ─── 3. Actor Validation ────────────────────────────────────────────────
    
    let actor = opts.actorId
        ? userWithRelations.calcActors?.find((a: any) => a.id === opts.actorId && (!opts.organizationId || a.organizationId === opts.organizationId)) ?? null
        : userWithRelations.calcActors?.[0] ?? null;

    // Super Admin Fallback: If no actor is found for this specific org, but the user is a Super Admin,
    // we allow them to use their global identity.
    if (!actor && userWithRelations.globalRole === GlobalRole.SUPER_ADMIN) {
        // Try to find ANY actor for this user
        const globalActor = await db.calcActor.findFirst({
            where: { userId },
            orderBy: { createdAt: 'asc' }
        });
        actor = globalActor ?? null;
    }

    if (opts.actorId && !actor) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid actor or actor does not belong to organization." });
    }

    const isSuperAdmin = userWithRelations.globalRole === GlobalRole.SUPER_ADMIN;
    const isOrgAdmin = isSuperAdmin || membership?.role === "ADMIN" || membership?.role === "OWNER";

    // ─── 4. Parallel Resource Loading ───────────────────────────────────────
    
    const [
        workflow,
        session,
        batchJob,
        workspace,
        formulaItem,
        tableItem,
        calcVersion,
        billingRecords,
        usage,
    ] = await Promise.all([
        opts.workflowId
            ? db.calcWorkflow.findFirst({
                where: {
                    id: opts.workflowId,
                    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                    deletedAt: null,
                },
                include: { collaborators: { select: { actorId: true, permission: true } } },
            })
            : Promise.resolve(undefined),

        opts.sessionId
            ? db.calcSession.findFirst({
                where: {
                    id: opts.sessionId,
                    calcWorkflow: {
                        ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                        deletedAt: null
                    },
                    ...(isOrgAdmin ? {} : { actorId: actor?.id }),
                },
            })
            : Promise.resolve(undefined),

        opts.batchJobId
            ? db.batchJob.findFirst({
                where: {
                    id: opts.batchJobId,
                    calcWorkflow: {
                        ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                        deletedAt: null
                    },
                    ...(isOrgAdmin ? {} : { actorId: actor?.id }),
                },
            })
            : Promise.resolve(undefined),

        opts.workspaceId
            ? db.workspace.findFirst({
                where: {
                    id: opts.workspaceId,
                    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                },
            })
            : Promise.resolve(undefined),

        opts.formulaRegistryId
            ? db.formulaRegistryItem.findFirst({
                where: {
                    id: opts.formulaRegistryId,
                    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                    deletedAt: null,
                },
            })
            : Promise.resolve(undefined),

        opts.tableRegistryId
            ? db.tableRegistryItem.findFirst({
                where: {
                    id: opts.tableRegistryId,
                    ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                    deletedAt: null,
                },
            })
            : Promise.resolve(undefined),

        opts.calcVersionId
            ? db.calcVersion.findFirst({
                where: {
                    id: opts.calcVersionId,
                    calcWorkflow: {
                        ...(opts.organizationId ? { organizationId: opts.organizationId } : {}),
                        deletedAt: null
                    },
                },
            })
            : Promise.resolve(undefined),

        opts.loadBilling && opts.organizationId
            ? db.orgBilling.findMany({
                where: { organizationId: opts.organizationId, status: "ACTIVE" },
                include: { plan: true },
                orderBy: { startedAt: "desc" },
                take: 1,
            })
            : Promise.resolve(undefined),

        opts.loadBilling && opts.organizationId
            ? db.orgUsage.findFirst({
                where: {
                    organizationId: opts.organizationId,
                    periodStart: { lte: new Date() },
                    periodEnd: { gte: new Date() },
                },
            })
            : Promise.resolve(undefined),
    ]);

    let draft = undefined;
    if (opts.loadDraftForWorkflow && opts.workflowId && actor) {
        draft = await db.calcDraft.findUnique({
            where: {
                calcWorkflowId_actorId: {
                    calcWorkflowId: opts.workflowId,
                    actorId: actor.id,
                },
            },
        });
    }

    return {
        user: userWithRelations,
        organization,
        membership,
        actor,
        workflow: opts.workflowId ? (workflow ?? null) : undefined,
        session: opts.sessionId ? (session ?? null) : undefined,
        batchJob: opts.batchJobId ? (batchJob ?? null) : undefined,
        workspace: opts.workspaceId ? (workspace ?? null) : undefined,
        formulaItem: opts.formulaRegistryId ? (formulaItem ?? null) : undefined,
        tableItem: opts.tableRegistryId ? (tableItem ?? null) : undefined,
        calcVersion: opts.calcVersionId ? (calcVersion ?? null) : undefined,
        draft: opts.loadDraftForWorkflow ? (draft ?? null) : undefined,
        billing: opts.loadBilling ? (billingRecords?.[0] ?? null) : undefined,
        usage: opts.loadBilling ? (usage ?? null) : undefined,
    };
}