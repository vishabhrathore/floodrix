import { FormulaEditor } from "@/features/registery/formula/components";
import { requireAuth } from "@/lib/auth-utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FormulaEditPage({ params }: PageProps) {
    await requireAuth();
    const { id } = await params;

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-4 border-b bg-background px-6 py-4">
                <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 w-8 p-0">
                    <Link href={`/admin/registery/formulas/${id}`}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-lg font-semibold">Edit Formula</h1>
                    <p className="text-xs text-muted-foreground">Modify formula configuration and variables</p>
                </div>
            </div>
            <div className="flex-1 overflow-hidden">
                <FormulaEditor formulaId={id} />
            </div>
        </div>
    );
}
