import { TableEditor } from "@/features/registery/table/components";
import { requireAuth } from "@/lib/auth-utils";

export default async function NewTableRegistryPage() {
    await requireAuth();

    return (
        <TableEditor />
    );
}
