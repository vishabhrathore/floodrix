// src/app/(dashboard)/(rest)/calc-workflows/[workflowId]/run/page.tsx

import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { WorkflowRunner } from "@/features/workflow-canvas/components/workflow-runner";

interface PageProps {
    params: Promise<{ workflowId: string }>;
}

export default async function RunWorkflowPage({ params }: PageProps) {
    const auth = await requireAuth();
    const { workflowId } = await params;

    const workflow = await prisma.calcWorkflow.findFirst({
        where: {
            deletedAt: null,
            organization: { members: { some: { userId: auth.user.id } } },
            OR: [{ id: workflowId }, { slug: workflowId }],
        },
        select: {
            id: true,
            name: true,
            status: true,
            description: true,
            category: true,
            metadata: true,
        },
    });

    if (!workflow) notFound();

    const meta = workflow.metadata as Record<string, unknown> | null;

    return (
        <HydrateClient>
            <div style={{ minHeight: "100vh", background: "#f4f5f7" }}>
                {/* FloodRix Header */}
                <header style={{
                    background: "#111", height: 58, padding: "0 28px",
                    display: "flex", alignItems: "center", gap: 14,
                    position: "sticky", top: 0, zIndex: 300,
                    boxShadow: "0 2px 16px rgba(0,0,0,0.5)",
                }}>
                    <div>
                        <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: 21, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>
                            Flood<span style={{ color: "#fb3640" }}>Rix</span>
                        </div>
                        <div style={{ fontSize: 9, color: "#555", letterSpacing: 2, textTransform: "uppercase", marginTop: 1 }}>
                            Engineering Hydraulics Platform
                        </div>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
                        <a
                            href={`/calc-workflows/${workflow.id}`}
                            style={{
                                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                                color: "#aaa", padding: "6px 14px", borderRadius: 6, fontSize: 12,
                                fontWeight: 600, textDecoration: "none", fontFamily: "'Outfit', sans-serif",
                            }}
                        >
                            ← Editor
                        </a>
                        <span style={{
                            background: "rgba(251,54,64,0.14)", border: "1px solid rgba(251,54,64,0.28)",
                            color: "#fb3640", padding: "4px 11px", borderRadius: 20,
                            fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                        }}>
                            {workflow.status}
                        </span>
                    </div>
                </header>

                {/* Runner */}
                <div style={{ padding: "28px 32px" }}>
                    <WorkflowRunner
                        workflowId={workflow.id}
                        workflowName={workflow.name}
                        workflowRef={meta?.reference as string | undefined}
                        workflowRegion={meta?.region as string | undefined}
                        workflowExpr={workflow.description ?? undefined}
                    />
                </div>
            </div>
        </HydrateClient>
    );
}