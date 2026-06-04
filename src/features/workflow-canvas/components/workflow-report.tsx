"use client";

import React from "react";
import {
  FileDown,
  Printer,
  X,
  FileText,
  Calendar,
  Layers,
  MapPin,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MarkdownContent from "@/web/components/MarkdownContent";

interface VariableInfo {
  key: string;
  value: any;
  label?: string;
  unit?: string;
}

interface WorkflowReportProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  workflowDescription?: string;
  workflowRef?: string;
  workflowRegion?: string;
  variables: Record<string, any>;
  nodeExecutions: any[];
}

export function WorkflowReport({
  isOpen,
  onClose,
  workflowName,
  workflowDescription,
  workflowRef,
  workflowRegion,
  variables,
  nodeExecutions,
}: WorkflowReportProps) {
  if (!isOpen) return null;

  // Format date helper
  const currentDate = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Extract input/output variables (filtering out internal system keys starting with $)
  const visibleVariables = Object.entries(variables).filter(
    ([k]) => !k.startsWith("$")
  );

  // Compile sequential markdown steps
  const markdownSteps = nodeExecutions
    .filter((exec) => exec.result?.markdown)
    .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0));

  // Trigger print dialog
  const handlePrint = () => {
    window.print();
  };

  // Compile Markdown report for download
  const handleDownloadMarkdown = () => {
    let md = `# Calculation Report: ${workflowName}\n\n`;
    if (workflowDescription) {
      md += `*Description:* ${workflowDescription}\n\n`;
    }
    md += `## Metadata\n`;
    md += `- **Date/Time:** ${currentDate}\n`;
    if (workflowRef) md += `- **Reference Standard:** ${workflowRef}\n`;
    if (workflowRegion) md += `- **Geographic Region:** ${workflowRegion}\n`;
    md += `\n`;

    md += `## 1.0 Resolved Variables\n\n`;
    md += `| Variable | Value | Description |\n`;
    md += `| :--- | :--- | :--- |\n`;

    visibleVariables.forEach(([k, v]) => {
      const val = typeof v === "number" ? v.toLocaleString() : String(v);
      md += `| \`${k}\` | **${val}** | - |\n`;
    });
    md += `\n`;

    md += `## 2.0 Calculation Methodology & Proof\n\n`;
    markdownSteps.forEach((step, idx) => {
      const stepTitle = step.nodeLabel || `Step ${idx + 1}`;
      md += `### 2.${idx + 1} ${stepTitle} (${step.nodeType || "Calculation"})\n\n`;
      md += `${step.result.markdown}\n\n`;
    });

    md += `---\n*Report generated automatically by Floodrix Workflow Engine.*`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflowName.toLowerCase().replace(/\s+/g, "_")}_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/40 backdrop-blur-xs">
      {/* Print styles injection to selectively print only the report card container */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #print-report-container, #print-report-container * {
              visibility: visible;
            }
            #print-report-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `
      }} />

      {/* ── Toolbar / Header (Sticky & non-printable) ── */}
      <div className="no-print flex items-center justify-between border-b bg-white px-6 py-4 shadow-xs">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-[#fb3640]" />
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Calculation Report Preview
            </h2>
            <p className="text-[11px] text-neutral-400 font-medium">
              Verify document styling before downloading or printing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadMarkdown}
            className="h-9 gap-2 text-neutral-600 hover:text-neutral-900 font-semibold"
          >
            <FileDown className="h-4 w-4" />
            Download Markdown
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="h-9 gap-2 bg-[#fb3640] hover:bg-[#fb3640]/90 text-white font-semibold shadow-xs"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </Button>
          <div className="h-5 w-[1px] bg-neutral-200 mx-1" />
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-9 w-9 text-neutral-400 hover:text-neutral-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* ── Scrollable Document Pane ── */}
      <div className="flex-1 overflow-y-auto bg-neutral-100 p-6 md:p-12 print:bg-white print:p-0">
        <div
          id="print-report-container"
          className="mx-auto max-w-4xl bg-white border border-neutral-200/80 shadow-md rounded-2xl p-10 md:p-16 print:border-0 print:shadow-none print:p-0"
        >
          {/* Engineering Letterhead */}
          <div className="border-b-4 border-double border-neutral-800 pb-6 mb-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <p className="text-[10px] font-bold text-neutral-400 tracking-[0.25em] uppercase font-mono mb-1">
                  Civil Engineering Calculation Record
                </p>
                <h1 className="text-2xl font-serif font-black text-neutral-900 leading-tight">
                  {workflowName}
                </h1>
                {workflowDescription && (
                  <p className="text-xs text-neutral-500 font-sans italic mt-1 max-w-xl">
                    {workflowDescription}
                  </p>
                )}
              </div>
              <div className="sm:text-right font-mono text-[10px] text-neutral-400 space-y-1">
                <p className="flex items-center sm:justify-end gap-1.5 font-bold uppercase tracking-wider text-neutral-500">
                  <Calendar className="h-3 w-3" /> {currentDate}
                </p>
                {workflowRef && (
                  <p className="flex items-center sm:justify-end gap-1.5">
                    <Bookmark className="h-3 w-3" /> Code: {workflowRef}
                  </p>
                )}
                {workflowRegion && (
                  <p className="flex items-center sm:justify-end gap-1.5">
                    <MapPin className="h-3 w-3" /> Region: {workflowRegion}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: variables */}
          <div className="mb-10">
            <h2 className="text-sm font-bold text-[#fb3640] tracking-widest font-mono uppercase mb-4 pb-1 border-b border-neutral-100 flex items-center gap-2">
              <Layers className="h-4 w-4" /> 1.0 Executive Summary & Variables
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed mb-6 font-sans">
              The following values represent the inputs supplied to the workflow and the final outputs computed by the execution engine.
            </p>

            <div className="overflow-hidden border border-neutral-200/60 rounded-xl bg-neutral-50/50 shadow-xs mb-8">
              <table className="w-full text-left border-collapse text-xs font-sans">
                <thead>
                  <tr className="bg-neutral-100/80 border-b border-neutral-200">
                    <th className="px-6 py-3 font-mono font-bold uppercase tracking-widest text-neutral-400 text-[9px] w-1/3">
                      Variable Key
                    </th>
                    <th className="px-6 py-3 font-mono font-bold uppercase tracking-widest text-neutral-400 text-[9px] w-1/3">
                      Resolved Value
                    </th>
                    <th className="px-6 py-3 font-mono font-bold uppercase tracking-widest text-neutral-400 text-[9px] w-1/3">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {visibleVariables.map(([k, v]) => {
                    const isOutput = k === "Qd" || k.startsWith("Q_") || k.startsWith("P_") || k.startsWith("W_");
                    return (
                      <tr
                        key={k}
                        className={`hover:bg-neutral-50/50 transition-colors ${
                          isOutput ? "bg-emerald-50/20 font-semibold" : ""
                        }`}
                      >
                        <td className="px-6 py-3 font-mono text-neutral-600 font-medium">
                          {k}
                        </td>
                        <td className={`px-6 py-3 font-mono ${isOutput ? "text-emerald-700 font-bold" : "text-neutral-900"}`}>
                          {typeof v === "number"
                            ? v.toLocaleString(undefined, { maximumFractionDigits: 4 })
                            : String(v)}
                        </td>
                        <td className="px-6 py-3 font-mono text-neutral-400">
                          {isOutput && k === "Qd" ? "m³/s (Cumecs)" : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Substantiating Working */}
          {markdownSteps.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-[#fb3640] tracking-widest font-mono uppercase mb-4 pb-1 border-b border-neutral-100 flex items-center gap-2">
                <FileText className="h-4 w-4" /> 2.0 Substantiating Mathematical Working
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed mb-6 font-sans">
                The detailed mathematical proofs, variable substitutions, and steps executed during calculation are detailed below.
              </p>

              <div className="space-y-10">
                {markdownSteps.map((step, idx) => (
                  <div
                    key={step.nodeId}
                    className="border-l-2 border-neutral-200 pl-6 py-1"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-xs font-mono font-bold text-[#fb3640] uppercase tracking-wider">
                        2.{idx + 1} {step.nodeLabel || "Node Output"}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-neutral-400 px-2 py-0.5 bg-neutral-100 rounded-md">
                        {step.nodeType}
                      </span>
                    </div>

                    <div className="prose prose-sm font-serif max-w-none text-neutral-800 leading-relaxed">
                      <MarkdownContent content={step.result.markdown} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Verification Signature / Document Footer */}
          <div className="mt-16 pt-8 border-t border-neutral-200 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-8">
              <div>
                <div className="h-10 w-44 border-b border-neutral-300 mb-2 italic text-neutral-300 font-serif text-sm flex items-end pl-2 pb-1">
                  Engine Cryptographic Signature
                </div>
                <p className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                  Calculated Verification Sign-off
                </p>
              </div>
              <div className="sm:text-right">
                <p className="text-[9px] font-mono text-neutral-400 leading-relaxed">
                  Report generated by Floodrix Workflows.
                  <br />
                  Verified Session ID: <span className="font-bold">{nodeExecutions[0]?.sessionId || "N/A"}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
