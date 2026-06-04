// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/workflow-runner.tsx
//
//  CHUNK 3: The runner panel that sits beside the canvas during execution.
//
//  Pause states handled:
//    - awaiting_user_input → render form for pausedNode.fields
//    - validation_error    → show error panel with retry/cancel
//    - step_complete       → show stepOutput + "Next ▶" button
//  Plus running/completed/errored/idle states.
//
//  Assumes Chunk 3's use-execution.ts hook is in place.
// ═══════════════════════════════════════════════════════════════════════════
// for any issues see in seprate commit
"use client";

import { useEffect, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Play,
  RefreshCw,
  SkipForward,
  StepForward,
  X,
  FileText,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useExecution } from "@/features/workflow-canvas/hooks/use-execution";
import MarkdownContent from "@/web/components/MarkdownContent";
import { TypewriterMarkdown } from "@/features/workflow-canvas/components/typewriter-markdown";
import { WorkflowReport } from "@/features/workflow-canvas/components/workflow-report";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { SequentialTypewriter } from "./sequential-typewriter";

interface WorkflowRunnerProps {
  workflowId: string;
  stepMode: boolean;
  onClose: () => void;
  execution?: any; // Share execution state from parent if available
}

export function WorkflowRunner({
  workflowId,
  stepMode,
  onClose,
  execution,
}: WorkflowRunnerProps) {
  const trpc = useTRPC();
  const internalExec = useExecution(workflowId);
  const exec = execution || internalExec;
  const [autoStarted, setAutoStarted] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const { data: workflow } = useQuery(
    trpc.calcWorkflows.getOne.queryOptions({ id: workflowId }),
  );
  const meta = workflow?.metadata as Record<string, unknown> | null;

  const executions = Object.values(exec.nodeOutputs ?? {})
    .filter((n: any) => n.result?.markdown)
    .map((n: any) => ({
      nodeId: n.nodeId,
      nodeLabel: n.nodeLabel || "Calculation",
      nodeType: n.nodeType,
      markdown: String(n.result.markdown),
    }));

  // Auto-start when the panel opens
  useEffect(() => {
    if (!autoStarted && !exec.status) {
      exec.startRun({ stepMode });
      setAutoStarted(true);
    }
  }, [autoStarted, exec, stepMode]);

  return (
    <div className="flex h-full w-[800px] flex-col border-l bg-white overflow-hidden shadow-2xl z-[9999]">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-6 py-4 bg-neutral-50/50">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-neutral-800">
            {stepMode ? "Step Runner" : "Workflow Runner"}
          </div>
          <StatusBadge status={exec.status} pauseReason={exec.pauseReason} />
        </div>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ── Body ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Analytical Inputs */}
          <div className="space-y-4">
            <div className="font-sans text-[15px] font-bold text-neutral-800 border-b pb-2 mb-2 flex items-center justify-between">
              <span>Analytical Inputs</span>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Parameter Specification</span>
            </div>

            {/* Input Pause View */}
            {exec.isInputPause && exec.pausedNode && (
              <InputPauseView
                field={exec.pausedNode}
                isSubmitting={exec.isSubmitting}
                onSubmit={exec.submitInput}
                onCancel={exec.cancel}
              />
            )}

            {/* Validation Pause View */}
            {exec.isValidationPause && (
              <ValidationPauseView
                message={exec.error ?? "Validation failed"}
                onCancel={exec.cancel}
              />
            )}

            {/* Running Loader */}
            {(exec.isRunning || exec.isStarting) && (
              <div className="bg-slate-50 border rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3 py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#fb3640]" />
                <span className="text-xs font-semibold text-neutral-600">
                  {exec.isStarting ? "Initializing calculation..." : "Executing calculation nodes..."}
                </span>
              </div>
            )}

            {/* Step Pause View */}
            {exec.isStepPause && exec.stepOutput && (
              <StepPauseView
                output={exec.stepOutput}
                onNext={exec.stepForward}
                onCancel={exec.cancel}
                isStepping={exec.isStepping}
              />
            )}

            {/* Errored View */}
            {exec.isErrored && (
              <ErroredView
                error={exec.error ?? "Unknown error"}
                onRetry={() => {
                  exec.reset();
                  setAutoStarted(false);
                }}
                onClose={onClose}
              />
            )}

            {/* Complete Left Side - show success card */}
            {exec.isComplete && (
              <div className="space-y-4">
                <Card className="border-emerald-200 bg-emerald-50/40 p-4 flex items-start gap-3 shadow-sm rounded-xl">
                  <div className="rounded-full bg-emerald-500 p-1 text-white mt-0.5">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                      Workflow Completed
                    </div>
                    <div className="mt-0.5 text-xs text-emerald-700 font-medium">
                      All calculations ran and outputs resolved successfully.
                    </div>
                  </div>
                </Card>

                {/* Reset & Re-run Buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      exec.reset();
                      setAutoStarted(false);
                    }}
                    className="flex-1 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl py-4 font-semibold shadow-sm transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin-slow" />
                    Run Calculation Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Computational Audit */}
          <div className="space-y-4">
            <div className="font-sans text-[15px] font-bold text-neutral-800 border-b pb-2 mb-2 flex items-center justify-between">
              <span>Computational Audit</span>
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Step-by-Step Derivation</span>
            </div>

            {/* If idle or starting */}
            {(!exec.status || exec.isStarting) && (
              <div className="bg-slate-50 border rounded-xl p-6 text-center text-xs text-neutral-400">
                Awaiting workflow execution to display analytical audit log.
              </div>
            )}

            {/* Completed variables and outputs */}
            {exec.isComplete && (
              <div className="space-y-4">
                {/* Computed Variables Table */}
                {Object.keys(exec.variables).length > 0 && (
                  <Card className="border-neutral-100 bg-neutral-50/40 p-4 rounded-xl shadow-sm">
                    <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Computed variables
                    </div>
                    <div className="space-y-1.5">
                      {Object.entries(exec.variables)
                        .filter(([k]) => !k.startsWith("$"))
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="flex items-center justify-between text-xs rounded-lg border border-neutral-100/50 bg-white p-2 shadow-xs"
                          >
                            <span className="font-mono font-medium text-neutral-500">{k}</span>
                            <span className="font-mono font-bold text-neutral-800">
                              {typeof v === "number" ? v.toLocaleString() : String(v)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </Card>
                )}

                {/* Full Report Button */}
                <Button
                  size="sm"
                  onClick={() => setReportOpen(true)}
                  className="w-full bg-[#fb3640] hover:bg-[#fb3640]/90 text-white rounded-xl py-5 font-semibold shadow-sm transition-all mb-2.5 flex items-center justify-center gap-1.5"
                >
                  <FileText className="h-4 w-4" />
                  View Full Report
                </Button>
              </div>
            )}

            {/* ═══ SEQUENTIAL TYPEWRITER RECORD ═══ */}
            {(exec.isRunning || exec.isPaused || exec.isComplete) && executions.length > 0 && (
              <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 space-y-6">
                <div className="border-b border-neutral-100 pb-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#fb3640] font-mono">
                    Calculation Record
                  </span>
                </div>
                <SequentialTypewriter executions={executions} speed={2} />
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      {(exec.isRunning || exec.isPaused) && (
        <div className="border-t px-4 py-2 bg-neutral-50/50">
          <Button
            size="sm"
            variant="ghost"
            onClick={exec.cancel}
            disabled={exec.isCancelling}
            className="w-full text-red-600 hover:bg-red-50"
          >
            {exec.isCancelling ? "Cancelling…" : "Cancel run"}
          </Button>
        </div>
      )}

      <WorkflowReport
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        workflowName={workflow?.name ?? "Workflow Calculation"}
        workflowDescription={workflow?.description ?? undefined}
        workflowRef={(meta?.reference as string) ?? undefined}
        workflowRegion={(meta?.region as string) ?? undefined}
        variables={exec.variables}
        nodeExecutions={Object.values(exec.nodeOutputs ?? {})}
      />
    </div>
  );
}

// ─── Status badge ──────────────────────────────────────────────────────────

function StatusBadge({
  status,
  pauseReason,
}: {
  status: string | null;
  pauseReason: string | null;
}) {
  if (!status) return null;

  const variants: Record<string, { label: string; className: string }> = {
    RUNNING: { label: "Running", className: "bg-amber-100 text-amber-800" },
    PAUSED:
      pauseReason === "step_complete"
        ? { label: "Stepped", className: "bg-sky-100 text-sky-800" }
        : { label: "Paused", className: "bg-purple-100 text-purple-800" },
    COMPLETED: {
      label: "Completed",
      className: "bg-emerald-100 text-emerald-800",
    },
    ERRORED: { label: "Errored", className: "bg-red-100 text-red-800" },
    CANCELLED: {
      label: "Cancelled",
      className: "bg-neutral-100 text-neutral-700",
    },
  };

  const v = variants[status] ?? { label: status, className: "bg-neutral-100" };
  return (
    <Badge variant="outline" className={`text-[10px] ${v.className} border-0`}>
      {v.label}
    </Badge>
  );
}

// ─── State views ───────────────────────────────────────────────────────────

function LoadingState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-neutral-500">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

function InputPauseView({
  field,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  field: { nodeLabel: string; fields: any[]; message?: string };
  isSubmitting: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  return (
    <Card className="border-purple-200 bg-purple-50/40 p-4">
      <div className="mb-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-purple-700">
          Input needed
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-800">
          {field.nodeLabel}
        </div>
        {field.message && (
          <div className="mt-1 text-xs text-neutral-600">{field.message}</div>
        )}
      </div>

      <div className="space-y-3">
        {field.fields.map((f) => (
          <div key={f.key}>
            <Label
              htmlFor={f.key}
              className="text-xs font-medium text-neutral-700"
            >
              {f.label}
              {f.unit && (
                <span className="ml-1 text-neutral-400">({f.unit})</span>
              )}
              {f.required !== false && (
                <span className="ml-0.5 text-red-500">*</span>
              )}
            </Label>
            <Input
              id={f.key}
              type={f.data_type === "number" ? "number" : "text"}
              step={f.constraints?.step ?? "any"}
              min={f.constraints?.min}
              max={f.constraints?.max}
              placeholder={f.default?.toString() ?? ""}
              value={(values[f.key] as string) ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  [f.key]:
                    f.data_type === "number"
                      ? Number(e.target.value)
                      : e.target.value,
                }))
              }
              className="mt-1"
            />
            {f.hint && (
              <p className="mt-1 text-[10px] text-neutral-500">{f.hint}</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          onClick={() => onSubmit(values)}
          disabled={isSubmitting}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {isSubmitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <ChevronRight className="h-3.5 w-3.5 mr-1" />
              Continue
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function ValidationPauseView({
  message,
  onCancel,
}: {
  message: string;
  onCancel: () => void;
}) {
  return (
    <Card className="border-amber-200 bg-amber-50/40 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Validation failed
          </div>
          <div className="mt-1 text-sm text-neutral-800">{message}</div>
          <p className="mt-2 text-xs text-neutral-600">
            Fix the inputs and re-run, or cancel to stop this execution.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onCancel}
        className="mt-3 w-full"
      >
        Cancel run
      </Button>
    </Card>
  );
}

function StepPauseView({
  output,
  onNext,
  onCancel,
  isStepping,
}: {
  output: {
    nodeLabel: string;
    nodeType: string;
    outputs: Record<string, unknown>;
    result: Record<string, unknown>;
    durationMs: number;
    stepNumber: number;
    totalSteps: number;
  };
  onNext: () => void;
  onCancel: () => void;
  isStepping: boolean;
}) {
  return (
    <Card className="border-neutral-200/80 bg-white p-4 shadow-md rounded-xl relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-sky-500" />
      <div className="mb-3 pl-1">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
            Step {output.stepNumber + 1} of {output.totalSteps}
          </div>
          <Badge
            variant="secondary"
            className="text-[9px] text-sky-700 bg-sky-50 border border-sky-100 rounded-md font-semibold px-1.5"
          >
            {output.nodeType}
          </Badge>
        </div>
        <div className="mt-1.5 text-sm font-bold text-neutral-800">
          {output.nodeLabel}
        </div>
        <div className="mt-0.5 text-[10px] text-neutral-400 font-medium">
          Completed in {output.durationMs}ms
        </div>
      </div>

      {Object.keys(output.outputs).length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="mt-2 pl-1">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-1.5">
              Outputs
            </div>
            <div className="space-y-1">
              {Object.entries(output.outputs).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-xs rounded-lg border border-neutral-100/50 bg-neutral-50/50 px-2.5 py-1.5"
                >
                  <span className="font-mono text-neutral-500 font-medium">{k}</span>
                  <span className="font-mono font-bold text-neutral-800">
                    {typeof v === "number" ? v.toLocaleString() : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {(output.result as any)?.markdown && (
        <>
          <Separator className="my-2" />
          <div className="mt-2 pl-1">
            <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-1.5">
              Node Output (Markdown)
            </div>
            <div className="rounded-lg border border-neutral-150 bg-neutral-50/20 p-3 text-xs text-neutral-800 shadow-inner max-h-[300px] overflow-y-auto">
              <MarkdownContent content={String((output.result as any).markdown)} />
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex gap-2 pl-1">
        <Button
          size="sm"
          onClick={onNext}
          disabled={isStepping}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-semibold shadow-sm"
        >
          {isStepping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <StepForward className="h-3.5 w-3.5 mr-1" />
              Next
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function CompletedView({
  variables,
  nodeOutputs,
  onRunAgain,
  onViewReport,
}: {
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, any>;
  onRunAgain: () => void;
  onViewReport: () => void;
}) {
  // Filter out internal keys ($nodes, $results)
  const visibleVars = Object.entries(variables).filter(
    ([k]) => !k.startsWith("$"),
  );

  const markdownOutputs = Object.values(nodeOutputs).filter(
    (out: any) => out.result?.markdown,
  );

  return (
    <div className="space-y-4">
      {/* Success banner */}
      <Card className="border-emerald-200 bg-emerald-50/40 p-3.5 flex items-start gap-3 shadow-sm rounded-xl">
        <div className="rounded-full bg-emerald-500 p-1 text-white mt-0.5">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Workflow Completed
          </div>
          <div className="mt-0.5 text-xs text-emerald-700 font-medium">
            All {visibleVars.length} variables resolved successfully.
          </div>
        </div>
      </Card>

      {visibleVars.length > 0 && (
        <Card className="border-neutral-100 bg-neutral-50/40 p-4 rounded-xl shadow-sm">
          <div className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Computed variables
          </div>
          <div className="space-y-1.5">
            {visibleVars.map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between text-xs rounded-lg border border-neutral-100/50 bg-white p-2 shadow-xs transition-colors hover:bg-neutral-50"
              >
                <span className="font-mono font-medium text-neutral-500">{k}</span>
                <span className="font-mono font-bold text-neutral-800">
                  {typeof v === "number" ? v.toLocaleString() : String(v)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {markdownOutputs.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="border-b border-neutral-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#fb3640] font-mono">
              Calculation Record
            </span>
          </div>
          <div className="space-y-6 divide-y divide-neutral-100">
            {markdownOutputs.map((out: any, idx: number) => (
              <div
                key={out.nodeId}
                className={idx > 0 ? "pt-6" : ""}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-neutral-800">
                    {out.nodeLabel || "Node Output"}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-neutral-400 px-1.5 py-0.5 bg-neutral-100 rounded-md">
                    {out.nodeType}
                  </span>
                </div>
                <div className="text-xs text-neutral-800 overflow-x-auto">
                  <MarkdownContent content={String((out.result as any).markdown)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        size="sm"
        onClick={onViewReport}
        className="w-full bg-[#fb3640] hover:bg-[#fb3640]/90 text-white rounded-xl py-5 font-semibold shadow-sm transition-all mb-2.5 flex items-center justify-center gap-1.5"
      >
        <FileText className="h-4 w-4" />
        View Full Report
      </Button>

      <Button
        size="sm"
        onClick={onRunAgain}
        className="w-full bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl py-5 font-semibold shadow-sm transition-all"
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin-slow" />
        Run Calculation Again
      </Button>
    </div>
  );
}

function ErroredView({
  error,
  onRetry,
  onClose,
}: {
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50/40 p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Execution failed
          </div>
          <div className="mt-1 text-sm text-neutral-800 font-mono text-xs bg-white/70 rounded px-2 py-1.5">
            {error}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="flex-1"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1" />
          Retry
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Card>
  );
}
