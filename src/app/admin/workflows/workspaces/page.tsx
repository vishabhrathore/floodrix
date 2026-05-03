"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import {
    LayoutGrid,
    Plus,
    Folder,
    ChevronRight,
    Search,
    Building2,
    Calendar,
    MoreVertical
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenu,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function WorkspacesAdminPage() {
    const trpc = useTRPC();
    const [search, setSearch] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [targetOrgId, setTargetOrgId] = useState<string | undefined>(undefined);

    const openCreate = (orgId?: string) => {
        setTargetOrgId(orgId);
        setCreateOpen(true);
    };

    // In a real admin view, we might want to list ALL workspaces.
    // For now, we'll list organizations and their workspaces.
    const { data: orgs, isLoading: isLoadingOrgs } = useQuery(
        trpc.organizations.getMany.queryOptions({})
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Workspaces</h1>
                    <p className="text-muted-foreground">Manage folder canvases and workflow organization across the system.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search workspaces..."
                            className="pl-9 h-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 h-9"
                        onClick={() => openCreate()}
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Workspace
                    </Button>
                </div>
            </div>

            {isLoadingOrgs ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="space-y-8">
                    {orgs?.items.map((org) => (
                        <div key={org.id} className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    {org.name}
                                </h2>
                                <Badge variant="outline" className="ml-2 text-[10px] h-4">
                                    Organization
                                </Badge>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="ml-auto text-xs text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5 h-7"
                                    onClick={() => openCreate(org.id)}
                                >
                                    <Plus size={14} /> Create
                                </Button>
                            </div>

                            <WorkspaceList organizationId={org.id} search={search} onCreateClick={() => openCreate(org.id)} />
                        </div>
                    ))}
                </div>
            )}

            <CreateWorkspaceDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                prefilledOrgId={targetOrgId}
                organizations={orgs?.items.map(o => ({ id: o.id, name: o.name })) || []}
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

function CreateWorkspaceDialog({ open, onOpenChange, prefilledOrgId, organizations }: CreateWorkspaceDialogProps) {
    const trpc = useTRPC();
    const router = useRouter();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [orgId, setOrgId] = useState(prefilledOrgId || "");

    // Reset when prefilled changes or dialog opens
    useEffect(() => {
        if (open) {
            setOrgId(prefilledOrgId || "");
            setName("");
            setDescription("");
        }
    }, [open, prefilledOrgId]);

    const createMutation = useMutation(
        trpc.workspaceCanvas.create.mutationOptions()
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
            // Redirect to the new workspace canvas
            router.push(`/admin/workflows/workspaces/${workspace.id}`);
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
                        <Select value={orgId} onValueChange={setOrgId} disabled={!!prefilledOrgId}>
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
                            placeholder="e.g. Finance Workflows"
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
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700"
                            disabled={createMutation.isPending || !name || !orgId}
                        >
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
    onCreateClick
}: {
    organizationId: string;
    search: string;
    onCreateClick: () => void;
}) {
    const trpc = useTRPC();
    const { data: workspaces, isLoading } = useQuery(
        trpc.workspaceCanvas.list.queryOptions({ organizationId })
    );

    const deleteMutation = useMutation(
        trpc.workspaceCanvas.delete.mutationOptions()
    );

    const utils = trpc.useUtils();

    const handleDelete = async (e: React.MouseEvent, workspaceId: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${name}"? This will delete all nodes inside it.`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync({ workspaceId });
            utils.workspaceCanvas.list.invalidate({ organizationId });
        } catch (err) {
            console.error("Failed to delete workspace:", err);
            alert("Failed to delete workspace.");
        }
    };

    const filtered = workspaces?.items.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.description?.toLowerCase().includes(search.toLowerCase())
    ) ?? [];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
            </div>
        );
    }

    if (filtered.length === 0 && !search) {
        return (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed rounded-xl bg-muted/30">
                <Folder className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No workspaces created for this organization.</p>
                <Button variant="link" size="sm" className="text-red-600" onClick={onCreateClick}>Create one now</Button>
            </div>
        );
    }

    if (filtered.length === 0 && search) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((workspace) => (
                <Link
                    key={workspace.id}
                    href={`/admin/workflows/workspaces/${workspace.id}`}
                    className="group"
                >
                    <Card className="shadow-none border-border group-hover:border-red-200 transition-all group-hover:shadow-md h-full">
                        <CardHeader className="p-4 pb-2">
                            <div className="flex justify-between items-start">
                                <div className="p-2 rounded-lg bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                    <LayoutGrid className="h-5 w-5" />
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem>Settings</DropdownMenuItem>
                                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                                        <DropdownMenuItem 
                                            className="text-red-600"
                                            onClick={(e) => handleDelete(e, workspace.id, workspace.name)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <CardTitle className="text-base mb-1">{workspace.name}</CardTitle>
                            <CardDescription className="text-xs line-clamp-2 h-8">
                                {workspace.description || "Visual canvas for workflow organization."}
                            </CardDescription>

                            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Updated {new Date(workspace.updatedAt).toLocaleDateString()}
                                </div>
                                <div className="flex items-center text-red-600 text-[10px] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-transform">
                                    Open Canvas <ChevronRight className="ml-1 h-3 w-3" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
}
