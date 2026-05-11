"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Calculator,
  FolderTree,
  Box,
  LayoutGrid,
  Sigma,
  ArrowRight,
  Zap
} from 'lucide-react';
import { PLATFORM_DATA, Category, Calculator as CalculatorType } from '@/lib/platform-data';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
} from '@/components/ui/sidebar';

export function PlatformSidebar() {
  const pathname = usePathname();
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({
    'ws-hydrology': true
  });

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-white text-sidebar-foreground">
      <SidebarHeader className="p-6 border-b border-sidebar-border/50">
        <Link href="/platform" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red text-white shadow-lg shadow-brand-red/20">
            <LayoutGrid size={20} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-black tracking-tighter text-brand-dark uppercase">FloodRix</h1>
            <p className="text-[10px] font-bold text-brand-red uppercase tracking-widest">Engineering Portal</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60 mb-4">
            Workspaces
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {PLATFORM_DATA.map((workspace) => (
                <SidebarMenuItem key={workspace.id}>
                  <button
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-4 py-2.5 transition-all hover:bg-muted/50",
                      expandedWorkspaces[workspace.id] ? "text-brand-dark bg-muted/30" : "text-muted-foreground"
                    )}
                    onClick={() => toggleWorkspace(workspace.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Box size={16} className={expandedWorkspaces[workspace.id] ? "text-brand-red" : "opacity-50"} />
                      <span className="text-[11px] font-black uppercase tracking-[0.1em]">{workspace.name}</span>
                    </div>
                    {expandedWorkspaces[workspace.id] ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
                  </button>

                  {expandedWorkspaces[workspace.id] && (
                    <div className="ml-3 mt-1 border-l-2 border-muted space-y-1 py-1">
                      {workspace.children.map((child) => (
                        <RecursiveNavItem key={child.id} item={child} level={1} />
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="mt-auto px-4 pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-slate-50 p-5 shadow-sm group border border-slate-200 hover:border-brand-red/30 transition-colors duration-300">
          {/* Subtle Technical Pattern */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-red/10 text-brand-red">
                <Zap size={12} fill="currentColor" />
              </div>
              <p className="text-[10px] font-black text-brand-dark uppercase tracking-[0.2em]">Bespoke Engineering</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                Need a custom analytical framework or a bespoke computational tool?
              </p>
            </div>

            <Link href="/#contact" className="flex items-center justify-between group/btn w-full bg-white hover:bg-brand-red transition-all duration-300 rounded-lg px-4 py-2.5 border border-slate-200 hover:border-brand-red shadow-sm">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-dark group-hover/btn:text-white transition-colors">Contact Experts</span>
              <ArrowRight size={14} className="text-brand-red group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

function RecursiveNavItem({ item, level }: { item: Category | CalculatorType, level: number }) {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-open first few levels
  const pathname = usePathname();

  if (item.type === 'calculator') {
    const isActive = pathname === `/platform/calculator/${item.id}`;
    return (
      <Link
        href={`/platform/calculator/${item.id}`}
        className={cn(
          "group relative flex items-center gap-2 py-2 pl-4 pr-2 text-sm transition-all",
          isActive
            ? "text-brand-red font-bold"
            : "text-muted-foreground hover:text-brand-dark"
        )}
      >
        {/* Active high-contrast marker */}
        {isActive && <div className="absolute left-[-1px] h-full w-[2px] bg-brand-red" />}

        <Sigma size={12} className={cn("shrink-0 transition-colors", isActive ? "text-brand-red" : "opacity-30 group-hover:opacity-100 group-hover:text-brand-red")} />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        className={cn(
          "flex w-full items-center justify-between py-2 pl-4 pr-2 text-sm transition-all hover:text-brand-red",
          isOpen ? "text-brand-dark font-bold" : "text-muted-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 truncate">
          <FolderTree size={14} className="opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />

          <span className="truncate">{item.name}</span>
        </div>
        {isOpen ? <ChevronDown size={12} className="opacity-30" /> : <ChevronRight size={12} className="opacity-30" />}
      </button>

      {isOpen && (
        <div className="ml-5 border-l border-border/40 flex flex-col gap-0.5">
          {item.children.map((child) => (
            <RecursiveNavItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
