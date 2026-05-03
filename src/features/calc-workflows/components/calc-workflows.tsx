// src/features/calc-workflows/components/calc-workflows.tsx

"use client";

import { formatDistanceToNow } from "date-fns";
import {
    EmptyView,
    EntityContainer,
    EntityHeader,
    EntityItem,
    EntityList,
    EntityPagination,
    EntitySearch,
    ErrorView,
    LoadingView,
} from "@/components/entity-components";
import {
    useSuspenseCalcWorkflows,
    useCreateCalcWorkflow,
    useRemoveCalcWorkflow,
} from "../hooks/use-calc-workflows";
import { useCalcWorkflowsParams } from "../hooks/use-calc-workflows-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { useRouter } from "next/navigation";
import { Droplets } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ─── Search ───────────────────────────────────────────────────────────────

export const CalcWorkflowsSearch = () => {
    const [params, setParams] = useCalcWorkflowsParams();
    const { searchValue, onSearchChange } = useEntitySearch({
        params,
        setParams,
    });

    return (
        <EntitySearch
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Search calc workflows"
        />
    );
};

// ─── List ─────────────────────────────────────────────────────────────────

export const CalcWorkflowsList = () => {
    const calcWorkflows = useSuspenseCalcWorkflows();

    return (
        <EntityList
            items={calcWorkflows.data.items}
            getKey={(wf) => wf.id}
            renderItem={(wf) => <CalcWorkflowItem data={wf} />}
            emptyView={<CalcWorkflowsEmpty />}
        />
    );
};

// ─── Header ───────────────────────────────────────────────────────────────

export const CalcWorkflowsHeader = ({ disabled }: { disabled?: boolean }) => {
    const router = useRouter();
    const createWorkflow = useCreateCalcWorkflow();
    const [params] = useCalcWorkflowsParams();

    const handleCreate = () => {
        createWorkflow.mutate(
            { organizationId: params.organizationId, name: "Untitled Workflow" },
            {
                onSuccess: (data) => {
                    router.push(`/calc-workflows/${data.id}`);
                },
            }
        );
    };

    return (
        <EntityHeader
            title="Calc Workflows"
            description="IRC hydraulic calculation workflows"
            onNew={handleCreate}
            newButtonLabel="New calc workflow"
            disabled={disabled}
            isCreating={createWorkflow.isPending}
        />
    );
};

// ─── Pagination ───────────────────────────────────────────────────────────

export const CalcWorkflowsPagination = () => {
    const calcWorkflows = useSuspenseCalcWorkflows();
    const [params, setParams] = useCalcWorkflowsParams();

    return (
        <EntityPagination
            disabled={calcWorkflows.isFetching}
            totalPages={calcWorkflows.data.totalPages}
            page={calcWorkflows.data.page}
            onPageChange={(page) => setParams({ ...params, page })}
        />
    );
};

// ─── Container ────────────────────────────────────────────────────────────

export const CalcWorkflowsContainer = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    return (
        <EntityContainer
            header={<CalcWorkflowsHeader />}
            search={<CalcWorkflowsSearch />}
            pagination={<CalcWorkflowsPagination />}
        >
            {children}
        </EntityContainer>
    );
};

// ─── States ───────────────────────────────────────────────────────────────

export const CalcWorkflowsLoading = () => {
    return <LoadingView message="Loading calc workflows..." />;
};

export const CalcWorkflowsError = () => {
    return <ErrorView message="Error loading calc workflows" />;
};

export const CalcWorkflowsEmpty = () => {
    const router = useRouter();
    const createWorkflow = useCreateCalcWorkflow();
    const [params] = useCalcWorkflowsParams();

    const handleCreate = () => {
        createWorkflow.mutate(
            { organizationId: params.organizationId, name: "Untitled Workflow" },
            {
                onSuccess: (data) => {
                    router.push(`/calc-workflows/${data.id}`);
                },
            }
        );
    };

    return (
        <EmptyView
            onNew={handleCreate}
            message="No calc workflows yet. Create your first IRC hydraulic calculation workflow."
        />
    );
};

// ─── Item ─────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
    DRAFT: "bg-amber-100 text-amber-700",
    PUBLISHED: "bg-emerald-100 text-emerald-700",
    ARCHIVED: "bg-slate-100 text-slate-500",
    DEPRECATED: "bg-rose-100 text-rose-600",
};

export const CalcWorkflowItem = ({
    data,
}: {
    data: {
        id: string;
        name: string;
        slug: string;
        description: string | null;
        category: string | null;
        status: string;
        updatedAt: Date;
        createdAt: Date;
        _count: { nodes: number; sessions: number };
        ratingAggregate: { averageRating: number; ratingCount: number } | null;
    };
}) => {
    const removeWorkflow = useRemoveCalcWorkflow();

    return (
        <EntityItem
            href={`/calc-workflows/${data.id}`}
            title={data.name}
            subtitle={
                <span className="flex items-center gap-2 text-xs">
                    <Badge
                        variant="secondary"
                        className={`h-5 px-1.5 text-[10px] font-bold ${STATUS_COLOR[data.status] ?? ""}`}
                    >
                        {data.status}
                    </Badge>
                    {data.category && (
                        <span className="text-slate-400">{data.category}</span>
                    )}
                    <span className="text-slate-300">·</span>
                    <span>{data._count.nodes} nodes</span>
                    <span className="text-slate-300">·</span>
                    Updated{" "}
                    {formatDistanceToNow(data.updatedAt, { addSuffix: true })}
                </span>
            }
            image={
                <div className="flex size-8 items-center justify-center rounded-lg bg-red-50">
                    <Droplets className="size-4 text-red-500" />
                </div>
            }
            onRemove={() => removeWorkflow.mutate({ id: data.id })}
            isRemoving={removeWorkflow.isPending}
        />
    );
};