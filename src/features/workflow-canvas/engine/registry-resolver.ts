// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/engine/registry-resolver.ts
//
//  IMPROVEMENT: Removed all version matching, TableRegistryVersion / 
//  FormulaRegistryVersion lookups, and pinnedVersion logic. Items are
//  now fully immutable standard published items fetched directly by ID.
// ═══════════════════════════════════════════════════════════════════════════
import type { PrismaClient } from "@/generated/prisma";
import { redisConnection } from "@/lib/bullmq";

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
        },
      });

      if (!record) throw new Error(`Formula ${registryId} not found`);
      if (!record.isPublished)
        throw new Error(`Formula "${record.name}" is not published`);

      const resolved = mapFormulaRecord(record);
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
      tableCache.set(cacheKey, resolved);
      return resolved;
    },

    async prefetchForWorkflow(db: PrismaClient, workflowId: string) {
      const cacheKey = `wf:${workflowId}:registry-prefetch`;

      let payload: {
        formulas: any[];
        tables: any[];
      } | null = null;

      if (redisConnection) {
        try {
          const cached = await redisConnection.get(cacheKey);
          if (cached) {
            payload = JSON.parse(cached);
          }
        } catch {}
      }

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

        if (redisConnection) {
          try {
            await redisConnection.setex(cacheKey, 3600, JSON.stringify(payload));
          } catch {}
        }
      }

      for (const f of payload.formulas) {
        const resolved = mapFormulaRecord(f);
        formulaCache.set(`f:${f.id}`, resolved);
      }

      for (const t of payload.tables) {
        const resolved = mapTableRecord(t);
        tableCache.set(`t:${t.id}`, resolved);
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
}): ResolvedFormula {
  return {
    id: r.id,
    name: r.name,
    expressionNotation: r.expressionNotation,
    displayExpression: r.displayExpression,
    inputVariables: r.inputVariables as ResolvedFormula["inputVariables"],
    outputVariable: r.outputVariable as ResolvedFormula["outputVariable"],
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
  return {
    id: r.id,
    name: r.name,
    tableType: r.tableType,
    inputKeys: r.inputKeys as ResolvedTable["inputKeys"],
    outputKey: r.outputKey as ResolvedTable["outputKey"],
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
