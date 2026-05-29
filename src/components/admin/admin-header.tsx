"use client";

import React, { useState } from "react";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { ChevronRight, PanelLeft, Search } from "lucide-react";

import { useSidebar } from "@/components/ui/sidebar";

export function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();

  // Generate dynamic breadcrumbs for Admin Panel
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean); // ['admin', 'registery', 'formulas']
    const crumbs = [{ label: "Admin", href: "/admin" }];

    if (parts.length >= 2) {
      const mapping: Record<string, string> = {
        organizations: "Organizations",
        users: "Users",
        workflows: "Workflows",
        automation: "Automation",
        calc: "Calculations",
        workspaces: "Workspaces",
        registery: "Library",
        formulas: "Formula Registry",
        tables: "Table Registry",
        system: "System",
        billing: "Billing Plans",
        "audit-log": "Audit Log",
        jobs: "Background Jobs",
        "review-queue": "Review Queue",
      };

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];

        // Skip adding "registery" as a breadcrumb layer to match sidebar layout "Library"
        if (part === "registery") continue;

        // If the part is an ID (e.g. formulaId or tableId), display "Detail" or the ID shortened
        const isId =
          part.length > 15 || (part.includes("-") && part.length > 8);
        const label = isId
          ? "Detail"
          : mapping[part] || part.charAt(0).toUpperCase() + part.slice(1);

        const href = "/" + parts.slice(0, i + 1).join("/");
        crumbs.push({ label, href });
      }
    } else {
      crumbs.push({ label: "Dashboard", href: "/admin" });
    }

    return crumbs;
  };

  const searchParams = useSearchParams();
  const organizationId = searchParams.get("organizationId");
  const breadcrumbs = getBreadcrumbs();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-40 flex h-[56px] w-full items-center justify-between border-b border-[#e8e8e8] bg-white/90 px-5 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-md text-[#a1a1a1] transition-colors hover:bg-gray-100 hover:text-[#0a0a0a] -ml-2 cursor-pointer"
          title="Toggle Sidebar"
        >
          <PanelLeft size={16} />
        </button>
        <nav className="flex items-center gap-1.5 text-[13px]">
          {breadcrumbs.map((crumb, i) => {
            const linkUrl = organizationId
              ? `${crumb.href}?organizationId=${organizationId}`
              : crumb.href;

            return (
              <React.Fragment key={crumb.href}>
                {i > 0 && <ChevronRight size={14} className="text-[#d4d4d4]" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-[#0a0a0a]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={linkUrl}
                    className="text-[#a1a1a1] hover:text-[#0a0a0a] transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative group">
          <div className="flex h-8 w-[240px] items-center gap-2 rounded-lg border border-[#e8e8e8] bg-[#fafafa] px-3 transition-all hover:border-[#d4d4d4]">
            <Search size={13} className="text-[#a1a1a1]" />
            <input
              type="text"
              placeholder="Search admin controls..."
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
          <button className="ml-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#0a0a0a] text-[10px] font-semibold text-white">
            SA
          </button>
        </div>
      </div>
    </header>
  );
}
