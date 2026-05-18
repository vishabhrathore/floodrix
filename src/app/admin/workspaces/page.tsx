"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Folder, Plus, Search } from "lucide-react";
import { Loader2 } from "lucide-react";

import { WorkspaceRegistryCard } from "@/components/platform/cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";

export default function WorkspacesAdminPage() {
  const trpc = useTRPC();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState<string | undefined>(undefined);

  const openCreate = (orgId?: string) => {
    setTargetOrgId(orgId);
    setCreateOpen(true);
  };

  const { data: orgs, isLoading: isLoadingOrgs } = useQuery(
    trpc.organizations.getMany.queryOptions({}),
  );

  return (
    <div className="px-7 md:px-10 py-7 md:py-10 w-full space-y-10">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8e8] pb-6">
        <div>
          <h3 className="text-h3 font-semibold text-[#0a0a0a] tracking-tight leading-tight mb-2">
            Workspaces
          </h3>
          <p className="text-[14px] text-[#a1a1a1] max-w-[600px] leading-relaxed font-normal">
            Manage folder canvases and workflow organization across the system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#a1a1a1]" />
            <Input
              placeholder="Search workspaces..."
              className="pl-9 h-9 border-[#e8e8e8] focus-visible:ring-1 focus-visible:ring-[#0a0a0a] text-[13px] rounded-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            className="bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white text-[12px] h-9 px-4 rounded-md font-medium transition-colors"
            onClick={() => openCreate()}
          >
            <Plus className="mr-1.5 h-4 w-4 shrink-0" /> New Workspace
          </Button>
        </div>
      </div>

      {isLoadingOrgs ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-44 w-full rounded-xl border border-[#e8e8e8]"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-12">
          {orgs?.items.map((org) => (
            <div key={org.id} className="space-y-4">
              {/* Organization Section Title */}
              <div className="flex items-center gap-2 border-b border-[#e8e8e8] pb-2 mb-4 px-1">
                <Building2 className="h-4 w-4 text-[#525252]" />
                <h4 className="text-[12px] font-semibold text-[#0a0a0a] uppercase tracking-wider font-mono">
                  {org.name}
                </h4>
                <Badge
                  variant="outline"
                  className="ml-1 text-[9px] px-1.5 py-0 border-[#e8e8e8] text-[#a1a1a1] font-mono h-4"
                >
                  Organization
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-[11px] font-semibold text-[#0a0a0a] hover:bg-[#fafafa] border border-transparent hover:border-[#e8e8e8] gap-1 h-7 px-2.5 rounded-md"
                  onClick={() => openCreate(org.id)}
                >
                  <Plus size={12} /> Create
                </Button>
              </div>

              <WorkspaceList
                organizationId={org.id}
                search={search}
                onCreateClick={() => openCreate(org.id)}
              />
            </div>
          ))}
        </div>
      )}

      <CreateWorkspaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        prefilledOrgId={targetOrgId}
        organizations={
          orgs?.items.map((o) => ({ id: o.id, name: o.name })) || []
        }
      />
    </div>
  );
}

interface CreateWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefilledOrgId?: string;
  organizations: { id: string; name: string }[];
}

function CreateWorkspaceDialog({
  open,
  onOpenChange,
  prefilledOrgId,
  organizations,
}: CreateWorkspaceDialogProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orgId, setOrgId] = useState(prefilledOrgId || "");

  useEffect(() => {
    if (open) {
      setOrgId(prefilledOrgId || "");
      setName("");
      setDescription("");
    }
  }, [open, prefilledOrgId]);

  const createMutation = useMutation(
    trpc.workspaceCanvas.create.mutationOptions(),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !orgId) return;

    try {
      const workspace = await createMutation.mutateAsync({
        name,
        description,
        organizationId: orgId,
      });
      onOpenChange(false);
      router.push(`/admin/workspaces/${workspace.id}`);
    } catch (err) {
      console.error("Failed to create workspace:", err);
      alert("Failed to create workspace. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Workspace</DialogTitle>
          <DialogDescription>
            Create a new visual canvas to organize your workflows.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="org">Organization</Label>
            <Select
              value={orgId}
              onValueChange={setOrgId}
              disabled={!!prefilledOrgId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              placeholder="e.g. Hydrology Studies"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Briefly describe this workspace"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#0a0a0a] hover:bg-[#1a1a1a] text-white"
              disabled={createMutation.isPending || !name || !orgId}
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Workspace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkspaceList({
  organizationId,
  search,
  onCreateClick,
}: {
  organizationId: string;
  search: string;
  onCreateClick: () => void;
}) {
  const trpc = useTRPC();
  const { data: workspaces, isLoading } = useQuery(
    trpc.workspaceCanvas.list.queryOptions({ organizationId }),
  );

  const deleteMutation = useMutation(
    trpc.workspaceCanvas.delete.mutationOptions(),
  );

  const queryClient = useQueryClient();

  const handleDelete = async (
    e: React.MouseEvent,
    workspaceId: string,
    name: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This will delete all nodes inside it.`,
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ workspaceId });
      queryClient.invalidateQueries(
        trpc.workspaceCanvas.list.queryOptions({ organizationId }),
      );
    } catch (err) {
      console.error("Failed to delete workspace:", err);
      alert("Failed to delete workspace.");
    }
  };

  const filtered =
    workspaces?.items.filter(
      (w) =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.description?.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2].map((i) => (
          <Skeleton
            key={i}
            className="h-36 w-full rounded-xl border border-[#e8e8e8]"
          />
        ))}
      </div>
    );
  }

  if (filtered.length === 0 && !search) {
    return (
      <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-[#fafafa]/50 border-[#e8e8e8]">
        <Folder className="h-10 w-10 text-[#a1a1a1]/50 mb-3" />
        <p className="text-[13px] text-[#a1a1a1]">
          No workspaces created for this organization.
        </p>
        <Button
          variant="link"
          size="sm"
          className="text-[#0a0a0a] font-semibold text-[12px] hover:text-[#333]"
          onClick={onCreateClick}
        >
          Create one now
        </Button>
      </div>
    );
  }

  if (filtered.length === 0 && search) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filtered.map((workspace, index) => (
        <WorkspaceRegistryCard
          key={workspace.id}
          workspace={workspace}
          index={index}
          href={`/admin/workspaces/${workspace.id}`}
          onDeleteClick={(e) => handleDelete(e, workspace.id, workspace.name)}
          deletePending={deleteMutation.isPending}
          actionLabel="Open Canvas"
        />
      ))}
    </div>
  );
}
