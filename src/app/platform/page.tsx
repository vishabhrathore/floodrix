"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, ArrowRight, Search, Sigma, ChevronRight, Database } from 'lucide-react';
import { PLATFORM_DATA, getAllCalculators, Calculator as CalculatorType } from '@/lib/platform-data';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PlatformPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const allCalculators = PLATFORM_DATA.flatMap(ws =>
    getAllCalculators(ws.children).map(c => ({
      ...c,
      workspaceName: ws.name,
      workspaceId: ws.id
    }))
  );

  const filteredCalculators = searchQuery
    ? allCalculators.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : allCalculators.slice(0, 4);

  return (
    <div className="w-full max-w-[1800px] mx-auto">
      {/* Structural Header */}
      <div className="mb-12 border-b border-border pb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-[22px] font-medium tracking-tight text-brand-dark">Engineering Methodologies</h1>
            <p className="text-sm text-muted-foreground font-normal max-w-2xl leading-relaxed">
              Explore our comprehensive library of validated engineering toolsets and analysis frameworks.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Search methods or standards..."
              className="h-10 w-full rounded-lg border border-border bg-white pl-10 pr-4 text-xs font-normal text-brand-dark outline-none focus:border-brand-red/50 focus:ring-4 focus:ring-brand-red/5 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="space-y-20 pb-24">
        {/* Discovery Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-base font-medium text-brand-dark tracking-tight">
                {searchQuery ? 'Analysis Results' : 'Recommended Methods'}
              </h2>
              <span className="text-[10px] font-bold text-muted-foreground/50 bg-muted px-2 py-0.5 rounded uppercase">
                {filteredCalculators.length} Methods
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 border-l border-t border-border overflow-hidden rounded-xl shadow-sm">
            <AnimatePresence mode="popLayout">
              {filteredCalculators.map((calc, i) => (
                <CalculatorDiscoveryCard
                  key={calc.id}
                  calc={calc}
                  index={i}
                  workspaceName={calc.workspaceName || 'Platform'}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

        {/* Workspace Architecture */}
        <section className="space-y-6">
          <div className="flex items-center gap-4 border-b border-border/50 pb-4">
            <h2 className="text-base font-medium text-brand-dark tracking-tight">Technical Workspaces</h2>
            <span className="text-[10px] font-bold text-muted-foreground/50 bg-muted px-2 py-0.5 rounded uppercase">
              {PLATFORM_DATA.length} Domains
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-l border-t border-border overflow-hidden rounded-xl shadow-sm">
            {PLATFORM_DATA.map((workspace, index) => (
              <WorkspaceCard key={workspace.id} workspace={workspace} index={index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function CalculatorDiscoveryCard({ calc, index, workspaceName }: { calc: any, index: number, workspaceName: string }) {
  return (
    <Link
      href={`/platform/calculator/${calc.id}`}
      className="group relative flex flex-col bg-white transition-all duration-300 border-r border-b border-border p-5 md:p-6 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] z-0 hover:z-10"
    >
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="flex flex-col h-full"
      >
        {/* Atmospheric Gradient Sweep - Top Right Only */}
        <div className="absolute inset-0 bg-gradient-to-bl from-brand-red/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        {/* Precision Accent Border */}
        <div className="absolute left-0 top-0 h-full w-px bg-brand-red scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-start justify-between mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-red group-hover:text-white transition-colors duration-300">
              <Sigma size={18} />
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">{calc.formula.region}</span>
              <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{workspaceName}</span>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-body font-semibold text-brand-dark leading-snug group-hover:text-brand-red transition-colors duration-300">
                {calc.name}
              </h3>
              <p className="text-[12px] text-muted-foreground mt-2 leading-relaxed line-clamp-2">
                {calc.description}
              </p>
            </div>

            <div className="w-fit rounded-md bg-slate-900 text-white px-3 py-1.5 font-mono text-[11px] tracking-tight border border-slate-800 text-left">
              {calc.formula.expression}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-dark uppercase tracking-wider group-hover:translate-x-1 transition-transform duration-300">
              Calculate <ChevronRight size={12} className="text-brand-red" />
            </div>
            <span className="text-[9px] font-medium text-muted-foreground/60 uppercase">{calc.formula.reference}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}



function WorkspaceCard({ workspace, index }: { workspace: any, index: number }) {
  const methodCount = getAllCalculators(workspace.children).length;

  return (
    <Link
      href={`/platform/${workspace.id}`}
      className="group relative flex flex-col bg-white transition-all duration-300 p-6 md:p-8 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] z-0 hover:z-10 border-r border-b border-border"
    >
      {/* Atmospheric Gradient Sweep - Top Right Only */}
      <div className="absolute inset-0 bg-gradient-to-bl from-brand-red/[0.04] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      {/* Precision Accent Border */}
      <div className="absolute left-0 top-0 h-full w-px bg-brand-red scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top"></div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 group-hover:bg-brand-red group-hover:text-white transition-all duration-300">
            <Box size={24} />
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-brand-red uppercase tracking-wider">Workspace</span>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-brand-dark leading-snug group-hover:text-brand-red transition-colors duration-300">
              {workspace.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed line-clamp-2">
              {workspace.description}
            </p>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-slate-100 pt-6">
          <div className="flex items-center gap-2 text-[11px] font-bold text-brand-dark uppercase tracking-wider group-hover:translate-x-1 transition-transform duration-300">
            Enter Workspace <ChevronRight size={14} className="text-brand-red" />
          </div>
          <span className="text-[10px] font-bold text-brand-red bg-brand-red/5 px-2 py-0.5 rounded uppercase tracking-tighter">
            {methodCount} Methods
          </span>
        </div>
      </div>
    </Link>
  );
}




