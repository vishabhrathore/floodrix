"use client";

import { useMemo } from "react";
import LookupConfigPanel from "@/features/registery/table/components/lookup-config-panel";

interface LookupConfigProps {
    nodeId: string;
    config: any;
    availableVariables?: { notation: string; displayLabel: string; contextKey: string }[];
    onSave: (config: Record<string, unknown>) => void;
}

export function LookupConfig({ nodeId, config, availableVariables = [], onSave }: LookupConfigProps) {
    // Map legacy/workflow config to the refined LookupNodeConfig structure
    const refinedConfig = useMemo(() => {
        // If it's already in the new format, use it
        if (config.mode) return config;

        // Otherwise, bridge from legacy format
        const mode = config.source === "registry" ? "registry" : "inline";

        // Map rows/columns
        let inlineColumns: any[] = [];
        let inlineData: any[] = config.rows ?? [];

        if (config.table_mode === "range") {
            inlineColumns = [
                { key: "from", label: "From", isKey: true },
                { key: "to", label: "To", isKey: true },
                { key: "value", label: "Value", isOutput: true },
                { key: "label", label: "Label" }
            ];
        } else if (config.table_mode === "exact") {
            inlineColumns = [
                { key: "key", label: "Key", isKey: true },
                { key: "value", label: "Value", isOutput: true }
            ];
        }

        return {
            mode,
            registryId: config.registry_id ?? null,
            pinnedVersion: config.registry_version ?? null,
            inlineTableType: config.table_mode === "range" ? "RANGE_LOOKUP" :
                config.table_mode === "exact" ? "EXACT_MATCH" :
                    config.table_mode === "interpolated" ? "INTERPOLATION" : "RANGE_LOOKUP",
            inlineColumns,
            inlineData,
            keyBindings: config.lookup_key ? [{ columnKey: "key", columnLabel: "Input", contextKey: config.lookup_key }] : [],
            outputBinding: config.result_variable ? {
                columnKey: "value",
                contextKey: config.result_variable,
                notation: config.result_variable,
                label: "Output"
            } : undefined,
            label: config.label,
            description: config.reference,
            fallbackMode: config.fallback_mode,
        };
    }, [config]);

    return (
        <div className="-mx-5 -mt-5">
            <LookupConfigPanel
                nodeId={nodeId}
                config={refinedConfig}
                onChange={onSave as any}
                availableVariables={availableVariables}
            />
        </div>
    );
}