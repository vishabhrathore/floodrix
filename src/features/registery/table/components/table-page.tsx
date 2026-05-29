"use client";

import { useTransition } from "react";
import { useParams } from "next/navigation";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { TableRegistryCard } from "@/components/platform/cards";
import { cn } from "@/lib/utils";

import { useSuspenseTables } from "../hooks/use-tables";
import { useTablesParams } from "../hooks/use-tables-params";

export const TableRegistryContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [params, setParams] = useTablesParams();
  const routeParams = useParams();
  const orgId = routeParams?.orgId as string;

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Table Registry"
          description="Manage IRC standard lookup tables and digitised charts."
          newButtonLabel="New Table"
          newButtonHref={`/admin/${orgId}/registery/tables/new`}
        />
      }
      search={
        <EntitySearch
          value={params.search}
          onChange={(v) => setParams({ search: v, page: 1 })}
          placeholder="Search tables by name or reference..."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

export const TableRegistryLoading = () => (
  <LoadingView message="Loading table registry..." />
);

export const TableRegistryError = () => (
  <ErrorView message="Failed to load tables. Please try again." />
);

export const TableRegistryList = () => {
  const { data } = useSuspenseTables();
  const [params, setParams] = useTablesParams();
  const [isPending, startTransition] = useTransition();
  const routeParams = useParams();
  const orgId = routeParams?.orgId as string;

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  if (items.length === 0) {
    return (
      <EmptyView
        message={
          params.search
            ? `No tables match "${params.search}"`
            : "The table registry is empty."
        }
        onNew={() => (window.location.href = `/admin/${orgId}/registery/tables/new`)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-y-6">
      {/* Seamless Transition Wrapper with Progress Indicator */}
      <div
        className={cn(
          "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 transition-all duration-300 relative",
          isPending && "opacity-60 pointer-events-none",
        )}
      >
        {/* Top-aligned linear progress bar for the grid container */}
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#f5f5f5] overflow-hidden z-30 rounded-t-lg">
            <style
              dangerouslySetInnerHTML={{
                __html: `
              @keyframes table-progress {
                0% { left: -40%; width: 30%; }
                50% { left: 40%; width: 40%; }
                100% { left: 100%; width: 30%; }
              }
              .table-progress-bar {
                position: absolute;
                height: 100%;
                background-color: #0a0a0a;
                animation: table-progress 1.2s infinite ease-in-out;
              }
            `,
              }}
            />
            <div className="table-progress-bar" />
          </div>
        )}

        {items.map((table, index) => (
          <TableRegistryCard
            key={table.id}
            table={table}
            index={index}
            href={`/admin/${orgId}/registery/tables/${table.id}`}
            actionLabel="Configure"
          />
        ))}
      </div>

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
