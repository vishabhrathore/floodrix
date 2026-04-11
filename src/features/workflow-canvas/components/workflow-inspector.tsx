// ═══════════════════════════════════════════════════════════════════════════
//  src/features/workflow-canvas/components/variable-inspector.tsx
//  Live variable inspector — right sidebar during execution
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { HANDLE_COLORS } from "@/theme/calc-theme";
// import { HANDLE_COLORS } from "../nodes/theme";

interface VariableInspectorProps {
    workflowId: string;
    sessionId?: string;
}

export function VariableInspector({ workflowId, sessionId }: VariableInspectorProps) {
    // For dry run, we don't fetch from server. 
    // Variables would ideally come from the canvas store but aren't currently stored there.
    const variables: any[] = [];
    const sessionVars = sessionId ? {} : null;

    return (
        <div
            style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 210,
                background: "white",
                borderLeft: "1px solid #e5e7eb",
                display: "flex",
                flexDirection: "column",
                fontFamily: "'Inter', system-ui, sans-serif",
                zIndex: 10,
            }}
        >
            <div style={{
                padding: "12px 14px 10px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "#64748b",
                borderBottom: "1px solid #f1f5f9",
            }}>
                Variables ({variables.length})
            </div>

            <div style={{ overflow: "auto", flex: 1 }}>
                {variables.length === 0 ? (
                    <div style={{ padding: "24px 14px", fontSize: 12, color: "#94a3b8", textAlign: "center", lineHeight: 1.7 }}>
                        Variables appear here as you add formula and input nodes
                    </div>
                ) : (
                    variables.map((v) => (
                        <div
                            key={v.id}
                            style={{
                                padding: "6px 14px",
                                borderBottom: "1px solid #f8fafc",
                            }}
                        >
                            <div style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: HANDLE_COLORS.number.border,
                                fontFamily: "'JetBrains Mono', monospace",
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                            }}>
                                <span style={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    backgroundColor: HANDLE_COLORS.number.bg,
                                }} />
                                {v.contextKey}
                                {v.notation !== v.contextKey && (
                                    <span style={{ color: "#cbd5e1", fontWeight: 400 }}>({v.notation})</span>
                                )}
                            </div>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 500,
                                color: "#1e293b",
                                fontFamily: "'JetBrains Mono', monospace",
                                marginTop: 1,
                            }}>
                                {sessionVars && (sessionVars as Record<string, unknown>)[v.contextKey] !== undefined
                                    ? String((sessionVars as Record<string, unknown>)[v.contextKey])
                                    : v.defaultValue !== null
                                        ? String(v.defaultValue)
                                        : "—"
                                }
                                {v.unit && (
                                    <span style={{ fontSize: 9, color: "#94a3b8", marginLeft: 3 }}>{v.unit}</span>
                                )}
                            </div>
                            <div style={{
                                fontSize: 10,
                                color: "#cbd5e1",
                                marginTop: 1,
                            }}>
                                {v.displayLabel}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}