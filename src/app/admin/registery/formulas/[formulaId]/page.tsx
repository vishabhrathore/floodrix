import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormulaEditor } from "@/features/registery/formula/components";
import { requireAuth } from "@/lib/auth-utils";

interface FormulaDetailPageProps {
  params: Promise<{
    formulaId: string;
  }>;
}

export default async function FormulaDetailPage({
  params,
}: FormulaDetailPageProps) {
  await requireAuth();
  const { formulaId } = await params;

  const handleDeleted = async () => {
    "use server";
    redirect("/admin/registery/formulas");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b bg-background px-6 py-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 w-8 p-0">
          <Link href="/admin/registery/formulas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Formula Details</h1>
          <p className="text-xs text-muted-foreground">
            View and edit standardized formula from the registry
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <FormulaEditor formulaId={formulaId} onDeleted={handleDeleted} />
      </div>
    </div>
  );
}
