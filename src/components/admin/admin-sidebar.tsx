"use client";

import React from "react";

import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  Building2Icon,
  CalculatorIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LayoutGridIcon,
  LibraryIcon,
  LogOutIcon,
  ScrollTextIcon,
  ServerCogIcon,
  SigmaIcon,
  TableIcon,
  UsersIcon,
  WorkflowIcon,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface AdminSidebarItem {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  url: string;
  badge?: string;
  badgeColor?: string;
}

interface AdminSidebarGroup {
  title: string;
  items: AdminSidebarItem[];
}

// Define the Super Admin sidebar structure matching the working registry paths
const adminGroups: AdminSidebarGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", icon: LayoutDashboardIcon, url: "/admin" },
      {
        title: "Organizations",
        icon: Building2Icon,
        url: "/admin/organizations",
        badge: "48",
      },
      { title: "Users", icon: UsersIcon, url: "/admin/users", badge: "312" },
    ],
  },
  {
    title: "Workflows",
    items: [
      // {
      //   title: "Automation workflows",
      //   icon: WorkflowIcon,
      //   url: "/admin/workflows/automation",
      //   badge: "241",
      // },
      {
        title: "Calc workflows",
        icon: CalculatorIcon,
        url: "/admin/workflows",
        badge: "189",
      },
      {
        title: "Workspaces",
        icon: LayoutGridIcon,
        url: "/admin/workspaces",
        badge: "76",
      },
    ],
  },
  {
    title: "Library",
    items: [
      {
        title: "Public library",
        icon: LibraryIcon,
        url: "/admin/library/review-queue",
        badge: "14 pending",
        badgeColor: "bg-red-50 text-red-600 border border-red-100",
      },
      {
        title: "Formula registry",
        icon: SigmaIcon,
        url: "/admin/registery/formulas",
      },
      {
        title: "Table registry",
        icon: TableIcon,
        url: "/admin/registery/tables",
      },
    ],
  },
  {
    title: "System",
    items: [
      {
        title: "Billing plans",
        icon: CreditCardIcon,
        url: "/admin/system/billing",
      },
      {
        title: "Audit log",
        icon: ScrollTextIcon,
        url: "/admin/system/audit-log",
      },
      {
        title: "Background jobs",
        icon: ServerCogIcon,
        url: "/admin/system/jobs",
      },
    ],
  },
];

export function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  
  const organizationId = (routeParams?.orgId as string) || searchParams.get("organizationId") || "";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#e8e8e8] bg-white text-[#0a0a0a]"
    >
      {/* Standardized UI Header */}
      <SidebarHeader className="h-[56px] px-4 border-b border-[#e8e8e8] flex flex-row items-center gap-2.5">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-[#0a0a0a] flex-shrink-0">
          <LayoutGridIcon size={12} className="text-white" strokeWidth={3} />
        </div>
        <div className="flex items-center text-[13px] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
          <span>Floodrix</span>
          <span className="mx-1 font-light text-[#d4d4d4]">/</span>
          <span className="font-normal text-[#a1a1a1]">Admin</span>
        </div>
      </SidebarHeader>

      {/* Navigation Groups using standard Sidebar components */}
      <SidebarContent className="scrollbar-hide flex flex-col gap-0 py-2">
        {adminGroups.map((group, idx) => (
          <SidebarGroup
            key={group.title}
            className={cn(
              "py-2 border-b border-[#e8e8e8]",
              idx === adminGroups.length - 1 && "border-b-0 flex-1",
            )}
          >
            <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#a1a1a1] px-4 py-2.5">
              {group.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const targetUrl = organizationId
                    ? (item.url === "/admin" ? `/admin/${organizationId}` : item.url.replace("/admin/", `/admin/${organizationId}/`))
                    : item.url;

                  const isActive = organizationId
                    ? (item.url === "/admin" ? pathname === `/admin/${organizationId}` : pathname.startsWith(targetUrl))
                    : (item.url === "/admin" ? pathname === "/admin" : pathname.startsWith(item.url));

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        isActive={isActive}
                        asChild
                        className="transition-all"
                      >
                        <Link
                          href={targetUrl}
                          prefetch
                          className="w-full flex items-center"
                        >
                          <item.icon
                            className={cn(
                              "size-4 opacity-50",
                              isActive && "opacity-100",
                            )}
                          />
                          <span className="flex-1 truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>

                      {item.badge && (
                        <SidebarMenuBadge
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 font-mono h-auto flex items-center justify-center select-none right-4",
                            item.badgeColor || "bg-[#f5f5f5] text-[#a1a1a1]",
                          )}
                        >
                          {item.badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Admin Profile Block in standard Footer */}
      <SidebarFooter className="p-3 border-t border-[#e8e8e8] group-data-[collapsible=icon]:p-2">
        <div className="rounded-lg border border-[#e8e8e8] bg-[#fafafa] p-3 group-data-[collapsible=icon]:p-1 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent">
          <div className="flex items-center gap-2 mb-3 group-data-[collapsible=icon]:mb-0 justify-center">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#0a0a0a] text-white text-[10px] font-bold shrink-0">
              SA
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="text-[12px] font-semibold text-[#0a0a0a] truncate leading-tight">
                Super Admin
              </span>
              <span className="text-[10px] text-[#a1a1a1] truncate leading-none mt-0.5">
                admin@floodrix.com
              </span>
            </div>
          </div>
          <button
            onClick={() =>
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/login");
                  },
                },
              })
            }
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-[#e8e8e8] bg-white text-[11px] font-medium text-[#fb3640] transition-colors hover:bg-red-50 hover:border-red-100 group-data-[collapsible=icon]:hidden"
          >
            <LogOutIcon size={12} />
            <span>Sign Out</span>
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
