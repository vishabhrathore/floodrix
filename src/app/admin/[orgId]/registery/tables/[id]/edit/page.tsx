import Link from "next/link";

import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TableEditor } from "@/features/registery/table/components";
import { requireAuth } from "@/lib/auth-utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TableEditPage({ params }: PageProps) {
  await requireAuth();
  const { id } = await params;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b bg-background px-6 py-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 w-8 p-0">
          <Link href={`/admin/registery/tables/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Edit Table Registry</h1>
          <p className="text-xs text-muted-foreground">
            Modify table data and lookup configuration
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <TableEditor tableId={id} />
      </div>
    </div>
  );
}
