"use client";

import { useMemo } from "react";
import FormulaConfigPanel from "@/features/registery/formula/components/formula-config-panel";

interface FormulaConfigProps {
    nodeId: string;
    config: any;
    /** All variables available from upstream nodes (INPUT, LOOKUP, etc.) */
    availableVariables?: { notation: string; displayLabel: string; contextKey: string }[];
    onSave: (config: Record<string, unknown>) => void;
}

export function FormulaConfig({ nodeId, config, availableVariables = [], onSave }: FormulaConfigProps) {
    // Map legacy/workflow config to the refined FormulaNodeConfig structure
    const refinedConfig = useMemo(() => {
        // If it's already in the new format, use it
        if (config.mode) return config;

        // Otherwise, bridge from legacy format
        const mode = config.source === "registry" ? "registry" : "inline";

        // Map input bindings from legacy variable_bindings
        const inputBindings = Object.entries(config.variable_bindings ?? {}).map(([formulaVar, contextKey]) => {
            const av = availableVariables.find(a => a.contextKey === contextKey);
            return {
                formulaVar,
                nodeVar: av?.notation ?? (contextKey as string),
                displayLabel: av?.displayLabel ?? formulaVar,
                contextKey: contextKey as string
            };
        });

        return {
            mode,
            registryId: config.registry_id ?? null,
            pinnedVersion: config.registry_version ?? null,
            inlineExpression: config.expression,
            inlineDisplayExpression: config.display_expression,
            label: config.label,
            description: config.reference,
            inputBindings,
            outputBinding: config.result_variable ? {
                formulaVar: config.result_variable,
                nodeVar: config.result_variable,
                displayLabel: "Result",
                contextKey: config.result_variable
            } : undefined
        };
    }, [config, availableVariables]);

    return (
        <div className="-mx-5 -mt-5">
            <FormulaConfigPanel
                nodeId={nodeId}
                config={refinedConfig}
                onChange={onSave as any}
                availableVariables={availableVariables}
            />
        </div>
    );
}