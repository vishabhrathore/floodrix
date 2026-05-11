"use client";

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Box,
  Filter,
  X,
  Check,
  ChevronDown
} from 'lucide-react';
import { PLATFORM_DATA, Category, Calculator as CalculatorType, getAllCalculators } from '@/lib/platform-data';
import Link from 'next/link';
import { CalculatorDiscoveryCard } from '../page';
import { cn } from '@/lib/utils';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const workspace = PLATFORM_DATA.find(w => w.id === workspaceId);

  // Filter States
  const [regionFilter, setRegionFilter] = useState<string>('All');
  const [methodTypeFilter, setMethodTypeFilter] = useState<string>('All');

  if (!workspace) return <div>Workspace not found</div>;

  const allCalculators = useMemo(() => getAllCalculators(workspace.children), [workspace]);

  const regions = ['All', ...Array.from(new Set(allCalculators.map(c => c.formula.region)))];
  const methodTypes = ['All', 'Empirical', 'Rational', 'Simulation'];

  const filteredCalculators = allCalculators.filter(calc => {
    const regionMatch = regionFilter === 'All' || calc.formula.region === regionFilter;
    const typeMatch = methodTypeFilter === 'All' || calc.name.toLowerCase().includes(methodTypeFilter.toLowerCase()) || calc.categoryLabel?.toLowerCase().includes(methodTypeFilter.toLowerCase());
    return regionMatch && typeMatch;
  });

  return (
    <div className="w-full max-w-[1800px] mx-auto">
      {/* Structural Header - Standard Professional Style */}
      <div className="mb-12 border-b border-border pb-8">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-6">
          <Link href="/platform" className="hover:text-brand-red transition-colors">Workspaces</Link>
          <ChevronRight size={10} />
          <span className="text-brand-dark">{workspace.name}</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[22px] font-medium tracking-tight text-brand-dark">{workspace.name}</h1>
            <p className="text-sm text-muted-foreground font-normal max-w-2xl leading-relaxed">
              {workspace.description}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 px-4 py-2 rounded-lg border border-border/50">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-dark">Methodology Engine Active</span>
          </div>
        </div>
      </div>

      {/* Primary Filter Bar - Rapid Selection Pills */}
      <div className="mb-12 space-y-6">
        <div className="flex flex-wrap items-center gap-8">
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Region Scope</span>
            <div className="flex items-center gap-2">
              {regions.map(region => (
                <button
                  key={region}
                  onClick={() => setRegionFilter(region)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                    regionFilter === region
                      ? "bg-brand-dark text-white border-brand-dark shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:border-brand-dark/30"
                  )}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="h-10 w-px bg-border/50 hidden md:block"></div>

          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Analysis Type</span>
            <div className="flex items-center gap-2">
              {methodTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setMethodTypeFilter(type)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
                    methodTypeFilter === type
                      ? "bg-brand-dark text-white border-brand-dark shadow-sm"
                      : "bg-white text-muted-foreground border-border hover:border-brand-dark/30"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {(regionFilter !== 'All' || methodTypeFilter !== 'All') && (
          <div className="flex items-center gap-2 pt-2">
            <span className="text-[10px] font-bold uppercase text-muted-foreground mr-2">Active:</span>
            {regionFilter !== 'All' && (
              <button
                onClick={() => setRegionFilter('All')}
                className="flex items-center gap-1.5 px-2 py-1 bg-brand-red/5 border border-brand-red/20 rounded text-[10px] font-bold text-brand-red"
              >
                Region: {regionFilter} <X size={10} />
              </button>
            )}
            {methodTypeFilter !== 'All' && (
              <button
                onClick={() => setMethodTypeFilter('All')}
                className="flex items-center gap-1.5 px-2 py-1 bg-brand-red/5 border border-brand-red/20 rounded text-[10px] font-bold text-brand-red"
              >
                Type: {methodTypeFilter} <X size={10} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Discovery Grid - Structural Hierarchy */}
      <div className="space-y-16 pb-24">
        {workspace.children.map((child, i) => (
          <NavSection
            key={child.id}
            item={child}
            workspaceName={workspace.name}
            workspaceId={workspace.id}
            index={i}
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
  workspaceId,
  depth = 0,
  index = 0,
  activeRegion,
  activeType
}: {
  item: Category | CalculatorType,
  workspaceName: string,
  workspaceId: string,
  depth?: number,
  index?: number,
  activeRegion: string,
  activeType: string
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (item.type === 'calculator') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-l border-t border-border overflow-hidden rounded-xl">
        <CalculatorDiscoveryCard calc={{ ...item, workspaceId }} index={0} workspaceName={workspaceName} />
      </div>
    );
  }

  const allCalculatorsInTree = getAllCalculators([item]);

  // Filtering for counts
  const filteredInTree = allCalculatorsInTree.filter(calc => {
    const regionMatch = activeRegion === 'All' || calc.formula.region === activeRegion;
    const typeMatch = activeType === 'All' || calc.name.toLowerCase().includes(activeType.toLowerCase()) || calc.categoryLabel?.toLowerCase().includes(activeType.toLowerCase());
    return regionMatch && typeMatch;
  });

  const subCategories = item.children.filter(child => child.type === 'category') as Category[];
  const directCalculators = item.children.filter(child => child.type === 'calculator') as CalculatorType[];

  if (filteredInTree.length === 0 && (activeRegion !== 'All' || activeType !== 'All')) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={cn("space-y-6", depth > 0 && "pt-2")}
    >
      {/* Category Header - Accordion Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-6 border-b border-border/50 pb-4 group hover:border-brand-red/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-slate-500 group-hover:bg-brand-red group-hover:text-white transition-all">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
          <h2 className={cn(
            "font-medium text-brand-dark tracking-tight",
            depth === 0 ? "text-base" : "text-sm text-muted-foreground"
          )}>
            {item.name}
          </h2>
          <span className="text-[10px] font-bold text-muted-foreground/50 bg-muted px-2 py-0.5 rounded uppercase">
            {filteredInTree.length} {filteredInTree.length === 1 ? 'Method' : 'Methods'}
          </span>
        </div>

        <div className="h-px flex-1 bg-border/30 mx-4 hidden md:block"></div>
      </button>

      {/* Content Area - Animated Accordion */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className={cn(
              "space-y-12 relative pb-4",
              depth > 0 && "ml-[10px] border-l border-border pl-8"
            )}>
              {/* Direct Calculator Grid */}
              {directCalculators.length > 0 && (
                <div className=" bg-accent grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-l border-t border-border overflow-hidden rounded-xl shadow-sm">
                  <AnimatePresence mode="popLayout">
                    {directCalculators
                      .filter(calc => {
                        const regionMatch = activeRegion === 'All' || calc.formula.region === activeRegion;
                        const typeMatch = activeType === 'All' || calc.name.toLowerCase().includes(activeType.toLowerCase()) || calc.categoryLabel?.toLowerCase().includes(activeType.toLowerCase());
                        return regionMatch && typeMatch;
                      })
                      .map((calc, i) => (
                        <CalculatorDiscoveryCard
                          key={calc.id}
                          calc={{ ...calc, workspaceId }}
                          index={i}
                          workspaceName={workspaceName}
                        />
                      ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Recursive Sub-Sections */}
              {subCategories.length > 0 && (
                <div className="space-y-12">
                  {subCategories.map((subCat, i) => (
                    <NavSection
                      key={subCat.id}
                      item={subCat}
                      workspaceName={workspaceName}
                      workspaceId={workspaceId}
                      depth={depth + 1}
                      index={i}
                      activeRegion={activeRegion}
                      activeType={activeType}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
