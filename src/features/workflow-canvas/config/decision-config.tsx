// src/features/workflow-canvas/config/decision-config.tsx

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { ConfigSection, ConfigField } from "./config-drawer";

interface DecisionConfigProps {
    config: {
        condition?: string;
        branches?: {
            true?: { label: string; set_variables: Record<string, unknown> };
            false?: { label: string; set_variables: Record<string, unknown> };
        };
    };
    onSave: (config: Record<string, unknown>) => void;
}

export function DecisionConfig({ config, onSave }: DecisionConfigProps) {
    const [condition, setCondition] = useState(config.condition ?? "");
    const [trueLabel, setTrueLabel] = useState(config.branches?.true?.label ?? "");
    const [falseLabel, setFalseLabel] = useState(config.branches?.false?.label ?? "");

    const doSave = useCallback(() => {
        onSave({
            condition,
            branches: {
                true: { label: trueLabel, set_variables: config.branches?.true?.set_variables ?? {} },
                false: { label: falseLabel, set_variables: config.branches?.false?.set_variables ?? {} },
            },
        });
    }, [condition, trueLabel, falseLabel, config.branches, onSave]);

    return (
        <div>
            <ConfigSection title="Condition" description="mathjs expression that evaluates to true or false">
                <ConfigField label="Condition Expression" hint="e.g. M > 25 or Q_dicken > 100">
                    <Textarea
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="M > 25"
                        className="min-h-[60px] font-mono text-xs"
                    />
                </ConfigField>
            </ConfigSection>

            <ConfigSection title="Branches">
                <div className="space-y-3">
                    {/* True branch */}
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                TRUE
                            </span>
                            <span className="text-[10px] text-slate-400">When condition is true</span>
                        </div>
                        <ConfigField label="Branch Label">
                            <Input
                                value={trueLabel}
                                onChange={(e) => setTrueLabel(e.target.value)}
                                placeholder="e.g. Large catchment"
                                className="h-8 text-xs"
                            />
                        </ConfigField>
                    </div>

                    {/* False branch */}
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                        <div className="mb-2 flex items-center gap-2">
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                FALSE
                            </span>
                            <span className="text-[10px] text-slate-400">When condition is false</span>
                        </div>
                        <ConfigField label="Branch Label">
                            <Input
                                value={falseLabel}
                                onChange={(e) => setFalseLabel(e.target.value)}
                                placeholder="e.g. Small catchment"
                                className="h-8 text-xs"
                            />
                        </ConfigField>
                    </div>
                </div>
            </ConfigSection>

            <Button size="sm" className="w-full gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={doSave}>
                <Save className="h-3.5 w-3.5" />
                Save Configuration
            </Button>
        </div>
    );
}