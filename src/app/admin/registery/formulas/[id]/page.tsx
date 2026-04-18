import { FormulaView } from "@/features/registery/formula/components";
import { requireAuth } from "@/lib/auth-utils";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function FormulaDetailPage({ params }: PageProps) {
    await requireAuth();
    const { id } = await params;

    return (
        <FormulaView formulaId={id} />
    );
}
