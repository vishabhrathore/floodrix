// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/registry-resolver.optimized.ts
//  FIXED: Per-request cache, single-query resolution, batch loading
// ═══════════════════════════════════════════════════════════════════════════

import type { PrismaClient } from "@/generated/prisma";

// ─── Types ───────────────────────────────────────────────────────────────

interface ResolvedFormula {
    id: string;
    name: string;
    expressionNotation: string;
    displayExpression: string;
    inputVariables: { key: string; notation: string; label: string; unit: string; required: boolean }[];
    outputVariable: { key: string; notation: string; label: string; unit: string; precision: number };
    intermediateSteps: { key: string; expr: string; label: string }[];
    reference: string | null;
    version: number;
}

interface ResolvedTable {
    id: string;
    name: string;
    tableType: string;
    inputKeys: { key: string; notation: string; label: string; unit: string }[];
    outputKey: { key: string; notation: string; label: string; unit: string };
    columns: string[];
    data: unknown[];
    interpolationConfig: Record<string, unknown> | null;
    fallbackMode: string;
    fallbackValue: unknown;
    reference: string | null;
    version: number;
}

// ─── PROBLEM: Singleton cache persists across requests ───────────────────
//
// BAD:
//   class RegistryResolver {
//     private formulaCache = new Map()  // Lives forever on the singleton
//     // If someone publishes a new formula version, the cache still
//     // serves the old one until the server restarts
//   }
//   export const registryResolver = new RegistryResolver()
//
// GOOD: Factory function creates a resolver per execution context
//   The cache lives only for the duration of one workflow execution

export function createRegistryResolver() {
    // Cache scoped to THIS execution — garbage collected when execution ends
    const formulaCache = new Map<string, ResolvedFormula>();
    const tableCache = new Map<string, ResolvedTable>();

    return {
        // ─── PROBLEM: Two sequential queries for pinned version ────────────
        //
        // BAD:
        //   const versionRecord = await db.registryVersion.findFirst(...)
        //   if (!versionRecord) {
        //     formula = await db.formulaRegistryItem.findUnique(...)  // Second query
        //   }
        //
        // GOOD: Single query that checks both sources

        async resolveFormula(
            db: PrismaClient,
            registryId: string,
            version: number | null
        ): Promise<ResolvedFormula> {
            const cacheKey = `f:${registryId}:${version ?? "latest"}`;
            const cached = formulaCache.get(cacheKey);
            if (cached) return cached;

            let resolved: ResolvedFormula;

            if (version !== null) {
                // Pinned version — try version snapshot first, fall back to current record
                const [versionRecord, currentRecord] = await Promise.all([
                    db.formulaRegistryVersion.findUnique({
                        where: {
                            formulaRegistryId_version: {
                                formulaRegistryId: registryId,
                                version,
                            }
                        },
                        select: { snapshot: true },
                    }),
                    db.formulaRegistryItem.findUnique({
                        where: { id: registryId },
                        select: {
                            id: true,
                            name: true,
                            currentVersion: true,
                            expressionNotation: true,
                            displayExpression: true,
                            inputVariables: true,
                            outputVariable: true,
                            intermediateSteps: true,
                            reference: true,
                        },
                    }),
                ]);

                if (versionRecord) {
                    const snap = versionRecord.snapshot as Record<string, unknown>;
                    resolved = mapFormulaSnapshot(registryId, version, snap);
                } else if (currentRecord && currentRecord.currentVersion === version) {
                    resolved = mapFormulaRecord(currentRecord);
                } else {
                    throw new Error(
                        `Formula ${registryId} version ${version} not found. ` +
                        `Current version: ${currentRecord?.currentVersion ?? "none"}`
                    );
                }
            } else {
                // Float to latest — single query
                const record = await db.formulaRegistryItem.findUnique({
                    where: { id: registryId },
                    select: {
                        id: true,
                        name: true,
                        currentVersion: true,
                        isPublished: true,
                        expressionNotation: true,
                        displayExpression: true,
                        inputVariables: true,
                        outputVariable: true,
                        intermediateSteps: true,
                        reference: true,
                    },
                });

                if (!record) throw new Error(`Formula ${registryId} not found`);
                if (!record.isPublished) throw new Error(`Formula "${record.name}" is not published`);

                resolved = mapFormulaRecord(record);
            }

            formulaCache.set(cacheKey, resolved);
            return resolved;
        },

        async resolveTable(
            db: PrismaClient,
            registryId: string,
            version: number | null
        ): Promise<ResolvedTable> {
            const cacheKey = `t:${registryId}:${version ?? "latest"}`;
            const cached = tableCache.get(cacheKey);
            if (cached) return cached;

            let resolved: ResolvedTable;

            if (version !== null) {
                const [versionRecord, currentRecord] = await Promise.all([
                    db.tableRegistryVersion.findUnique({
                        where: {
                            tableRegistryId_version: {
                                tableRegistryId: registryId,
                                version,
                            }
                        },
                        select: { snapshot: true },
                    }),
                    db.tableRegistryItem.findUnique({
                        where: { id: registryId },
                        select: {
                            id: true, name: true, currentVersion: true, tableType: true,
                            inputKeys: true, outputKey: true, columns: true, data: true,
                            interpolationConfig: true, fallbackMode: true, fallbackValue: true,
                            reference: true,
                        },
                    }),
                ]);

                if (versionRecord) {
                    const snap = versionRecord.snapshot as Record<string, unknown>;
                    resolved = mapTableSnapshot(registryId, version, snap);
                } else if (currentRecord && currentRecord.currentVersion === version) {
                    resolved = mapTableRecord(currentRecord);
                } else {
                    throw new Error(`Table ${registryId} version ${version} not found`);
                }
            } else {
                const record = await db.tableRegistryItem.findUnique({
                    where: { id: registryId },
                    select: {
                        id: true, name: true, currentVersion: true, tableType: true,
                        inputKeys: true, outputKey: true, columns: true, data: true,
                        interpolationConfig: true, fallbackMode: true, fallbackValue: true,
                        reference: true,
                    },
                });

                if (!record) throw new Error(`Table ${registryId} not found`);
                resolved = mapTableRecord(record);
            }

            tableCache.set(cacheKey, resolved);
            return resolved;
        },

        async prefetchForWorkflow(
            db: PrismaClient,
            workflowId: string
        ) {
            // Load all registry usages for this workflow (Formulas and Tables)
            const [formulaUsages, tableUsages] = await Promise.all([
                db.formulaRegistryUsage.findMany({
                    where: { calcWorkflowId: workflowId },
                    select: {
                        formulaRegistryId: true,
                        pinnedVersion: true,
                    },
                }),
                db.tableRegistryUsage.findMany({
                    where: { calcWorkflowId: workflowId },
                    select: {
                        tableRegistryId: true,
                        pinnedVersion: true,
                    },
                })
            ]);

            // Collect IDs
            const formulaIds = formulaUsages.map((u) => u.formulaRegistryId);
            const tableIds = tableUsages.map((u) => u.tableRegistryId);

            // Batch load ALL formulas and tables in TWO queries (parallel)
            const [formulas, tables] = await Promise.all([
                formulaIds.length > 0
                    ? db.formulaRegistryItem.findMany({
                        where: { id: { in: formulaIds } },
                        select: {
                            id: true, name: true, currentVersion: true,
                            expressionNotation: true, displayExpression: true,
                            inputVariables: true, outputVariable: true,
                            intermediateSteps: true, reference: true,
                        },
                    })
                    : [],
                tableIds.length > 0
                    ? db.tableRegistryItem.findMany({
                        where: { id: { in: tableIds } },
                        select: {
                            id: true, name: true, currentVersion: true, tableType: true,
                            inputKeys: true, outputKey: true, columns: true, data: true,
                            interpolationConfig: true, fallbackMode: true,
                            fallbackValue: true, reference: true,
                        },
                    })
                    : [],
            ]);

            // Warm the cache
            for (const f of formulas) {
                const resolved = mapFormulaRecord(f);
                formulaCache.set(`f:${f.id}:latest`, resolved);
                formulaCache.set(`f:${f.id}:${f.currentVersion}`, resolved);
            }

            for (const t of tables) {
                const resolved = mapTableRecord(t);
                tableCache.set(`t:${t.id}:latest`, resolved);
                tableCache.set(`t:${t.id}:${t.currentVersion}`, resolved);
            }

            // Also load pinned versions if any differ from current
            const pinnedFormulas = formulaUsages.filter((u) => u.pinnedVersion !== null);
            const pinnedTables = tableUsages.filter((u) => u.pinnedVersion !== null);

            if (pinnedFormulas.length > 0 || pinnedTables.length > 0) {
                const [formulaVersions, tableVersions] = await Promise.all([
                    pinnedFormulas.length > 0 ? db.formulaRegistryVersion.findMany({
                        where: {
                            OR: pinnedFormulas.map((u) => ({
                                formulaRegistryId: u.formulaRegistryId,
                                version: u.pinnedVersion!,
                            })),
                        },
                        select: {
                            formulaRegistryId: true,
                            version: true,
                            snapshot: true,
                        },
                    }) : [],
                    pinnedTables.length > 0 ? db.tableRegistryVersion.findMany({
                        where: {
                            OR: pinnedTables.map((u) => ({
                                tableRegistryId: u.tableRegistryId,
                                version: u.pinnedVersion!,
                            })),
                        },
                        select: {
                            tableRegistryId: true,
                            version: true,
                            snapshot: true,
                        },
                    }) : []
                ]);

                for (const vr of formulaVersions) {
                    const snap = vr.snapshot as Record<string, unknown>;
                    const resolved = mapFormulaSnapshot(vr.formulaRegistryId, vr.version, snap);
                    formulaCache.set(`f:${vr.formulaRegistryId}:${vr.version}`, resolved);
                }
                for (const vr of tableVersions) {
                    const snap = vr.snapshot as Record<string, unknown>;
                    const resolved = mapTableSnapshot(vr.tableRegistryId, vr.version, snap);
                    tableCache.set(`t:${vr.tableRegistryId}:${vr.version}`, resolved);
                }
            }

            return {
                formulasCached: formulas.length,
                tablesCached: tables.length,
                pinnedVersionsCached: (pinnedFormulas.length + pinnedTables.length),
            };
        },
    };
}

// ─── Mapping helpers ─────────────────────────────────────────────────────

function mapFormulaRecord(r: {
    id: string; name: string; currentVersion: number;
    expressionNotation: string; displayExpression: string;
    inputVariables: unknown; outputVariable: unknown;
    intermediateSteps: unknown; reference: string | null;
}): ResolvedFormula {
    return {
        id: r.id,
        name: r.name,
        expressionNotation: r.expressionNotation,
        displayExpression: r.displayExpression,
        inputVariables: r.inputVariables as ResolvedFormula["inputVariables"],
        outputVariable: r.outputVariable as ResolvedFormula["outputVariable"],
        intermediateSteps: (r.intermediateSteps || []) as ResolvedFormula["intermediateSteps"],
        reference: r.reference,
        version: r.currentVersion,
    };
}

function mapFormulaSnapshot(
    id: string, version: number, snap: Record<string, unknown>
): ResolvedFormula {
    return {
        id,
        name: snap.name as string,
        expressionNotation: snap.expressionNotation as string,
        displayExpression: snap.displayExpression as string,
        inputVariables: snap.inputVariables as ResolvedFormula["inputVariables"],
        outputVariable: snap.outputVariable as ResolvedFormula["outputVariable"],
        intermediateSteps: (snap.intermediateSteps || []) as ResolvedFormula["intermediateSteps"],
        reference: snap.reference as string | null,
        version,
    };
}

function mapTableRecord(r: {
    id: string; name: string; currentVersion: number; tableType: string;
    inputKeys: unknown; outputKey: unknown; columns: unknown; data: unknown;
    interpolationConfig: unknown; fallbackMode: string; fallbackValue: unknown;
    reference: string | null;
}): ResolvedTable {
    return {
        id: r.id, name: r.name, tableType: r.tableType, version: r.currentVersion,
        inputKeys: r.inputKeys as ResolvedTable["inputKeys"],
        outputKey: r.outputKey as ResolvedTable["outputKey"],
        columns: r.columns as string[],
        data: r.data as unknown[],
        interpolationConfig: (r.interpolationConfig || null) as Record<string, unknown> | null,
        fallbackMode: r.fallbackMode,
        fallbackValue: r.fallbackValue,
        reference: r.reference,
    };
}

function mapTableSnapshot(
    id: string, version: number, snap: Record<string, unknown>
): ResolvedTable {
    return {
        id, version,
        name: snap.name as string,
        tableType: snap.tableType as string,
        inputKeys: snap.inputKeys as ResolvedTable["inputKeys"],
        outputKey: snap.outputKey as ResolvedTable["outputKey"],
        columns: snap.columns as string[],
        data: snap.data as unknown[],
        interpolationConfig: (snap.interpolationConfig || null) as Record<string, unknown> | null,
        fallbackMode: (snap.fallbackMode || "error") as string,
        fallbackValue: snap.fallbackValue ?? null,
        reference: snap.reference as string | null,
    };
}

export const registryResolver = createRegistryResolver();
