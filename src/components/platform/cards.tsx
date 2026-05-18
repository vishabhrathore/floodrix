"use client";

import React from "react";

import Link from "next/link";

import {
  AlignJustify,
  ArrowRight,
  BarChart3,
  Box,
  Calendar,
  ChevronRight,
  Grid3X3,
  Hash,
  Layout,
  LayoutGrid,
  MoreVertical,
  Table2,
  Tag,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { FormulaDisplay } from "./formula-display";

// TABLE TYPE CONFIGS FOR STYLING
const TABLE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  RANGE_LOOKUP: {
    label: "Range",
    icon: AlignJustify,
    color: "text-blue-600 bg-blue-50/50 border-blue-200",
  },
  EXACT_LOOKUP: {
    label: "Exact",
    icon: Hash,
    color: "text-slate-600 bg-slate-50/50 border-slate-200",
  },
  MULTI_KEY_LOOKUP: {
    label: "Multi-key",
    icon: Grid3X3,
    color: "text-violet-600 bg-violet-50/50 border-violet-200",
  },
  INTERPOLATION_1D: {
    label: "1D Interpolation",
    icon: TrendingUp,
    color: "text-emerald-600 bg-emerald-50/50 border-emerald-200",
  },
  INTERPOLATION_2D: {
    label: "2D Interpolation",
    icon: BarChart3,
    color: "text-orange-600 bg-orange-50/50 border-orange-200",
  },
  CLASSIFICATION: {
    label: "Classification",
    icon: Tag,
    color: "text-pink-600 bg-pink-50/50 border-pink-200",
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
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border",
        config.color,
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {config.label}
    </span>
  );
}

// Micro Table Preview inside card
function MiniTablePreview({
  data,
  columns,
}: {
  data: unknown[];
  columns: { key: string; label?: string }[];
}) {
  const rows = Array.isArray(data) ? data.slice(0, 3) : [];
  const cols = Array.isArray(columns) ? columns.slice(0, 3) : [];

  if (!rows.length || !cols.length) {
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-[#e8e8e8] text-[10px] text-[#a1a1a1]">
        No preview data available
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[#e8e8e8] bg-[#fafafa]/30">
      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-2.5 py-1 text-left font-medium text-[#a1a1a1] uppercase tracking-[0.02em]"
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
              className="border-b border-[#e8e8e8] last:border-0 hover:bg-[#fafafa]/50 transition-colors"
            >
              {cols.map((c) => (
                <td
                  key={c.key}
                  className="px-2.5 py-1.5 font-mono text-[#525252]"
                >
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

interface ReusableCalculatorCardProps {
  calc: any;
  index?: number;
  workspaceName?: string;
  href?: string;
  actionLabel?: string;
}

export function CalculatorDiscoveryCard({
  calc,
  index = 0,
  workspaceName,
  href,
  actionLabel = "Calculate",
}: ReusableCalculatorCardProps) {
  const colors = [
    "#0070f3", // Blue
    "#f97316", // Orange
    "#00b341", // Green
    "#7c3aed", // Purple
  ];
  const accentColor = colors[index % colors.length];

  const id = calc.id;
  const name = calc.name;
  const description = calc.description || "No description provided.";
  const region = calc.formula?.region || calc.region || "International";
  const expression =
    calc.formula?.expression ||
    calc.displayExpression ||
    calc.expressionNotation ||
    "";
  const reference = calc.formula?.reference || calc.reference || "";
  const resolvedWorkspaceName =
    workspaceName || calc.workspaceName || calc.category || "General";
  const resolvedHref = href || `/platform/calculator/${id}`;

  return (
    <Link
      href={resolvedHref}
      className="group flex flex-col bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full"
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="h-8 w-8 rounded-lg border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center shrink-0">
            <Layout size={14} className="text-[#525252]" />
          </div>
          <div
            className="px-2 py-0.5 rounded-[4px] border text-[10px] font-medium shrink-0"
            style={{
              borderColor: `${accentColor}20`,
              backgroundColor: `${accentColor}10`,
              color: accentColor,
            }}
          >
            {region}
          </div>
        </div>

        <div className="mb-1 text-[10px] uppercase tracking-wider text-[#a1a1a1] font-semibold font-mono">
          {resolvedWorkspaceName}
        </div>
        <h4 className="text-[14px] font-semibold text-[#0a0a0a] leading-tight mb-2 group-hover:text-primary transition-colors">
          {name}
        </h4>
        <p className="text-[12px] text-[#a1a1a1] leading-relaxed line-clamp-2 mb-4 flex-1">
          {description}
        </p>

        {expression && (
          <div className="bg-[#fafafa] border border-[#e8e8e8] rounded-lg px-3 py-2 mb-2 overflow-hidden">
            <FormulaDisplay
              expression={expression}
              className="text-[12px] text-[#0a0a0a] font-mono font-medium"
            />
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525252] group-hover:text-[#0a0a0a] transition-colors">
          <span>{actionLabel}</span>
          <ArrowRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
        {reference && (
          <span className="text-[10px] text-[#a1a1a1] font-mono truncate max-w-[120px]">
            {reference}
          </span>
        )}
      </div>
    </Link>
  );
}

interface ReusableWorkspaceCardProps {
  workspace: any;
  index?: number;
  href?: string;
}

export function WorkspaceCard({
  workspace,
  index = 0,
  href,
}: ReusableWorkspaceCardProps) {
  const resolvedHref = href || `/platform/${workspace.id}`;

  return (
    <Link
      href={resolvedHref}
      className="group bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-full"
    >
      <div className="p-6 flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="h-10 w-10 rounded-xl border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center shrink-0">
            <Box size={20} className="text-[#525252]" />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-[#dcfce7] bg-[#f0fdf4] text-[11px] font-medium text-[#00b341] shrink-0">
            <div className="h-1.5 w-1.5 rounded-full bg-[#00b341]" />
            Active
          </div>
        </div>

        <h4 className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight mb-2 group-hover:text-primary transition-colors">
          {workspace.name}
        </h4>
        <p className="text-[13px] text-[#a1a1a1] leading-relaxed max-w-[450px]">
          {workspace.description}
        </p>
      </div>

      <div className="px-6 py-4 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between mt-auto">
        <div className="flex gap-1.5">
          {["Empirical", "Rational", "Simulation"].map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-[4px] border border-[#e8e8e8] bg-white text-[10px] font-mono text-[#a1a1a1]"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525252] group-hover:text-[#0a0a0a] transition-colors">
          <span>Open workspace</span>
          <ArrowRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
      </div>
    </Link>
  );
}

interface TableRegistryCardProps {
  table: any;
  index?: number;
  href?: string;
  actionLabel?: string;
}

export function TableRegistryCard({
  table,
  index = 0,
  href,
  actionLabel = "Open Table",
}: TableRegistryCardProps) {
  const colors = [
    "#0070f3", // Blue
    "#f97316", // Orange
    "#00b341", // Green
    "#7c3aed", // Purple
  ];
  const accentColor = colors[index % colors.length];

  const data = Array.isArray(table.data) ? table.data : [];
  const columns = Array.isArray(table.columns)
    ? (table.columns as { key: string; label?: string }[])
    : [];

  const id = table.id;
  const name = table.name;
  const region = table.region || "International";
  const reference = table.reference || table.sourceStandard || "";
  const resolvedHref = href || `/admin/registery/tables/${id}`;

  return (
    <Link
      href={resolvedHref}
      className="group flex flex-col bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full"
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="h-8 w-8 rounded-lg border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center shrink-0">
            <Table2 size={14} className="text-[#525252]" />
          </div>
          <div
            className="px-2 py-0.5 rounded-[4px] border text-[10px] font-medium shrink-0"
            style={{
              borderColor: `${accentColor}20`,
              backgroundColor: `${accentColor}10`,
              color: accentColor,
            }}
          >
            {region}
          </div>
        </div>

        <div className="mb-1.5 flex flex-wrap gap-1">
          <TableTypeBadge type={table.tableType} />
        </div>

        <h4 className="text-[14px] font-semibold text-[#0a0a0a] leading-tight mb-3 group-hover:text-primary transition-colors">
          {name}
        </h4>

        {/* Mini table Preview Box */}
        <div className="mb-2 mt-auto">
          <MiniTablePreview data={data} columns={columns} />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525252] group-hover:text-[#0a0a0a] transition-colors">
          <span>{actionLabel}</span>
          <ArrowRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#a1a1a1] font-mono shrink-0">
          <span>{data.length} rows</span>
          {reference && (
            <span
              className="truncate max-w-[80px] hover:text-[#525252] transition-colors"
              title={reference}
            >
              · {reference}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

interface WorkspaceRegistryCardProps {
  workspace: any;
  index?: number;
  href?: string;
  onDeleteClick: (
    e: React.MouseEvent,
    workspaceId: string,
    name: string,
  ) => void;
  deletePending?: boolean;
  actionLabel?: string;
}

export function WorkspaceRegistryCard({
  workspace,
  index = 0,
  href,
  onDeleteClick,
  deletePending = false,
  actionLabel = "Open Canvas",
}: WorkspaceRegistryCardProps) {
  const colors = [
    "#0070f3", // Blue
    "#f97316", // Orange
    "#00b341", // Green
    "#7c3aed", // Purple
  ];
  const accentColor = colors[index % colors.length];
  const resolvedHref = href || `/admin/workspaces/${workspace.id}`;

  return (
    <div className="group flex flex-col bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full relative">
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="h-9 w-9 rounded-lg border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center shrink-0">
            <LayoutGrid size={16} className="text-[#525252]" />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border border-[#dcfce7] bg-[#f0fdf4] text-[10px] font-medium text-[#00b341] shrink-0">
              <div className="h-1 w-1 rounded-full bg-[#00b341]" />
              Active
            </div>

            {/* Dropdown Menu actions */}
            <div className="shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 border border-transparent hover:border-[#e8e8e8] hover:bg-[#fafafa]"
                  >
                    <MoreVertical size={13} className="text-[#525252]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-32 bg-white border border-[#e8e8e8] shadow-[0_4px_12px_rgba(0,0,0,0.05)] rounded-md p-1"
                >
                  <DropdownMenuItem className="text-[12px] py-1.5 cursor-pointer text-[#0a0a0a] hover:bg-[#fafafa]">
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[12px] py-1.5 cursor-pointer text-[#0a0a0a] hover:bg-[#fafafa]">
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) =>
                      onDeleteClick(e, workspace.id, workspace.name)
                    }
                    className="text-[12px] py-1.5 cursor-pointer text-red-600 hover:bg-red-50/50"
                    disabled={deletePending}
                  >
                    {deletePending ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <Link href={resolvedHref} className="flex-1 flex flex-col">
          <h4 className="text-[15px] font-semibold text-[#0a0a0a] leading-tight mb-2 group-hover:text-primary transition-colors">
            {workspace.name}
          </h4>
          <p className="text-[12px] text-[#a1a1a1] leading-relaxed line-clamp-2 mb-4 flex-1">
            {workspace.description ||
              "Visual canvas for workflow organization."}
          </p>
        </Link>
      </div>

      <Link
        href={resolvedHref}
        className="px-5 py-3 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between mt-auto"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525252] group-hover:text-[#0a0a0a] transition-colors">
          <span>{actionLabel}</span>
          <ChevronRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform text-[#525252]"
          />
        </div>
        {workspace.updatedAt && (
          <div className="flex items-center gap-1 text-[10px] text-[#a1a1a1] font-mono shrink-0">
            <Calendar size={11} className="text-[#a1a1a1] shrink-0" />
            <span>{new Date(workspace.updatedAt).toLocaleDateString()}</span>
          </div>
        )}
      </Link>
    </div>
  );
}
