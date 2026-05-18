"use client";

import React, { useTransition } from "react";

import { format } from "date-fns";
import {
  Building2Icon,
  CalendarIcon,
  MoreVerticalIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UserCogIcon,
  UserIcon,
} from "lucide-react";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataGrid, type DataGridColumn } from "@/components/ui/data-grid";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GlobalRole } from "@/generated/prisma";
import { cn } from "@/lib/utils";

import {
  useDeleteUser,
  useSuspenseAdminUsers,
  useUpdateUserRole,
} from "../hooks/use-admin-users";
import { useAdminUsersParams } from "../hooks/use-admin-users-params";

// Helper for rendering initials
function getInitials(name: string) {
  if (!name) return "US";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const UsersContainer = ({ children }: { children: React.ReactNode }) => {
  const [params, setParams] = useAdminUsersParams();

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="User Directory"
          description="Manage system-wide user credentials, global permission levels, and affiliated workspaces."
        />
      }
      search={
        <EntitySearch
          value={params.search}
          onChange={(v) => setParams({ search: v, page: 1 })}
          placeholder="Search users by name or email..."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

export const UsersLoading = () => (
  <LoadingView message="Assembling user directory..." />
);

export const UsersError = () => (
  <ErrorView message="Failed to load user directory. Please try again." />
);

export const UsersList = () => {
  const { data } = useSuspenseAdminUsers();
  const [params, setParams] = useAdminUsersParams();
  const [isPending, startTransition] = useTransition();

  const updateRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleRoleChange = (userId: string, currentRole: GlobalRole) => {
    const nextRole =
      currentRole === GlobalRole.SUPER_ADMIN
        ? GlobalRole.USER
        : GlobalRole.SUPER_ADMIN;

    startTransition(async () => {
      await updateRoleMutation.mutateAsync({ userId, role: nextRole });
    });
  };

  const handleDelete = (userId: string) => {
    if (
      confirm(
        "Are you absolutely sure you want to permanently delete this user? This cannot be undone.",
      )
    ) {
      startTransition(async () => {
        await deleteUserMutation.mutateAsync({ userId });
      });
    }
  };

  // Define Columns Config for generic DataGrid
  const columns: DataGridColumn<any>[] = [
    {
      key: "profile",
      header: "User Profile",
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8 rounded-md border border-[#e8e8e8] shrink-0">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback className="rounded-md bg-[#fafafa] text-[11px] font-semibold text-[#525252]">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-[#0a0a0a] truncate text-[13px]">
              {user.name}
            </span>
            <span className="text-[11px] text-[#a1a1a1] truncate mt-0.5 font-mono">
              {user.email}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Global Role",
      render: (user) =>
        user.globalRole === GlobalRole.SUPER_ADMIN ? (
          <Badge className="bg-red-50 text-red-600 border border-red-100 hover:bg-red-100/50 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 font-mono">
            <ShieldCheckIcon className="size-3" />
            Admin
          </Badge>
        ) : (
          <Badge className="bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100/50 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium inline-flex items-center gap-1 font-mono">
            <UserIcon className="size-3" />
            User
          </Badge>
        ),
    },
    {
      key: "organizations",
      header: "Organizations",
      render: (user) => {
        const orgMemberships = user.organizationMembers ?? [];
        return orgMemberships.length > 0 ? (
          <div className="flex flex-wrap gap-1 max-w-[240px]">
            {orgMemberships.slice(0, 2).map((m: any) => (
              <span
                key={m.organization.id}
                className="inline-flex items-center gap-1 rounded bg-[#f5f5f5] px-1.5 py-0.5 text-[10px] font-medium text-[#525252] border border-[#e8e8e8]"
              >
                <Building2Icon className="size-2.5 text-[#a1a1a1]" />
                {m.organization.name}
              </span>
            ))}
            {orgMemberships.length > 2 && (
              <span className="inline-flex items-center rounded bg-slate-50 px-1 py-0.5 text-[9px] font-medium text-slate-500 border border-slate-100 font-mono">
                +{orgMemberships.length - 2} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#a1a1a1] italic">
            No affiliations
          </span>
        );
      },
    },
    {
      key: "workflows",
      header: "Workflows",
      headerClassName: "justify-center text-center",
      className: "text-center",
      render: (user) => {
        const workflowCount = user._count?.workflows ?? 0;
        return (
          <span
            className={cn(
              "font-mono text-xs px-2 py-0.5 rounded border",
              workflowCount > 0
                ? "bg-blue-50/50 border-blue-100 text-blue-600"
                : "bg-[#fafafa] border-[#e8e8e8] text-[#a1a1a1]",
            )}
          >
            {workflowCount}
          </span>
        );
      },
    },
    {
      key: "credentials",
      header: "Credentials",
      headerClassName: "justify-center text-center",
      className: "text-center",
      render: (user) => {
        const credentialCount = user._count?.credentials ?? 0;
        return (
          <span
            className={cn(
              "font-mono text-xs px-2 py-0.5 rounded border",
              credentialCount > 0
                ? "bg-violet-50/50 border-violet-100 text-violet-600"
                : "bg-[#fafafa] border-[#e8e8e8] text-[#a1a1a1]",
            )}
          >
            {credentialCount}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (user) => (
        <div className="flex items-center gap-1.5 text-[11px] text-[#525252] font-mono">
          <CalendarIcon className="size-3.5 text-[#a1a1a1]" />
          <span>{format(new Date(user.createdAt), "MMM dd, yyyy")}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "justify-end text-right w-[80px]",
      className: "text-right w-[80px]",
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 border border-transparent hover:border-[#e8e8e8] hover:bg-[#fafafa]"
              disabled={isPending}
            >
              <MoreVerticalIcon className="size-3.5 text-[#525252]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 bg-white border border-[#e8e8e8] shadow-[0_4px_12px_rgba(0,0,0,0.05)] rounded-md p-1"
          >
            <DropdownMenuItem
              onClick={() => handleRoleChange(user.id, user.globalRole)}
              className="text-[12px] py-1.5 cursor-pointer text-[#0a0a0a] hover:bg-[#fafafa] focus:bg-[#fafafa]"
            >
              <UserCogIcon className="size-3.5 mr-2 text-[#525252]" />
              <span>
                {user.globalRole === GlobalRole.SUPER_ADMIN
                  ? "Demote to User"
                  : "Promote to Admin"}
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#e8e8e8]" />
            <DropdownMenuItem
              onClick={() => handleDelete(user.id)}
              className="text-[12px] py-1.5 cursor-pointer text-red-600 hover:bg-red-50/50 focus:bg-red-50/50"
            >
              <Trash2Icon className="size-3.5 mr-2 text-red-500" />
              <span>Delete Account</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (items.length === 0) {
    return (
      <EmptyView
        message={
          params.search
            ? `No users match "${params.search}"`
            : "The user directory is currently empty."
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      {/* High Fidelity Directory DataGrid */}
      <DataGrid
        data={items}
        columns={columns}
        getKey={(user) => user.id}
        isTransitioning={isPending}
      />

      <EntityPagination
        page={params.page}
        totalPages={totalPages}
        onPageChange={(p) =>
          startTransition(() => {
            setParams({ page: p });
          })
        }
        disabled={isPending}
      />
    </div>
  );
};
