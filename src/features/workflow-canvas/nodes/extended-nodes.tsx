// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/nodes/types/extended-nodes.tsx
//  P1 + P2 node types
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { memo } from "react";

import type { NodeProps } from "@xyflow/react";

import { BaseNode } from "@/components/react-flow/calculator/calc-base-node";
import {
  CodePreview,
  EmptyState,
  FieldRow,
  FormulaDisplay,
  ResultDisplay,
  SectionLabel,
  VariablePill,
} from "@/components/react-flow/calculator/calc-node-fields";

interface NodeData {
  label: string;
  description?: string;
  config: Record<string, unknown>;
  executionStatus?:
    | "pending"
    | "running"
    | "completed"
    | "errored"
    | "waiting"
    | "skipped";
  executionResult?: Record<string, unknown>;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
//  MULTI FORMULA NODE
//  Computes several expressions at once. Shows each formula + result.
// ═══════════════════════════════════════════════════════════════════════════

function MultiFormulaNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;
  const result = d.executionResult;

  const formulas = (config.formulas || []) as {
    expr: string;
    result_var: string;
    unit: string;
    label: string;
  }[];

  return (
    <BaseNode
      id={id}
      nodeType="MULTI_FORMULA"
      label={d.label || "Multi Formula"}
      subtitle={`${formulas.length} expression${formulas.length !== 1 ? "s" : ""}`}
      selected={selected}
      executionStatus={d.executionStatus}
    >
      {formulas.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {formulas.slice(0, 4).map((f, i) => (
            <div key={i}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 2,
                }}
              >
                {f.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FormulaDisplay expression={f.expr} compact />
                {result && result[f.result_var] !== undefined && (
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#059669",
                      flexShrink: 0,
                    }}
                  >
                    = {result[f.result_var] as number}
                    {f.unit && (
                      <span
                        style={{ fontSize: 9, color: "#94a3b8", marginLeft: 2 }}
                      >
                        {f.unit}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          ))}
          {formulas.length > 4 && (
            <div
              style={{ fontSize: 10, color: "#cbd5e1", textAlign: "center" }}
            >
              +{formulas.length - 4} more
            </div>
          )}
        </div>
      ) : (
        <EmptyState message="No formulas defined" action="Add formulas" />
      )}
    </BaseNode>
  );
}

export const MultiFormulaNode = memo(MultiFormulaNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  VALIDATION NODE
//  Checks constraints and warns or stops execution.
// ═══════════════════════════════════════════════════════════════════════════

function ValidationNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;
  const result = d.executionResult;

  const checks = (config.checks || []) as {
    expr: string;
    severity: string;
    message: string;
  }[];
  const onError = config.on_error as string | undefined;

  const checkResults = result?.checks as
    | { expr: string; passed: boolean; message: string }[]
    | undefined;

  return (
    <BaseNode
      id={id}
      nodeType="VALIDATION"
      label={d.label || "Validation"}
      subtitle={`${checks.length} check${checks.length !== 1 ? "s" : ""} · ${onError || "pause"} on error`}
      selected={selected}
      executionStatus={d.executionStatus}
    >
      {checks.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {checks.map((check, i) => {
            const cr = checkResults?.[i];
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  padding: "3px 6px",
                  borderRadius: 4,
                  backgroundColor: cr
                    ? cr.passed
                      ? "#f0fdf4"
                      : "#fef2f2"
                    : "#f8fafc",
                  border: `1px solid ${cr ? (cr.passed ? "#dcfce7" : "#fecaca") : "#f1f5f9"}`,
                  fontSize: 10,
                }}
              >
                <span style={{ flexShrink: 0, marginTop: 1 }}>
                  {cr
                    ? cr.passed
                      ? "✓"
                      : "✕"
                    : check.severity === "error"
                      ? "⊘"
                      : "⚠"}
                </span>
                <div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "#374151",
                      fontWeight: 500,
                      fontSize: 10,
                    }}
                  >
                    {check.expr}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: 10, marginTop: 1 }}>
                    {check.message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState message="No validation rules" action="Add checks" />
      )}
    </BaseNode>
  );
}

export const ValidationNode = memo(ValidationNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  UNIT CONVERSION NODE
//  Converts a value between unit systems.
// ═══════════════════════════════════════════════════════════════════════════

function UnitConversionNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;
  const result = d.executionResult;

  const inputVar = config.input_variable as string | undefined;
  const inputUnit = config.input_unit as string | undefined;
  const outputVar = config.output_variable as string | undefined;
  const outputUnit = config.output_unit as string | undefined;

  return (
    <BaseNode
      id={id}
      nodeType="UNIT_CONVERSION"
      label={d.label || "Unit Conversion"}
      selected={selected}
      executionStatus={d.executionStatus}
    >
      {inputVar && outputVar ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "4px 0",
          }}
        >
          <VariablePill name={inputVar} unit={inputUnit} />
          <span style={{ color: "#0891b2", fontSize: 16, fontWeight: 300 }}>
            →
          </span>
          <VariablePill name={outputVar} unit={outputUnit} />
        </div>
      ) : (
        <EmptyState message="Configure conversion" action="Set units" />
      )}

      {result?.result !== undefined && outputVar && (
        <ResultDisplay
          label={outputVar}
          value={result.result as number}
          unit={outputUnit}
          accent="#0891b2"
        />
      )}
    </BaseNode>
  );
}

export const UnitConversionNode = memo(UnitConversionNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  CUSTOM CODE NODE
//  Multi-line mathjs editor with variable context.
// ═══════════════════════════════════════════════════════════════════════════

function CustomCodeNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;
  const result = d.executionResult;

  const code = (config.code || "") as string;
  const outputVars = (config.output_variables || []) as string[];

  return (
    <BaseNode
      id={id}
      nodeType="CUSTOM_CODE"
      label={d.label || "Custom Code"}
      subtitle="mathjs"
      selected={selected}
      executionStatus={d.executionStatus}
      width={280}
    >
      {code ? (
        <>
          <CodePreview code={code} maxLines={4} />

          {outputVars.length > 0 && (
            <>
              <SectionLabel>Outputs</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {outputVars.map((v) => (
                  <VariablePill
                    key={v}
                    name={v}
                    value={
                      result?.outputs
                        ? (result.outputs as Record<string, number>)[v]
                        : undefined
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <EmptyState message="No code written" action="Open editor" />
      )}
    </BaseNode>
  );
}

export const CustomCodeNode = memo(CustomCodeNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  LOOP NODE
//  Iterates over dataset rows, executing child nodes per row.
// ═══════════════════════════════════════════════════════════════════════════

function LoopNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;

  const source = config.source as string | undefined;
  const iteratorVar = config.iterator_variable as string | undefined;
  const childNodes = (config.child_nodes || []) as string[];

  return (
    <BaseNode
      id={id}
      nodeType="LOOP"
      label={d.label || "Loop"}
      subtitle={
        source === "uploaded_dataset" ? "Over dataset rows" : "Iterator"
      }
      selected={selected}
      executionStatus={d.executionStatus}
    >
      <FieldRow label="Source">{source || "—"}</FieldRow>
      <FieldRow label="Iterator">
        {iteratorVar ? (
          <VariablePill name={iteratorVar} dataType="dataset" />
        ) : (
          "—"
        )}
      </FieldRow>
      <FieldRow label="Steps">
        {childNodes.length} node{childNodes.length !== 1 ? "s" : ""}
      </FieldRow>
    </BaseNode>
  );
}

export const LoopNode = memo(LoopNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  SUBWORKFLOW NODE
//  Embeds another workflow. Shows input/output mapping.
// ═══════════════════════════════════════════════════════════════════════════

function SubworkflowNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;

  const workflowId = config.workflow_id as string | undefined;
  const workflowName = config.workflow_name as string | undefined;
  const inputMapping = (config.input_mapping || {}) as Record<string, string>;
  const outputMapping = (config.output_mapping || {}) as Record<string, string>;

  const inputCount = Object.keys(inputMapping).length;
  const outputCount = Object.keys(outputMapping).length;

  return (
    <BaseNode
      id={id}
      nodeType="SUBWORKFLOW"
      label={d.label || "Subworkflow"}
      subtitle={workflowName || workflowId?.slice(0, 8)}
      selected={selected}
      executionStatus={d.executionStatus}
    >
      {workflowId ? (
        <>
          <FieldRow label="Inputs">{inputCount} mapped</FieldRow>
          <FieldRow label="Outputs">{outputCount} mapped</FieldRow>
          {workflowName && (
            <div
              style={{
                marginTop: 4,
                padding: "4px 8px",
                borderRadius: 5,
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                fontSize: 11,
                fontWeight: 500,
                color: "#4338ca",
                textAlign: "center",
              }}
            >
              {workflowName}
            </div>
          )}
        </>
      ) : (
        <EmptyState message="No workflow linked" action="Select workflow" />
      )}
    </BaseNode>
  );
}

export const SubworkflowNode = memo(SubworkflowNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  COMMENT NODE
//  Non-executable annotation. Renders as a simple text card.
// ═══════════════════════════════════════════════════════════════════════════

function CommentNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;

  const text = (config.text || "") as string;
  const color = (config.color || "#fef3c7") as string;

  return (
    <div
      style={{
        minWidth: 160,
        maxWidth: 260,
        padding: "10px 12px",
        borderRadius: 8,
        backgroundColor: color,
        border: `1px solid ${selected ? "#f59e0b" : `${color}cc`}`,
        boxShadow: selected
          ? "0 0 0 2px rgba(245,158,11,0.15)"
          : "0 1px 3px rgba(0,0,0,0.04)",
        fontSize: 12,
        lineHeight: 1.5,
        color: "#78350f",
        fontFamily: "'Inter', system-ui, sans-serif",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {text || "Add a note..."}
    </div>
  );
}

export const CommentNode = memo(CommentNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  CHART NODE
//  Renders output visualizations (preview only on canvas).
// ═══════════════════════════════════════════════════════════════════════════

function ChartNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;

  const chartType = config.chart_type as string | undefined;
  const title = config.title as string | undefined;

  return (
    <BaseNode
      id={id}
      nodeType="CHART"
      label={d.label || "Chart"}
      subtitle={chartType || "line"}
      selected={selected}
      executionStatus={d.executionStatus}
    >
      <div
        style={{
          height: 48,
          borderRadius: 6,
          backgroundColor: "#f8fafc",
          border: "1px dashed #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          fontSize: 11,
        }}
      >
        {title || "Chart preview renders at runtime"}
      </div>
    </BaseNode>
  );
}

export const ChartNode = memo(ChartNodeInner);

// ═══════════════════════════════════════════════════════════════════════════
//  REFERENCE IMAGE NODE
//  Non-executable — shows a codebook page image.
// ═══════════════════════════════════════════════════════════════════════════

function ReferenceImageNodeInner({ id, data, selected }: NodeProps) {
  const d = data as NodeData;
  const config = d.config;

  const caption = config.caption as string | undefined;
  const imageUrl = config.image_url as string | undefined;

  return (
    <BaseNode
      id={id}
      nodeType="REFERENCE_IMAGE"
      label={d.label || "Reference"}
      selected={selected}
    >
      {imageUrl ? (
        <div
          style={{
            borderRadius: 6,
            overflow: "hidden",
            border: "1px solid #f1f5f9",
          }}
        >
          <img
            src={imageUrl}
            alt={caption || "Reference image"}
            style={{ width: "100%", display: "block" }}
          />
        </div>
      ) : (
        <EmptyState message="No image attached" action="Upload image" />
      )}
      {caption && (
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            marginTop: 4,
            textAlign: "center",
          }}
        >
          {caption}
        </div>
      )}
    </BaseNode>
  );
}

export const ReferenceImageNode = memo(ReferenceImageNodeInner);
