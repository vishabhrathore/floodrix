// src/app/(dashboard)/(rest)/calc-workflows/page.tsx

import { prefetchCalcWorkflows } from "@/features/calc-workflows/server/prefetch";
import { calcWorkflowParamsLoader } from "@/features/calc-workflows/server/params-loader";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
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
    await requireAuth();
    const params = await calcWorkflowParamsLoader(searchParams);

    prefetchCalcWorkflows(params);

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