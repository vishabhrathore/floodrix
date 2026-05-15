"use client";

import React, { useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronRight, Search } from "lucide-react";

import { PLATFORM_DATA, getAllCalculators } from "@/lib/platform-data";
import { cn } from "@/lib/utils";

export function PlatformHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  // Generate dynamic breadcrumbs
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean); // ['platform', 'calculator', 'id'] or ['platform', 'workspaceId']
    const crumbs = [{ label: "Workspaces", href: "/platform" }];

    if (parts.length >= 2) {
      if (parts[1] === "calculator" && parts[2]) {
        // We are on a calculator page: /platform/calculator/[id]
        const calcId = parts[2];
        const allCalculators = getAllCalculators(
          PLATFORM_DATA.flatMap((ws) => ws.children),
        );
        const calculator = allCalculators.find((c) => c.id === calcId);

        if (calculator) {
          // Find parent workspace for this calculator
          const workspace = PLATFORM_DATA.find((ws) =>
            getAllCalculators(ws.children).some((c) => c.id === calcId),
          );

          if (workspace) {
            crumbs.push({
              label: workspace.name,
              href: `/platform/${workspace.id}`,
            });
          }
          crumbs.push({ label: calculator.name, href: pathname });
        }
      } else {
        // We are likely on a workspace page: /platform/[workspaceId]
        const workspaceId = parts[1];
        const workspace = PLATFORM_DATA.find((w) => w.id === workspaceId);

        if (workspace) {
          crumbs.push({
            label: workspace.name,
            href: `/platform/${workspaceId}`,
          });
        } else if (
          parts.length === 1 ||
          (parts.length === 2 && parts[1] === "platform")
        ) {
          crumbs.push({ label: "Overview", href: "/platform" });
        }
      }
    } else {
      crumbs.push({ label: "Overview", href: "/platform" });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="sticky top-0 z-40 flex h-[56px] w-full items-center justify-between border-b border-[#e8e8e8] bg-white/90 px-7 md:px-10 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1.5 text-[13px]">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.href}>
              {i > 0 && <ChevronRight size={14} className="text-[#d4d4d4]" />}
              {i === breadcrumbs.length - 1 ? (
                <span className="font-medium text-[#0a0a0a]">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-[#a1a1a1] hover:text-[#0a0a0a] transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </React.Fragment>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="flex h-8 w-[240px] items-center gap-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-3 transition-all hover:border-[#d4d4d4]">
            <Search size={13} className="text-[#a1a1a1]" />
            <input
              type="text"
              placeholder="Search methods..."
              className="flex-1 bg-transparent text-[12px] text-[#0a0a0a] outline-none placeholder:text-[#a1a1a1]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center gap-0.5 rounded border border-[#e8e8e8] bg-[#f5f5f5] px-1 py-0.5 text-[9px] font-mono text-[#a1a1a1]">
              <span>⌘</span>
              <span>K</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00b341] opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#00b341]"></span>
            </div>
            <span className="text-[12px] text-[#525252]">Engine active</span>
          </div>

          <button className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0a] text-[10px] font-semibold text-white">
            AK
          </button>
        </div>
      </div>
    </header>
  );
}
