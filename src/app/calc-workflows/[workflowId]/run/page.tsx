"use client";

// ═══════════════════════════════════════════════════════════════════════════
//  src/app/calc-workflows/[workflowId]/run/page.tsx
//
//  CHUNK 3: the "run this workflow" page. Shows the canvas (read-only) with
//  the runner panel docked to the right. Step mode toggle in the toolbar.
//
//  This is a suggested structure — if you already have a run page, merge the
//  WorkflowRunner panel into it alongside your canvas.
// ═══════════════════════════════════════════════════════════════════════════
import { use, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileText, Layout, Loader2, Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkflowCanvas } from "@/features/workflow-canvas/components/workflow-canvas";
import { WorkflowFormRunner } from "@/features/workflow-canvas/components/workflow-form-runner";
import { WorkflowRunner } from "@/features/workflow-canvas/components/workflow-runner";
import { WorkflowToolbar } from "@/features/workflow-canvas/components/workflow-toolbar";
import { useTRPC } from "@/trpc/client";

interface RunPageProps {
  params: Promise<{ workflowId: string }>;
}

export default function WorkflowRunPage({ params }: RunPageProps) {
  const { workflowId } = use(params);
  const router = useRouter();
  const trpc = useTRPC();

  // View state: 'canvas' vs 'form'
  const [viewMode, setViewMode] = useState<"canvas" | "form">("form");
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [runnerStepMode, setRunnerStepMode] = useState(false);

  // Fetch workflow details for the Form view metadata
  const { data: workflow } = useQuery(
    trpc.calcWorkflows.getOne.queryOptions({ id: workflowId }),
  );

  const handleOpenRunner = ({ stepMode }: { stepMode: boolean }) => {
    setRunnerStepMode(stepMode);
    setRunnerOpen(true);
  };

  const meta = workflow?.metadata as Record<string, unknown> | null;

  return (
    <div className="flex h-screen flex-col bg-neutral-50">
      {/* ── Top bar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b bg-white px-4 py-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => router.back()}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="h-4 w-[1px] bg-neutral-200 mx-1" />

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="h-8 p-1">
            <TabsTrigger value="form" className="h-6 text-[11px] gap-1.5 px-3">
              <FileText className="h-3 w-3" />
              Summary View
            </TabsTrigger>
            <TabsTrigger
              value="canvas"
              className="h-6 text-[11px] gap-1.5 px-3"
            >
              <Monitor className="h-3 w-3" />
              Canvas View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="ml-auto text-xs font-semibold text-neutral-400 uppercase tracking-widest">
          Run Workflow
        </div>
      </div>

      {viewMode === "canvas" ? (
        <>
          {/* ── Toolbar ──────────────────────────────────────────── */}
          <WorkflowToolbar
            workflowId={workflowId}
            onOpenRunner={handleOpenRunner}
          />

          {/* ── Canvas + runner ──────────────────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <WorkflowCanvas workflowId={workflowId} readOnly />
            </div>

            {runnerOpen && (
              <WorkflowRunner
                workflowId={workflowId}
                stepMode={runnerStepMode}
                onClose={() => setRunnerOpen(false)}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto bg-[#f4f5f7] p-8">
          {workflow && (
            <WorkflowFormRunner
              workflowId={workflowId}
              workflowName={workflow.name}
              workflowRef={meta?.reference as string}
              workflowRegion={meta?.region as string}
              workflowDescription={workflow.description ?? undefined}
            />
          )}
          {!workflow && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-300" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
