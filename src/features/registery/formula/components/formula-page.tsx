"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Plus,
    Tag,
    Globe,
    Lock,
    CheckCircle2,
    Clock,
    BookOpen,
    FunctionSquare,
    ChevronRight,
    Layers,
    Star,
    ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FormulaRegistryItem } from "@/generated/prisma";
import { EntityContainer, EntityHeader, EntityPagination, EntitySearch, LoadingView, ErrorView, EmptyView } from "@/components/entity-components";
import { useFormulasParams } from "../hooks/use-formulas-params";
import { useSuspenseFormulas } from "../hooks/use-formulas";

// ── Category colour mapping ───────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
    "Flood Discharge": "bg-blue-500/10 text-blue-700 border-blue-200",
    "Scour Depth": "bg-orange-500/10 text-orange-700 border-orange-200",
    "Waterway Width": "bg-emerald-500/10 text-emerald-700 border-emerald-200",
    Rainfall: "bg-cyan-500/10 text-cyan-700 border-cyan-200",
    Velocity: "bg-violet-500/10 text-violet-700 border-violet-200",
    General: "bg-slate-500/10 text-slate-700 border-slate-200",
};

function getCategoryColor(category: string) {
    return (
        CATEGORY_COLORS[category] ??
        "bg-slate-500/10 text-slate-600 border-slate-200"
    );
}

// ── Formula card ──────────────────────────────────────────────────────────
interface FormulaCardProps {
    formula: FormulaRegistryItem & { _count?: { registryUsages: number } };
}

function FormulaCard({ formula }: FormulaCardProps) {
    const inputVars = Array.isArray(formula.inputVariables)
        ? (formula.inputVariables as { notation: string; displayLabel: string }[])
        : [];
    const outputVar = formula.outputVariable as {
        notation: string;
        displayLabel: string;
    } | null;

    return (
        <Card
            className={cn(
                "group relative flex flex-col border border-border/60 bg-card transition-all duration-200",
                "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
            )}
        >
            {/* Status strip */}
            <div
                className={cn(
                    "absolute left-0 top-0 h-full w-1 rounded-l-lg",
                    formula.isPublished ? "bg-emerald-500" : "bg-amber-400"
                )}
            />

            <CardHeader className="pb-3 pl-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <CardTitle className="truncate text-sm font-semibold leading-tight">
                            {formula.name}
                        </CardTitle>
                        {formula.sourceStandard && (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {formula.sourceStandard}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {formula.isSystem && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge
                                            variant="secondary"
                                            className="h-5 px-1.5 text-[10px]"
                                        >
                                            <Star className="mr-0.5 h-2.5 w-2.5" />
                                            IRC
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>Official IRC standard formula</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {formula.isPublished ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                        )}
                    </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                    <Badge
                        variant="outline"
                        className={cn("h-5 px-1.5 text-[10px]", getCategoryColor(formula.category))}
                    >
                        {formula.category}
                    </Badge>
                    {formula.region && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            <Globe className="mr-0.5 h-2.5 w-2.5" />
                            {formula.region}
                        </Badge>
                    )}
                    {formula.visibility === "PRIVATE" && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                            <Lock className="mr-0.5 h-2.5 w-2.5" />
                            Private
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="flex-1 pb-3 pl-5">
                {/* Formula expression */}
                <div className="rounded-md border border-emerald-200/60 bg-emerald-50/50 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-950/20">
                    <code className="font-mono text-xs text-emerald-800 dark:text-emerald-300">
                        {formula.displayExpression || formula.expressionNotation}
                    </code>
                </div>

                {/* Variables */}
                {inputVars.length > 0 && (
                    <div className="mt-3 space-y-1">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            Inputs
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {inputVars.slice(0, 4).map((v, i) => (
                                <span
                                    key={`${v.notation}-${i}`}
                                    className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                                >
                                    {v.notation}
                                </span>
                            ))}
                            {inputVars.length > 4 && (
                                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    +{inputVars.length - 4}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {outputVar && (
                    <div className="mt-2 flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-mono text-[10px] font-medium text-primary">
                            {outputVar.notation}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                            {outputVar.displayLabel}
                        </span>
                    </div>
                )}
            </CardContent>

            <CardFooter className="border-t border-border/40 py-2 pl-5 pr-3">
                <div className="flex w-full items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {formula._count?.registryUsages != null && (
                            <span className="flex items-center gap-0.5">
                                <Layers className="h-3 w-3" />
                                {formula._count.registryUsages} workflows
                            </span>
                        )}
                        {formula.reference && (
                            <span className="flex items-center gap-0.5">
                                <BookOpen className="h-3 w-3" />
                                {formula.reference}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
                            <Link href={`/admin/registery/formulas/${formula.id}`}>
                                <ArrowUpRight className="h-3 w-3" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

export const FormulaRegistryContainer = ({ children }: { children: React.ReactNode }) => {
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

export const FormulaRegistryLoading = () => <LoadingView message="Loading formula registry..." />;

export const FormulaRegistryError = () => <ErrorView message="Failed to load formulas. Please try again." />;

export const FormulaRegistryList = () => {
    const { data } = useSuspenseFormulas();
    const [params, setParams] = useFormulasParams();
    console.log("data", data)

    const items = data?.items ?? [];
    const totalPages = data?.totalPages ?? 0;

    if (items.length === 0) {
        return (
            <EmptyView
                message={params.search ? `No formulas match "${params.search}"` : "The formula registry is empty."}
                onNew={() => window.location.href = "/admin/registery/formulas/new"}
            />
        );
    }

    return (
        <div className="flex flex-col gap-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((formula) => (
                    <FormulaCard key={formula.id} formula={formula as any} />
                ))}
            </div>

            <EntityPagination
                page={params.page}
                totalPages={totalPages}
                onPageChange={(p) => setParams({ page: p })}
            />
        </div>
    );
};