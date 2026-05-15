"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Activity,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  Edit3,
  Eye,
  EyeOff,
  Globe,
  Info,
  Layers,
  ShieldCheck,
  Star,
  Table2,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import { ErrorView, LoadingView } from "@/components/entity-components";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authClient } from "@/lib/auth-client";

import { useDeleteTable, useTable } from "../hooks/use-tables";

interface TableViewProps {
  tableId: string;
}

export default function TableView({ tableId }: TableViewProps) {
  const { data: table, isLoading, isError } = useTable(tableId);
  const deleteMutation = useDeleteTable();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const isSuperAdminUser = (session?.user as any)?.globalRole === "SUPER_ADMIN";

  if (isLoading) return <LoadingView message="Loading table details..." />;
  if (isError || !table)
    return <ErrorView message="Failed to load table details." />;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync({ id: table.id });
    router.push("/admin/registery/tables");
  };

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
              <div className="flex items-center gap-1.5">
                {table.isSystem && (
                  <Badge
                    variant="secondary"
                    className="h-5 gap-1 px-1.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    <ShieldCheck className="h-2.5 w-2.5" />
                    System
                  </Badge>
                )}
                {table.isPublished ? (
                  <Badge
                    variant="secondary"
                    className="h-5 gap-1 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  >
                    <Eye className="h-2.5 w-2.5" />
                    Published
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="h-5 gap-1 px-1.5 text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  >
                    <EyeOff className="h-2.5 w-2.5" />
                    Draft
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-mono">
              {table.slug}
            </p>
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

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  table <span className="font-semibold">{table.name}</span> and
                  remove its data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Table"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-5xl space-y-10">
          {/* Summary row */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Category
              </p>
              <Badge variant="outline" className="px-2 py-0.5">
                {table.category}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {table.tableType.replace("_", " ")}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Standard & Source
              </p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  {table.sourceStandard || "Custom"}
                </Badge>
                {table.reference && (
                  <span className="text-xs text-muted-foreground">
                    {table.reference}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Logic & Behavior
              </p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-sm">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs">
                    {table.fallbackMode === "error"
                      ? "Strict"
                      : table.fallbackMode === "null"
                        ? "Null Fallback"
                        : `Fallback: ${table.fallbackValue ?? "None"}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 h-4 ${table.allowOverride ? "border-blue-200 text-blue-600" : "opacity-50"}`}
                  >
                    {table.allowOverride ? "Override On" : "No Override"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1 h-4 ${table.showInOutput ? "border-emerald-200 text-emerald-600" : "opacity-50"}`}
                  >
                    {table.showInOutput ? "Visible" : "Hidden"}
                  </Badge>
                </div>
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
              <Badge variant="outline" className="text-[10px]">
                {data.length} entries
              </Badge>
            </div>

            <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    {table.tableType === "EXACT_LOOKUP" && (
                      <>
                        <TableHead>Category / Key</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </>
                    )}
                    {table.tableType === "RANGE_LOOKUP" && (
                      <>
                        <TableHead>From</TableHead>
                        <TableHead>To</TableHead>
                        <TableHead>Condition Name</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                      </>
                    )}
                    {table.tableType === "INTERPOLATION_1D" && (
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
                      {table.tableType === "EXACT_LOOKUP" && (
                        <>
                          <TableCell className="font-medium">
                            {row.key}
                          </TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {row.value}
                          </TableCell>
                        </>
                      )}
                      {table.tableType === "RANGE_LOOKUP" && (
                        <>
                          <TableCell className="font-mono">
                            {row.from}
                          </TableCell>
                          <TableCell className="font-mono">
                            {row.to ?? "∞"}
                          </TableCell>
                          <TableCell>{row.label}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {row.value}
                          </TableCell>
                        </>
                      )}
                      {table.tableType === "INTERPOLATION_1D" && (
                        <>
                          <TableCell className="font-mono">{row.x}</TableCell>
                          <TableCell className="text-right font-mono text-blue-600">
                            {row.y}
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No data entries in this table.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Metadata & Tags Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
            {table.description && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Info className="h-3.5 w-3.5" />
                  Description & Usage
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {table.description}
                </p>
              </div>
            )}

            {(table.tags as string[])?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(table.tags as string[]).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="bg-muted/30 text-[10px] py-0 px-2 font-normal"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isSuperAdminUser && (
            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                  System Metadata
                </h3>
                <Badge
                  variant="outline"
                  className="bg-primary/10 border-primary/20 text-primary text-[9px] h-4"
                >
                  SuperAdmin Only
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-[11px] font-mono">
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-sans font-bold">
                    Record ID
                  </p>
                  <p className="truncate">{table.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-sans font-bold">
                    Organization ID
                  </p>
                  <p className="truncate">{table.organizationId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-sans font-bold">
                    Created By
                  </p>
                  <p className="truncate">{table.createdBy}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-sans font-bold">
                    Created At
                  </p>
                  <p>{new Date(table.createdAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-sans font-bold">
                    Updated At
                  </p>
                  <p>{new Date(table.updatedAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground uppercase text-[9px] font-sans font-bold">
                    Version
                  </p>
                  <p>{(table as any).currentVersion || 1}</p>
                </div>
              </div>
            </div>
          )}

          <div className="h-10" />
        </div>
      </div>
    </div>
  );
}
