import { WorkspaceCanvasPage } from "@/features/workspace-canvas/page";
import { requireAuth } from "@/lib/auth-utils";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function AdminWorkspaceCanvasPage({ params }: PageProps) {
    await requireAuth();
    const { id } = await params;

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden">
            <WorkspaceCanvasPage workspaceId={id} />
        </div>
    );
}
