"use client";

import React, { useState } from "react";

import Link from "next/link";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  ChevronRight,
  Clock,
  Database,
  Layout,
  Search,
  ShieldCheck,
} from "lucide-react";

import { FormulaDisplay } from "@/components/platform/formula-display";
import {
  Calculator as CalculatorType,
  PLATFORM_DATA,
  getAllCalculators,
} from "@/lib/platform-data";
import { cn } from "@/lib/utils";

export default function PlatformPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const allCalculators = PLATFORM_DATA.flatMap((ws) =>
    getAllCalculators(ws.children).map((c) => ({
      ...c,
      workspaceName: ws.name,
      workspaceId: ws.id,
    })),
  );

  const filteredCalculators = searchQuery
    ? allCalculators.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : allCalculators.slice(0, 4);

  return (
    <div className="px-7 md:px-10 py-7 md:py-10 w-full">
      {/* Page Header */}
      <div className="mb-10">
        <h3 className="text-h3 font-semibold text-[#0a0a0a] tracking-tight leading-tight mb-2">
          Engineering Methodologies
        </h3>
        <p className="text-[14px] text-[#a1a1a1] max-w-[600px] leading-relaxed font-normal">
          Explore our comprehensive library of validated engineering toolsets
          and analysis frameworks.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 border border-[#e8e8e8] rounded-xl overflow-hidden mb-12">
        <StatCell value="24" label="Methods available" delta="+ 4 this month" />
        <StatCell value="6" label="Engineering domains" />
        <StatCell
          value="99"
          label="Validation accuracy"
          sup="%"
          sub="IS / IRC / ACI"
        />
        <StatCell value="2" label="Active workspaces" />
      </div>

      <div className="space-y-16 pb-20">
        {/* Recommended Methods */}
        <section>
          <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
            <h4 className="text-[14px] font-semibold text-[#0a0a0a]">
              Recommended Methods
            </h4>
            <span className="text-[12px] text-[#a1a1a1] font-mono">
              {filteredCalculators.length} methods
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {filteredCalculators.map((calc, i) => (
              <CalculatorDiscoveryCard
                key={calc.id}
                calc={calc}
                index={i}
                workspaceName={calc.workspaceName || "Platform"}
              />
            ))}
          </div>
        </section>

        {/* Technical Workspaces */}
        <section>
          <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
            <h4 className="text-[14px] font-semibold text-[#0a0a0a]">
              Technical Workspaces
            </h4>
            <span className="text-[12px] text-[#a1a1a1] font-mono">
              {PLATFORM_DATA.length} domains
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {PLATFORM_DATA.map((workspace, index) => (
              <WorkspaceCard
                key={workspace.id}
                workspace={workspace}
                index={index}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCell({
  value,
  label,
  delta,
  sup,
  sub,
}: {
  value: string;
  label: string;
  delta?: string;
  sup?: string;
  sub?: string;
}) {
  return (
    <div className="px-6 py-5 border-r border-[#e8e8e8] last:border-r-0 hover:bg-[#fafafa] transition-colors">
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[28px] font-semibold text-[#0a0a0a] tracking-tighter">
          {value}
        </span>
        {sup && (
          <sup className="text-[14px] font-medium text-[#a1a1a1]">{sup}</sup>
        )}
      </div>
      <div className="text-[11px] text-[#a1a1a1] font-medium mb-1">{label}</div>
      {delta && (
        <div className="text-[11px] text-[#00b341] font-medium font-mono">
          {delta}
        </div>
      )}
      {sub && (
        <div className="text-[11px] text-[#00b341] font-medium font-mono">
          {sub}
        </div>
      )}
    </div>
  );
}

export function CalculatorDiscoveryCard({
  calc,
  index,
  workspaceName,
}: {
  calc: any;
  index: number;
  workspaceName: string;
}) {
  // Chart-based colors for variety
  const colors = [
    "#0070f3", // Blue
    "#f97316", // Orange
    "#00b341", // Green
    "#7c3aed", // Purple
  ];
  const accentColor = colors[index % colors.length];

  return (
    <Link
      href={`/platform/calculator/${calc.id}`}
      className="group flex flex-col bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="h-8 w-8 rounded-lg border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center">
            <Layout size={14} className="text-[#525252]" />
          </div>
          <div
            className="px-2 py-0.5 rounded-[4px] border border-[#dbeafe] bg-[#eff6ff] text-[10px] font-medium text-[#0070f3]"
            style={{
              borderColor: `${accentColor}20`,
              backgroundColor: `${accentColor}10`,
              color: accentColor,
            }}
          >
            {calc.formula.region || "International"}
          </div>
        </div>

        <div className="mb-1 text-[10px] uppercase tracking-wider text-[#a1a1a1] font-medium">
          {workspaceName}
        </div>
        <h4 className="text-[14px] font-semibold text-[#0a0a0a] leading-tight mb-2">
          {calc.name}
        </h4>
        <p className="text-[12px] text-[#a1a1a1] leading-relaxed line-clamp-2 mb-4 flex-1">
          {calc.description}
        </p>

        <div className="bg-[#fafafa] border border-[#e8e8e8] rounded-lg px-3 py-2.5 mb-2 overflow-hidden">
          <FormulaDisplay
            expression={calc.formula.expression}
            className="text-[13px] text-[#0a0a0a]"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525252] group-hover:text-[#0a0a0a] transition-colors">
          Calculate{" "}
          <ArrowRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
        <span className="text-[10px] text-[#d4d4d4] font-mono">
          {calc.formula.reference}
        </span>
      </div>
    </Link>
  );
}

function WorkspaceCard({
  workspace,
  index,
}: {
  workspace: any;
  index: number;
}) {
  return (
    <Link
      href={`/platform/${workspace.id}`}
      className="group bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="h-10 w-10 rounded-xl border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center">
            <Box size={20} className="text-[#525252]" />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-[#dcfce7] bg-[#f0fdf4] text-[11px] font-medium text-[#00b341]">
            <div className="h-1.5 w-1.5 rounded-full bg-[#00b341]" />
            Active
          </div>
        </div>

        <h4 className="text-[18px] font-semibold text-[#0a0a0a] tracking-tight mb-2">
          {workspace.name}
        </h4>
        <p className="text-[13px] text-[#a1a1a1] leading-relaxed max-w-[450px]">
          {workspace.description}
        </p>
      </div>

      <div className="px-6 py-4 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between">
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
          Open workspace{" "}
          <ArrowRight
            size={12}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
      </div>
    </Link>
  );
}
