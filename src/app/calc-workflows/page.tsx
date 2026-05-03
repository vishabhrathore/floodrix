// src/app/(dashboard)/(rest)/calc-workflows/page.tsx

import { prefetchCalcWorkflows } from "@/features/calc-workflows/server/prefetch";
import { loadCalcWorkflowParams } from "@/features/calc-workflows/server/params-loader";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import prisma from "@/lib/db";
import {
    CalcWorkflowsContainer,
    CalcWorkflowsError,
    CalcWorkflowsList,
    CalcWorkflowsLoading,

} from "@/features/calc-workflows/components/calc-workflows";

interface PageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const Page = async ({ searchParams }: PageProps) => {
    const user = await requireAuth();
    const params = await loadCalcWorkflowParams(searchParams);

    // Resolve organizationId
    let organizationId = params.organizationId;
    if (!organizationId) {
        const membership = await prisma.organizationMember.findFirst({
            where: { userId: user.id },
            select: { organizationId: true },
        });
        organizationId = membership?.organizationId ?? "";
    }

    // Redirect with organizationId in URL so client hooks see it
    if (organizationId && !params.organizationId) {
        const { redirect } = await import("next/navigation");
        const url = new URL("/calc-workflows", "http://localhost");
        url.searchParams.set("organizationId", organizationId);
        redirect(url.pathname + url.search);
    }

    if (organizationId) {
        prefetchCalcWorkflows({
            organizationId,
            page: params.page,
            pageSize: params.pageSize,
        });
    }

    return (
        <HydrateClient>
            <CalcWorkflowsContainer>
                <ErrorBoundary fallback={<CalcWorkflowsError />}>
                    <Suspense fallback={<CalcWorkflowsLoading />}>
                        <CalcWorkflowsList />
                    </Suspense>
                </ErrorBoundary>
            </CalcWorkflowsContainer>
        </HydrateClient>
    );
};

export default Page;