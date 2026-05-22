import { TRPCError } from "@trpc/server";

import { GlobalRole, PrismaClient } from "@/generated/prisma";

import { RequestContext } from "./context.types";

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

export async function loadContext(
  db: PrismaClient,
  userId: string,
  opts: LoadOptions,
): Promise<RequestContext> {
  // Dynamically resolve organizationId from resource IDs if not explicitly provided
  if (!opts.organizationId) {
    if (opts.workspaceId) {
      const ws = await db.workspace.findUnique({
        where: { id: opts.workspaceId },
        select: { organizationId: true },
      });
      if (ws) opts.organizationId = ws.organizationId;
    } else if (opts.workflowId) {
      const wf = await db.calcWorkflow.findUnique({
        where: { id: opts.workflowId },
        select: { organizationId: true },
      });
      if (wf) opts.organizationId = wf.organizationId;
    } else if (opts.formulaRegistryId) {
      const f = await db.formulaRegistryItem.findUnique({
        where: { id: opts.formulaRegistryId },
        select: { organizationId: true },
      });
      if (f) opts.organizationId = f.organizationId;
    } else if (opts.tableRegistryId) {
      const t = await db.tableRegistryItem.findUnique({
        where: { id: opts.tableRegistryId },
        select: { organizationId: true },
      });
      if (t) opts.organizationId = t.organizationId;
    }
  }

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
    // 1. Fetch bare user (1 DB call)
    const bareUser = await db.user.findUnique({ where: { id: userId } });

    if (!bareUser)
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });

    // Initialize with empty arrays to prevent downstream mapping errors
    userWithRelations = {
      ...bareUser,
      organizationMembers: [],
      calcActors: [],
    };

    // 2. Fetch default org and relations (Extra DB calls ONLY when organizationId is not provided)
    const defaultOrg = await db.organization.findFirst({
      where: {
        OR: [
          { founderId: bareUser.id },
          { members: { some: { userId: bareUser.id } } },
        ],
      },
      orderBy: { createdAt: "asc" }, // Default to their oldest/primary organization
    });

    if (defaultOrg) {
      opts.organizationId = defaultOrg.id; // Mutate opts for downstream queries

      // Fetch the relations for this newly discovered org in parallel
      const [members, actors] = await Promise.all([
        db.organizationMember.findMany({
          where: { userId: bareUser.id, organizationId: defaultOrg.id },
        }),
        db.calcActor.findMany({
          where: { userId: bareUser.id, organizationId: defaultOrg.id },
        }),
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
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Organization not found",
    });
  }

  const membership = userWithRelations.organizationMembers?.[0] ?? null;
  if (
    opts.organizationId &&
    !membership &&
    userWithRelations.globalRole !== GlobalRole.SUPER_ADMIN
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this organization",
    });
  }

  // Strict Actor Validation with Org Boundary
  const actor = opts.actorId
    ? (userWithRelations.calcActors?.find(
        (a: any) =>
          a.id === opts.actorId &&
          (!opts.organizationId || a.organizationId === opts.organizationId),
      ) ?? null)
    : (userWithRelations.calcActors?.[0] ?? null);

  if (opts.actorId && !actor) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invalid actor or actor does not belong to organization.",
    });
  }

  const isSuperAdmin = userWithRelations.globalRole === GlobalRole.SUPER_ADMIN;
  const isOrgAdmin =
    isSuperAdmin ||
    membership?.role === "ADMIN" ||
    membership?.role === "OWNER";

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
            ...(opts.organizationId
              ? { organizationId: opts.organizationId }
              : {}),
            deletedAt: null,
          },
          include: {
            collaborators: { select: { actorId: true, permission: true } },
          },
        })
      : Promise.resolve(undefined),

    opts.sessionId
      ? db.calcSession.findFirst({
          where: {
            id: opts.sessionId,
            calcWorkflow: {
              ...(opts.organizationId
                ? { organizationId: opts.organizationId }
                : {}),
              deletedAt: null,
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
              ...(opts.organizationId
                ? { organizationId: opts.organizationId }
                : {}),
              deletedAt: null,
            },
            ...(isOrgAdmin ? {} : { actorId: actor?.id }),
          },
        })
      : Promise.resolve(undefined),

    opts.workspaceId
      ? db.workspace.findFirst({
          where: {
            id: opts.workspaceId,
            ...(opts.organizationId
              ? { organizationId: opts.organizationId }
              : {}),
          },
        })
      : Promise.resolve(undefined),

    opts.formulaRegistryId
      ? db.formulaRegistryItem.findFirst({
          where: {
            id: opts.formulaRegistryId,
            ...(opts.organizationId
              ? { organizationId: opts.organizationId }
              : {}),
            deletedAt: null,
          },
        })
      : Promise.resolve(undefined),

    opts.tableRegistryId
      ? db.tableRegistryItem.findFirst({
          where: {
            id: opts.tableRegistryId,
            ...(opts.organizationId
              ? { organizationId: opts.organizationId }
              : {}),
            deletedAt: null,
          },
        })
      : Promise.resolve(undefined),

    opts.calcVersionId
      ? db.calcVersion.findFirst({
          where: {
            id: opts.calcVersionId,
            calcWorkflow: {
              ...(opts.organizationId
                ? { organizationId: opts.organizationId }
                : {}),
              deletedAt: null,
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
