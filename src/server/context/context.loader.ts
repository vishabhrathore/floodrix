import { TRPCError } from "@trpc/server";
import {
  GlobalRole,
  PrismaClient,
  User,
  OrganizationMember,
  CalcActor,
} from "@/generated/prisma";
import { RequestContext } from "./context.types";
import { AppCache } from "@/lib/cache";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

export type UserWithRelations = User & {
  organizationMembers: OrganizationMember[];
  calcActors: CalcActor[];
};

interface ResolvedPermissions {
  isSuperAdmin: boolean;
  isOrgAdmin: boolean;
  membership: OrganizationMember | null;
  actor: CalcActor | null;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Runs a query only when condition is true, otherwise resolves undefined. */
function ifEnabled<T>(condition: boolean, fn: () => Promise<T>): Promise<T | undefined> {
  return condition ? fn() : Promise.resolve(undefined);
}

// ─────────────────────────────────────────────
// Step 1 — Resolve organization ID from resource IDs
// ─────────────────────────────────────────────

async function resolveOrganizationId(
  db: PrismaClient,
  opts: LoadOptions,
): Promise<string | undefined> {
  if (opts.organizationId) return opts.organizationId;

  if (opts.workspaceId) {
    const cacheKey = `map:workspace:${opts.workspaceId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const ws = await db.workspace.findUnique({
      where: { id: opts.workspaceId },
      select: { organizationId: true },
    });
    if (ws?.organizationId) {
      await AppCache.setString(cacheKey, ws.organizationId, 3600);
    }
    return ws?.organizationId;
  }

  if (opts.workflowId) {
    const cacheKey = `map:workflow:${opts.workflowId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const wf = await db.calcWorkflow.findUnique({
      where: { id: opts.workflowId },
      select: { organizationId: true },
    });
    if (wf?.organizationId) {
      await AppCache.setString(cacheKey, wf.organizationId, 3600);
    }
    return wf?.organizationId;
  }

  if (opts.formulaRegistryId) {
    const cacheKey = `map:formula:${opts.formulaRegistryId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const f = await db.formulaRegistryItem.findUnique({
      where: { id: opts.formulaRegistryId },
      select: { organizationId: true },
    });
    if (f?.organizationId) {
      await AppCache.setString(cacheKey, f.organizationId, 3600);
    }
    return f?.organizationId;
  }

  if (opts.tableRegistryId) {
    const cacheKey = `map:table:${opts.tableRegistryId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const t = await db.tableRegistryItem.findUnique({
      where: { id: opts.tableRegistryId },
      select: { organizationId: true },
    });
    if (t?.organizationId) {
      await AppCache.setString(cacheKey, t.organizationId, 3600);
    }
    return t?.organizationId;
  }

  if (opts.sessionId) {
    const cacheKey = `map:session:${opts.sessionId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const sess = await db.calcSession.findUnique({
      where: { id: opts.sessionId },
      select: { calcWorkflow: { select: { organizationId: true } } },
    });
    const orgId = sess?.calcWorkflow.organizationId;
    if (orgId) {
      await AppCache.setString(cacheKey, orgId, 3600);
    }
    return orgId;
  }

  if (opts.batchJobId) {
    const cacheKey = `map:batchjob:${opts.batchJobId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const job = await db.batchJob.findUnique({
      where: { id: opts.batchJobId },
      select: { calcWorkflow: { select: { organizationId: true } } },
    });
    const orgId = job?.calcWorkflow.organizationId;
    if (orgId) {
      await AppCache.setString(cacheKey, orgId, 3600);
    }
    return orgId;
  }

  if (opts.calcVersionId) {
    const cacheKey = `map:version:${opts.calcVersionId}:orgId`;
    const cached = await AppCache.getString(cacheKey);
    if (cached) return cached;
    const ver = await db.calcVersion.findUnique({
      where: { id: opts.calcVersionId },
      select: { calcWorkflow: { select: { organizationId: true } } },
    });
    const orgId = ver?.calcWorkflow.organizationId;
    if (orgId) {
      await AppCache.setString(cacheKey, orgId, 3600);
    }
    return orgId;
  }

  return undefined;
}

// ─────────────────────────────────────────────
// Step 2 — Load user with org membership & actors
// ─────────────────────────────────────────────

async function loadUserWithRelations(
  db: PrismaClient,
  userId: string,
  organizationId: string | undefined,
): Promise<{ user: UserWithRelations; resolvedOrgId: string | undefined }> {
  const cacheKey = `user-relations:${userId}:${organizationId || "none"}`;

  const cached = await AppCache.get<{ user: UserWithRelations; resolvedOrgId: string | undefined }>(cacheKey);
  if (cached) return cached;

  let result: { user: UserWithRelations; resolvedOrgId: string | undefined };

  if (organizationId) {
    const [user, members, actors] = await Promise.all([
      db.user.findUnique({ where: { id: userId } }),
      db.organizationMember.findMany({
        where: { userId, organizationId },
      }),
      db.calcActor.findMany({
        where: { userId, organizationId },
      }),
    ]);

    if (!user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    result = {
      user: {
        ...user,
        organizationMembers: members,
        calcActors: actors,
      } as UserWithRelations,
      resolvedOrgId: organizationId,
    };
  } else {
    // No org yet — fetch bare user then discover default org
    const bareUser = await db.user.findUnique({ where: { id: userId } });
    if (!bareUser) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    }

    const defaultOrg = await db.organization.findFirst({
      where: {
        OR: [
          { founderId: bareUser.id },
          { members: { some: { userId: bareUser.id } } },
        ],
      },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultOrg) {
      result = {
        user: { ...bareUser, organizationMembers: [], calcActors: [] } as UserWithRelations,
        resolvedOrgId: undefined,
      };
    } else {
      const [members, actors] = await Promise.all([
        db.organizationMember.findMany({
          where: { userId: bareUser.id, organizationId: defaultOrg.id },
        }),
        db.calcActor.findMany({
          where: { userId: bareUser.id, organizationId: defaultOrg.id },
        }),
      ]);

      result = {
        user: {
          ...bareUser,
          organizationMembers: members,
          calcActors: actors,
        } as UserWithRelations,
        resolvedOrgId: defaultOrg.id,
      };
    }
  }

  await AppCache.set(cacheKey, result, 300);

  return result;
}

// ─────────────────────────────────────────────
// Step 3 — Resolve permissions & validate access
// ─────────────────────────────────────────────

function resolvePermissions(
  user: UserWithRelations,
  organizationId: string | undefined,
  requestedActorId: string | undefined,
): ResolvedPermissions {
  const membership = user.organizationMembers?.[0] ?? null;
  const isSuperAdmin = user.globalRole === GlobalRole.SUPER_ADMIN;
  const isOrgAdmin =
    isSuperAdmin || membership?.role === "ADMIN" || membership?.role === "OWNER";

  if (organizationId && !membership && !isSuperAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not a member of this organization",
    });
  }

  const actor = requestedActorId
    ? (user.calcActors?.find(
      (a) =>
        a.id === requestedActorId &&
        (!organizationId || a.organizationId === organizationId),
    ) ?? null)
    : (user.calcActors?.[0] ?? null);

  if (requestedActorId && !actor) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Invalid actor or actor does not belong to organization.",
    });
  }

  return { isSuperAdmin, isOrgAdmin, membership, actor };
}

// ─────────────────────────────────────────────
// Step 4 — Load organization record
// ─────────────────────────────────────────────

async function loadOrganization(db: PrismaClient, organizationId: string | undefined) {
  if (!organizationId) return null;

  const cacheKey = `org:${organizationId}`;
  const cached = await AppCache.get<any>(cacheKey);
  if (cached) return cached;

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
  }

  await AppCache.set(cacheKey, organization, 3600);

  return organization;
}

// ─────────────────────────────────────────────
// Step 5 — Load requested resources in parallel
// ─────────────────────────────────────────────

async function loadResources(
  db: PrismaClient,
  opts: LoadOptions,
  organizationId: string | undefined,
  isOrgAdmin: boolean,
  actorId: string | undefined,
) {
  const orgFilter = organizationId ? { organizationId } : {};
  const nonDeletedOrgWorkflow = { ...orgFilter, deletedAt: null };

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
    ifEnabled(!!opts.workflowId, async () => {
      const cacheKey = `res:workflow:${opts.workflowId!}`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const workflow = await db.calcWorkflow.findFirst({
        where: { id: opts.workflowId!, ...nonDeletedOrgWorkflow },
        include: {
          collaborators: { select: { actorId: true, permission: true } },
        },
      });
      if (workflow) {
        await AppCache.set(cacheKey, workflow, 3600);
      }
      return workflow;
    }),

    ifEnabled(!!opts.sessionId, async () => {
      const cacheKey = `res:session:${opts.sessionId!}`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) {
        if (cached.pausedAt) cached.pausedAt = new Date(cached.pausedAt);
        if (cached.startedAt) cached.startedAt = new Date(cached.startedAt);
        if (cached.completedAt) cached.completedAt = new Date(cached.completedAt);
        if (cached.createdAt) cached.createdAt = new Date(cached.createdAt);
        if (cached.updatedAt) cached.updatedAt = new Date(cached.updatedAt);
        return cached;
      }
      const session = await db.calcSession.findFirst({
        where: {
          id: opts.sessionId!,
          calcWorkflow: nonDeletedOrgWorkflow,
          ...(isOrgAdmin ? {} : { actorId }),
        },
      });
      if (session) {
        await AppCache.set(cacheKey, session, 3600);
      }
      return session;
    }),

    ifEnabled(!!opts.batchJobId, () =>
      db.batchJob.findFirst({
        where: {
          id: opts.batchJobId!,
          calcWorkflow: nonDeletedOrgWorkflow,
          ...(isOrgAdmin ? {} : { actorId }),
        },
      }),
    ),

    ifEnabled(!!opts.workspaceId, async () => {
      const cacheKey = `res:workspace:${opts.workspaceId!}`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const workspace = await db.workspace.findFirst({
        where: { id: opts.workspaceId!, ...orgFilter },
      });
      if (workspace) {
        await AppCache.set(cacheKey, workspace, 3600);
      }
      return workspace;
    }),

    ifEnabled(!!opts.formulaRegistryId, async () => {
      const cacheKey = `res:formula:${opts.formulaRegistryId!}`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const formula = await db.formulaRegistryItem.findFirst({
        where: { id: opts.formulaRegistryId!, ...nonDeletedOrgWorkflow },
      });
      if (formula) {
        await AppCache.set(cacheKey, formula, 3600);
      }
      return formula;
    }),

    ifEnabled(!!opts.tableRegistryId, async () => {
      const cacheKey = `res:table:${opts.tableRegistryId!}`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const table = await db.tableRegistryItem.findFirst({
        where: { id: opts.tableRegistryId!, ...nonDeletedOrgWorkflow },
      });
      if (table) {
        await AppCache.set(cacheKey, table, 3600);
      }
      return table;
    }),

    ifEnabled(!!opts.calcVersionId, async () => {
      const cacheKey = `res:version:${opts.calcVersionId!}`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const version = await db.calcVersion.findFirst({
        where: {
          id: opts.calcVersionId!,
          calcWorkflow: nonDeletedOrgWorkflow,
        },
      });
      if (version) {
        await AppCache.set(cacheKey, version, 3600);
      }
      return version;
    }),

    ifEnabled(!!(opts.loadBilling && organizationId), async () => {
      const cacheKey = `org:${organizationId}:billing`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const records = await db.orgBilling.findMany({
        where: { organizationId: organizationId!, status: "ACTIVE" },
        include: { plan: true },
        orderBy: { startedAt: "desc" },
        take: 1,
      });
      await AppCache.set(cacheKey, records, 3600);
      return records;
    }),

    ifEnabled(!!(opts.loadBilling && organizationId), async () => {
      const cacheKey = `org:${organizationId}:usage`;
      const cached = await AppCache.get<any>(cacheKey);
      if (cached) return cached;
      const record = await db.orgUsage.findFirst({
        where: {
          organizationId: organizationId!,
          periodStart: { lte: new Date() },
          periodEnd: { gte: new Date() },
        },
      });
      await AppCache.set(cacheKey, record, 3600);
      return record;
    }),
  ]);

  return { workflow, session, batchJob, workspace, formulaItem, tableItem, calcVersion, billingRecords, usage };
}

// ─────────────────────────────────────────────
// Step 6 — Load draft (sequential, depends on actor)
// ─────────────────────────────────────────────

async function loadDraft(
  db: PrismaClient,
  opts: LoadOptions,
  actorId: string | undefined,
) {
  if (!opts.loadDraftForWorkflow || !opts.workflowId || !actorId) return undefined;

  return db.calcDraft.findUnique({
    where: {
      calcWorkflowId_actorId: {
        calcWorkflowId: opts.workflowId,
        actorId,
      },
    },
  });
}

// ─────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────

export async function loadContext(
  db: PrismaClient,
  userId: string,
  opts: LoadOptions,
): Promise<RequestContext> {
  const tStart = performance.now();

  const t0 = performance.now();
  const organizationId = await resolveOrganizationId(db, opts);
  const d0 = Math.round(performance.now() - t0);

  const t1 = performance.now();
  const { user, resolvedOrgId } = await loadUserWithRelations(db, userId, organizationId);
  const d1 = Math.round(performance.now() - t1);

  const t2 = performance.now();
  const organization = await loadOrganization(db, resolvedOrgId);
  const d2 = Math.round(performance.now() - t2);

  const t3 = performance.now();
  const { isSuperAdmin, isOrgAdmin, membership, actor } = resolvePermissions(
    user,
    resolvedOrgId,
    opts.actorId,
  );
  const d3 = Math.round(performance.now() - t3);

  const t4 = performance.now();
  const { workflow, session, batchJob, workspace, formulaItem, tableItem, calcVersion, billingRecords, usage } =
    await loadResources(db, opts, resolvedOrgId, isOrgAdmin, actor?.id);
  const d4 = Math.round(performance.now() - t4);

  const t5 = performance.now();
  const draft = await loadDraft(db, opts, actor?.id);
  const d5 = Math.round(performance.now() - t5);

  const total = Math.round(performance.now() - tStart);
  console.log(`⏱️ [LOAD_CONTEXT_TRACE] resolveOrg: ${d0}ms, loadUser: ${d1}ms, loadOrg: ${d2}ms, resolvePerms: ${d3}ms, loadRes: ${d4}ms, loadDraft: ${d5}ms. Total: ${total}ms`);

  return {
    user,
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