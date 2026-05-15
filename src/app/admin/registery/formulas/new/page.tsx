import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormulaEditor } from "@/features/registery/formula/components";
import { requireAuth } from "@/lib/auth-utils";

export default async function NewFormulaPage() {
  await requireAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b bg-background px-6 py-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 w-8 p-0">
          <Link href="/admin/registery/formulas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Create Formula</h1>
          <p className="text-xs text-muted-foreground">
            Add a new standardized formula to the registry
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <FormulaEditor />
      </div>
    </div>
  );
}
