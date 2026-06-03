// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/engine/registry-resolver.ts
//
//  IMPROVEMENT: Removed all version matching, TableRegistryVersion / 
//  FormulaRegistryVersion lookups, and pinnedVersion logic. Items are
//  now fully immutable standard published items fetched directly by ID.
// ═══════════════════════════════════════════════════════════════════════════
import type { PrismaClient } from "@/generated/prisma";
import { AppCache } from "@/lib/cache";

// ─── Types ───────────────────────────────────────────────────────────────

interface ResolvedFormula {
  id: string;
  name: string;
  expressionNotation: string;
  displayExpression: string;
  inputVariables: {
    key: string;
    notation: string;
    label: string;
    unit: string;
    required: boolean;
  }[];
  outputVariable: {
    key: string;
    notation: string;
    label: string;
    unit: string;
    precision: number;
    useWorker?: boolean;
  };
  intermediateSteps: { key: string; expr: string; label: string }[];
  reference: string | null;
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
}

export type RegistryResolver = ReturnType<typeof createRegistryResolver>;

const GLOBAL_FORMULA_CACHE = new Map<string, { resolved: ResolvedFormula; expiresAt: number }>();
const GLOBAL_TABLE_CACHE = new Map<string, { resolved: ResolvedTable; expiresAt: number }>();
const CACHE_TTL_MS = 600000; // 10 minutes

function deepFreeze(obj: any) {
  if (obj === null || typeof obj !== "object") return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    deepFreeze(obj[key]);
  }
  return obj;
}

export function createRegistryResolver() {
  // Cache scoped to THIS execution — garbage collected when execution ends
  const formulaCache = new Map<string, ResolvedFormula>();
  const tableCache = new Map<string, ResolvedTable>();

  return {
    async resolveFormula(
      db: PrismaClient,
      registryId: string,
    ): Promise<ResolvedFormula> {
      const cacheKey = `f:${registryId}`;
      const cached = formulaCache.get(cacheKey);
      if (cached) return cached;

      const now = Date.now();
      const globalCached = GLOBAL_FORMULA_CACHE.get(cacheKey);
      if (globalCached && globalCached.expiresAt > now) {
        formulaCache.set(cacheKey, globalCached.resolved);
        return globalCached.resolved;
      }

      const record = await db.formulaRegistryItem.findUnique({
        where: { id: registryId },
        select: {
          id: true,
          name: true,
          isPublished: true,
          expressionNotation: true,
          displayExpression: true,
          inputVariables: true,
          outputVariable: true,
          intermediateSteps: true,
          reference: true,
          useWorker: true,
        },
      });

      if (!record) throw new Error(`Formula ${registryId} not found`);
      if (!record.isPublished)
        throw new Error(`Formula "${record.name}" is not published`);

      const resolved = mapFormulaRecord(record);
      deepFreeze(resolved);
      GLOBAL_FORMULA_CACHE.set(cacheKey, { resolved, expiresAt: Date.now() + CACHE_TTL_MS });
      formulaCache.set(cacheKey, resolved);
      return resolved;
    },

    async resolveTable(
      db: PrismaClient,
      registryId: string,
    ): Promise<ResolvedTable> {
      const cacheKey = `t:${registryId}`;
      const cached = tableCache.get(cacheKey);
      if (cached) return cached;

      const now = Date.now();
      const globalCached = GLOBAL_TABLE_CACHE.get(cacheKey);
      if (globalCached && globalCached.expiresAt > now) {
        tableCache.set(cacheKey, globalCached.resolved);
        return globalCached.resolved;
      }

      const record = await db.tableRegistryItem.findUnique({
        where: { id: registryId },
        select: {
          id: true,
          name: true,
          tableType: true,
          inputKeys: true,
          outputKey: true,
          columns: true,
          data: true,
          interpolationConfig: true,
          fallbackMode: true,
          fallbackValue: true,
          reference: true,
        },
      });

      if (!record) throw new Error(`Table ${registryId} not found`);
      const resolved = mapTableRecord(record);
      deepFreeze(resolved);
      GLOBAL_TABLE_CACHE.set(cacheKey, { resolved, expiresAt: Date.now() + CACHE_TTL_MS });
      tableCache.set(cacheKey, resolved);
      return resolved;
    },

    async prefetchForWorkflow(db: PrismaClient, workflowId: string) {
      const cacheKey = `wf:${workflowId}:registry-prefetch`;

      let payload: { formulas: any[]; tables: any[] } | null = await AppCache.get(cacheKey);

      if (!payload) {
        const [formulaUsages, tableUsages] = await Promise.all([
          db.formulaRegistryUsage.findMany({
            where: { calcWorkflowId: workflowId },
            select: { formulaRegistryId: true },
          }),
          db.tableRegistryUsage.findMany({
            where: { calcWorkflowId: workflowId },
            select: { tableRegistryId: true },
          }),
        ]);

        const formulaIds = formulaUsages.map((u) => u.formulaRegistryId);
        const tableIds = tableUsages.map((u) => u.tableRegistryId);

        const [formulas, tables] = await Promise.all([
          formulaIds.length > 0
            ? db.formulaRegistryItem.findMany({
                where: { id: { in: formulaIds } },
                select: {
                  id: true,
                  name: true,
                  expressionNotation: true,
                  displayExpression: true,
                  inputVariables: true,
                  outputVariable: true,
                  intermediateSteps: true,
                  reference: true,
                  useWorker: true,
                },
              })
            : [],
          tableIds.length > 0
            ? db.tableRegistryItem.findMany({
                where: { id: { in: tableIds } },
                select: {
                  id: true,
                  name: true,
                  tableType: true,
                  inputKeys: true,
                  outputKey: true,
                  columns: true,
                  data: true,
                  interpolationConfig: true,
                  fallbackMode: true,
                  fallbackValue: true,
                  reference: true,
                },
              })
            : [],
        ]);

        payload = {
          formulas,
          tables,
        };

        await AppCache.set(cacheKey, payload, 3600);
      }

      for (const f of payload.formulas) {
        const resolvedKey = `f:${f.id}`;
        const cached = GLOBAL_FORMULA_CACHE.get(resolvedKey);
        const now = Date.now();
        let resolved: ResolvedFormula;
        if (cached && cached.expiresAt > now) {
          resolved = cached.resolved;
        } else {
          resolved = mapFormulaRecord(f);
          deepFreeze(resolved);
          GLOBAL_FORMULA_CACHE.set(resolvedKey, { resolved, expiresAt: now + CACHE_TTL_MS });
        }
        formulaCache.set(resolvedKey, resolved);
      }

      for (const t of payload.tables) {
        const resolvedKey = `t:${t.id}`;
        const cached = GLOBAL_TABLE_CACHE.get(resolvedKey);
        const now = Date.now();
        let resolved: ResolvedTable;
        if (cached && cached.expiresAt > now) {
          resolved = cached.resolved;
        } else {
          resolved = mapTableRecord(t);
          deepFreeze(resolved);
          GLOBAL_TABLE_CACHE.set(resolvedKey, { resolved, expiresAt: now + CACHE_TTL_MS });
        }
        tableCache.set(resolvedKey, resolved);
      }

      return {
        formulasCached: payload.formulas.length,
        tablesCached: payload.tables.length,
      };
    },
  };
}

// ─── Mapping helpers ─────────────────────────────────────────────────────

function mapFormulaRecord(r: {
  id: string;
  name: string;
  expressionNotation: string;
  displayExpression: string;
  inputVariables: unknown;
  outputVariable: unknown;
  intermediateSteps: unknown;
  reference: string | null;
  useWorker?: boolean;
}): ResolvedFormula {
  const inputVarsRaw = (r.inputVariables || []) as any[];
  const inputVariables = inputVarsRaw.map((v) => ({
    key: v.key || "",
    notation: v.notation || v.key || "",
    label: v.label || "",
    unit: v.unit || "",
    required: v.required !== false,
  }));

  const outVarRaw = (r.outputVariable || {}) as any;
  const outputVariable = {
    key: outVarRaw.key || "",
    notation: outVarRaw.notation || outVarRaw.key || "",
    label: outVarRaw.label || "",
    unit: outVarRaw.unit || "",
    precision: outVarRaw.precision ?? 3,
    useWorker: r.useWorker === true || outVarRaw.useWorker === true || outVarRaw.use_worker === true,
  };

  return {
    id: r.id,
    name: r.name,
    expressionNotation: r.expressionNotation,
    displayExpression: r.displayExpression,
    inputVariables,
    outputVariable,
    intermediateSteps: (r.intermediateSteps ||
      []) as ResolvedFormula["intermediateSteps"],
    reference: r.reference,
  };
}

function mapTableRecord(r: {
  id: string;
  name: string;
  tableType: string;
  inputKeys: unknown;
  outputKey: unknown;
  columns: unknown;
  data: unknown;
  interpolationConfig: unknown;
  fallbackMode: string;
  fallbackValue: unknown;
  reference: string | null;
}): ResolvedTable {
  const inputKeysRaw = (r.inputKeys || []) as any[];
  const inputKeys = inputKeysRaw.map((k) => ({
    key: k.key || "",
    notation: k.notation || k.key || "",
    label: k.label || "",
    unit: k.unit || "",
  }));

  const outKeyRaw = (r.outputKey || {}) as any;
  const outputKey = {
    key: outKeyRaw.key || "",
    notation: outKeyRaw.notation || outKeyRaw.key || "",
    label: outKeyRaw.label || "",
    unit: outKeyRaw.unit || "",
  };

  return {
    id: r.id,
    name: r.name,
    tableType: r.tableType,
    inputKeys,
    outputKey,
    columns: r.columns as string[],
    data: r.data as unknown[],
    interpolationConfig: (r.interpolationConfig || null) as Record<
      string,
      unknown
    > | null,
    fallbackMode: r.fallbackMode,
    fallbackValue: r.fallbackValue,
    reference: r.reference,
  };
}

export async function invalidateFormulaCache(db: PrismaClient, formulaId: string) {
  const cacheKey = `f:${formulaId}`;
  GLOBAL_FORMULA_CACHE.delete(cacheKey);

  // Find all workflows using this formula
  const usages = await db.formulaRegistryUsage.findMany({
    where: { formulaRegistryId: formulaId },
    select: { calcWorkflowId: true },
  });

  const keysToDel = [
    cacheKey,
    `res:formula:${formulaId}`,
    ...usages.map((u) => `wf:${u.calcWorkflowId}:registry-prefetch`),
  ];
  await AppCache.del(keysToDel);
}

export async function invalidateTableCache(db: PrismaClient, tableId: string) {
  const cacheKey = `t:${tableId}`;
  GLOBAL_TABLE_CACHE.delete(cacheKey);

  // Find all workflows using this table
  const usages = await db.tableRegistryUsage.findMany({
    where: { tableRegistryId: tableId },
    select: { calcWorkflowId: true },
  });

  const keysToDel = [
    cacheKey,
    `res:table:${tableId}`,
    ...usages.map((u) => `wf:${u.calcWorkflowId}:registry-prefetch`),
  ];
  await AppCache.del(keysToDel);
}

export async function invalidateWorkflowLoadedCache(workflowId: string) {
  await AppCache.invalidateWorkflow(workflowId);
}

