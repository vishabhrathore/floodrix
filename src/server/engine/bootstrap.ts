// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/bootstrap.ts
//
//  CHUNK 5 ADDITIONS:
//    - Register MetricsListener alongside DatabaseListener + AuditListener
//    - Add optional overrideMetricsListener for tests
//
//  That's the only change from Chunk 4. Everything else is unchanged.
// ═══════════════════════════════════════════════════════════════════════════

import type { PrismaClient } from "@/generated/prisma";
import type { Clock, ExecutionOptions } from "./types";
import { NodeHandlerRegistry } from "./NodeHandlerRegistry";
import { SessionRepository } from "./SessionRepository";
import { ExecutionEventEmitter } from "./ExecutionEventEmitter";
import { DatabaseListener } from "./listeners/DatabaseListener";
import { AuditListener } from "./listeners/AuditListener";
import { MetricsListener } from "./listeners/MetricsListener"; // CHUNK 5
import { WorkflowExecutor } from "./WorkflowExecutor";
import { RunStrategyResolver } from "./RunStrategyResolver";
import { RunOrchestrator } from "./RunOrchestrator";
import { SessionPoller } from "./SessionPoller";
import { CalcContext } from "./calc-context";

// Sync handlers
// import { InputHandler } from "./handlers/InputHandler";
import { FormulaHandler } from "./handlers/FormulaHandler";
import { MultiFormulaHandler } from "./handlers/MultiFormulaHandler";
import { LookupTableHandler } from "./handlers/LookupTableHandler";
import { InterpolationHandler } from "./handlers/InterpolationHandler";
import { DecisionHandler } from "./handlers/DecisionHandler";
import { DisplayHandler } from "./handlers/DisplayHandler";
import { ValidationHandler } from "./handlers/ValidationHandler";
import { UnitConversionHandler } from "./handlers/UnitConversionHandler";
import { CustomCodeHandler } from "./handlers/CustomCodeHandler";
import { InputHandler } from "./handlers/InputHandler";

// ─── Default Clock ────────────────────────────────────────────────────────

class SystemClock implements Clock {
    now(): number { return Date.now(); }
    nowDate(): Date { return new Date(); }
}

const DEFAULT_CLOCK = new SystemClock();

// ─── Handler registration ─────────────────────────────────────────────────

function registerAllHandlers(registry: NodeHandlerRegistry): NodeHandlerRegistry {
    registry.register(new InputHandler());
    registry.register(new FormulaHandler());
    registry.register(new MultiFormulaHandler());
    registry.register(new LookupTableHandler());
    registry.register(new InterpolationHandler());
    registry.register(new DecisionHandler());
    registry.register(new DisplayHandler());
    registry.register(new ValidationHandler());
    registry.register(new UnitConversionHandler());
    registry.register(new CustomCodeHandler());
    return registry;
}

// ─── Factory: createWorkflowExecutor ──────────────────────────────────────

export interface BootstrapOptions {
    clock?: Clock;
    overrideDatabaseListener?: DatabaseListener;
    overrideAuditListener?: AuditListener;
    /** CHUNK 5: override the metrics listener (e.g. disable in tests). */
    overrideMetricsListener?: MetricsListener;
    /** CHUNK 5: pass false to disable metrics emission entirely. */
    metricsEnabled?: boolean;
    skipHandlerValidation?: boolean;
    liveUpdates?: boolean;
}

export function createWorkflowExecutor(ctx: CalcContext, opts: BootstrapOptions = {}): WorkflowExecutor {
    const clock = opts.clock ?? DEFAULT_CLOCK;
    const repo = new SessionRepository(ctx.db, clock);
    const registry = registerAllHandlers(new NodeHandlerRegistry());

    if (!opts.skipHandlerValidation) {
        const { missing } = registry.validate({ strict: false });
        const missingAsync = missing.filter((t) =>
            ["API_CALL", "PDF_REPORT", "SUBWORKFLOW", "LOOP", "PARALLEL"].includes(t));
        const missingSync = missing.filter((t) => !missingAsync.includes(t));

        if (missingSync.length > 0) {
            throw new Error(`bootstrap: missing SYNC handlers: ${missingSync.join(", ")}`);
        }
    }

    const emitter = new ExecutionEventEmitter();
    const dbListener = opts.overrideDatabaseListener ?? new DatabaseListener(repo, opts.liveUpdates ?? false);
    const auditListener = opts.overrideAuditListener ?? new AuditListener(ctx.audit);

    emitter.on((e) => dbListener.handle(e), { name: "database", priority: 50 });
    emitter.on((e) => auditListener.handle(e), { name: "audit", priority: 100 });

    // CHUNK 5: register metrics listener unless explicitly disabled
    if (opts.metricsEnabled !== false) {
        const metricsListener = opts.overrideMetricsListener ?? new MetricsListener();
        emitter.on((e) => metricsListener.handle(e), { name: "metrics", priority: 200 });
    }

    return new WorkflowExecutor({ db: ctx.db, repo, registry, emitter, clock });
}

// ─── Factory: createRunOrchestrator ───────────────────────────────────────

export interface OrchestratorOptions extends BootstrapOptions {
    pollUrlPrefix?: string;
}

export function createRunOrchestrator(ctx: CalcContext, opts: OrchestratorOptions = {}): RunOrchestrator {
    const clock = opts.clock ?? DEFAULT_CLOCK;
    const repo = new SessionRepository(ctx.db, clock);
    const executor = createWorkflowExecutor(ctx, opts);
    const resolver = new RunStrategyResolver();

    return new RunOrchestrator({
        db: ctx.db, repo, executor, resolver, clock,
        pollUrlPrefix: opts.pollUrlPrefix,
    });
}

// ─── Factory: createSessionPoller ─────────────────────────────────────────

export function createSessionPoller(ctx: CalcContext, opts: BootstrapOptions = {}): SessionPoller {
    const clock = opts.clock ?? DEFAULT_CLOCK;
    const repo = new SessionRepository(ctx.db, clock);
    return new SessionPoller(ctx.db, repo, clock);
}

// ─── Exports ──────────────────────────────────────────────────────────────

export type { ExecutionOptions };
export { RunStrategy } from "./types";
export { BATCH_THRESHOLD } from "./RunStrategyResolver";
export { MetricsListener } from "./listeners/MetricsListener";
export type { MetricsSink } from "./listeners/MetricsListener";