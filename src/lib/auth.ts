import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";

// ─── Hardcoded free plan ID — must match your seed ───────────────────────────
export const FREE_PLAN_ID = "plan_free";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  user: {
    additionalFields: {
      globalRole: {
        type: "string",
        required: false,
        defaultValue: "USER",
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const displayName = user.name || user.email.split("@")[0];

          await prisma.$transaction(async (tx) => {
            // ── 1. Personal organization ──────────────────────────────────
            const org = await tx.organization.create({
              data: {
                name: `${displayName}'s Organization`,
                founderId: user.id,
                isPersonal: true,
              },
            });

            // ── 2. Org membership (OWNER) ─────────────────────────────────
            await tx.organizationMember.create({
              data: {
                userId: user.id,
                organizationId: org.id,
                role: "OWNER",
              },
            });

            // ── 3. CalcActor ──────────────────────────────────────────────
            await tx.calcActor.create({
              data: {
                userId: user.id,
                organizationId: org.id,
                displayName,
              },
            });

            // ── 4. Free billing — hardcoded plan ID, no lookup ────────────
            await tx.orgBilling.create({
              data: {
                organizationId: org.id,
                planId: FREE_PLAN_ID,
                billingType: "SUBSCRIPTION",
                status: "ACTIVE",
              },
            });

            // ── 5. Current month usage window ─────────────────────────────
            const now = new Date();
            const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const periodEnd = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59
            );

            await tx.orgUsage.create({
              data: {
                organizationId: org.id,
                periodStart,
                periodEnd,
                totalRuns: 0,
              },
            });

            // ── 6. Default workspace ──────────────────────────────────────
            const workspace = await tx.workspace.create({
              data: {
                organizationId: org.id,
                name: "My Workspace",
                description: "Default workspace",
                visibility: "PRIVATE",
              },
            });

            // ── 7. Root workspace node ────────────────────────────────────
            await tx.workspaceNode.create({
              data: {
                workspaceId: workspace.id,
                nodeType: "ROOT",
                name: "Root",
                sortOrder: 0,
              },
            });
          });
        },
      },
    },
  },
  plugins: [],
});

// ─── Invite flow helper ───────────────────────────────────────────────────────
// Call this when a user accepts an invite to a NON-personal org.
//
// Usage:
//   await onUserJoinOrg(userId, organizationId, "MEMBER")

export async function onUserJoinOrg(
  userId: string,
  organizationId: string,
  role: "OWNER" | "ADMIN" | "MEMBER" = "MEMBER"
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const displayName = user.name || user.email.split("@")[0];

  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      create: { userId, organizationId, role },
      update: { role },
    });

    await tx.calcActor.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      create: { userId, organizationId, displayName },
      update: {},
    });
  });
}