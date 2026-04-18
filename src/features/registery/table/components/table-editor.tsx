"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Table2,
    Save,
    ArrowLeft,
    Trash2,
    Plus,
    Settings2,
    Database,
    BookOpen
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTable, useCreateTable, useUpdateTable } from "../hooks/use-tables";
import { LoadingView } from "@/components/entity-components";
import { TableDataEditor } from "./table-data-editor";
import { Visibility } from "@/generated/prisma";

const tableSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().min(1, "Slug is required"),
    category: z.string().min(1, "Category is required"),
    subCategory: z.string().optional(),
    description: z.string().optional(),
    tableType: z.enum(["EXACT_LOOKUP", "RANGE_LOOKUP", "INTERPOLATION_1D", "MULTI_KEY_LOOKUP"]),
    data: z.array(z.any()).default([]),
    columns: z.array(z.any()).default([]),
    reference: z.string().optional(),
    sourceStandard: z.string().optional(),
    visibility: z.nativeEnum(Visibility).default(Visibility.PRIVATE),
    fallbackMode: z.string().default("error"),
    allowOverride: z.boolean().default(false),
});

type TableFormValues = z.infer<typeof tableSchema>;

interface TableEditorProps {
    tableId?: string;
}

export default function TableEditor({ tableId }: TableEditorProps) {
    const router = useRouter();
    const { data: existing, isLoading } = useTable(tableId);
    const { mutate: create, isPending: isCreating } = useCreateTable();
    const { mutate: update, isPending: isUpdating } = useUpdateTable();

    const form = useForm<TableFormValues>({
        resolver: zodResolver(tableSchema),
        defaultValues: {
            name: "",
            slug: "",
            category: "General",
            tableType: "EXACT_LOOKUP",
            data: [],
            columns: [],
            visibility: Visibility.PRIVATE,
            fallbackMode: "error",
            allowOverride: false,
        },
    });

    useEffect(() => {
        if (existing) {
            form.reset({
                ...existing,
                subCategory: existing.subCategory ?? undefined,
                description: existing.description ?? undefined,
                reference: existing.reference ?? undefined,
                sourceStandard: existing.sourceStandard ?? undefined,
                data: (existing.data as any[]) ?? [],
                columns: (existing.columns as any[]) ?? [],
            } as any);
        }
    }, [existing, form]);

    const onSubmit = (values: TableFormValues) => {
        if (tableId) {
            update({ id: tableId, ...values }, {
                onSuccess: () => router.push(`/admin/registery/tables/${tableId}`)
            });
        } else {
            create(values as any, {
                onSuccess: (data) => router.push(`/admin/registery/tables/${data.id}`)
            });
        }
    };

    if (tableId && isLoading) return <LoadingView message="Loading table details..." />;

    const type = form.watch("tableType");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                <div className="flex items-center justify-between border-b px-6 py-4 bg-background z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                            <Link href="/admin/registery/tables">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold">
                                {tableId ? `Edit ${existing?.name ?? "Table"}` : "Create New Table Registry"}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
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
                                                    <Input placeholder="Scour depth multipliers" {...field} />
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
                                                    <Input placeholder="scour-depth-multipliers" {...field} />
                                                </FormControl>
                                                <FormDescription>Used for referencing in formulas</FormDescription>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Civil">Civil</SelectItem>
                                                        <SelectItem value="Hydraulics">Hydraulics</SelectItem>
                                                        <SelectItem value="Structural">Structural</SelectItem>
                                                        <SelectItem value="General">General</SelectItem>
                                                    </SelectContent>
                                                </Select>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="EXACT_LOOKUP">Exact Match</SelectItem>
                                                        <SelectItem value="RANGE_LOOKUP">Range Match</SelectItem>
                                                        <SelectItem value="INTERPOLATION_1D">1D Interpolation</SelectItem>
                                                        <SelectItem value="MULTI_KEY_LOOKUP">Multi-Key (Planned)</SelectItem>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="PRIVATE">Private (Team only)</SelectItem>
                                                        <SelectItem value="PUBLIC">Public (Library)</SelectItem>
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

                        <TableDataEditor
                            type={form.watch("tableType")}
                            data={form.watch("data")}
                            onTypeChange={(t: any) => form.setValue("tableType", t)}
                            onDataChange={(d: any[]) => form.setValue("data", d)}
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
                            </div>
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
                </div>
            </form>
        </Form>
    );
}
