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

import {
  CalculatorDiscoveryCard,
  WorkspaceCard,
} from "@/components/platform/cards";
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
