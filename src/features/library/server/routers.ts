import { TRPCError } from "@trpc/server";
import z from "zod";

import { PAGINATION } from "@/config/constants";
import { SubmissionStatus } from "@/generated/prisma";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const librarySubmissionsRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
        status: z.string().default("PENDING"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Ensure only super admins can review library submissions
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin access required",
        });
      }

      const { page, pageSize, search, status } = input;

      const whereClause = {
        status: status as SubmissionStatus,
        calcVersion: {
          calcWorkflow: {
            name: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        },
      };

      const [items, totalCount] = await Promise.all([
        prisma.librarySubmission.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: whereClause,
          include: {
            submitter: {
              select: {
                displayName: true,
                organization: { select: { name: true } },
              },
            },
            calcVersion: {
              select: {
                version: true,
                calcWorkflow: {
                  select: { id: true, name: true, category: true },
                },
              },
            },
          },
          orderBy: {
            createdAt: "asc", // Oldest first for a queue
          },
        }),
        prisma.librarySubmission.count({
          where: whereClause,
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  approve: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin access required",
        });
      }

      const submission = await prisma.librarySubmission.findUniqueOrThrow({
        where: { id: input.id },
        include: { calcVersion: true },
      });

      // 1. Update the submission status
      // 2. Publish the workflow to the public library
      return prisma.$transaction([
        prisma.librarySubmission.update({
          where: { id: input.id },
          data: { status: "APPROVED" },
        }),
        prisma.calcWorkflow.update({
          where: { id: submission.calcVersion.calcWorkflowId },
          data: { libraryStatus: "LISTED", visibility: "PUBLIC" },
        }),
      ]);
    }),

  reject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        feedback: z.string().min(1, "Feedback is required when rejecting"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.auth.user.globalRole !== "SUPER_ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Super admin access required",
        });
      }

      const submission = await prisma.librarySubmission.findUniqueOrThrow({
        where: { id: input.id },
        include: { calcVersion: true },
      });

      // 1. Update the submission status with feedback
      // 2. Reset the workflow's library status so they can fix and resubmit
      return prisma.$transaction([
        prisma.librarySubmission.update({
          where: { id: input.id },
          data: { status: "REJECTED", adminFeedback: input.feedback },
        }),
        prisma.calcWorkflow.update({
          where: { id: submission.calcVersion.calcWorkflowId },
          data: { libraryStatus: "NONE" },
        }),
      ]);
    }),
});
