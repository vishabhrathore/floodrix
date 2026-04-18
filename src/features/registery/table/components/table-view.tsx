"use client";

import { useTable } from "../hooks/use-tables";
import { LoadingView, ErrorView } from "@/components/entity-components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Table2,
    BookOpen,
    Globe,
    CheckCircle2,
    Clock,
    Star,
    Layers,
    ArrowLeft,
    Edit3,
    Database,
    Zap
} from "lucide-react";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";

interface TableViewProps {
    tableId: string;
}

export default function TableView({ tableId }: TableViewProps) {
    const { data: table, isLoading, isError } = useTable(tableId);

    if (isLoading) return <LoadingView message="Loading table details..." />;
    if (isError || !table) return <ErrorView message="Failed to load table details." />;

    const data = (table.data as any[]) ?? [];

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/30">
                        <Table2 className="h-6 w-6 text-blue-700 dark:text-blue-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight">{table.name}</h1>
                            {table.isSystem && (
                                <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                                    <Star className="h-2.5 w-2.5" />
                                    Official
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">{table.slug}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/registery/tables`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Registry
                        </Link>
                    </Button>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700" asChild>
                        <Link href={`/admin/registery/tables/${table.id}/edit`}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit Table
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                <div className="mx-auto max-w-5xl space-y-10">
                    {/* Summary row */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Category</p>
                            <Badge variant="outline" className="px-2 py-0.5">{table.category}</Badge>
                            <p className="text-xs text-muted-foreground mt-1">{table.tableType.replace('_', ' ')}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Standard & Source</p>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {table.sourceStandard || "Custom"}
                                </Badge>
                                {table.reference && <span className="text-xs text-muted-foreground">{table.reference}</span>}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Logic Params</p>
                            <div className="flex items-center gap-1.5 text-sm">
                                <Zap className="h-4 w-4 text-emerald-500" />
                                <span>{table.fallbackMode === 'error' ? 'Strict Matching' : 'Fallback enabled'}</span>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Data Visualization */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Database className="h-5 w-5 text-blue-600" />
                                <h2 className="text-lg font-semibold">Standard Dataset</h2>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{data.length} entries</Badge>
                        </div>

                        <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        {table.tableType === 'EXACT_LOOKUP' && (
                                            <>
                                                <TableHead>Category / Key</TableHead>
                                                <TableHead className="text-right">Value</TableHead>
                                            </>
                                        )}
                                        {table.tableType === 'RANGE_LOOKUP' && (
                                            <>
                                                <TableHead>From</TableHead>
                                                <TableHead>To</TableHead>
                                                <TableHead>Condition Name</TableHead>
                                                <TableHead className="text-right">Value</TableHead>
                                            </>
                                        )}
                                        {table.tableType === 'INTERPOLATION_1D' && (
                                            <>
                                                <TableHead>X (Input)</TableHead>
                                                <TableHead className="text-right">Y (Output)</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row, i) => (
                                        <TableRow key={i} className="hover:bg-muted/10">
                                            {table.tableType === 'EXACT_LOOKUP' && (
                                                <>
                                                    <TableCell className="font-medium">{row.key}</TableCell>
                                                    <TableCell className="text-right font-mono text-blue-600">{row.value}</TableCell>
                                                </>
                                            )}
                                            {table.tableType === 'RANGE_LOOKUP' && (
                                                <>
                                                    <TableCell className="font-mono">{row.from}</TableCell>
                                                    <TableCell className="font-mono">{row.to ?? '∞'}</TableCell>
                                                    <TableCell>{row.label}</TableCell>
                                                    <TableCell className="text-right font-mono text-blue-600">{row.value}</TableCell>
                                                </>
                                            )}
                                            {table.tableType === 'INTERPOLATION_1D' && (
                                                <>
                                                    <TableCell className="font-mono">{row.x}</TableCell>
                                                    <TableCell className="text-right font-mono text-blue-600">{row.y}</TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                    {data.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                                No data entries in this table.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Metadata Section */}
                    {table.description && (
                        <div className="space-y-4 pt-4">
                            <Separator />
                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description & Usage Notes</h3>
                                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                    {table.description}
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="h-10" />
                </div>
            </div>
        </div>
    );
}
