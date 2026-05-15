"use client";

import {
  AlertTriangleIcon,
  ArrowDownRightIcon,
  ArrowUpRightIcon,
  Building2Icon,
  CalculatorIcon,
  ClockIcon,
  FileCodeIcon,
  FolderPlusIcon,
  PlayCircleIcon,
  TableIcon,
  ZapIcon,
} from "lucide-react";

import {
  EntityContainer,
  EntityHeader,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  useSuspenseSuperAdminStats,
  useSuspenseSystemAlerts,
} from "../hooks/use-admin-stats";

export const AdminDashboardHeader = () => {
  return (
    <EntityHeader
      title="Admin Dashboard"
      description="System-wide overview and administrative controls"
    />
  );
};

export const AdminDashboardStats = () => {
  const { data: stats } = useSuspenseSuperAdminStats();

  const cards = [
    {
      label: "Total organizations",
      value: stats.organizations.total,
      delta: `+${stats.organizations.thisMonth} this month`,
      deltaType: "up",
      icon: Building2Icon,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Calc workflows",
      value: stats.calcWorkflows.total,
      delta: `+${stats.calcWorkflows.thisMonth} this month`,
      deltaType: "up",
      icon: CalculatorIcon,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      label: "Active sessions today",
      value: stats.sessions.activeToday,
      delta: "Running or paused",
      deltaType: "neutral",
      icon: PlayCircleIcon,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Library submissions",
      value: stats.library.pendingReview,
      delta: "Awaiting review",
      deltaType: "down",
      icon: ClockIcon,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-none border-border">
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {card.label}
              </span>
              <div className={cn("p-1.5 rounded-md", card.bgColor)}>
                <card.icon className={cn("size-4", card.color)} />
              </div>
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="flex items-center mt-1">
              {card.deltaType === "up" && (
                <ArrowUpRightIcon className="size-3 text-green-600 mr-1" />
              )}
              {card.deltaType === "down" && (
                <ArrowDownRightIcon className="size-3 text-red-600 mr-1" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  card.deltaType === "up"
                    ? "text-green-600"
                    : card.deltaType === "down"
                      ? "text-red-600"
                      : "text-muted-foreground",
                )}
              >
                {card.delta}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export const AdminDashboardQuickCreate = () => {
  const items = [
    {
      title: "New calc workflow",
      desc: "IRC hydraulics calculation",
      icon: CalculatorIcon,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "New automation",
      desc: "n8n-style automation",
      icon: ZapIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "New workspace",
      desc: "Folder canvas for org",
      icon: FolderPlusIcon,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
    {
      title: "Publish formula",
      desc: "Add to public registry",
      icon: FileCodeIcon,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Publish table",
      desc: "Add system coefficient table",
      icon: TableIcon,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "New organization",
      desc: "Manually onboard a team",
      icon: Building2Icon,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {items.map((item) => (
        <Card
          key={item.title}
          className="shadow-none border-border hover:border-muted-foreground/50 cursor-pointer transition-colors"
        >
          <CardContent className="p-3 flex items-center gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", item.bgColor)}>
              <item.icon className={cn("size-5", item.color)} />
            </div>
            <div>
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {item.desc}
              </div>
            </div>
          </CardContent>
        </Card>
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
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    });
  }
  alerts.failedPayments.forEach((orgName) => {
    alertItems.push({
      title: `${orgName} — payment failed`,
      desc: "Account suspended · contact required",
      icon: AlertTriangleIcon,
      color: "text-red-600",
      bgColor: "bg-red-50",
    });
  });

  if (alertItems.length === 0) {
    return (
      <Card className="shadow-none border-border h-full">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">System Alerts</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="text-xs text-muted-foreground py-4">
            No critical system alerts.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-none border-border h-full">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold">System Alerts</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex flex-col gap-3">
        {alertItems.map((item, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className={cn("p-1.5 rounded-full shrink-0", item.bgColor)}>
              <item.icon className={cn("size-4", item.color)} />
            </div>
            <div>
              <div className="text-sm font-medium">{item.title}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export const AdminDashboardOrganizations = () => {
  // This could also be a hook if we had a trpc route for recent orgs
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
    <Card className="shadow-none border-border">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">Organizations</CardTitle>
        <Button variant="outline" size="sm" className="text-[10px] h-7 px-2">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-2 flex flex-col gap-4">
        {mockOrgs.map((org) => (
          <div key={org.name} className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
              {org.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{org.name}</div>
              <div className="text-xs text-muted-foreground">
                {org.members} members · {org.workflows} workflows
              </div>
            </div>
            <div className="flex gap-1">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0 h-5"
              >
                Active
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-5",
                  org.plan === "Pro"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-gray-50 text-gray-700 border-gray-200",
                )}
              >
                {org.plan}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
      actionColor: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      time: "14 min ago",
      actor: "Arjun K.",
      org: "TechRoads",
      action: "Run completed",
      resource: "Scour depth session",
      actionColor: "text-green-600 bg-green-50 border-green-200",
    },
  ];

  return (
    <Card className="shadow-none border-border">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold">
          Recent audit events
        </CardTitle>
        <Button variant="outline" size="sm" className="text-[10px] h-7 px-2">
          Full audit log
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="p-3 text-xs font-medium text-muted-foreground">
                  Time
                </th>
                <th className="p-3 text-xs font-medium text-muted-foreground">
                  Actor
                </th>
                <th className="p-3 text-xs font-medium text-muted-foreground">
                  Organization
                </th>
                <th className="p-3 text-xs font-medium text-muted-foreground">
                  Action
                </th>
                <th className="p-3 text-xs font-medium text-muted-foreground">
                  Resource
                </th>
              </tr>
            </thead>
            <tbody>
              {mockEvents.map((event, i) => (
                <tr
                  key={i}
                  className="border-b last:border-0 hover:bg-muted/10"
                >
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {event.time}
                  </td>
                  <td className="p-3 text-xs">{event.actor}</td>
                  <td className="p-3 text-xs">{event.org}</td>
                  <td className="p-3 text-xs">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-1.5 py-0 h-5 font-normal",
                        event.actionColor,
                      )}
                    >
                      {event.action}
                    </Badge>
                  </td>
                  <td className="p-3 text-xs">{event.resource}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export const AdminDashboardList = () => {
  return (
    <div className="flex flex-col gap-8">
      <AdminDashboardStats />
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
    <EntityContainer header={<AdminDashboardHeader />}>
      {children}
    </EntityContainer>
  );
};

export const AdminDashboardLoading = () => {
  return <LoadingView message="Loading admin statistics..." />;
};

export const AdminDashboardError = () => {
  return <ErrorView message="Error loading admin dashboard" />;
};
