// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/listeners/MetricsListener.ts
//
//  Emits structured JSON log lines for every execution event. Plug your
//  log collector (Datadog agent, Vector, Fluent Bit, even grep) on top.
//
//  Each line is one JSON object with fields:
//    { ts, level, category, event, sessionId?, workflowId?, ... }
//
//  Why console.log + JSON:
//    - Zero dependencies, zero setup
//    - Structured so it's parseable by any log aggregator
//    - Vercel, Cloud Run, Fly.io, Render \u2014 all stream stdout to their
//      own logging UI, and all support structured log parsing
//    - Later you can swap the `emit()` private method for an OTel exporter
//      without changing the listener's public surface
//
//  Categories emitted:
//    engine.session.started / paused / completed / errored / cancelled
//    engine.node.started / completed / skipped / errored / waiting
//    engine.metric.node_duration_ms        \u2014 one per completed node
//    engine.metric.session_duration_ms     \u2014 one per completed session
// ═══════════════════════════════════════════════════════════════════════════

import type { ExecutionEvent } from "../types";

/**
 * Minimal interface for metric sinks. Default impl uses console.log; tests
 * or prod can inject something richer (OTel, Sentry, etc.) later.
 */
export interface MetricsSink {
    emit(line: Record<string, unknown>): void;
}

/** Default sink: structured JSON to console. */
class ConsoleJsonSink implements MetricsSink {
    emit(line: Record<string, unknown>): void {
        // One JSON object per line. Log aggregators parse this naturally.
        // We use console.log (stdout) rather than stderr so metric events
        // don't appear as "errors" in log UIs.
        try {
            console.log(JSON.stringify({ ts: new Date().toISOString(), ...line }));
        } catch {
            // JSON.stringify can throw on circular refs. Fall back to a
            // stripped-down line so we don't lose observability entirely.
            console.log(JSON.stringify({
                ts: new Date().toISOString(),
                level: "error",
                category: "metrics.sink_error",
                event: "emit_failed",
            }));
        }
    }
}

export class MetricsListener {
    constructor(private readonly sink: MetricsSink = new ConsoleJsonSink()) { }

    handle(event: ExecutionEvent): void {
        switch (event.type) {
            // ── Session events ────────────────────────────────────────
            case "session:started":
                this.sink.emit({
                    level: "info",
                    category: "engine.session",
                    event: "started",
                    sessionId: event.sessionId,
                    workflowId: event.workflowId,
                    actorId: event.actorId,
                    nodeCount: event.nodeCount,
                });
                break;

            case "session:completed":
                this.sink.emit({
                    level: "info",
                    category: "engine.session",
                    event: "completed",
                    sessionId: event.sessionId,
                    workflowId: event.workflowId,
                    actorId: event.actorId,
                    durationMs: event.durationMs,
                    finalVariableCount: event.finalVariables.length,
                });
                // Also emit a pure-metric line so histograms are easy to aggregate
                this.sink.emit({
                    level: "info",
                    category: "engine.metric",
                    event: "session_duration_ms",
                    sessionId: event.sessionId,
                    workflowId: event.workflowId,
                    value: event.durationMs,
                });
                break;

            case "session:errored":
                this.sink.emit({
                    level: "error",
                    category: "engine.session",
                    event: "errored",
                    sessionId: event.sessionId,
                    workflowId: event.workflowId,
                    actorId: event.actorId,
                    nodeId: event.nodeId,
                    error: event.error,
                });
                break;

            case "session:paused":
                this.sink.emit({
                    level: "info",
                    category: "engine.session",
                    event: "paused",
                    sessionId: event.sessionId,
                    workflowId: event.workflowId,
                    nodeId: event.nodeId,
                    pauseReason: event.pauseReason,
                    stepMode: event.stepMode,
                    skippedCount: event.skippedNodes.length,
                });
                break;

            case "session:cancelled":
                this.sink.emit({
                    level: "info",
                    category: "engine.session",
                    event: "cancelled",
                    sessionId: event.sessionId,
                    workflowId: event.workflowId,
                    actorId: event.actorId,
                });
                break;

            // ── Node events ───────────────────────────────────────────
            case "node:started":
                // Don't emit for every node start \u2014 too noisy. We can re-add
                // if you want per-node latency traces.
                break;

            case "node:completed":
                this.sink.emit({
                    level: "info",
                    category: "engine.node",
                    event: "completed",
                    sessionId: event.sessionId,
                    nodeId: event.nodeId,
                    nodeLabel: event.nodeLabel,
                    nodeType: event.nodeType,
                    stepNumber: event.stepNumber,
                    durationMs: event.durationMs,
                });
                this.sink.emit({
                    level: "info",
                    category: "engine.metric",
                    event: "node_duration_ms",
                    nodeType: event.nodeType,
                    value: event.durationMs,
                });
                break;

            case "node:errored":
                this.sink.emit({
                    level: "error",
                    category: "engine.node",
                    event: "errored",
                    sessionId: event.sessionId,
                    nodeId: event.nodeId,
                    nodeLabel: event.nodeLabel,
                    errorType: event.errorType,
                    errorMessage: event.error.message,
                    durationMs: event.durationMs,
                });
                break;

            case "node:skipped":
                // Low-value log, skip to reduce noise
                break;

            case "node:waiting":
                this.sink.emit({
                    level: "info",
                    category: "engine.node",
                    event: "waiting",
                    sessionId: event.sessionId,
                    nodeId: event.nodeId,
                    nodeLabel: event.nodeLabel,
                    pauseReason: event.pauseReason,
                });
                break;
        }
    }
}