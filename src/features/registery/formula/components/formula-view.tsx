"use client";

import { useFormula } from "../hooks/use-formulas";
import { LoadingView, ErrorView } from "@/components/entity-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    FunctionSquare,
    Variable,
    BookOpen,
    Globe,
    CheckCircle2,
    Clock,
    Star,
    Layers,
    ArrowLeft,
    Edit3
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface FormulaViewProps {
    formulaId: string;
}

export default function FormulaView({ formulaId }: FormulaViewProps) {
    const { data: formula, isLoading, isError } = useFormula(formulaId);

    if (isLoading) return <LoadingView message="Loading formula details..." />;
    if (isError || !formula) return <ErrorView message="Failed to load formula details." />;

    const inputVars = Array.isArray(formula.inputVariables)
        ? (formula.inputVariables as any[])
        : [];
    const outputVar = formula.outputVariable as any;

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/30">
                        <FunctionSquare className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight">{formula.name}</h1>
                            {formula.isSystem && (
                                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                                    <Star className="h-2.5 w-2.5" />
                                    Official
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{formula.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/registery/formulas`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Registry
                        </Link>
                    </Button>
                    <Button size="sm" asChild>
                        <Link href={`/admin/registery/formulas/${formula.id}/edit`}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit Formula
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="mx-auto max-w-4xl space-y-10">
                    {/* Summary row */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</p>
                            <Badge variant="outline" className="px-2 py-0.5">{formula.category}</Badge>
                            {formula.subCategory && <p className="text-xs text-muted-foreground">{formula.subCategory}</p>}
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Region & Visibility</p>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                    <Globe className="h-3 w-3" />
                                    {formula.region || "Global"}
                                </Badge>
                                <Badge variant={formula.visibility === 'PUBLIC' ? 'outline' : 'secondary'} className="gap-1">
                                    {formula.visibility === 'PUBLIC' ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : <Clock className="h-3 w-3" />}
                                    {formula.visibility}
                                </Badge>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Usage</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Layers className="h-4 w-4 text-muted-foreground" />
                                <span>Used in <strong>{(formula as any)._count?.registryUsages ?? 0}</strong> workflows</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Expression Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <FunctionSquare className="h-5 w-5 text-emerald-600" />
                            <h2 className="text-lg font-semibold">Formula Expression</h2>
                        </div>
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-6 dark:border-emerald-800/40 dark:bg-emerald-950/10">
                            <div className="mb-4 text-center">
                                <code className="text-2xl font-semibold tracking-tight text-emerald-900 dark:text-emerald-300">
                                    {formula.displayExpression || formula.expressionNotation}
                                </code>
                            </div>
                            <Separator className="my-4 bg-emerald-200/60 dark:bg-emerald-800/40" />
                            <div className="text-xs text-emerald-700/70 dark:text-emerald-400/60">
                                <p className="font-mono">Computational: {formula.expressionNotation}</p>
                            </div>
                        </div>
                    </div>

                    {/* Variables Section */}
                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                        {/* Inputs */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Variable className="h-5 w-5 text-blue-600" />
                                <h2 className="text-lg font-semibold">Inputs</h2>
                            </div>
                            <div className="space-y-3">
                                {inputVars.map((v, i) => (
                                    <div key={i} className="flex items-start gap-4 rounded-lg border border-border/40 bg-muted/20 p-4">
                                        <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-blue-100 font-mono text-sm font-bold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            {v.notation}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{v.displayLabel}</p>
                                                {v.unit && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">{v.unit}</Badge>}
                                            </div>
                                            {v.description && <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Output */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Variable className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-semibold">Output</h2>
                            </div>
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-8 w-12 shrink-0 items-center justify-center rounded bg-primary font-mono text-sm font-bold text-primary-foreground">
                                        {outputVar?.notation}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-primary">{outputVar?.displayLabel}</p>
                                            {outputVar?.unit && <Badge className="px-1.5 py-0 text-[10px]">{outputVar?.unit}</Badge>}
                                        </div>
                                        {outputVar?.description && <p className="mt-1 text-xs text-muted-foreground">{outputVar?.description}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Source and Reference */}
                            <div className="mt-8 space-y-4">
                                <div className="flex items-center gap-2 pt-2 text-muted-foreground">
                                    <BookOpen className="h-4 w-4" />
                                    <h3 className="text-sm font-medium uppercase tracking-wider">Source info</h3>
                                </div>
                                <div className="space-y-3 rounded-lg border border-border/40 p-4 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Standard</span>
                                        <span className="font-medium">{formula.sourceStandard || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Reference</span>
                                        <span className="font-medium">{formula.reference || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Year</span>
                                        <span className="font-medium">{formula.yearIntroduced || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Section */}
                    {(formula.applicability || formula.limitations || (formula.tags as string[])?.length > 0) && (
                        <div className="space-y-6 pt-4">
                            <Separator />
                            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                                {formula.applicability && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold">Applicability</h3>
                                        <p className="text-sm leading-relaxed text-muted-foreground">{formula.applicability}</p>
                                    </div>
                                )}
                                {formula.limitations && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold">Limitations</h3>
                                        <p className="text-sm leading-relaxed text-muted-foreground">{formula.limitations}</p>
                                    </div>
                                )}
                            </div>
                            {(formula.tags as string[])?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {(formula.tags as string[]).map(tag => (
                                        <Badge key={tag} variant="outline" className="text-[10px]">#{tag}</Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="h-10" />
                </div>
            </div>
        </div>
    );
}
