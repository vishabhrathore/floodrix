"use client";

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
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

// Define the Super Admin sidebar structure based on your HTML template
const adminGroups = [
    {
        title: "Overview",
        items: [
            { title: "Dashboard", icon: LayoutDashboardIcon, url: "/admin" },
            { title: "Organizations", icon: Building2Icon, url: "/admin/organizations", badge: "48" },
            { title: "Users", icon: UsersIcon, url: "/admin/users", badge: "312" },
        ],
    },
    {
        title: "Workflows",
        items: [
            { title: "Automation workflows", icon: WorkflowIcon, url: "/admin/workflows/automation", badge: "241" },
            { title: "Calc workflows", icon: CalculatorIcon, url: "/admin/workflows/calc", badge: "189" },
            { title: "Workspaces", icon: LayoutGridIcon, url: "/admin/workflows/workspaces", badge: "76" },
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
                badgeColor: "bg-red-100 text-red-800"
            },
            { title: "Formula registry", icon: SigmaIcon, url: "/admin/library/formulas" },
            { title: "Table registry", icon: TableIcon, url: "/admin/library/tables" },
        ],
    },
    {
        title: "System",
        items: [
            { title: "Billing plans", icon: CreditCardIcon, url: "/admin/system/billing" },
            { title: "Audit log", icon: ScrollTextIcon, url: "/admin/system/audit-log" },
            { title: "Background jobs", icon: ServerCogIcon, url: "/admin/system/jobs" },
        ],
    },
];

export const AdminSidebar = () => {
    const router = useRouter();
    const pathname = usePathname();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenuItem className="list-none flex flex-col items-start justify-center p-2">
                    <SidebarMenuButton asChild className="gap-x-2 h-12 px-2 hover:bg-transparent">
                        <Link href="/admin" prefetch className="flex items-center w-full">
                            {/* Note: Update src to your actual logo if different */}
                            <Image src="/logo.png" alt="FloodRix Logo" width={28} height={28} className="w-7 h-7 object-contain bg-red-500 rounded p-1" />
                            <div className="flex flex-col ml-2 overflow-hidden">
                                <span className="font-semibold text-sm leading-tight truncate">FloodRix</span>
                                <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded-sm border border-red-100 w-fit mt-0.5">
                                    Super admin
                                </span>
                            </div>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarHeader>

            <SidebarContent>
                {adminGroups.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const isActive = item.url === "/admin"
                                        ? pathname === "/admin"
                                        : pathname.startsWith(item.url);

                                    return (
                                        <SidebarMenuItem key={item.title}>
                                            <SidebarMenuButton
                                                tooltip={item.title}
                                                isActive={isActive}
                                                asChild
                                                className={`gap-x-3 h-9 px-3 ${isActive ? 'bg-red-50 text-red-900 font-medium hover:bg-red-100 hover:text-red-900' : ''}`}
                                            >
                                                <Link href={item.url} prefetch className="flex items-center w-full">
                                                    <item.icon className={`size-4 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                                                    <span className="flex-1 truncate">{item.title}</span>

                                                    {item.badge && (
                                                        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${item.badgeColor || (isActive ? 'bg-red-200 text-red-900' : 'bg-secondary text-secondary-foreground')}`}>
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    {/* Admin Profile Block */}
                    <SidebarMenuItem className="list-none mb-2 px-2">
                        <div className="flex items-center gap-2 p-2 rounded-md">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white text-xs font-medium shrink-0">
                                SA
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">Super admin</span>
                                <span className="text-[11px] text-muted-foreground truncate">admin@floodrix.com</span>
                            </div>
                        </div>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sign out"
                            className="gap-x-4 h-10 px-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => authClient.signOut({
                                fetchOptions: {
                                    onSuccess: () => {
                                        router.push("/login");
                                    },
                                },
                            })}
                        >
                            <LogOutIcon className="h-4 w-4" />
                            <span>Sign out</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
};