// src/features/calc-workflows/server/params-loader.ts

import { calcWorkflowParamsLoader } from "../params";

/**
 * Server-side: parse searchParams using the nuqs loader.
 * Usage in page.tsx:
 *   const params = await loadCalcWorkflowParams(searchParams);
 */
export async function loadCalcWorkflowParams(
    searchParams: Promise<Record<string, string | string[] | undefined>>
) {
    return calcWorkflowParamsLoader(searchParams);
}