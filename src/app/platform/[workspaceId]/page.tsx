"use client";

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Box,
  ChevronDown,
  Layout,
  ArrowRight
} from 'lucide-react';
import { PLATFORM_DATA, Category, Calculator as CalculatorType, getAllCalculators } from '@/lib/platform-data';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { FormulaDisplay } from '@/components/platform/formula-display';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const workspace = PLATFORM_DATA.find(w => w.id === workspaceId);

  // Filter States
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [methodTypeFilter, setMethodTypeFilter] = useState<string>('All');

  if (!workspace) return <div className="p-20 text-center">Workspace not found</div>;

  const allCalculators = useMemo(() => getAllCalculators(workspace.children), [workspace]);
  const regions = ['All', ...Array.from(new Set(allCalculators.map(c => c.formula.region)))];
  const methodTypes = ['All', 'Empirical', 'Rational', 'Simulation'];

  return (
    <div className="px-7 md:px-10 py-7 md:py-10 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <div className="space-y-2">
          <h3 className="text-h3 font-semibold text-[#0a0a0a] tracking-tight leading-tight">{workspace.name}</h3>
          <p className="text-[14px] text-[#a1a1a1] max-w-[600px] leading-relaxed font-normal">
            {workspace.description}
          </p>
        </div>

      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-8 bg-[#fafafa] border border-[#e8e8e8] rounded-xl px-6 py-4 mb-12">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1a1]">Region</span>
          <div className="flex items-center gap-1.5">
            {regions.map(region => (
              <button
                key={region}
                onClick={() => setRegionFilter(region)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
                  regionFilter === region
                    ? "bg-[#0a0a0a] text-white shadow-sm"
                    : "text-[#525252] border border-[#e8e8e8] bg-white hover:border-[#d4d4d4]"
                )}
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        <div className="h-6 w-px bg-[#e8e8e8]" />

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#a1a1a1]">Type</span>
          <div className="flex items-center gap-1.5">
            {methodTypes.map(type => (
              <button
                key={type}
                onClick={() => setMethodTypeFilter(type)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-[12px] font-medium transition-all",
                  methodTypeFilter === type
                    ? "bg-[#0a0a0a] text-white shadow-sm"
                    : "text-[#525252] border border-[#e8e8e8] bg-white hover:border-[#d4d4d4]"
                )}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-12 pb-24">
        {workspace.children.map((child, i) => (
          <NavSection
            key={child.id}
            item={child}
            workspaceName={workspace.name}
            activeRegion={regionFilter}
            activeType={methodTypeFilter}
          />
        ))}
      </div>
    </div>
  );
}

function NavSection({
  item,
  workspaceName,
  activeRegion,
  activeType
}: {
  item: Category | CalculatorType,
  workspaceName: string,
  activeRegion: string,
  activeType: string
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (item.type === 'calculator') {
    const show = (activeRegion === 'All' || item.formula.region === activeRegion) &&
      (activeType === 'All' || item.name.includes(activeType) || item.categoryLabel?.includes(activeType));
    if (!show) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
        <CalculatorDiscoveryCard calc={item} workspaceName={workspaceName} index={0} />
      </div>
    );
  }

  const allInTree = getAllCalculators([item]);
  const filteredInTree = allInTree.filter(calc => {
    const regionMatch = activeRegion === 'All' || calc.formula.region === activeRegion;
    const typeMatch = activeType === 'All' || calc.name.toLowerCase().includes(activeType.toLowerCase()) || calc.categoryLabel?.toLowerCase().includes(activeType.toLowerCase());
    return regionMatch && typeMatch;
  });

  if (filteredInTree.length === 0 && (activeRegion !== 'All' || activeType !== 'All')) return null;

  return (
    <div className="space-y-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 group"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded border border-[#e8e8e8] bg-[#fafafa] text-[#a1a1a1] transition-all group-hover:border-[#d4d4d4] group-hover:text-[#525252]">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <h4 className="text-[14px] font-semibold text-[#0a0a0a]">{item.name}</h4>
        <span className="text-[11px] text-[#a1a1a1] bg-[#f5f5f5] px-1.5 py-0.5 rounded font-mono">
          {filteredInTree.length} {filteredInTree.length === 1 ? 'method' : 'methods'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredInTree.map((calc, i) => (
                <CalculatorDiscoveryCard
                  key={calc.id}
                  calc={calc}
                  workspaceName={workspaceName}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CalculatorDiscoveryCard({ calc, workspaceName, index }: { calc: CalculatorType, workspaceName: string, index: number }) {
  const colors = [
    '#0070f3', // Blue
    '#f97316', // Orange
    '#00b341', // Green
    '#7c3aed', // Purple
  ];
  const accentColor = colors[index % colors.length];

  return (
    <Link
      href={`/platform/calculator/${calc.id}`}
      className="group flex flex-col bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
    >
      <div className="h-0.5 w-full" style={{ backgroundColor: accentColor }} />

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="h-8 w-8 rounded-lg border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center">
            <Layout size={14} className="text-[#a1a1a1]" />
          </div>
          <div className="px-2 py-0.5 rounded-[4px] border border-[#dbeafe] bg-[#eff6ff] text-[10px] font-medium text-[#0070f3]"
            style={{
              borderColor: `${accentColor}20`,
              backgroundColor: `${accentColor}10`,
              color: accentColor
            }}>
            {calc.formula.region || 'International'}
          </div>
        </div>

        <div className="mb-1 text-[10px] uppercase tracking-wider text-[#a1a1a1] font-medium">
          {workspaceName}
        </div>
        <h4 className="text-[15px] font-semibold text-[#0a0a0a] leading-tight mb-2">
          {calc.name}
        </h4>
        <p className="text-[12px] text-[#a1a1a1] leading-relaxed line-clamp-2 mb-5 flex-1">
          {calc.description}
        </p>

        <div className="bg-[#fafafa] border border-[#e8e8e8] rounded-lg px-3 py-3 mb-2">
          <FormulaDisplay expression={calc.formula.expression} className="text-[14px] text-[#0a0a0a]" />
        </div>
      </div>

      <div className="px-5 py-3.5 border-t border-[#e8e8e8] bg-[#fafafa] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#525252] group-hover:text-[#0a0a0a] transition-colors">
          Calculate <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
        <span className="text-[10px] text-[#d4d4d4] font-mono">{calc.formula.reference}</span>
      </div>
    </Link>
  );
}
