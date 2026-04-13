import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { HydrateClient } from "@/trpc/server";
import { requireAuth } from "@/lib/auth-utils";
import {
    FormulaRegistryContainer,
    FormulaRegistryList,
    FormulaRegistryLoading,
    FormulaRegistryError
} from "@/features/registery/formula/components";
import { prefetchFormulas } from "@/features/registery/formula/server/prefetch";
import { formulaParamsLoader } from "@/features/registery/formula/server/params-loader";

export const dynamic = "force-dynamic";

interface PageProps {
    searchParams: Promise<any>;
}

const Page = async ({ searchParams }: PageProps) => {
    await requireAuth();

    const params = await formulaParamsLoader(searchParams);

    // Prefetch data for the formula listing
    await prefetchFormulas({
        page: params.page,
        pageSize: params.pageSize,
        search: params.search,
        category: params.category || undefined,
    });

    return (
        <FormulaRegistryContainer>
            <HydrateClient>
                <ErrorBoundary fallback={<FormulaRegistryError />}>
                    <Suspense fallback={<FormulaRegistryLoading />}>
                        <FormulaRegistryList />
                    </Suspense>
                </ErrorBoundary>
            </HydrateClient>
        </FormulaRegistryContainer>
    );
};

export default Page;
