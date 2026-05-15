"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  ArrowLeft,
  BookOpen,
  Globe,
  Info,
  Lock,
  Save,
  ShieldCheck,
  Tag,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import { LoadingView } from "@/components/entity-components";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Visibility } from "@/generated/prisma";
import { authClient } from "@/lib/auth-client";

import {
  useCreateTable,
  useDeleteTable,
  useTable,
  useUpdateTable,
} from "../hooks/use-tables";
import { TableDataEditor } from "./table-data-editor";

// FIX: Added inputKeys and outputKey to match the Prisma schema (they are required Json fields).
// FIX: Added tags, sourcePage, sourceImage, fallbackValue that exist in schema but were missing.
const tableSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  category: z.string().min(1, "Category is required"),
  subCategory: z.string().optional(),
  description: z.string().optional(),
  tableType: z.enum([
    "EXACT_LOOKUP",
    "RANGE_LOOKUP",
    "INTERPOLATION_1D",
    "MULTI_KEY_LOOKUP",
  ]),
  inputKeys: z.array(z.any()).default([]), // FIX: was missing - required in Prisma schema
  outputKey: z.record(z.any()).default({}), // FIX: was missing - required in Prisma schema
  data: z.array(z.any()).default([]),
  columns: z.array(z.any()).default([]),
  tags: z.array(z.string()).default([]), // FIX: was missing
  reference: z.string().optional(),
  sourceStandard: z.string().optional(),
  sourcePage: z.string().optional(), // FIX: was missing
  sourceImage: z.string().optional(), // FIX: was missing
  visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
  interpolationConfig: z.any().optional(),
  fallbackMode: z.enum(["error", "null", "value"]).default("error"),
  fallbackValue: z.any().optional(),
  allowOverride: z.boolean().default(false),
  showInOutput: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  isSystem: z.boolean().default(false),
});

type TableFormValues = z.infer<typeof tableSchema>;

interface TableEditorProps {
  tableId?: string;
}

// Converts a human name to a URL-safe slug.
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function TableEditor({ tableId }: TableEditorProps) {
  const router = useRouter();
  const { data: existing, isLoading } = useTable(tableId);
  const { mutate: create, isPending: isCreating } = useCreateTable();
  const { mutate: update, isPending: isUpdating } = useUpdateTable();
  const deleteMutation = useDeleteTable();
  const [tagInput, setTagInput] = useState("");

  const { data: session } = authClient.useSession();
  const isSuperAdminUser = (session?.user as any)?.globalRole === "SUPER_ADMIN";

  const form = useForm<TableFormValues>({
    resolver: zodResolver(tableSchema),
    values: existing
      ? {
          name: existing.name,
          slug: existing.slug,
          category: existing.category || "General",
          subCategory: existing.subCategory ?? "",
          description: existing.description ?? "",
          tableType: (existing.tableType as any) || "EXACT_LOOKUP",
          visibility: (existing.visibility as any) || Visibility.PRIVATE,
          inputKeys: (existing.inputKeys as any[]) ?? [],
          outputKey: (existing.outputKey as Record<string, any>) ?? {},
          data: (existing.data as any[]) ?? [],
          columns: (existing.columns as any[]) ?? [],
          tags: (existing.tags as string[]) ?? [],
          reference: existing.reference ?? "",
          sourceStandard: existing.sourceStandard ?? "",
          sourcePage: existing.sourcePage ?? "",
          sourceImage: existing.sourceImage ?? "",
          interpolationConfig: existing.interpolationConfig ?? undefined,
          fallbackMode: (existing.fallbackMode as any) || "error",
          fallbackValue: existing.fallbackValue ?? undefined,
          allowOverride: existing.allowOverride ?? false,
          showInOutput: existing.showInOutput ?? true,
          isPublished: existing.isPublished ?? false,
          isSystem: existing.isSystem ?? false,
        }
      : {
          name: "",
          slug: "",
          category: "General",
          subCategory: "",
          description: "",
          tableType: "EXACT_LOOKUP",
          inputKeys: [],
          outputKey: {},
          data: [],
          columns: [],
          tags: [],
          visibility: Visibility.PRIVATE,
          fallbackMode: "error",
          fallbackValue: undefined,
          allowOverride: false,
          showInOutput: true,
          isPublished: false,
          isSystem: false,
        },
  });

  const watchedData = useWatch({ control: form.control, name: "data" });
  const watchedColumns = useWatch({ control: form.control, name: "columns" });
  const watchedType = useWatch({ control: form.control, name: "tableType" });

  // FIX: Auto-derive slug from name when creating (not editing an existing record).
  const handleNameBlur = () => {
    if (!tableId && !form.getValues("slug")) {
      form.setValue("slug", toSlug(form.getValues("name")), {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = (values: TableFormValues) => {
    if (tableId) {
      update(
        { id: tableId, ...values },
        {
          onSuccess: () => router.push(`/admin/registery/tables/${tableId}`),
        },
      );
    } else {
      create(values as any, {
        onSuccess: (data) => router.push(`/admin/registery/tables/${data.id}`),
      });
    }
  };

  const handleDelete = async () => {
    if (!tableId) return;
    deleteMutation.mutate(
      { id: tableId },
      {
        onSuccess: () => router.push("/admin/registery/tables"),
      },
    );
  };

  if (tableId && isLoading)
    return <LoadingView message="Loading table details..." />;

  // FIX: Removed unused `const type = form.watch("tableType")` declaration.

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="h-full flex flex-col"
      >
        <div className="flex items-center justify-between border-b px-6 py-4 bg-background z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href="/admin/registery/tables">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-lg font-bold">
                {tableId
                  ? `Edit ${existing?.name ?? "Table"}`
                  : "Create New Table Registry"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tableId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Table
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      the table{" "}
                      <span className="font-semibold">{existing?.name}</span>{" "}
                      and remove its data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleteMutation.isPending
                        ? "Deleting..."
                        : "Delete Table"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {tableId ? "Save Changes" : "Create Table"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Basic Info */}
            <Card className="border-none shadow-none bg-transparent">
              <CardContent className="p-0 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Scour depth multipliers"
                            {...field}
                            // FIX: auto-fill slug on blur when creating
                            onBlur={handleNameBlur}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unique Slug</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="scour-depth-multipliers"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Used for referencing in formulas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Civil">Civil</SelectItem>
                            <SelectItem value="Hydraulics">
                              Hydraulics
                            </SelectItem>
                            <SelectItem value="Structural">
                              Structural
                            </SelectItem>
                            <SelectItem value="General">General</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sub-Category</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Empirical, Structural, etc."
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tableType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lookup Logic Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="EXACT_LOOKUP">
                              Exact Match
                            </SelectItem>
                            <SelectItem value="RANGE_LOOKUP">
                              Range Match
                            </SelectItem>
                            <SelectItem value="INTERPOLATION_1D">
                              1D Interpolation
                            </SelectItem>
                            <SelectItem value="MULTI_KEY_LOOKUP">
                              Multi-Key (Planned)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="PRIVATE">
                              Private (Team only)
                            </SelectItem>
                            <SelectItem value="PUBLIC">
                              Public (Library)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* FIX: All three callbacks now wired - onColumnsChange was missing before */}
            <TableDataEditor
              type={watchedType}
              data={watchedData}
              columns={watchedColumns}
              onTypeChange={(t: any) => form.setValue("tableType", t)}
              onDataChange={(d: any[]) =>
                form.setValue("data", d, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              onColumnsChange={(c: any[]) =>
                form.setValue("columns", c, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />

            <Separator />

            {/* Reference Info */}
            <div className="space-y-4 pb-12">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-indigo-600" />
                <h2 className="text-lg font-semibold">Sources & References</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="sourceStandard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Standard</FormLabel>
                      <FormControl>
                        <Input placeholder="IRC:89-1997" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Table Reference</FormLabel>
                      <FormControl>
                        <Input placeholder="Table 1.1, Clause 3.2" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* FIX: sourcePage added - was in Prisma schema but missing from form */}
                <FormField
                  control={form.control}
                  name="sourcePage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Page</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="p. 47"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* FIX: sourceImage added - was in Prisma schema but missing from form */}
                <FormField
                  control={form.control}
                  name="sourceImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Image URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://..."
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Extended Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Explain the technical background or applicability rules..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Logic & Fallback Settings */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">
                  Logic & Fallback Behavior
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fallbackMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>If no match is found...</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="error">
                              Throw Error (Strict)
                            </SelectItem>
                            <SelectItem value="null">
                              Return Null / Empty
                            </SelectItem>
                            <SelectItem value="value">
                              Use Fallback Value
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Determines engine behavior when input is out of range
                          or missing.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("fallbackMode") === "value" && (
                    <FormField
                      control={form.control}
                      name="fallbackValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fallback Value</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0, N/A, or 1.0"
                              {...field}
                              value={field.value ?? ""}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-md border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel>Allow Override</FormLabel>
                      <FormDescription className="text-[11px]">
                        Allow users to manually overwrite lookup results.
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="allowOverride"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border p-4 bg-muted/10">
                    <div className="space-y-0.5">
                      <FormLabel>Show in Output</FormLabel>
                      <FormDescription className="text-[11px]">
                        Include this table result in the final workflow output.
                      </FormDescription>
                    </div>
                    <FormField
                      control={form.control}
                      name="showInOutput"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags & Access */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-500" />
                <h2 className="text-lg font-semibold">Tags & Accessibility</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <FormLabel>Tags</FormLabel>
                  <div className="mt-2 flex gap-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const currentTags = form.getValues("tags") || [];
                          if (
                            tagInput.trim() &&
                            !currentTags.includes(tagInput.trim())
                          ) {
                            form.setValue("tags", [
                              ...currentTags,
                              tagInput.trim(),
                            ]);
                            setTagInput("");
                          }
                        }
                      }}
                      placeholder="Add tag and press Enter"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const currentTags = form.getValues("tags") || [];
                        if (
                          tagInput.trim() &&
                          !currentTags.includes(tagInput.trim())
                        ) {
                          form.setValue("tags", [
                            ...currentTags,
                            tagInput.trim(),
                          ]);
                          setTagInput("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {(form.watch("tags") || []).map((t: string) => (
                      <Badge
                        key={t}
                        variant="secondary"
                        className="gap-1 px-2 py-1"
                      >
                        {t}
                        <X
                          className="h-3 w-3 cursor-pointer hover:text-destructive"
                          onClick={() =>
                            form.setValue(
                              "tags",
                              (form.getValues("tags") || []).filter(
                                (x: string) => x !== t,
                              ),
                            )
                          }
                        />
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Super Admin Section */}
            {isSuperAdminUser && (
              <>
                <Separator className="border-primary/20" />
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-bold uppercase tracking-tight text-primary">
                      System Administration
                    </h2>
                    <Badge
                      variant="outline"
                      className="bg-primary/10 border-primary/20 text-primary text-[10px]"
                    >
                      SuperAdmin Only
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-lg border bg-background p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold">
                            Official System Table
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Mark as a verified, immutable system registry item.
                          </p>
                        </div>
                        <FormField
                          control={form.control}
                          name="isSystem"
                          render={({ field }) => (
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          )}
                        />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border bg-background p-4 shadow-sm">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold">
                            Published Status
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Make this table visible in the global library.
                          </p>
                        </div>
                        <FormField
                          control={form.control}
                          name="isPublished"
                          render={({ field }) => (
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          )}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border bg-background p-4 shadow-sm space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Database Metadata
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1.5 text-[11px] font-mono">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="truncate">
                          {existing?.id || "NEW"}
                        </span>
                        <span className="text-muted-foreground">OrgID:</span>
                        <span className="truncate">
                          {existing?.organizationId || "-"}
                        </span>
                        <span className="text-muted-foreground">Creator:</span>
                        <span className="truncate">
                          {existing?.createdBy || "-"}
                        </span>
                        <span className="text-muted-foreground">Created:</span>
                        <span>
                          {existing?.createdAt
                            ? new Date(existing.createdAt).toLocaleDateString()
                            : "-"}
                        </span>
                        <span className="text-muted-foreground">Updated:</span>
                        <span>
                          {existing?.updatedAt
                            ? new Date(existing.updatedAt).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="h-10" />
          </div>
        </div>
      </form>
    </Form>
  );
}
