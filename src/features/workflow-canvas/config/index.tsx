// src/features/workflow-canvas/config/index.tsx

"use client";

import { useCallback, useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CalcNodeType } from "@/generated/prisma";
import { useTRPC } from "@/trpc/client";

import { useWorkflowCanvasStore } from "../store/workflow-canvas-store";
import { ConfigDrawer } from "./config-drawer";
import { DecisionConfig } from "./decision-config";
import { DisplayConfig } from "./display-config";
import { FormulaConfig } from "./formula-config";
import { InputConfig } from "./input-config";
import { LookupConfig } from "./lookup-config";

// ─── Collect available variables from all nodes in the store ─────────────

function collectAvailableVariables(
  nodes: { id: string; type?: string; data: Record<string, unknown> }[],
): { key: string; label: string; unit?: string; sourceNode?: string }[] {
  const vars: {
    key: string;
    label: string;
    unit?: string;
    sourceNode?: string;
  }[] = [];

  for (const node of nodes) {
    const config = (node.data?.config as Record<string, unknown>) ?? {};
    const nodeLabel = (node.data?.label as string) ?? node.type ?? "Node";

    // INPUT nodes → each field is a variable
    if (node.type === "INPUT") {
      const fields = (config.fields ?? []) as {
        key: string;
        label: string;
        unit?: string;
      }[];
      for (const f of fields) {
        vars.push({
          key: f.key,
          label: f.label,
          unit: f.unit,
          sourceNode: nodeLabel,
        });
      }
    }

    // LOOKUP_TABLE → result_variable
    if (node.type === "LOOKUP_TABLE" && config.result_variable) {
      vars.push({
        key: config.result_variable as string,
        label: `${nodeLabel} result`,
        sourceNode: nodeLabel,
      });
    }

    // FORMULA → result_variable
    if (node.type === "FORMULA" && config.result_variable) {
      vars.push({
        key: config.result_variable as string,
        label: `${nodeLabel} result`,
        unit: config.result_unit as string | undefined,
        sourceNode: nodeLabel,
      });
    }

    // MULTI_FORMULA → each formula's result_var
    if (node.type === "MULTI_FORMULA") {
      const formulas = (config.formulas ?? []) as {
        result_var: string;
        label: string;
        unit?: string;
      }[];
      for (const f of formulas) {
        vars.push({
          key: f.result_var,
          label: f.label,
          unit: f.unit,
          sourceNode: nodeLabel,
        });
      }
    }

    // UNIT_CONVERSION → output_variable
    if (node.type === "UNIT_CONVERSION" && config.output_variable) {
      vars.push({
        key: config.output_variable as string,
        label: `${nodeLabel} output`,
        unit: config.output_unit as string | undefined,
        sourceNode: nodeLabel,
      });
    }

    // DISPLAY → result_variable
    if (node.type === "DISPLAY" && config.result_variable) {
      vars.push({
        key: config.result_variable as string,
        label: `${nodeLabel} result`,
        unit: config.result_unit as string | undefined,
        sourceNode: nodeLabel,
      });
    }

    // DECISION → set_variables from branches
    if (node.type === "DECISION") {
      const branches = config.branches as
        | Record<string, { set_variables?: Record<string, unknown> }>
        | undefined;
      if (branches) {
        for (const branch of Object.values(branches)) {
          if (branch.set_variables) {
            for (const key of Object.keys(branch.set_variables)) {
              vars.push({
                key,
                label: `${nodeLabel} → ${key}`,
                sourceNode: nodeLabel,
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate by key
  const seen = new Set<string>();
  return vars.filter((v) => {
    if (seen.has(v.key)) return false;
    seen.add(v.key);
    return true;
  });
}

// ─── Node type → config component ────────────────────────────────────────

function getConfigComponent(
  nodeType: CalcNodeType,
  config: Record<string, unknown>,
  onSave: (config: Record<string, unknown>) => void,
  availableVariables: {
    key: string;
    label: string;
    unit?: string;
    sourceNode?: string;
  }[],
): React.ReactNode | null {
  switch (nodeType) {
    case "INPUT":
      return <InputConfig config={config as any} onSave={onSave} />;
    case "FORMULA":
      return (
        <FormulaConfig
          config={config as any}
          availableVariables={availableVariables}
          onSave={onSave}
        />
      );
    case "LOOKUP_TABLE":
      return <LookupConfig config={config as any} onSave={onSave} />;
    case "DECISION":
      return <DecisionConfig config={config as any} onSave={onSave} />;
    case "DISPLAY":
      return <DisplayConfig config={config as any} onSave={onSave} />;
    default:
      return null;
  }
}

// ─── Hook: useConfigDrawer ───────────────────────────────────────────────

interface ConfigDrawerState {
  open: boolean;
  nodeId: string | null;
  nodeType: CalcNodeType | null;
  nodeLabel: string;
  config: Record<string, unknown>;
}

export function useConfigDrawer(workflowId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const store = useWorkflowCanvasStore();

  const [state, setState] = useState<ConfigDrawerState>({
    open: false,
    nodeId: null,
    nodeType: null,
    nodeLabel: "",
    config: {},
  });

  // Collect all available variables from every node on the canvas
  const availableVariables = useMemo(
    () => collectAvailableVariables(store.nodes as any),
    [store.nodes],
  );

  const saveMutation = useMutation(
    trpc.calcWorkflowCanvas.updateNodeConfig.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: trpc.calcWorkflowCanvas.get.queryKey({ workflowId }),
        });
        store.markDirty();
      },
    }),
  );

  const openDrawer = useCallback(
    (nodeId: string) => {
      const node = store.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setState({
        open: true,
        nodeId,
        nodeType: node.type as CalcNodeType,
        nodeLabel: (node.data?.label as string) ?? node.type ?? "Node",
        config: (node.data?.config as Record<string, unknown>) ?? {},
      });
    },
    [store.nodes],
  );

  const closeDrawer = useCallback(() => {
    setState((s) => ({ ...s, open: false }));
  }, []);

  const handleSave = useCallback(
    (config: Record<string, unknown>) => {
      if (!state.nodeId) return;

      // Optimistic update in store
      store.updateNodeConfig(state.nodeId, config);

      // Persist to server
      saveMutation.mutate({
        workflowId,
        nodeId: state.nodeId,
        config,
      });

      closeDrawer();
    },
    [state.nodeId, workflowId, store, saveMutation, closeDrawer],
  );

  const drawer =
    state.open && state.nodeType ? (
      <ConfigDrawer
        open={state.open}
        onOpenChange={(open) => {
          if (!open) closeDrawer();
        }}
        nodeType={state.nodeType}
        nodeLabel={state.nodeLabel}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
      >
        {getConfigComponent(
          state.nodeType,
          state.config,
          handleSave,
          availableVariables,
        )}
      </ConfigDrawer>
    ) : null;

  return {
    drawer,
    openDrawer,
    closeDrawer,
    isOpen: state.open,
  };
}
