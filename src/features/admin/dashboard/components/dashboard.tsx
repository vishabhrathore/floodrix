"use client";

import React from "react";

import {
  AlertTriangleIcon,
  Building2Icon,
  CalculatorIcon,
  ClockIcon,
  FileCodeIcon,
  FolderPlusIcon,
  PlayCircleIcon,
  TableIcon,
  ZapIcon,
} from "lucide-react";

import { ErrorView, LoadingView } from "@/components/entity-components";
import { cn } from "@/lib/utils";

import {
  useSuspenseSuperAdminStats,
  useSuspenseSystemAlerts,
} from "../hooks/use-admin-stats";

export const AdminDashboardHeader = () => {
  return (
    <div className="mb-10">
      <h3 className="text-h3 font-semibold text-[#0a0a0a] tracking-tight leading-tight mb-2">
        Admin Dashboard
      </h3>
      <p className="text-[14px] text-[#a1a1a1] max-w-[600px] leading-relaxed font-normal">
        System-wide overview and administrative controls.
      </p>
    </div>
  );
};

export const AdminDashboardStats = () => {
  const { data: stats } = useSuspenseSuperAdminStats();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 border border-[#e8e8e8] rounded-xl overflow-hidden mb-10 bg-white">
      <StatCell
        value={String(stats.organizations.total)}
        label="Total Organizations"
        delta={`+${stats.organizations.thisMonth} this month`}
      />
      <StatCell
        value={String(stats.calcWorkflows.total)}
        label="Calc Workflows"
        delta={`+${stats.calcWorkflows.thisMonth} this month`}
      />
      <StatCell
        value={String(stats.sessions.activeToday)}
        label="Active Sessions Today"
        delta="Running or paused"
      />
      <StatCell
        value={String(stats.library.pendingReview)}
        label="Library Submissions"
        delta="Awaiting review"
        isWarning={stats.library.pendingReview > 0}
      />
    </div>
  );
};

function StatCell({
  value,
  label,
  delta,
  isWarning,
}: {
  value: string;
  label: string;
  delta?: string;
  isWarning?: boolean;
}) {
  return (
    <div className="px-6 py-5 border-r border-[#e8e8e8] last:border-r-0 hover:bg-[#fafafa] transition-colors">
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[28px] font-semibold text-[#0a0a0a] tracking-tighter">
          {value}
        </span>
      </div>
      <div className="text-[11px] text-[#a1a1a1] font-medium mb-1">{label}</div>
      {delta && (
        <div
          className={cn(
            "text-[11px] font-medium font-mono",
            isWarning ? "text-[#fb3640]" : "text-[#00b341]",
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

export const AdminDashboardQuickCreate = () => {
  const items = [
    {
      title: "New calc workflow",
      desc: "IRC hydraulics calculation",
      icon: CalculatorIcon,
      color: "#fb3640", // Brand Red
    },
    {
      title: "New automation",
      desc: "n8n-style automation",
      icon: ZapIcon,
      color: "#0070f3", // Blue
    },
    {
      title: "New workspace",
      desc: "Folder canvas for org",
      icon: FolderPlusIcon,
      color: "#0d9488", // Teal
    },
    {
      title: "Publish formula",
      desc: "Add to public registry",
      icon: FileCodeIcon,
      color: "#7c3aed", // Purple
    },
    {
      title: "Publish table",
      desc: "Add system coefficient table",
      icon: TableIcon,
      color: "#f97316", // Orange
    },
    {
      title: "New organization",
      desc: "Manually onboard a team",
      icon: Building2Icon,
      color: "#fb3640", // Brand Red
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
      {items.map((item) => (
        <div
          key={item.title}
          className="group flex flex-col bg-white border border-[#e8e8e8] rounded-xl overflow-hidden transition-all hover:border-[#d4d4d4] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer"
        >
          <div
            className="h-0.5 w-full"
            style={{ backgroundColor: item.color }}
          />
          <div className="p-4 flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-lg border border-[#e8e8e8] bg-[#fafafa] flex items-center justify-center shrink-0">
              <item.icon size={16} className="text-[#525252]" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#0a0a0a] leading-tight mb-0.5">
                {item.title}
              </div>
              <div className="text-[11px] text-[#a1a1a1] truncate leading-none">
                {item.desc}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const AdminDashboardAlerts = () => {
  const { data: alerts } = useSuspenseSystemAlerts();

  const alertItems = [];
  if (alerts.stuckBatchJobsCount > 0) {
    alertItems.push({
      title: `${alerts.stuckBatchJobsCount} batch jobs stuck > 30 min`,
      desc: "Inngest queue may need attention",
      icon: AlertTriangleIcon,
      color: "#f97316",
      bgColor: "bg-amber-50/50 border-amber-100",
    });
  }
  alerts.failedPayments.forEach((orgName) => {
    alertItems.push({
      title: `${orgName} — payment failed`,
      desc: "Account suspended · contact required",
      icon: AlertTriangleIcon,
      color: "#fb3640",
      bgColor: "bg-red-50/50 border-red-100",
    });
  });

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-sm h-full">
      <h4 className="text-[14px] font-semibold text-[#0a0a0a] border-b border-[#e8e8e8] pb-3 mb-4">
        System Alerts
      </h4>
      {alertItems.length === 0 ? (
        <div className="text-[12px] text-[#a1a1a1] py-4">
          No critical system alerts.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {alertItems.map((item, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 items-start p-3 rounded-lg border",
                item.bgColor,
              )}
            >
              <div className="p-1 rounded shrink-0">
                <item.icon size={14} style={{ color: item.color }} />
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#0a0a0a] leading-tight mb-1">
                  {item.title}
                </div>
                <div className="text-[11px] text-[#a1a1a1] leading-none">
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminDashboardOrganizations = () => {
  const mockOrgs = [
    {
      name: "Bridge House Consultants",
      members: 12,
      workflows: 34,
      status: "Active",
      plan: "Pro",
      initial: "BH",
    },
    {
      name: "NH Infra Pvt Ltd",
      members: 5,
      workflows: 18,
      status: "Active",
      plan: "Free",
      initial: "NH",
    },
  ];

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
        <h4 className="text-[14px] font-semibold text-[#0a0a0a]">
          Organizations
        </h4>
        <button className="text-[11px] font-semibold text-[#525252] hover:text-[#0a0a0a] transition-colors border border-[#e8e8e8] rounded-md px-2 py-0.5 bg-white">
          View all
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {mockOrgs.map((org) => (
          <div key={org.name} className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-[#fafafa] border border-[#e8e8e8] flex items-center justify-center text-[11px] font-bold text-[#0a0a0a] shrink-0">
              {org.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#0a0a0a] truncate leading-tight mb-1">
                {org.name}
              </div>
              <div className="text-[11px] text-[#a1a1a1] leading-none">
                {org.members} members · {org.workflows} workflows
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <span className="px-1.5 py-0.5 rounded-[4px] border border-[#dcfce7] bg-[#f0fdf4] text-[10px] font-medium text-[#00b341]">
                Active
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-[4px] border text-[10px] font-medium",
                  org.plan === "Pro"
                    ? "border-[#dbeafe] bg-[#eff6ff] text-[#0070f3]"
                    : "border-[#e8e8e8] bg-white text-[#a1a1a1]",
                )}
              >
                {org.plan}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminDashboardAuditLog = () => {
  const mockEvents = [
    {
      time: "2 min ago",
      actor: "Priya M.",
      org: "Bridge House",
      action: "Published",
      resource: "Flood calc v3",
      actionColor: "border-[#dbeafe] bg-[#eff6ff] text-[#0070f3]",
    },
    {
      time: "14 min ago",
      actor: "Arjun K.",
      org: "TechRoads",
      action: "Run completed",
      resource: "Scour depth session",
      actionColor: "border-[#dcfce7] bg-[#f0fdf4] text-[#00b341]",
    },
  ];

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between border-b border-[#e8e8e8] p-5 pb-3">
        <h4 className="text-[14px] font-semibold text-[#0a0a0a]">
          Recent audit events
        </h4>
        <button className="text-[11px] font-semibold text-[#525252] hover:text-[#0a0a0a] transition-colors border border-[#e8e8e8] rounded-md px-2 py-0.5 bg-white">
          Full audit log
        </button>
      </div>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e8e8e8] bg-[#fafafa]">
              <th className="p-3 px-5 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wider">
                Time
              </th>
              <th className="p-3 px-5 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wider">
                Actor
              </th>
              <th className="p-3 px-5 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wider">
                Organization
              </th>
              <th className="p-3 px-5 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wider">
                Action
              </th>
              <th className="p-3 px-5 text-[11px] font-semibold text-[#a1a1a1] uppercase tracking-wider">
                Resource
              </th>
            </tr>
          </thead>
          <tbody>
            {mockEvents.map((event, i) => (
              <tr
                key={i}
                className="border-b border-[#e8e8e8] last:border-b-0 hover:bg-[#fafafa]/50 transition-colors"
              >
                <td className="p-3 px-5 text-[12px] text-[#a1a1a1] font-mono whitespace-nowrap">
                  {event.time}
                </td>
                <td className="p-3 px-5 text-[12px] font-semibold text-[#0a0a0a]">
                  {event.actor}
                </td>
                <td className="p-3 px-5 text-[12px] text-[#525252]">
                  {event.org}
                </td>
                <td className="p-3 px-5 text-[12px]">
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-[4px] border text-[10px] font-medium leading-none",
                      event.actionColor,
                    )}
                  >
                    {event.action}
                  </span>
                </td>
                <td className="p-3 px-5 text-[12px] text-[#525252]">
                  {event.resource}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminDashboardList = () => {
  return (
    <div className="flex flex-col gap-6">
      <AdminDashboardStats />

      <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-3 mb-4">
        <h4 className="text-[13px] font-semibold text-[#a1a1a1] uppercase tracking-wider">
          Quick Administrative Actions
        </h4>
      </div>
      <AdminDashboardQuickCreate />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <AdminDashboardOrganizations />
          <AdminDashboardAuditLog />
        </div>
        <div>
          <AdminDashboardAlerts />
        </div>
      </div>
    </div>
  );
};

export const AdminDashboardContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="px-7 md:px-10 py-7 md:py-10 w-full flex flex-col gap-y-6">
      <AdminDashboardHeader />
      {children}
    </div>
  );
};

export const AdminDashboardLoading = () => {
  return <LoadingView message="Loading admin statistics..." />;
};

export const AdminDashboardError = () => {
  return <ErrorView message="Error loading admin dashboard" />;
};
