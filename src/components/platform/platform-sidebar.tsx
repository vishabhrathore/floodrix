"use client";

import React, { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  ArrowRight,
  Box,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Layout,
  LayoutGrid,
  Sigma,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  Calculator as CalculatorType,
  Category,
  PLATFORM_DATA,
} from "@/lib/platform-data";
import { cn } from "@/lib/utils";

export function PlatformSidebar() {
  const pathname = usePathname();
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<
    Record<string, boolean>
  >({
    "ws-hydrology": true,
  });

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Sidebar className="border-r border-[#e8e8e8] bg-white text-[#0a0a0a]">
      <SidebarHeader className="h-[56px] px-4 border-b border-[#e8e8e8] flex flex-row items-center gap-2.5">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[#0a0a0a]">
          <LayoutGrid size={12} className="text-white" strokeWidth={3} />
        </div>
        <div className="flex items-center text-[13px] font-semibold tracking-tight">
          <span>Floodrix</span>
          <span className="mx-1 font-light text-[#d4d4d4]">/</span>
          <span className="font-normal text-[#a1a1a1]">Portal</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-hide flex flex-col gap-0 py-2">
        {/* GENERAL SECTION */}
        <div className="py-2 border-b border-[#e8e8e8]">
          <div className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#a1a1a1]">
            General
          </div>
          <SidebarItem
            icon={<LayoutGrid size={14} />}
            label="Overview"
            active={pathname === "/platform"}
            href="/platform"
          />
        </div>

        {/* WORKSPACES SECTION */}
        <div className="py-2 border-b border-[#e8e8e8] flex-1">
          <div className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#a1a1a1]">
            Workspaces
          </div>
          {PLATFORM_DATA.map((workspace) => (
            <div key={workspace.id} className="mb-0.5">
              <div
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-1.5 text-[13px] transition-all hover:bg-[#fafafa]",
                  expandedWorkspaces[workspace.id] ||
                    pathname.includes(workspace.id)
                    ? "text-[#0a0a0a] font-medium"
                    : "text-[#525252]",
                )}
              >
                <Link
                  href={`/platform/${workspace.id}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                >
                  <Box
                    size={14}
                    className={
                      expandedWorkspaces[workspace.id] ||
                      pathname.includes(workspace.id)
                        ? "text-[#0a0a0a]"
                        : "opacity-50"
                    }
                  />
                  <span className="truncate">{workspace.name}</span>
                </Link>
                <button
                  onClick={() => toggleWorkspace(workspace.id)}
                  className="p-1 hover:bg-[#f0f0f0] rounded transition-colors"
                >
                  {expandedWorkspaces[workspace.id] ? (
                    <ChevronDown size={14} className="opacity-30" />
                  ) : (
                    <ChevronRight size={14} className="opacity-30" />
                  )}
                </button>
              </div>

              {expandedWorkspaces[workspace.id] && (
                <div className="flex flex-col gap-0.5 mt-0.5 border-l-2 border-[#f5f5f5] ml-[23px]">
                  {workspace.children.map((child) => (
                    <RecursiveNavItem key={child.id} item={child} level={1} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </SidebarContent>

      {/* Footer / Bespoke Engineering */}
      <div className="p-3 border-top border-[#e8e8e8]">
        <div className="rounded-lg border border-[#e8e8e8] bg-[#fafafa] p-3.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[#0070f3]" />
            <span className="text-[11px] font-semibold text-[#0a0a0a]">
              Bespoke Engineering
            </span>
          </div>
          <p className="text-[11px] text-[#a1a1a1] leading-relaxed mb-3">
            Need a custom framework or bespoke computational tool?
          </p>
          <Link
            href="/contact"
            className="flex h-8 w-full items-center justify-center rounded-md bg-[#0a0a0a] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Contact Experts
          </Link>
        </div>
      </div>
    </Sidebar>
  );
}

function SidebarItem({
  icon,
  label,
  badge,
  active,
  dot,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  badge?: string;
  active?: boolean;
  dot?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href || "#"}
      className={cn(
        "flex w-full items-center gap-2 px-4 py-1.5 text-[13px] transition-all border-l-2",
        active
          ? "bg-[#fafafa] text-[#0a0a0a] border-[#0a0a0a] font-medium"
          : "text-[#525252] border-transparent hover:bg-[#fafafa] hover:text-[#0a0a0a]",
      )}
    >
      {icon && (
        <span className={cn("opacity-50", active && "opacity-100")}>
          {icon}
        </span>
      )}
      {dot && <div className="h-1 w-1 rounded-full bg-current opacity-40" />}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-[10px] font-medium bg-[#f5f5f5] text-[#a1a1a1] px-1.5 py-0.5 rounded font-mono">
          {badge}
        </span>
      )}
    </Link>
  );
}

function RecursiveNavItem({
  item,
  level,
}: {
  item: Category | CalculatorType;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(level < 2);
  const pathname = usePathname();

  if (item.type === "calculator") {
    const isActive = pathname === `/platform/calculator/${item.id}`;
    return (
      <Link
        href={`/platform/calculator/${item.id}`}
        className={cn(
          "group relative flex items-center gap-2 py-1.5 pl-4 pr-4 text-[13px] transition-all",
          isActive
            ? "text-[#0a0a0a] font-medium bg-[#fafafa]"
            : "text-[#525252] hover:text-[#0a0a0a] hover:bg-[#fafafa]",
        )}
      >
        {isActive && (
          <div className="absolute left-[-2px] h-full w-[2px] bg-[#0a0a0a]" />
        )}
        <Sigma
          size={14}
          className={cn(
            "shrink-0 transition-colors",
            isActive ? "text-[#0a0a0a]" : "opacity-30 group-hover:opacity-100",
          )}
        />
        <span className="truncate">{item.name}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        className={cn(
          "flex w-full items-center gap-2 py-1.5 pl-4 pr-4 text-[13px] transition-all hover:bg-[#fafafa]",
          isOpen ? "text-[#0a0a0a] font-medium" : "text-[#525252]",
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <FolderTree size={14} className="opacity-40 shrink-0" />
        <span className="truncate flex-1 text-left">{item.name}</span>
        {isOpen ? (
          <ChevronDown size={12} className="opacity-30" />
        ) : (
          <ChevronRight size={12} className="opacity-30" />
        )}
      </button>

      {isOpen && (
        <div className="flex flex-col gap-0.5 ml-3 border-l border-[#f0f0f0]">
          {item.children.map((child) => (
            <RecursiveNavItem key={child.id} item={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
