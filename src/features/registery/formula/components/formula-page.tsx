"use client";

import { useTransition } from "react";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { CalculatorDiscoveryCard } from "@/components/platform/cards";
import { cn } from "@/lib/utils";

import { useSuspenseFormulas } from "../hooks/use-formulas";
import { useFormulasParams } from "../hooks/use-formulas-params";

export const FormulaRegistryContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [params, setParams] = useFormulasParams();

  return (
    <EntityContainer
      header={
        <EntityHeader
          title="Formula Registry"
          description="Standardize and manage hydraulic formulas used across the system."
          newButtonLabel="New Formula"
          newButtonHref="/admin/registery/formulas/new"
        />
      }
      search={
        <EntitySearch
          value={params.search}
          onChange={(v) => setParams({ search: v, page: 1 })}
          placeholder="Search formulas by name or reference..."
        />
      }
    >
      {children}
    </EntityContainer>
  );
};

export const FormulaRegistryLoading = () => (
  <LoadingView message="Loading formula registry..." />
);

export const FormulaRegistryError = () => (
  <ErrorView message="Failed to load formulas. Please try again." />
);

export const FormulaRegistryList = () => {
  const { data } = useSuspenseFormulas();
  const [params, setParams] = useFormulasParams();
  const [isPending, startTransition] = useTransition();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  if (items.length === 0) {
    return (
      <EmptyView
        message={
          params.search
            ? `No formulas match "${params.search}"`
            : "The formula registry is empty."
        }
        onNew={() => {}} // Placeholder or redirect to new
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
              @keyframes registry-progress {
                0% { left: -40%; width: 30%; }
                50% { left: 40%; width: 40%; }
                100% { left: 100%; width: 30%; }
              }
              .registry-progress-bar {
                position: absolute;
                height: 100%;
                background-color: #0a0a0a;
                animation: registry-progress 1.2s infinite ease-in-out;
              }
            `,
              }}
            />
            <div className="registry-progress-bar" />
          </div>
        )}

        {items.map((formula, index) => (
          <CalculatorDiscoveryCard
            key={formula.id}
            calc={formula}
            index={index}
            href={`/admin/registery/formulas/${formula.id}`}
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
