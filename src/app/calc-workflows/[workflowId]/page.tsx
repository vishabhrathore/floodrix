// src/app/(dashboard)/(editor)/calc-workflows/[workflowId]/page.tsx
import { Suspense } from "react";

import { notFound } from "next/navigation";

import { ErrorBoundary } from "react-error-boundary";

import { prefetchCalcWorkflow } from "@/features/calc-workflows/server/prefetch";
import { WorkflowCanvas } from "@/features/workflow-canvas/components/workflow-canvas";
import { requireAuth } from "@/lib/auth-utils";
import prisma from "@/lib/db";
import { HydrateClient } from "@/trpc/server";

interface PageProps {
  params: Promise<{ workflowId: string }>;
}

function EditorLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-red-500" />
        <p className="text-sm text-slate-500">Loading workflow editor...</p>
      </div>
    </div>
  );
}

function EditorError() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mb-3 text-3xl">⚠️</div>
        <p className="text-sm font-semibold text-slate-700">
          Failed to load workflow
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Check the workflow exists and you have access.
        </p>
      </div>
    </div>
  );
}

const Page = async ({ params }: PageProps) => {
  const auth = await requireAuth();
  const { workflowId } = await params;

  const where: any = {
    deletedAt: null,
    OR: [{ id: workflowId }, { slug: workflowId }],
  };

  // Only enforce organization membership for non-super-admins
  if (auth.user.globalRole !== "SUPER_ADMIN") {
    where.organization = {
      members: { some: { userId: auth.user.id } },
    };
  }

  //     where: {
  //     deletedAt: null,
  //     organization: { members: { some: { userId: auth.user.id } } },
  //     OR: [{ id: workflowId }, { slug: workflowId }],
  // },

  const workflow = await prisma.calcWorkflow.findFirst({
    where,
    select: { id: true, name: true, status: true, organizationId: true },
  });

  if (!workflow) notFound();

  prefetchCalcWorkflow(workflow.id);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<EditorError />}>
        <Suspense fallback={<EditorLoading />}>
          <div className="h-screen w-full overflow-hidden">
            <WorkflowCanvas
              workflowId={workflow.id}
              workflowName={workflow.name}
              workflowStatus={workflow.status}
              organizationId={workflow.organizationId}
            />
          </div>
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
