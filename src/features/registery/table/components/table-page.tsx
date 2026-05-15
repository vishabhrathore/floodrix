"use client";

import Link from "next/link";

import {
  AlignJustify,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Globe,
  Grid3X3,
  Hash,
  Layers,
  Lock,
  Plus,
  Star,
  Table2,
  Tag,
  TrendingUp,
} from "lucide-react";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { useSuspenseTables } from "../hooks/use-tables";
import { useTablesParams } from "../hooks/use-tables-params";

// ── Table type display config ─────────────────────────────────────────────
const TABLE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  RANGE_LOOKUP: {
    label: "Range",
    icon: AlignJustify,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  EXACT_LOOKUP: {
    label: "Exact",
    icon: Hash,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  },
  MULTI_KEY_LOOKUP: {
    label: "Multi-key",
    icon: Grid3X3,
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  INTERPOLATION_1D: {
    label: "1D Interpolation",
    icon: TrendingUp,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  INTERPOLATION_2D: {
    label: "2D Interpolation",
    icon: BarChart3,
    color: "text-orange-600 bg-orange-50 border-orange-200",
  },
  CLASSIFICATION: {
    label: "Classification",
    icon: Tag,
    color: "text-pink-600 bg-pink-50 border-pink-200",
  },
};

function TableTypeBadge({ type }: { type: string }) {
  const config = TABLE_TYPE_CONFIG[type] ?? {
    label: type,
    icon: Table2,
    color: "text-slate-600 bg-slate-50 border-slate-200",
  };
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("h-5 gap-0.5 px-1.5 text-[10px]", config.color)}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </Badge>
  );
}

// ── Mini table preview ────────────────────────────────────────────────────
function MiniTablePreview({
  data,
  columns,
}: {
  data: unknown[];
  columns: { key: string; label?: string }[];
}) {
  const rows = Array.isArray(data) ? data.slice(0, 4) : [];
  const cols = Array.isArray(columns) ? columns.slice(0, 3) : [];

  if (!rows.length || !cols.length) {
    return (
      <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-border/40 text-[10px] text-muted-foreground">
        No preview data
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-border/40">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-border/40 bg-muted/40">
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2 py-1 text-left font-medium text-muted-foreground"
              >
                {c.label ?? c.key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-border/20 last:border-0",
                i === 0 && "bg-primary/5",
              )}
            >
              {cols.map((c) => (
                <td key={c.key} className="px-2 py-1 font-mono">
                  {String((row as Record<string, unknown>)[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Table card ────────────────────────────────────────────────────────────
interface TableCardProps {
  table: any;
}

function TableCard({ table }: TableCardProps) {
  const data = Array.isArray(table.data) ? table.data : [];
  const columns = Array.isArray(table.columns)
    ? (table.columns as { key: string; label?: string }[])
    : [];

  return (
    <Card
      className={cn(
        "group relative flex flex-col border border-border/60 bg-card transition-all duration-200",
        "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
      )}
    >
      {/* Status strip */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-lg",
          table.isPublished ? "bg-emerald-500" : "bg-amber-400",
        )}
      />

      <CardHeader className="pb-2 pl-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-sm font-semibold leading-tight">
              {table.name}
            </CardTitle>
            {table.sourceStandard && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {table.sourceStandard}
                {table.sourcePage && ` · ${table.sourcePage}`}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {table.isSystem && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="h-5 px-1.5 text-[10px]"
                    >
                      <Star className="mr-0.5 h-2.5 w-2.5" />
                      IRC
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Official IRC standard table</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {table.isPublished ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500" />
            )}
          </div>
        </div>

        <div className="mt-1.5 flex flex-wrap gap-1">
          <TableTypeBadge type={table.tableType} />
          {table.region && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              <Globe className="mr-0.5 h-2.5 w-2.5" />
              {table.region}
            </Badge>
          )}
          {table.visibility === "PRIVATE" && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              <Lock className="mr-0.5 h-2.5 w-2.5" />
              Private
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2 pl-5">
        <MiniTablePreview data={data} columns={columns} />
      </CardContent>

      <CardFooter className="border-t border-border/40 py-2 pl-5 pr-3">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Table2 className="h-3 w-3" />
              {data.length} rows
            </span>
            {table._count?.registryUsages != null && (
              <span className="flex items-center gap-0.5">
                <Layers className="h-3 w-3" />
                {table._count.registryUsages} workflows
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
              <Link href={`/admin/registery/tables/${table.id}`}>
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

export const TableRegistryContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [params, setParams] = useTablesParams();

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Table Registry"
          description="Manage IRC standard lookup tables and digitised charts."
          newButtonLabel="New Table"
          newButtonHref="/admin/registery/tables/new"
        />
      }
      search={
        <EntitySearch
          value={params.search}
          onChange={(v) => setParams({ search: v, page: 1 })}
          placeholder="Search tables by name or reference..."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

export const TableRegistryLoading = () => (
  <LoadingView message="Loading table registry..." />
);

export const TableRegistryError = () => (
  <ErrorView message="Failed to load tables. Please try again." />
);

export const TableRegistryList = () => {
  const { data } = useSuspenseTables();
  const [params, setParams] = useTablesParams();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  if (items.length === 0) {
    return (
      <EmptyView
        message={
          params.search
            ? `No tables match "${params.search}"`
            : "The table registry is empty."
        }
        onNew={() => (window.location.href = "/admin/registery/tables/new")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((table) => (
          <TableCard key={table.id} table={table} />
        ))}
      </div>

      <EntityPagination
        page={params.page}
        totalPages={totalPages}
        onPageChange={(p) => setParams({ page: p })}
      />
    </div>
  );
};
