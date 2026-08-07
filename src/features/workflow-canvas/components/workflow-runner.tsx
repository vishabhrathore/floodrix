// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/workflow-runner.tsx
//
//  The runner panel that sits beside the canvas during execution.
//  Fully data-driven and dynamic: reads formulas, units, coordinate tables,
//  and charting series directly from node configurations and execution step
//  outputs without hardcoding specific workflow node IDs.
// ═══════════════════════════════════════════════════════════════════════════
"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  X,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useExecution } from "@/features/workflow-canvas/hooks/use-execution";
import MarkdownContent from "@/web/components/MarkdownContent";
import { WorkflowReport } from "@/features/workflow-canvas/components/workflow-report";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

interface WorkflowRunnerProps {
  workflowId: string;
  stepMode: boolean;
  onClose: () => void;
  execution?: any;
}

// Map node types to human-readable labels and Tailwind classes
function getNodeTypeBadge(type: string) {
  const normType = type?.toUpperCase() || "";
  
  if (normType === "INPUT") {
    return { label: "Input", className: "bg-neutral-100 text-neutral-600 border-neutral-200" };
  }
  if (normType === "FORMULA") {
    return { label: "Formula", className: "bg-blue-50 text-blue-700 border-blue-200/60" };
  }
  if (normType === "LOOKUP" || normType.includes("LOOKUP")) {
    return { label: "Lookup", className: "bg-indigo-50 text-indigo-700 border-indigo-200/60" };
  }
  if (normType.includes("INTERPOLATION") || normType === "INTERPOLATE") {
    return { label: "Interpolate", className: "bg-purple-50 text-purple-700 border-purple-200/60" };
  }
  if (normType === "DECISION") {
    return { label: "Decision", className: "bg-orange-50 text-orange-700 border-orange-200/60" };
  }
  if (normType === "DISPLAY") {
    return { label: "Display", className: "bg-teal-50 text-teal-700 border-teal-200/60" };
  }
  if (normType === "CHART") {
    return { label: "Chart", className: "bg-pink-50 text-pink-700 border-pink-200/60" };
  }
  
  // Custom code or fallback
  return { label: "Custom", className: "bg-emerald-50 text-emerald-700 border-emerald-200/60" };
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
  
  // Interactive expand/collapse state for completed cards
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const { data: workflow } = useQuery(
    trpc.calcWorkflows.getOne.queryOptions({ id: workflowId }),
  );
  
  const { data: canvasData } = useQuery(
    trpc.calcWorkflowCanvas.get.queryOptions({ workflowId }),
  );

  const meta = workflow?.metadata as Record<string, unknown> | null;

  // Auto-start run on load
  useEffect(() => {
    if (!autoStarted && !exec.status) {
      exec.startRun({ stepMode });
      setAutoStarted(true);
    }
  }, [autoStarted, exec, stepMode]);

  // Sort nodes by level / position coordinates (Y then X) to get topological sequence
  const sortedNodes = [...(canvasData?.nodes || [])].sort((a, b) => {
    if (a.positionY !== b.positionY) return a.positionY - b.positionY;
    return a.positionX - b.positionX;
  });

  const totalNodes = sortedNodes.length;
  const completedNodesCount = sortedNodes.filter(n => exec.nodeOutputs[n.id]).length;
  const progressPercent = totalNodes > 0 ? (completedNodesCount / totalNodes) * 100 : 0;

  // Helper to classify nodes into stages dynamically based on workflow category
  const isHydrology = workflow?.category?.toLowerCase() === "hydrology" || workflow?.name?.toLowerCase().includes("river");

  const getStageInfo = (node: any, index: number) => {
    const isInput = node.type === "INPUT";
    
    if (isHydrology) {
      // Hydrology-specific dynamic buckets based on position in sequence
      if (isInput) {
        return { index: 0, name: "Catchment & Terrain" };
      }
      const nonInputs = sortedNodes.filter(n => n.type !== "INPUT");
      const idx = nonInputs.indexOf(node);
      const count = nonInputs.length;
      
      if (idx < count * 0.35) {
        return { index: 1, name: "Unit Hydrograph" };
      }
      if (idx < count * 0.65) {
        return { index: 2, name: "Storm & PMP" };
      }
      if (idx < count * 0.85) {
        return { index: 3, name: "Rainfall Excess" };
      }
      return { index: 4, name: "Final PMF" };
    }

    // Generic fallback for other domains
    if (isInput) {
      return { index: 0, name: "Inputs & Parameters" };
    }
    const nonInputs = sortedNodes.filter(n => n.type !== "INPUT");
    const idx = nonInputs.indexOf(node);
    const count = nonInputs.length;
    
    if (idx < count * 0.35) {
      return { index: 1, name: "Primary Derivations" };
    }
    if (idx < count * 0.70) {
      return { index: 2, name: "Core Calculations" };
    }
    if (idx < count * 0.90) {
      return { index: 3, name: "Simulation Models" };
    }
    return { index: 4, name: "Final Synthesis" };
  };

  // Group sorted nodes into stages
  const stagesMap: Record<number, { name: string; nodes: any[] }> = {};
  sortedNodes.forEach((node, idx) => {
    const sInfo = getStageInfo(node, idx);
    if (!stagesMap[sInfo.index]) {
      stagesMap[sInfo.index] = { name: sInfo.name, nodes: [] };
    }
    stagesMap[sInfo.index].nodes.push(node);
  });

  const stagesList = Object.keys(stagesMap)
    .map(Number)
    .sort((a, b) => a - b)
    .map(key => ({
      index: key,
      name: stagesMap[key].name,
      nodes: stagesMap[key].nodes,
    }));

  // Determine stage status
  const stagesWithStatus = stagesList.map((stage, idx) => {
    const total = stage.nodes.length;
    const completed = stage.nodes.filter(n => exec.nodeOutputs[n.id]).length;
    const hasActiveNode = stage.nodes.some(n => n.id === exec.currentNodeId);
    
    let status: "done" | "active" | "locked" = "locked";
    if (completed === total && total > 0) {
      status = "done";
    } else if (hasActiveNode || completed > 0 || idx === 0) {
      status = "active";
    }

    return {
      ...stage,
      total,
      completed,
      status,
    };
  });

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !isNodeExpanded(nodeId),
    }));
  };

  const isNodeExpanded = (nodeId: string) => {
    if (expandedNodes[nodeId] !== undefined) return expandedNodes[nodeId];
    // Default expanded for nodes yielding lists (tables) or plot data (charts)
    const completedOutput = exec.nodeOutputs[nodeId];
    if (!completedOutput) return false;
    const keys = Object.keys(completedOutput.outputs || {});
    const hasTable = keys.some(k => Array.isArray(completedOutput.outputs[k]) && completedOutput.outputs[k].length > 0 && typeof completedOutput.outputs[k][0] === "object");
    const hasChart = keys.some(k => k.includes("time") || k.includes("hour")) && keys.some(k => k.includes("ordinate") || k.includes("flow") || k.includes("discharge"));
    return hasTable || hasChart;
  };

  const scrollToStage = (stageIndex: number) => {
    const el = document.getElementById(`stage-header-${stageIndex}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Determine final outcome summary for the Hero banner
  const getFinalOutcome = () => {
    if (sortedNodes.length === 0) return null;
    
    // 1. Inspect output of the final node in topological order
    const lastNode = sortedNodes[sortedNodes.length - 1];
    const completedOutput = exec.nodeOutputs[lastNode.id];
    if (completedOutput && completedOutput.outputs) {
      const keys = Object.keys(completedOutput.outputs);
      const primaryKey = keys.find(k => typeof completedOutput.outputs[k] === "number") || keys[0];
      const val = completedOutput.outputs[primaryKey];
      const unit = lastNode.config?.result_unit ?? lastNode.config?.unit ?? "";
      return {
        label: lastNode.label || "Final Result",
        value: typeof val === "number" ? val : null,
        unit: unit,
      };
    }
    
    // 2. Fallback: search variables map for key metrics
    const keys = Object.keys(exec.variables);
    const peakKey = keys.find(k => k.includes("pmf_peak") || k.includes("peak") || k.includes("max_flow") || k === "Qp");
    if (peakKey && typeof exec.variables[peakKey] === "number") {
      return {
        label: peakKey.replace(/_/g, " ").toUpperCase(),
        value: exec.variables[peakKey] as number,
        unit: "cumec",
      };
    }
    
    return null;
  };

  return (
    <div className="flex h-full w-[800px] flex-row border-l border-neutral-200 bg-white overflow-hidden shadow-2xl z-[9999] font-sans">
      
      {/* ================= LEFT: STAGE NAVIGATOR ================= */}
      <aside className="w-60 flex-shrink-0 bg-neutral-50 border-r border-neutral-200 flex flex-col h-full overflow-y-auto">
        <div className="flex items-center gap-2.5 p-4 border-b border-neutral-200">
          <div className="w-7 h-7 bg-blue-600 text-white rounded font-bold flex items-center justify-center text-sm shadow-sm">
            F
          </div>
          <div>
            <div className="font-semibold text-xs text-neutral-800 leading-none">Floodrix</div>
            <div className="text-[9px] text-neutral-400 uppercase tracking-widest mt-1">Workflow Runner</div>
          </div>
        </div>

        <div className="p-4 border-b border-neutral-200">
          <div className="text-xs font-bold text-neutral-800 leading-tight mb-2">
            {workflow?.name ?? "Calculation Workflow"}
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span>{totalNodes} nodes</span>
            <span className="bg-amber-100/70 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold tracking-wide uppercase text-[8.5px]">
              {workflow?.status ?? "DRAFT"}
            </span>
          </div>
          <div className="h-1 bg-neutral-200 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-1.5">
            {completedNodesCount} / {totalNodes} complete
          </div>
        </div>

        <div className="p-3 space-y-0.5 flex-1">
          {stagesWithStatus.map((stage, idx) => (
            <div key={stage.index} className="flex flex-col">
              <div
                className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer hover:bg-neutral-200/60 transition-colors group ${
                  stage.status === "locked" ? "opacity-40" : ""
                } ${stage.status === "active" ? "bg-blue-50/50 border-l-2 border-blue-600 rounded-l-none pl-1.5" : ""}`}
                onClick={() => stage.status !== "locked" && scrollToStage(stage.index)}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all shrink-0 ${
                    stage.status === "done"
                      ? "bg-emerald-600 text-white"
                      : stage.status === "active"
                      ? "bg-blue-600 text-white shadow-[0_0_0_2px_rgba(37,99,235,0.2)]"
                      : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                  }`}
                >
                  {stage.status === "done" ? "✓" : stage.status === "active" ? "●" : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold truncate transition-colors ${
                    stage.status === "active" ? "text-blue-900" : "text-neutral-700 group-hover:text-neutral-900"
                  }`}>
                    {stage.name}
                  </div>
                  <div className="text-[9.5px] text-neutral-400 font-mono">
                    {stage.status === "locked"
                      ? "locked"
                      : `${stage.completed} / ${stage.total} run`}
                  </div>
                </div>
              </div>
              {idx < stagesWithStatus.length - 1 && (
                <div className="w-px h-2.5 bg-neutral-200 ml-4 my-0.5" />
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* ================= RIGHT: TIMELINE & AUDIT ================= */}
      <main className="flex-1 flex flex-col h-full bg-neutral-50/50">
        
        {/* Topbar */}
        <div className="flex items-center justify-between p-3 px-5 border-b border-neutral-200 bg-white/95 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="text-[11px] text-neutral-500 font-mono truncate max-w-[280px]">
            Calculations / {workflow?.category !== "Hydrology" ? workflow?.category ?? "General" : "Hydrology"} / <b className="text-neutral-800">{workflow?.name ?? "Workflow"}</b>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-sm"
              onClick={() => setReportOpen(true)}
            >
              <FileText className="h-3.5 w-3.5 mr-1 text-neutral-550" /> Report
            </Button>
            
            {exec.isComplete ? (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs text-neutral-700 hover:bg-neutral-50"
                onClick={() => {
                  exec.reset();
                  setAutoStarted(false);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1 text-neutral-500" /> Re-run
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                  disabled={
                    exec.isRunning ||
                    exec.isStarting ||
                    exec.isStepping ||
                    exec.isInputPause ||
                    exec.isValidationPause
                  }
                  onClick={() => {
                    if (exec.isStepPause) {
                      exec.stepForward();
                    } else {
                      exec.startRun({ stepMode: true });
                    }
                  }}
                >
                  <ChevronRight className="h-3 w-3 mr-0.5" /> Step Run
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm"
                  disabled={exec.isRunning || exec.isStarting}
                  onClick={() => exec.startRun({ stepMode: false })}
                >
                  {exec.isRunning || exec.isStarting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Running
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-1 fill-current" /> Run All
                    </>
                  )}
                </Button>
              </>
            )}
            
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-md border-0 ml-1"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-5 flex-1 overflow-y-auto min-h-0 space-y-6">
          {stagesWithStatus.map((stage) => {
            if (stage.nodes.length === 0) return null;
            
            return (
              <div key={stage.index} className="space-y-3">
                <div className="flex items-baseline justify-between mt-2" id={`stage-header-${stage.index}`}>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">
                    {stage.index + 1} · {stage.name}
                  </h2>
                  <span className="text-[10px] text-neutral-400 font-mono">{stage.nodes.length} nodes</span>
                </div>
                
                <div className="relative pl-5 border-l border-neutral-200 ml-2 space-y-3 py-1">
                  {stage.nodes.map((node) => {
                    const completedOutput = exec.nodeOutputs[node.id];
                    const isActive = exec.currentNodeId === node.id;
                    const isLocked = !completedOutput && !isActive;
                    
                    // Dot status styling
                    let dotBg = "bg-neutral-100 text-neutral-400 border border-neutral-200";
                    let dotNode: React.ReactNode = <Lock className="h-2 w-2" />;
                    
                    if (completedOutput) {
                      dotBg = "bg-emerald-600 text-white";
                      dotNode = <span className="text-[8px]">✓</span>;
                    } else if (isActive) {
                      dotBg = "bg-blue-600 text-white shadow-[0_0_0_2.5px_rgba(37,99,235,0.2)]";
                      dotNode = <span className="text-[6px]">●</span>;
                    }
                    
                    const badge = getNodeTypeBadge(node.type);
                    
                    return (
                      <div key={node.id} className="relative">
                        {/* Inline Dot marker */}
                        <div className={`absolute -left-[29px] top-2.5 w-4 h-4 rounded-full flex items-center justify-center font-bold z-10 ${dotBg}`}>
                          {dotNode}
                        </div>
                        
                        {/* Node Card */}
                        <div
                          className={`rounded-lg bg-white border shadow-sm transition-all overflow-hidden ${
                            isLocked
                              ? "bg-neutral-50/30 border-neutral-200/60 border-dashed"
                              : isActive
                              ? "border-blue-500 shadow-md ring-1 ring-blue-500/10"
                              : "border-neutral-200/80 hover:border-neutral-300/90"
                          }`}
                        >
                          {/* ─── CASE 1: Node is COMPLETED ─── */}
                          {completedOutput && (
                            <div>
                              <div className="flex items-center gap-3.5 p-3 px-4">
                                <span className={`font-mono text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 ${badge.className}`}>
                                  {badge.label}
                                </span>
                                
                                <span className="text-xs font-semibold text-neutral-800 flex-1 truncate">
                                  {node.label}
                                </span>
                                
                                <span className="font-mono text-[11px] text-neutral-400 truncate max-w-[200px]">
                                  {getExpressionText(node, completedOutput, exec.variables)}
                                </span>
                                
                                <span className="font-mono text-xs font-bold text-neutral-800 shrink-0 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
                                  {getOutputValuePreview(node, completedOutput)}
                                </span>
                                
                                <span
                                  className="text-neutral-400 hover:text-neutral-600 cursor-pointer p-0.5 shrink-0"
                                  onClick={() => toggleExpand(node.id)}
                                >
                                  {isNodeExpanded(node.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </span>
                              </div>
                              
                              {/* Collapse body detail */}
                              {isNodeExpanded(node.id) && (
                                <DynamicVisualizer
                                  node={node}
                                  completedOutput={completedOutput}
                                  variables={exec.variables}
                                />
                              )}
                            </div>
                          )}

                          {/* ─── CASE 2: Node is ACTIVE & AWAITING INPUT ─── */}
                          {isActive && exec.isInputPause && exec.pausedNode && (
                            <InputForm
                              pausedNode={exec.pausedNode}
                              isSubmitting={exec.isSubmitting}
                              onSubmit={exec.submitInput}
                            />
                          )}

                          {/* ─── CASE 3: Node is ACTIVE & WAITING STEP MODE ─── */}
                          {isActive && exec.isStepPause && exec.stepOutput && (
                            <StepPauseForm
                              stepOutput={exec.stepOutput}
                              isStepping={exec.isStepping}
                              onNext={exec.stepForward}
                            />
                          )}

                          {/* ─── CASE 4: Node is ACTIVE & RUNNING (NO PAUSE) ─── */}
                          {isActive && !exec.isInputPause && !exec.isStepPause && !exec.isValidationPause && (
                            <div className="p-3.5 px-4 flex items-center justify-between bg-white">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                <span className="text-xs font-medium text-neutral-500">
                                  Running computation...
                                </span>
                              </div>
                              <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 uppercase">
                                RUNNING
                              </span>
                            </div>
                          )}

                          {/* ─── CASE 5: Node is ACTIVE & VALIDATION ERROR ─── */}
                          {isActive && exec.isValidationPause && (
                            <div className="p-4 bg-amber-50/40">
                              <div className="flex items-start gap-2.5">
                                <AlertTriangle className="h-4.5 w-4.5 text-amber-600 mt-0.5" />
                                <div className="flex-1">
                                  <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                                    Validation Failed
                                  </div>
                                  <div className="mt-1 text-xs text-neutral-700 leading-normal">
                                    {exec.error ?? "Invalid input criteria detected."}
                                  </div>
                                </div>
                              </div>
                              <Button
                                className="w-full bg-neutral-900 text-white font-bold text-xs p-2.5 hover:bg-neutral-800 transition-colors mt-3"
                                onClick={exec.cancel}
                              >
                                Cancel Run
                              </Button>
                            </div>
                          )}

                          {/* ─── CASE 6: Node is LOCKED ─── */}
                          {isLocked && (
                            <div className="flex items-center gap-3 p-3 px-4 text-neutral-400 bg-neutral-50/30">
                              <span className="text-xs">🔒</span>
                              <span className="text-xs font-medium">{node.label}</span>
                              <span className="text-[10px] font-mono text-neutral-400/80 ml-auto">
                                waiting on {getWaitingDependencyLabel(node, canvasData?.edges, canvasData?.nodes)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Errored Execution banner */}
          {exec.isErrored && (
            <div className="border border-red-200 bg-red-50/40 p-4 rounded-lg space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-red-800">
                    Execution Interrupted
                  </div>
                  <div className="mt-1 text-xs font-mono text-neutral-800 bg-white p-2 rounded border border-red-100/60 leading-normal">
                    {exec.error ?? "Aborted due to process error."}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
                  onClick={exec.cancel}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-red-800 hover:bg-red-900 text-white"
                  onClick={() => {
                    exec.reset();
                    setAutoStarted(false);
                  }}
                >
                  Retry Run
                </Button>
              </div>
            </div>
          )}

          {/* Outcome Hero summary card */}
          {(() => {
            const outcome = getFinalOutcome();
            return (
              <div className="bg-neutral-900 rounded-lg p-5 px-6 flex items-center justify-between gap-4 mt-6 shadow-md border border-neutral-950">
                <div>
                  <div className="text-[9px] tracking-widest uppercase text-neutral-400 font-bold mb-1.5 font-mono">
                    {exec.isComplete
                      ? `${outcome?.label ?? "Calculation Outcome"} — complete`
                      : `${outcome?.label ?? "Calculation Outcome"} — pending`}
                  </div>
                  {exec.isComplete && outcome && typeof outcome.value === "number" ? (
                    <div className="text-2xl font-bold font-mono text-neutral-100 leading-none">
                      {outcome.value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {outcome.unit && (
                        <span className="text-xs font-bold text-blue-400 uppercase ml-2">{outcome.unit}</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-2xl font-bold font-mono text-neutral-500 leading-none">
                      —
                    </div>
                  )}
                  <div className="text-[10px] text-neutral-400 font-mono mt-2">
                    {exec.isComplete
                      ? "All calculations complete. Visual report generated."
                      : "Resolves once all required steps and calculations are complete."}
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-950 text-[10px] font-mono text-neutral-300 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${exec.isComplete ? "bg-emerald-500" : "bg-neutral-500"}`} />
                  {completedNodesCount} / {totalNodes} nodes run
                </div>
              </div>
            );
          })()}
        </div>
        
      </main>

      <WorkflowReport
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        workflowId={workflowId}
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

// ─── HELPER COMPONENT: Active Node Input form ───
function InputForm({
  pausedNode,
  isSubmitting,
  onSubmit,
}: {
  pausedNode: { nodeId: string; nodeLabel: string; fields: any[]; message?: string };
  isSubmitting: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [values, setValues] = useState<Record<string, any>>({});

  const handleSelectOption = (key: string, optionVal: any) => {
    setValues(prev => ({
      ...prev,
      [key]: optionVal,
    }));
  };

  const handleTextChange = (key: string, type: string, textVal: string) => {
    const val = type === "number" ? (textVal === "" ? "" : Number(textVal)) : textVal;
    setValues(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleFormSubmit = () => {
    const submitValues: Record<string, any> = {};
    pausedNode.fields.forEach(f => {
      const current = values[f.key];
      submitValues[f.key] = current !== undefined ? current : f.default;
    });
    onSubmit(submitValues);
  };

  return (
    <div>
      <div className="p-3.5 px-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/20">
        <div>
          <div className="text-xs font-bold text-neutral-800">{pausedNode.nodeLabel}</div>
          <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider mt-0.5">Input parameters</div>
        </div>
        <span className="text-[10px] font-bold font-mono tracking-wide px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 uppercase">
          Awaiting Input
        </span>
      </div>
      
      <div className="p-4 space-y-3.5 bg-white">
        {pausedNode.fields.map((f) => {
          const hasMCQ = Array.isArray(f.mcq_options) && f.mcq_options.length > 0;
          const currentVal = values[f.key] !== undefined ? values[f.key] : f.default;
          
          return (
            <div key={f.key} className="space-y-1.5">
              <label className="block text-[11px] font-mono font-medium text-neutral-500">
                {f.label} {f.unit && f.unit !== "—" ? `(${f.unit})` : ""}
              </label>
              
              {hasMCQ ? (
                <div className="flex flex-wrap gap-2">
                  {f.mcq_options.map((opt: any) => {
                    const isSelected = String(currentVal) === String(opt.label);
                    return (
                      <div
                        key={opt.label}
                        className={`flex-1 min-w-[70px] text-center p-2 rounded border text-xs font-semibold font-mono hover:bg-neutral-50 transition-colors cursor-pointer select-none ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/60 text-blue-700"
                            : "border-neutral-200 text-neutral-600 bg-white"
                        }`}
                        onClick={() => {
                          const parsed = f.data_type === "number" ? Number(opt.label) : opt.label;
                          handleSelectOption(f.key, parsed);
                        }}
                      >
                        {opt.label} {f.unit && f.unit !== "—" ? f.unit : ""}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <input
                  type={f.data_type === "number" ? "number" : "text"}
                  className="w-full rounded border border-neutral-200 bg-white p-2.5 text-xs font-semibold font-mono text-neutral-800 focus:outline-none focus:border-blue-500 transition-colors"
                  value={currentVal !== undefined ? String(currentVal) : ""}
                  onChange={(e) => handleTextChange(f.key, f.data_type, e.target.value)}
                  placeholder={f.default !== undefined ? String(f.default) : ""}
                />
              )}
              {f.hint && <p className="text-[10px] text-neutral-400 mt-1 leading-normal">{f.hint}</p>}
            </div>
          );
        })}
        
        <Button
          className="w-full bg-neutral-900 text-white font-bold text-xs p-3 hover:bg-neutral-800 transition-colors mt-2"
          disabled={isSubmitting}
          onClick={handleFormSubmit}
        >
          {isSubmitting ? "PROCESSING..." : "CONTINUE →"}
        </Button>
      </div>
    </div>
  );
}

// ─── HELPER COMPONENT: Step Pause form ───
function StepPauseForm({
  stepOutput,
  isStepping,
  onNext,
}: {
  stepOutput: {
    nodeLabel: string;
    nodeType: string;
    outputs: Record<string, unknown>;
    result: Record<string, unknown>;
    stepNumber: number;
    totalSteps: number;
  };
  isStepping: boolean;
  onNext: () => void;
}) {
  return (
    <div>
      <div className="p-3.5 px-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/20">
        <div>
          <div className="text-xs font-bold text-neutral-800">{stepOutput.nodeLabel}</div>
          <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider mt-0.5">
            Step {stepOutput.stepNumber + 1} of {stepOutput.totalSteps || "?"} · {stepOutput.nodeType}
          </div>
        </div>
        <span className="text-[10px] font-bold font-mono tracking-wide px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 uppercase">
          Step Done
        </span>
      </div>
      
      <div className="p-4 space-y-4 bg-white">
        {Object.keys(stepOutput.outputs).length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
              Outputs Resolved:
            </div>
            <div className="space-y-1">
              {Object.entries(stepOutput.outputs).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between text-xs rounded border border-neutral-200 bg-neutral-50/30 p-2"
                >
                  <span className="font-mono text-neutral-500">{k}</span>
                  <span className="font-mono font-bold text-neutral-800">
                    {typeof v === "number"
                      ? Number(v).toLocaleString(undefined, { maximumFractionDigits: 3 })
                      : typeof v === "object"
                      ? "Array dataset"
                      : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(stepOutput.result as any)?.markdown && (
          <div className="space-y-1.5">
            <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
              Calculation logs:
            </div>
            <div className="rounded border border-neutral-200 bg-neutral-50/20 p-3 text-xs text-neutral-700 max-h-[150px] overflow-y-auto leading-relaxed">
              <MarkdownContent content={String((stepOutput.result as any).markdown)} />
            </div>
          </div>
        )}

        <Button
          className="w-full bg-neutral-900 text-white font-bold text-xs p-3 hover:bg-neutral-800 transition-colors"
          disabled={isStepping}
          onClick={onNext}
        >
          {isStepping ? "STEPPING..." : "CONTINUE →"}
        </Button>
      </div>
    </div>
  );
}

// ─── HELPER COMPONENT: Dynamic visual routing (table, chart, markdown logs) ───
function DynamicVisualizer({
  node,
  completedOutput,
  variables,
}: {
  node: any;
  completedOutput: any;
  variables: Record<string, any>;
}) {
  const outputs = completedOutput.outputs || {};
  const keys = Object.keys(outputs);

  // 1. Check if we have coordinate data containing a stream profile coords array
  const streamProfile = outputs.stream_profile || variables.stream_profile;
  if (
    Array.isArray(streamProfile) &&
    streamProfile.length > 0 &&
    typeof streamProfile[0] === "object" &&
    "chainage" in streamProfile[0] &&
    "rl" in streamProfile[0]
  ) {
    return <SlopeProfileTable profile={streamProfile} />;
  }

  // 2. Check for chartable dataset coordinates (e.g. times vs flow/ordinates/excess)
  const xKey = keys.find(k => k.includes("time") || k.includes("hour") || k.includes("instant") || k === "x");
  const yKey = keys.find(
    k =>
      k.includes("ordinate") ||
      k.includes("flow") ||
      k.includes("discharge") ||
      k.includes("pmf") ||
      k.includes("drh") ||
      k.includes("rainfall") ||
      k.includes("excess") ||
      k === "y"
  );

  if (xKey && yKey) {
    const xArr = outputs[xKey];
    const yArr = outputs[yKey];
    if (Array.isArray(xArr) && Array.isArray(yArr) && xArr.length > 0 && xArr.length === yArr.length) {
      return (
        <div className="space-y-1.5 p-3 px-4 border-t border-neutral-100 bg-[#FDFDFB]">
          <div className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider font-mono">
            {yKey.replace(/_/g, " ")} vs {xKey.replace(/_/g, " ")}:
          </div>
          <DynamicChart xValues={xArr} yValues={yArr} />
        </div>
      );
    }
  }

  // 3. Check for any other array-of-objects to display in a dynamic grid table
  const tableKey = keys.find(k => Array.isArray(outputs[k]) && outputs[k].length > 0 && typeof outputs[k][0] === "object");
  if (tableKey) {
    return (
      <div className="space-y-1.5 p-1 border-t border-neutral-200/50 bg-neutral-50/10">
        <div className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wider font-mono p-2 px-3">
          {tableKey.replace(/_/g, " ")}:
        </div>
        <DynamicTableView data={outputs[tableKey]} />
      </div>
    );
  }

  // 4. Default fallback: calculations log
  if (completedOutput.result?.markdown) {
    return (
      <div className="border-t border-neutral-100 p-3 px-4 text-[11.5px] bg-neutral-50/20 text-neutral-700 max-h-56 overflow-y-auto leading-relaxed">
        <MarkdownContent content={String(completedOutput.result.markdown)} />
      </div>
    );
  }

  return null;
}

// ─── HELPER COMPONENT: Slope Profile Table ───
function SlopeProfileTable({ profile }: { profile: any[] }) {
  const lastRl = profile[profile.length - 1].rl;
  const rows: Array<{ chainage: number; rl: number; segment: number; weighted: number }> = [];
  
  for (let i = 1; i < profile.length; i++) {
    const Li = profile[i].chainage - profile[i - 1].chainage;
    const Di_prev = profile[i - 1].rl - lastRl;
    const Di = profile[i].rl - lastRl;
    const weighted = Li * (Di_prev + Di);
    
    rows.push({
      chainage: profile[i].chainage,
      rl: profile[i].rl,
      segment: Li,
      weighted,
    });
  }

  const maxRowsToShow = 4;
  const showMore = rows.length > maxRowsToShow;
  const displayedRows = showMore ? rows.slice(0, maxRowsToShow) : rows;
  const remainingCount = rows.length - maxRowsToShow;

  return (
    <div className="max-h-44 overflow-y-auto border-t border-neutral-100 bg-neutral-50/10">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky top-0 bg-white text-left text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider p-2 px-4 border-b border-neutral-200">Chainage (km)</th>
            <th className="sticky top-0 bg-white text-right text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider p-2 px-4 border-b border-neutral-200">RL (m)</th>
            <th className="sticky top-0 bg-white text-right text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider p-2 px-4 border-b border-neutral-200">Segment (Li)</th>
            <th className="sticky top-0 bg-white text-right text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider p-2 px-4 border-b border-neutral-200">Weighted</th>
          </tr>
        </thead>
        <tbody>
          {displayedRows.map((row, idx) => (
            <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50/50">
              <td className="p-2 px-4 text-xs font-mono text-neutral-500 text-left">{row.chainage.toFixed(3)}</td>
              <td className="p-2 px-4 text-xs font-mono text-neutral-700 text-right">{row.rl.toFixed(2)}</td>
              <td className="p-2 px-4 text-xs font-mono text-neutral-700 text-right">{row.segment.toFixed(3)}</td>
              <td className="p-2 px-4 text-xs font-mono text-neutral-700 text-right">{row.weighted.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            </tr>
          ))}
          {showMore && (
            <tr className="border-b border-neutral-100">
              <td className="p-2 px-4 text-xs font-mono text-neutral-400 text-left">... {remainingCount} more rows</td>
              <td className="p-2 px-4 text-xs font-mono text-neutral-400 text-right">—</td>
              <td className="p-2 px-4 text-xs font-mono text-neutral-400 text-right">—</td>
              <td className="p-2 px-4 text-xs font-mono text-neutral-400 text-right">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── HELPER COMPONENT: Dynamic coordinates table ───
function DynamicTableView({ data }: { data: any[] }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const headers = Object.keys(data[0]);
  
  const maxRows = 5;
  const displayRows = data.slice(0, maxRows);
  const remaining = data.length - maxRows;

  return (
    <div className="max-h-48 overflow-y-auto border-t border-neutral-100 bg-neutral-50/10">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h} className="sticky top-0 bg-white text-left text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wider p-2 px-4 border-b border-neutral-200">
                {h.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, idx) => (
            <tr key={idx} className="border-b border-neutral-100 hover:bg-neutral-50/50">
              {headers.map(h => {
                const val = row[h];
                const isNum = typeof val === "number";
                return (
                  <td key={h} className={`p-2 px-4 text-xs font-mono text-left ${isNum ? "text-neutral-700 font-bold" : "text-neutral-550"}`}>
                    {isNum ? val.toLocaleString(undefined, { maximumFractionDigits: 3 }) : String(val)}
                  </td>
                );
              })}
            </tr>
          ))}
          {remaining > 0 && (
            <tr className="border-b border-neutral-100">
              <td colSpan={headers.length} className="p-2 px-4 text-xs font-mono text-neutral-400 text-left">
                ... {remaining} more rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── HELPER COMPONENT: Dynamic line chart ───
function DynamicChart({ xValues, yValues }: { xValues: number[]; yValues: number[] }) {
  const maxX = Math.max(...xValues, 1);
  const maxY = Math.max(...yValues, 1);

  // SVG grid config
  const svgW = 700;
  const svgH = 160;
  const padX = 15;
  const padY = 15;

  const pointsArr: string[] = [];
  xValues.forEach((xVal, idx) => {
    const x = padX + (xVal / maxX) * (svgW - padX * 2);
    const y = svgH - padY - (yValues[idx] / maxY) * (svgH - padY * 2);
    pointsArr.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });

  const linePoints = pointsArr.join(" ");
  const fillPoints = `${padX},${svgH - padY} ${linePoints} ${svgW - padX},${svgH - padY}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${svgW} ${svgH}`} xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
        {/* Grids */}
        <line x1={padX} y1={svgH - padY} x2={svgW - padX} y2={svgH - padY} stroke="#f0f0f0" strokeWidth="1" />
        <line x1={padX} y1={padY} x2={padX} y2={svgH - padY} stroke="#f0f0f0" strokeWidth="1" />
        
        {/* Fill color area */}
        <polyline
          points={fillPoints}
          fill="#3b82f6"
          opacity="0.08"
          stroke="none"
        />
        {/* Line path */}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
}

// ─── TIMELINE ROW HELPERS ───
function getExpressionText(node: any, completedOutput: any, variables: Record<string, any>): string {
  if (node.type === "FORMULA") {
    const expr =
      completedOutput.result?.displayExpression ||
      completedOutput.result?.expression ||
      node.config?.display_expression ||
      node.config?.expression;
    if (expr) return expr;
  }
  
  // List outputs dynamically for input or lookup nodes
  const entries = Object.entries(completedOutput.outputs || {});
  if (entries.length > 0) {
    const isSingleNum = entries.length === 1 && typeof entries[0][1] === "number";
    if (isSingleNum) {
      return node.description || "";
    }
    
    return entries
      .filter(([_, v]) => typeof v === "number" || typeof v === "string" || typeof v === "boolean")
      .map(([k, v]) => {
        const formattedVal = typeof v === "number"
          ? v.toLocaleString(undefined, { maximumFractionDigits: 3 })
          : String(v);
        return `${k}=${formattedVal}`;
      })
      .join(" · ");
  }

  return node.description ?? "";
}

function getOutputValuePreview(node: any, completedOutput: any): React.ReactNode {
  const outputs = completedOutput.outputs || {};
  const keys = Object.keys(outputs);
  
  if (keys.length === 0) return null;
  
  // Check if it's table data
  const hasTable = keys.some(k => Array.isArray(outputs[k]) && outputs[k].length > 0 && typeof outputs[k][0] === "object");
  if (hasTable) {
    const tableKey = keys.find(k => Array.isArray(outputs[k]));
    const len = outputs[tableKey!].length;
    return (
      <span className="font-mono text-xs font-bold text-neutral-700">
        {len} rows
      </span>
    );
  }

  // Check if it is a coordinates chartable dataset
  const hasChart = keys.some(k => k.includes("time") || k.includes("hour"));
  if (hasChart && keys.some(k => k.includes("ordinate") || k.includes("flow") || k.includes("discharge"))) {
    const depthKey = keys.find(k => k.includes("depth") || k.includes("vol"));
    if (depthKey && typeof outputs[depthKey] === "number") {
      return (
        <span className="font-mono text-xs font-bold text-neutral-700">
          Vol {Number(outputs[depthKey]).toFixed(2)}
          <span className="text-[10px] text-neutral-450 font-normal ml-0.5">cm</span>
        </span>
      );
    }
    return <span className="text-[11px] font-mono text-neutral-400">dataset</span>;
  }
  
  // Primary output preview
  const primaryKey = keys.find(k => typeof outputs[k] === "number") || keys[0];
  const val = outputs[primaryKey];
  
  if (typeof val === "number") {
    const formatted = val.toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
    
    const unit = node.config?.result_unit ?? node.config?.unit ?? completedOutput.result?.unit ?? "";
    return (
      <span className="font-mono text-xs font-bold text-neutral-700">
        {formatted}
        {unit && <span className="text-[10px] text-neutral-400 font-normal ml-0.5">{unit}</span>}
      </span>
    );
  }
  
  if (typeof val === "boolean") {
    return <span className="font-mono text-xs font-bold text-[#1d4e89]">{val ? "TRUE" : "FALSE"}</span>;
  }
  
  if (typeof val === "string") {
    return <span className="font-mono text-xs font-bold text-neutral-700 truncate max-w-[80px]">{val}</span>;
  }
  
  return <span className="text-[11px] font-mono text-neutral-400">computed</span>;
}

function getWaitingDependencyLabel(node: any, edges?: any[], nodes?: any[]): string {
  if (!edges || !nodes) return "dependencies";
  
  const incoming = edges.filter((e: any) => e.targetNodeId === node.id);
  if (incoming.length === 0) return "previous step";
  
  const parentIds = incoming.map((e: any) => e.sourceNodeId);
  const parentNode = nodes.find(n => parentIds.includes(n.id));
  return parentNode ? parentNode.label : "previous step";
}
