"use client";

import React, { useState } from "react";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, ChevronRight, PanelLeft, Search } from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { useSidebar } from "@/components/ui/sidebar";
import { useTRPC } from "@/trpc/client";

export function AdminHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const routeParams = useParams();
  const router = useRouter();
  const trpc = useTRPC();

  const orgId = routeParams?.orgId as string;
  const { data: orgs } = useQuery(
    trpc.organizations.getMany.queryOptions({}),
  );

  const handleOrgChange = (newOrgId: string) => {
    if (!newOrgId || !orgId) return;
    const newPath = pathname.replace(`/admin/${orgId}`, `/admin/${newOrgId}`);
    router.push(newPath);
  };

  // Generate dynamic breadcrumbs for Admin Panel
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean); // ['admin', 'orgId', 'registery', 'formulas']
    
    // Set root crumb pointing to /admin/[orgId]
    const crumbs = [{ label: "Admin", href: orgId ? `/admin/${orgId}` : "/admin" }];

    if (parts.length >= 3) {
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

      for (let i = 2; i < parts.length; i++) {
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
      crumbs.push({ label: "Dashboard", href: orgId ? `/admin/${orgId}` : "/admin" });
    }

    return crumbs;
  };

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

        {/* Premium Organization Switcher Dropdown */}
        {orgs && orgs.items && orgs.items.length > 0 && orgId && (
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-[#e8e8e8]">
            <Building2 size={13} className="text-[#a1a1a1]" />
            <select
              value={orgId}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="bg-transparent border-none text-[12px] font-semibold text-[#525252] focus:outline-none cursor-pointer hover:text-[#0a0a0a] transition-colors pr-2"
            >
              {orgs.items.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}
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
