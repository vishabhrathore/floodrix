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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useExecution } from "@/features/workflow-canvas/hooks/use-execution";

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
  const internalExec = useExecution(workflowId);
  const exec = execution || internalExec;
  const [autoStarted, setAutoStarted] = useState(false);

  // Auto-start when the panel opens
  useEffect(() => {
    if (!autoStarted && !exec.status) {
      exec.startRun({ stepMode });
      setAutoStarted(true);
    }
  }, [autoStarted, exec, stepMode]);

  return (
    <div className="flex h-full w-[400px] flex-col border-l bg-white">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b px-4 py-3">
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
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {exec.isStarting && <LoadingState message="Starting execution…" />}

          {exec.isRunning && !exec.isStarting && (
            <LoadingState message="Executing nodes…" />
          )}

          {exec.isInputPause && exec.pausedNode && (
            <InputPauseView
              field={exec.pausedNode}
              isSubmitting={exec.isSubmitting}
              onSubmit={exec.submitInput}
              onCancel={exec.cancel}
            />
          )}

          {exec.isValidationPause && (
            <ValidationPauseView
              message={exec.error ?? "Validation failed"}
              onCancel={exec.cancel}
            />
          )}

          {exec.isStepPause && exec.stepOutput && (
            <StepPauseView
              output={exec.stepOutput}
              onNext={exec.stepForward}
              onCancel={exec.cancel}
              isStepping={exec.isStepping}
            />
          )}

          {exec.isComplete && (
            <CompletedView
              variables={exec.variables}
              onRunAgain={() => {
                exec.reset();
                setAutoStarted(false);
              }}
            />
          )}

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
        </div>
      </ScrollArea>

      {/* ── Footer ──────────────────────────────────────── */}
      {(exec.isRunning || exec.isPaused) && (
        <div className="border-t px-4 py-2">
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
    <Card className="border-sky-200 bg-sky-50/40 p-4">
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Step {output.stepNumber + 1} of {output.totalSteps}
          </div>
          <Badge
            variant="outline"
            className="text-[10px] text-sky-700 border-sky-300"
          >
            {output.nodeType}
          </Badge>
        </div>
        <div className="mt-1 text-sm font-medium text-neutral-800">
          {output.nodeLabel}
        </div>
        <div className="mt-0.5 text-[11px] text-neutral-500">
          Completed in {output.durationMs}ms
        </div>
      </div>

      {Object.keys(output.outputs).length > 0 && (
        <>
          <Separator className="my-2" />
          <div className="mt-2">
            <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Outputs
            </div>
            <div className="space-y-1">
              {Object.entries(output.outputs).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-xs rounded bg-white/70 px-2 py-1"
                >
                  <span className="font-mono text-neutral-600">{k}</span>
                  <span className="font-mono font-medium text-neutral-900">
                    {typeof v === "number" ? v.toLocaleString() : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="mt-4 flex gap-2">
        <Button
          size="sm"
          onClick={onNext}
          disabled={isStepping}
          className="flex-1 bg-sky-600 hover:bg-sky-700 text-white"
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
  onRunAgain,
}: {
  variables: Record<string, unknown>;
  onRunAgain: () => void;
}) {
  // Filter out internal keys ($nodes, $results)
  const visibleVars = Object.entries(variables).filter(
    ([k]) => !k.startsWith("$"),
  );

  return (
    <Card className="border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Completed
          </div>
          <div className="mt-0.5 text-sm text-neutral-700">
            All {visibleVars.length} variables computed successfully.
          </div>
        </div>
      </div>

      {visibleVars.length > 0 && (
        <>
          <Separator className="my-3" />
          <div>
            <div className="text-[10px] font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Results
            </div>
            <div className="space-y-1">
              {visibleVars.map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-xs rounded bg-white/70 px-2 py-1"
                >
                  <span className="font-mono text-neutral-600">{k}</span>
                  <span className="font-mono font-medium text-neutral-900">
                    {typeof v === "number" ? v.toLocaleString() : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <Button
        size="sm"
        onClick={onRunAgain}
        className="mt-4 w-full"
        variant="outline"
      >
        <RefreshCw className="h-3.5 w-3.5 mr-1" />
        Run again
      </Button>
    </Card>
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
