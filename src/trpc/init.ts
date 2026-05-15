import { cache } from "react";

import { headers } from "next/headers";

import { TRPCError, initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { polarClient } from "@/lib/polar";
import { loadContext } from "@/server/context/context.loader";
import { assertAndConsumeBillingQuota } from "@/server/context/runtime-checks";

export const createTRPCContext = cache(async () => {
  return {
    db: prisma,
    userId: null as string | null,
  };
});

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. tRPC INIT
// ─────────────────────────────────────────────────────────────────────────────

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

// ─────────────────────────────────────────────────────────────────────────────
// 3. PROTECTED PROCEDURE
//    Validates better-auth session and surfaces userId + auth into ctx.
//    Every procedure that needs auth extends from this.
// ─────────────────────────────────────────────────────────────────────────────

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }

  return next({
    ctx: {
      ...ctx,
      userId: session.user.id,
      auth: session,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. ORG PROCEDURE
//    Requires `organizationId` in the input schema (type-safe — no magic
//    headers). Calls loadContext() and attaches the full RequestContext.
//    Use this as the base for any route that operates within an org.
// ─────────────────────────────────────────────────────────────────────────────

export const orgProcedure = protectedProcedure
  .input(z.object({ organizationId: z.string().optional() }))
  .use(async ({ ctx, input, next }) => {
    const reqCtx = await loadContext(ctx.db, ctx.userId, {
      organizationId: input.organizationId,
    });

    return next({
      ctx: { ...ctx, reqCtx },
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// 5. WORKFLOW PROCEDURE
//    Extends orgProcedure. Also requires `workflowId` in the input.
//    Loads workflow + collaborators into reqCtx automatically.
// ─────────────────────────────────────────────────────────────────────────────

export const workflowProcedure = protectedProcedure
  .input(z.object({ organizationId: z.string(), workflowId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const reqCtx = await loadContext(ctx.db, ctx.userId, {
      organizationId: input.organizationId,
      workflowId: input.workflowId,
    });

    return next({
      ctx: { ...ctx, reqCtx },
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// 6. BILLED PROCEDURE
//    Extends orgProcedure. Loads billing + usage into reqCtx.
//    Automatically asserts and atomically consumes 1 run quota on every call.
//    Use for any route that triggers a workflow execution.
// ─────────────────────────────────────────────────────────────────────────────

export const billedProcedure = protectedProcedure
  .input(
    z.object({
      organizationId: z.string(),
      workflowId: z.string(),
    }),
  )
  .use(async ({ ctx, input, next }) => {
    const reqCtx = await loadContext(ctx.db, ctx.userId, {
      organizationId: input.organizationId,
      workflowId: input.workflowId,
      loadBilling: true,
    });

    // Consume quota atomically before passing control to the handler.
    // If the limit is hit, this throws FORBIDDEN and the handler never runs.
    await assertAndConsumeBillingQuota(ctx.db, reqCtx);

    return next({
      ctx: { ...ctx, reqCtx },
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// 7. ACTOR PROCEDURE  (optional helper)
//    Same as orgProcedure but also resolves a specific actorId from input.
//    Use when a user can operate as multiple actors within an org.
// ─────────────────────────────────────────────────────────────────────────────

export const actorProcedure = protectedProcedure
  .input(z.object({ organizationId: z.string(), actorId: z.string() }))
  .use(async ({ ctx, input, next }) => {
    const reqCtx = await loadContext(ctx.db, ctx.userId, {
      organizationId: input.organizationId,
      actorId: input.actorId,
    });

    return next({
      ctx: { ...ctx, reqCtx },
    });
  });

// ─────────────────────────────────────────────────────────────────────────────
// 8. PREMIUM PROCEDURE (Existing)
// ─────────────────────────────────────────────────────────────────────────────

export const premiumProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    return next({ ctx });
  },
);
