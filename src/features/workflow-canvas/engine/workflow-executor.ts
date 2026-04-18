// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/workflow-executor.ts
//  The core execution engine — runs workflows step by step,
//  handles pause/resume for INPUT nodes, resolves registries
//
//  EXECUTION MODES
//  ───────────────
//  liveUpdates: false (default — "Run Mode")
//    • All CalcNodeExecution writes are accumulated in memory
//    • Single createMany flush at end / pause / error
//    • Session currentIndex is NOT written per-node
//    • 10-60× faster depending on DB latency
//
//  liveUpdates: true ("Canvas / Debug Mode")
//    • Per-node DB writes (original behaviour)
//    • Frontend can poll/subscribe for real-time node highlights
//    • Use only while building or debugging a workflow
// ═══════════════════════════════════════════════════════════════════════════

import {
    type PrismaClient,
    type CalcNodeType,
    type SessionStatus,
    Prisma,
} from "@/generated/prisma";
import toposort from "toposort";
import * as math from "mathjs";
import { auditService } from "./audit-service";
import { registryResolver } from "./registry-resolver";
import { interpolate } from "./interpolation";
import { inngest } from "@/inngest/client";

// ─── Types ────────────────────────────────────────────────────────────────

interface VariableContext {
    [key: string]: any;
    $nodes?: Record<string, Record<string, any>>;
    $results?: Record<string, Record<string, any>>;
}

interface ExecutionResult {
    sessionId: string;
    status: SessionStatus;
    variables: VariableContext;
    currentNodeId?: string;
    pauseReason?: string;
    pausedNode?: {
        nodeId: string;
        nodeLabel: string;
        fields: FieldDef[];
    } | null;
    completedAt?: string | null;
    error?: { nodeId: string; message: string; type: string };
}

interface NodeConfig {
    source?: "registry" | "inline";
    registry_id?: string;
    registry_version?: number | null;
    variable_bindings?: Record<string, string>;
    overrides?: Record<string, unknown>;
    fields?: FieldDef[];
    expression?: string;
    expression_notation?: string;
    display_expression?: string;
    result_variable?: string;
    result_unit?: string;
    result_precision?: number;
    condition?: string;
    branches?: Record<string, { label: string; set_variables: Record<string, unknown> }>;
    mode?: string;
    lookup_key?: string;
    match_mode?: string;
    fallback_mode?: string;
    data?: unknown[];
    rows?: unknown[];
    compare_variables?: { key: string; label: string; method?: string }[];
    selection_rule?: string;
    custom_selection_expr?: string;
    data_points?: { x: number; y: number }[];
    interpolation_method?: string;
    extrapolation?: string;
    input_variable?: string;
    input_unit?: string;
    output_unit?: string;
    formulas?: { expr: string; result_var: string; unit: string; label: string }[];
    checks?: { expr: string; severity: string; message: string }[];
    on_error?: string;
    pause_execution?: boolean;
    code?: string;
    output_variables?: string[];
    [key: string]: unknown;
}

interface FieldDef {
    key: string;
    label: string;
    data_type?: string;
    unit?: string;
    default?: number | string;
    hint?: string;
    required?: boolean;
    constraints?: { min?: number; max?: number; step?: number };
    validation_expr?: string;
    options?: string[];
}

// ─── In-memory log entry (used when liveUpdates=false) ────────────────────

interface NodeExecutionLogEntry {
    calcNodeId: string;
    stepNumber: number;
    status: "COMPLETED" | "SKIPPED" | "ERRORED" | "WAITING";
    inputVars?: Prisma.InputJsonValue;
    outputVars?: Prisma.InputJsonValue;
    result?: Prisma.InputJsonValue;
    userInput?: Prisma.InputJsonValue;
    userInputAt?: Date;
    error?: string;
    errorType?: string;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
}

// ─── Execution options ─────────────────────────────────────────────────────

interface ContinueExecutionOptions {
    /**
     * When true: write each node's status to DB immediately (canvas/debug mode).
     * When false (default): accumulate all writes in memory, flush at end/pause/error.
     */
    liveUpdates?: boolean;
    isBackgroundRun?: boolean;
}

// ─── Topological Sort ─────────────────────────────────────────────────────

export function resolveExecutionOrder(
    nodes: { id: string; type: CalcNodeType; sortOrder: number }[],
    edges: { sourceNodeId: string; targetNodeId: string; sourceHandle: string }[]
): string[] {
    const pairs: [string, string][] = edges.map((e) => [e.sourceNodeId, e.targetNodeId]);
    const allNodeIds = new Set(nodes.map((n) => n.id));

    let sorted: string[];
    try {
        sorted = toposort.array(Array.from(allNodeIds), pairs);
    } catch (err) {
        if ((err as Error).message?.includes("cycle")) {
            throw new Error(
                "Circular dependency detected in workflow. " +
                "Please check your node connections for loops."
            );
        }
        throw err;
    }

    return sorted;
}

// ─── Main Executor ────────────────────────────────────────────────────────

export class WorkflowExecutor {
    constructor(private db: PrismaClient) { }

    // ══════════════════════════════════════════════════════════════════════
    //  PUBLIC ENTRY POINTS
    // ══════════════════════════════════════════════════════════════════════

    async startExecution(
        calcWorkflowId: string,
        actorId: string,
        initialValues?: VariableContext,
        options: { liveUpdates?: boolean } = {}
    ): Promise<ExecutionResult> {
        const workflow = await this.db.calcWorkflow.findUniqueOrThrow({
            where: { id: calcWorkflowId },
            include: {
                nodes: {
                    where: { deletedAt: null },
                    orderBy: { sortOrder: "asc" },
                },
                edges: {
                    where: { deletedAt: null },
                },
                variables: {
                    where: { deletedAt: null },
                },
            },
        });

        const executionOrder = resolveExecutionOrder(
            workflow.nodes.map((n) => ({ id: n.id, type: n.type, sortOrder: n.sortOrder })),
            workflow.edges.map((e) => ({
                sourceNodeId: e.sourceNodeId,
                targetNodeId: e.targetNodeId,
                sourceHandle: e.sourceHandle,
            }))
        );

        const variables: VariableContext = {};
        for (const v of workflow.variables) {
            if (v.defaultValue !== null) {
                variables[v.contextKey] = v.defaultValue as number;
            }
        }
        if (initialValues) Object.assign(variables, initialValues);

        const session = await this.db.calcSession.create({
            data: {
                calcWorkflowId,
                actorId,
                status: "RUNNING",
                variables: variables as Prisma.InputJsonValue,
                executionOrder: executionOrder as Prisma.InputJsonValue,
                currentIndex: 0,
                startedAt: new Date(),
                runMode: "SINGLE",
                metadata: {},
            },
        });

        // In liveUpdates mode we need PENDING rows up front so the canvas
        // can immediately render all nodes as "queued".
        // In batch mode we skip this — rows are created in one shot at the end.
        if (options.liveUpdates) {
            await this.db.calcNodeExecution.createMany({
                data: executionOrder.map((nodeId, idx) => ({
                    sessionId: session.id,
                    calcNodeId: nodeId,
                    stepNumber: idx,
                    status: "PENDING" as const,
                })),
            });
        }

        await auditService.log(this.db, {
            actorId,
            resourceType: "WORKFLOW",
            resourceId: calcWorkflowId,
            calcWorkflowId,
            action: "WORKFLOW_RUN_STARTED",
            changes: { sessionId: session.id, nodeCount: executionOrder.length },
        });

        return this.continueExecution(session.id, {
            liveUpdates: options.liveUpdates ?? false,
        });
    }

    async resumeWithInput(
        sessionId: string,
        nodeId: string,
        userInput: Record<string, unknown>,
        options: { liveUpdates?: boolean } = {}
    ): Promise<ExecutionResult> {
        const session = await this.db.calcSession.findUniqueOrThrow({
            where: { id: sessionId },
        });

        if (session.status !== "PAUSED") {
            throw new Error(`Session ${sessionId} is not paused (status: ${session.status})`);
        }
        if (session.currentNodeId !== nodeId) {
            throw new Error(
                `Session is paused at node ${session.currentNodeId}, not ${nodeId}`
            );
        }

        const variables = session.variables as VariableContext;
        Object.assign(variables, userInput);

        // The WAITING node execution row always exists (written when we paused)
        await this.db.calcNodeExecution.updateMany({
            where: { sessionId, calcNodeId: nodeId, status: "WAITING" },
            data: {
                status: "COMPLETED",
                userInput: userInput as Prisma.InputJsonValue,
                userInputAt: new Date(),
                outputVars: userInput as Prisma.InputJsonValue,
                completedAt: new Date(),
            },
        });

        const executionOrder = session.executionOrder as string[];
        const currentIdx = executionOrder.indexOf(nodeId);

        await this.db.calcSession.update({
            where: { id: sessionId },
            data: {
                status: "RUNNING",
                variables: variables as Prisma.InputJsonValue,
                currentNodeId: null,
                currentIndex: currentIdx + 1,
                pausedAt: null,
                pauseReason: null,
                inputSnapshot: (session.inputSnapshot
                    ? { ...(session.inputSnapshot as Record<string, unknown>), ...userInput }
                    : userInput) as Prisma.InputJsonValue,
            },
        });

        await auditService.log(this.db, {
            actorId: session.actorId,
            resourceType: "WORKFLOW",
            resourceId: session.calcWorkflowId,
            calcWorkflowId: session.calcWorkflowId,
            action: "USER_INPUT_SUBMITTED",
            changes: { sessionId, nodeId, fields: Object.keys(userInput) },
        });

        return this.continueExecution(sessionId, {
            liveUpdates: options.liveUpdates ?? false,
        });
    }

    async cancelExecution(sessionId: string, actorId: string): Promise<void> {
        const session = await this.db.calcSession.findUniqueOrThrow({
            where: { id: sessionId },
        });

        if (session.status !== "RUNNING" && session.status !== "PAUSED") {
            throw new Error(`Cannot cancel session with status: ${session.status}`);
        }

        await this.db.calcSession.update({
            where: { id: sessionId },
            data: {
                status: "CANCELLED",
                completedAt: new Date(),
                duration: Date.now() - (session.startedAt?.getTime() ?? Date.now()),
            },
        });

        await this.db.calcNodeExecution.updateMany({
            where: { sessionId, status: { in: ["PENDING", "WAITING"] } },
            data: { status: "SKIPPED", completedAt: new Date() },
        });

        await auditService.log(this.db, {
            actorId,
            resourceType: "WORKFLOW",
            resourceId: session.calcWorkflowId,
            calcWorkflowId: session.calcWorkflowId,
            action: "WORKFLOW_RUN_CANCELLED",
            changes: { sessionId },
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  FLUSH HELPER
    //  Writes all accumulated in-memory node logs to DB in one shot.
    //  Called at: completion, pause, error.
    // ══════════════════════════════════════════════════════════════════════

    private async flushNodeLogs(
        sessionId: string,
        log: NodeExecutionLogEntry[]
    ): Promise<void> {
        if (log.length === 0) return;

        await this.db.calcNodeExecution.createMany({
            data: log.map((entry) => ({
                sessionId,
                calcNodeId: entry.calcNodeId,
                stepNumber: entry.stepNumber,
                status: entry.status,
                inputVars: entry.inputVars ?? Prisma.JsonNull,
                outputVars: entry.outputVars ?? Prisma.JsonNull,
                result: entry.result ?? Prisma.JsonNull,
                userInput: entry.userInput ?? Prisma.JsonNull,
                userInputAt: entry.userInputAt,
                error: entry.error,
                errorType: entry.errorType,
                startedAt: entry.startedAt,
                completedAt: entry.completedAt,
                durationMs: entry.durationMs,
            })),
            skipDuplicates: true,
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  CORE EXECUTION LOOP
    // ══════════════════════════════════════════════════════════════════════

    async continueExecution(
        sessionId: string,
        options: ContinueExecutionOptions = {}
    ): Promise<ExecutionResult> {
        // liveUpdates defaults to FALSE — batch mode is the fast path
        const liveUpdates = options.liveUpdates ?? false;

        const session = await this.db.calcSession.findUniqueOrThrow({
            where: { id: sessionId },
            include: {
                calcWorkflow: {
                    include: {
                        nodes: { where: { deletedAt: null } },
                        edges: { where: { deletedAt: null } },
                    },
                },
            },
        });

        const executionOrder = session.executionOrder as string[];
        let currentIndex = session.currentIndex;
        const variables = { ...(session.variables as VariableContext) };
        const nodeMap = new Map(session.calcWorkflow.nodes.map((n) => [n.id, n]));
        const edges = session.calcWorkflow.edges;
        const skipSet = new Set<string>();

        // In-memory accumulator — only used when liveUpdates=false
        const nodeLog: NodeExecutionLogEntry[] = [];

        // ── helpers that branch on liveUpdates ────────────────────────────

        const markRunning = async (nodeId: string, vars: VariableContext) => {
            if (!liveUpdates) return; // batch mode: no RUNNING writes
            await this.db.calcNodeExecution.updateMany({
                where: { sessionId, calcNodeId: nodeId },
                data: {
                    status: "RUNNING",
                    startedAt: new Date(),
                    inputVars: vars as Prisma.InputJsonValue,
                },
            });
        };

        const markSkipped = async (nodeId: string, stepNumber: number) => {
            if (liveUpdates) {
                await this.db.calcNodeExecution.updateMany({
                    where: { sessionId, calcNodeId: nodeId },
                    data: { status: "SKIPPED", startedAt: new Date(), completedAt: new Date() },
                });
            } else {
                nodeLog.push({
                    calcNodeId: nodeId,
                    stepNumber,
                    status: "SKIPPED",
                    startedAt: new Date(),
                    completedAt: new Date(),
                });
            }
        };

        const markCompleted = async (
            nodeId: string,
            stepNumber: number,
            payload: {
                outputVars: Prisma.InputJsonValue;
                result: Prisma.InputJsonValue;
                durationMs: number;
                inputVars?: Prisma.InputJsonValue;
            }
        ) => {
            if (liveUpdates) {
                await this.db.calcNodeExecution.updateMany({
                    where: { sessionId, calcNodeId: nodeId },
                    data: {
                        status: "COMPLETED",
                        outputVars: payload.outputVars,
                        result: payload.result,
                        completedAt: new Date(),
                        durationMs: payload.durationMs,
                    },
                });
            } else {
                nodeLog.push({
                    calcNodeId: nodeId,
                    stepNumber,
                    status: "COMPLETED",
                    inputVars: payload.inputVars,
                    outputVars: payload.outputVars,
                    result: payload.result,
                    startedAt: new Date(Date.now() - payload.durationMs),
                    completedAt: new Date(),
                    durationMs: payload.durationMs,
                });
            }
        };

        const persistProgress = async (idx: number) => {
            if (!liveUpdates) return; // batch mode: skip per-node session update
            await this.db.calcSession.update({
                where: { id: sessionId },
                data: {
                    variables: variables as Prisma.InputJsonValue,
                    currentIndex: idx + 1,
                },
            });
        };

        // ─────────────────────────────────────────────────────────────────
        //  MAIN LOOP
        // ─────────────────────────────────────────────────────────────────

        while (currentIndex < executionOrder.length) {
            const nodeId = executionOrder[currentIndex];
            const node = nodeMap.get(nodeId);

            if (!node) { currentIndex++; continue; }

            // ── Skip nodes on false decision branches ──────────────────
            if (skipSet.has(nodeId)) {
                await markSkipped(nodeId, currentIndex);
                currentIndex++;
                continue;
            }

            // ── Non-executable structural nodes ────────────────────────
            if (
                node.type === "COMMENT" ||
                node.type === "GROUP" ||
                node.type === "REFERENCE_IMAGE"
            ) {
                await markSkipped(nodeId, currentIndex);
                currentIndex++;
                continue;
            }

            const config = node.config as unknown as NodeConfig;
            const startTime = Date.now();

            // ── Background transition ───────────────────────────────────
            if (!options.isBackgroundRun && this.isBackgroundNode(node.type)) {
                // Flush whatever we have before handing off to Inngest
                if (!liveUpdates && nodeLog.length > 0) {
                    await this.flushNodeLogs(sessionId, nodeLog);
                    nodeLog.length = 0;
                }
                await this.db.calcSession.update({
                    where: { id: sessionId },
                    data: {
                        status: "PAUSED",
                        currentNodeId: nodeId,
                        currentIndex,
                        variables: variables as Prisma.InputJsonValue,
                        pausedAt: new Date(),
                        pauseReason: "background_transition",
                    },
                });

                await inngest.send({
                    name: "calc/session.resume",
                    data: { sessionId },
                });

                return {
                    sessionId,
                    status: "PAUSED",
                    variables,
                    currentNodeId: nodeId,
                    pauseReason: "background_transition",
                };
            }

            await markRunning(nodeId, variables);

            try {
                // ── INPUT ───────────────────────────────────────────────
                if (node.type === "INPUT") {
                    const shouldPause = config.pause_execution !== false;

                    if (shouldPause) {
                        const fields = config.fields ?? [];
                        const allProvided = fields.every((f) => variables[f.key] !== undefined);

                        if (!allProvided) {
                            // Flush accumulated log before pausing — the WAITING
                            // row must exist before resumeWithInput can update it
                            if (!liveUpdates && nodeLog.length > 0) {
                                await this.flushNodeLogs(sessionId, nodeLog);
                                nodeLog.length = 0;
                            }

                            await this.db.calcNodeExecution.create({
                                data: {
                                    sessionId,
                                    calcNodeId: nodeId,
                                    stepNumber: currentIndex,
                                    status: "WAITING",
                                    inputVars: variables as Prisma.InputJsonValue,
                                    startedAt: new Date(),
                                },
                            });

                            await this.db.calcSession.update({
                                where: { id: sessionId },
                                data: {
                                    status: "PAUSED",
                                    currentNodeId: nodeId,
                                    currentIndex,
                                    variables: variables as Prisma.InputJsonValue,
                                    pausedAt: new Date(),
                                    pauseReason: "awaiting_user_input",
                                },
                            });

                            return {
                                sessionId,
                                status: "PAUSED",
                                variables,
                                currentNodeId: nodeId,
                                pauseReason: "awaiting_user_input",
                                pausedNode: {
                                    nodeId,
                                    nodeLabel: node.label,
                                    fields: config.fields ?? [],
                                },
                            };
                        }
                    }

                    const inputResult: Record<string, unknown> = {};
                    for (const f of config.fields ?? []) {
                        if (variables[f.key] === undefined && f.default !== undefined) {
                            variables[f.key] = f.default;
                        }
                        inputResult[f.key] = variables[f.key];
                    }

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: inputResult as Prisma.InputJsonValue,
                        result: inputResult as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                    this.trackNodeOutput(variables, node, inputResult);
                }

                // ── FORMULA ─────────────────────────────────────────────
                else if (node.type === "FORMULA") {
                    const res = await this.executeFormula(node, config, variables);
                    variables[res.outputKey] = res.value;
                    this.trackNodeOutput(variables, node, { [res.outputKey]: res.value });

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: { [res.outputKey]: res.value } as Prisma.InputJsonValue,
                        result: res.details as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── MULTI_FORMULA ────────────────────────────────────────
                else if (node.type === "MULTI_FORMULA") {
                    const outputs: Record<string, unknown> = {};
                    const details: unknown[] = [];

                    for (const f of config.formulas ?? []) {
                        const val = this.evaluateSafe(f.expr, variables) as number;
                        const rounded = Math.round(val * 1000) / 1000;
                        variables[f.result_var] = rounded;
                        outputs[f.result_var] = rounded;
                        details.push({ expr: f.expr, resultVar: f.result_var, value: rounded });
                    }
                    this.trackNodeOutput(variables, node, outputs);

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: outputs as Prisma.InputJsonValue,
                        result: { formulas: details } as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── LOOKUP_TABLE ─────────────────────────────────────────
                else if (node.type === "LOOKUP_TABLE") {
                    const res = await this.executeLookup(node, config, variables);
                    variables[res.outputKey] = res.value;
                    this.trackNodeOutput(variables, node, { [res.outputKey]: res.value });

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: { [res.outputKey]: res.value } as Prisma.InputJsonValue,
                        result: res.details as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── GRAPH_INTERPOLATION ──────────────────────────────────
                else if (node.type === "GRAPH_INTERPOLATION") {
                    const res = await this.executeInterpolation(node, config, variables);
                    variables[res.outputKey] = res.value;
                    this.trackNodeOutput(variables, node, { [res.outputKey]: res.value });

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: { [res.outputKey]: res.value } as Prisma.InputJsonValue,
                        result: res.details as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── DECISION ─────────────────────────────────────────────
                else if (node.type === "DECISION") {
                    const res = this.executeDecision(node, config, variables, edges);
                    Object.assign(variables, res.varsSet);
                    for (const skipId of res.skipNodeIds) skipSet.add(skipId);

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: res.varsSet as Prisma.InputJsonValue,
                        result: {
                            condition: config.condition,
                            evaluatedTo: res.conditionResult,
                            branchTaken: res.branchTaken,
                            varsSet: res.varsSet,
                            skippedNodes: res.skipNodeIds,
                        } as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                    this.trackNodeOutput(variables, node, res.varsSet);
                }

                // ── DISPLAY ──────────────────────────────────────────────
                else if (node.type === "DISPLAY") {
                    const res = this.executeDisplay(config, variables);
                    if (res.outputKey) variables[res.outputKey] = res.value;

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: res.outputKey
                            ? ({ [res.outputKey]: res.value } as Prisma.InputJsonValue)
                            : ({} as Prisma.InputJsonValue),
                        result: res.details as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                    if (res.outputKey) {
                        this.trackNodeOutput(variables, node, { [res.outputKey]: res.value });
                    }
                }

                // ── VALIDATION ───────────────────────────────────────────
                else if (node.type === "VALIDATION") {
                    const res = this.executeValidation(config, variables);

                    if (res.hasErrors && config.on_error === "pause") {
                        // Flush accumulated log before pausing on validation error
                        if (!liveUpdates && nodeLog.length > 0) {
                            await this.flushNodeLogs(sessionId, nodeLog);
                            nodeLog.length = 0;
                        }

                        await this.db.calcNodeExecution.create({
                            data: {
                                sessionId,
                                calcNodeId: nodeId,
                                stepNumber: currentIndex,
                                status: "WAITING",
                                result: res as unknown as Prisma.InputJsonValue,
                                startedAt: new Date(),
                            },
                        });

                        await this.db.calcSession.update({
                            where: { id: sessionId },
                            data: {
                                status: "PAUSED",
                                currentNodeId: nodeId,
                                currentIndex,
                                variables: variables as Prisma.InputJsonValue,
                                pausedAt: new Date(),
                                pauseReason: "validation_error",
                            },
                        });

                        return {
                            sessionId,
                            status: "PAUSED",
                            variables,
                            currentNodeId: nodeId,
                            pauseReason: `Validation failed: ${res.errors.map((e) => e.message).join("; ")}`,
                        };
                    }

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: {} as Prisma.InputJsonValue,
                        result: res as unknown as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── UNIT_CONVERSION ──────────────────────────────────────
                else if (node.type === "UNIT_CONVERSION") {
                    const inputVar = config.input_variable as string;
                    const outputVar = config.result_variable as string;
                    const inputVal = variables[inputVar] as number;

                    let result: number;
                    if (config.expression) {
                        result = this.evaluateSafe(config.expression, {
                            ...variables,
                            value: inputVal,
                        }) as number;
                    } else {
                        result = math
                            .unit(inputVal, config.input_unit as string)
                            .toNumber(config.output_unit as string);
                    }

                    variables[outputVar] = Math.round(result * 10000) / 10000;

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: { [outputVar]: variables[outputVar] } as Prisma.InputJsonValue,
                        result: {
                            inputVar,
                            inputVal,
                            outputVar,
                            result: variables[outputVar],
                        } as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── CUSTOM_CODE ──────────────────────────────────────────
                else if (node.type === "CUSTOM_CODE") {
                    const code = config.code as string;
                    const outputVarNames = config.output_variables ?? [];

                    const lines = code.split("\n").filter((l) => l.trim());
                    for (const line of lines) {
                        const match = line.match(/^\s*(\w+)\s*=\s*(.+)$/);
                        if (match) {
                            const [, varName, expr] = match;
                            const val = this.evaluateSafe(expr, variables);
                            variables[varName] =
                                typeof val === "number" ? Math.round(val * 10000) / 10000 : val;
                        }
                    }

                    const outputs: Record<string, unknown> = {};
                    for (const v of outputVarNames) outputs[v] = variables[v];

                    await markCompleted(nodeId, currentIndex, {
                        outputVars: outputs as Prisma.InputJsonValue,
                        result: { code, outputs } as Prisma.InputJsonValue,
                        durationMs: Date.now() - startTime,
                        inputVars: variables as Prisma.InputJsonValue,
                    });
                }

                // ── Unsupported / structural ─────────────────────────────
                else {
                    await markSkipped(nodeId, currentIndex);
                }
            } catch (err) {
                // ── ERROR ────────────────────────────────────────────────
                const error = err as Error;
                const errorType = this.classifyError(error);

                if (liveUpdates) {
                    await this.db.calcNodeExecution.updateMany({
                        where: { sessionId, calcNodeId: nodeId },
                        data: {
                            status: "ERRORED",
                            error: error.message,
                            errorType,
                            completedAt: new Date(),
                            durationMs: Date.now() - startTime,
                        },
                    });
                } else {
                    // Push the errored node into the log then flush everything
                    nodeLog.push({
                        calcNodeId: nodeId,
                        stepNumber: currentIndex,
                        status: "ERRORED",
                        inputVars: variables as Prisma.InputJsonValue,
                        error: error.message,
                        errorType,
                        startedAt: new Date(Date.now() - (Date.now() - startTime)),
                        completedAt: new Date(),
                        durationMs: Date.now() - startTime,
                    });
                    await this.flushNodeLogs(sessionId, nodeLog);
                    nodeLog.length = 0; // clear after flush
                }

                await this.db.calcSession.update({
                    where: { id: sessionId },
                    data: {
                        status: "ERRORED",
                        variables: variables as Prisma.InputJsonValue,
                        currentNodeId: nodeId,
                        currentIndex,
                        error: {
                            nodeId,
                            nodeLabel: node.label,
                            message: error.message,
                            type: errorType,
                        } as Prisma.InputJsonValue,
                        completedAt: new Date(),
                        duration:
                            Date.now() - (session.startedAt?.getTime() ?? Date.now()),
                    },
                });

                await auditService.log(this.db, {
                    actorId: session.actorId,
                    resourceType: "WORKFLOW",
                    resourceId: session.calcWorkflowId,
                    calcWorkflowId: session.calcWorkflowId,
                    action: "WORKFLOW_RUN_ERRORED",
                    changes: { sessionId, nodeId, error: error.message },
                });

                return {
                    sessionId,
                    status: "ERRORED",
                    variables,
                    error: { nodeId, message: error.message, type: errorType },
                };
            }

            await persistProgress(currentIndex);
            currentIndex++;
        }

        // ── ALL NODES COMPLETE ─────────────────────────────────────────────

        // Flush any remaining in-memory logs before writing COMPLETED
        if (!liveUpdates && nodeLog.length > 0) {
            await this.flushNodeLogs(sessionId, nodeLog);
            nodeLog.length = 0;
        }

        const endTime = new Date();

        await this.db.calcSession.update({
            where: { id: sessionId },
            data: {
                status: "COMPLETED",
                variables: variables as Prisma.InputJsonValue,
                currentNodeId: null,
                completedAt: endTime,
                duration:
                    endTime.getTime() - (session.startedAt?.getTime() ?? endTime.getTime()),
            },
        });

        await auditService.log(this.db, {
            actorId: session.actorId,
            resourceType: "WORKFLOW",
            resourceId: session.calcWorkflowId,
            calcWorkflowId: session.calcWorkflowId,
            action: "WORKFLOW_RUN_COMPLETED",
            changes: {
                sessionId,
                finalVariables: Object.keys(variables),
                durationMs:
                    endTime.getTime() - (session.startedAt?.getTime() ?? endTime.getTime()),
            },
        });

        return {
            sessionId,
            status: "COMPLETED",
            variables,
            completedAt: endTime.toISOString(),
        };

    }

    // ══════════════════════════════════════════════════════════════════════
    //  NODE EXECUTORS  (unchanged from original)
    // ══════════════════════════════════════════════════════════════════════

    private async executeFormula(
        node: { id: string },
        config: NodeConfig,
        variables: VariableContext
    ) {
        let expression: string;
        let outputKey: string;
        let evalScope: VariableContext;
        let displayExpr: string;

        if (config.source === "registry" && config.registry_id) {
            const registry = await registryResolver.resolveFormula(
                this.db,
                config.registry_id,
                config.registry_version ?? null
            );

            const bindings = config.variable_bindings ?? {};
            expression = registry.expressionNotation;
            displayExpr = registry.displayExpression;

            evalScope = {};
            for (const inputVar of registry.inputVariables as { notation: string; key: string }[]) {
                const contextKey = bindings[inputVar.notation] ?? inputVar.key;
                const value = variables[contextKey];
                if (value === undefined) {
                    throw new Error(
                        `${registry.name} requires "${inputVar.notation}" (bound to "${contextKey}") ` +
                        `but it hasn't been computed yet. ` +
                        `Add an upstream node that produces "${contextKey}".`
                    );
                }
                evalScope[inputVar.notation] = value;
            }

            const outVar = registry.outputVariable as { notation: string; key: string };
            outputKey = bindings[outVar.notation] ?? outVar.key;

            if (config.overrides?.result_variable) {
                outputKey = config.overrides.result_variable as string;
            }
        } else {
            expression = config.expression ?? "";
            displayExpr = config.display_expression ?? expression;
            outputKey = config.result_variable ?? "result";
            evalScope = { ...variables };

            if (config.variable_bindings) {
                for (const [notation, contextKey] of Object.entries(config.variable_bindings)) {
                    if (typeof contextKey === "string" && variables[contextKey] !== undefined) {
                        evalScope[notation] = variables[contextKey];
                    }
                }
            }
        }

        const rawResult = this.evaluateSafe(expression, evalScope);
        const precision =
            (config.overrides?.result_precision as number) ?? config.result_precision ?? 3;
        const value =
            Math.round((rawResult as number) * 10 ** precision) / 10 ** precision;

        return {
            outputKey,
            value,
            details: {
                expression,
                displayExpression: displayExpr,
                evalScope,
                rawResult,
                roundedResult: value,
                outputKey,
            },
        };
    }

    private async executeLookup(
        node: { id: string },
        config: NodeConfig,
        variables: VariableContext
    ) {
        let data: unknown[];
        let outputKey: string;
        let lookupKey: string;

        if (config.source === "registry" && config.registry_id) {
            const registry = await registryResolver.resolveTable(
                this.db,
                config.registry_id,
                config.registry_version ?? null
            );

            const bindings = config.variable_bindings ?? {};
            const inputDef = (registry.inputKeys as { notation: string; key: string }[])[0];
            lookupKey = bindings[inputDef.notation] ?? inputDef.key;
            outputKey =
                bindings[(registry.outputKey as { notation: string }).notation] ??
                (registry.outputKey as { key: string }).key;
            data = registry.data as unknown[];
        } else {
            lookupKey = config.lookup_key ?? "";
            outputKey = config.result_variable ?? "result";
            data = (config.data ?? config.rows ?? []) as unknown[];
        }

        const lookupValue = variables[lookupKey] as number;
        if (lookupValue === undefined) {
            throw new Error(`Lookup key "${lookupKey}" not found in variables`);
        }

        type Row = { range?: [number, number | null]; key?: string | number; value: number; label?: string };

        let matchedRow: Row | null = null;
        let matchedIndex = -1;
        const matchMode = config.match_mode ?? "range";

        for (let i = 0; i < data.length; i++) {
            const row = data[i] as Row;

            if (matchMode === "range" && row.range) {
                const [lo, hi] = row.range;
                if (lookupValue >= lo && (hi === null || lookupValue < hi)) {
                    matchedRow = row; matchedIndex = i; break;
                }
            } else if (matchMode === "exact" && row.key !== undefined) {
                if (row.key === lookupValue || row.key === String(lookupValue)) {
                    matchedRow = row; matchedIndex = i; break;
                }
            } else if (matchMode === "nearest") {
                if (!matchedRow) { matchedRow = row; matchedIndex = i; }
            }
        }

        if (!matchedRow) {
            const fallback = config.fallback_mode ?? "error";
            if (fallback === "error") {
                throw new Error(
                    `No matching row found in lookup table for ${lookupKey} = ${lookupValue}`
                );
            }
            if (fallback === "first") { matchedRow = data[0] as Row; matchedIndex = 0; }
            if (fallback === "last") { matchedRow = data[data.length - 1] as Row; matchedIndex = data.length - 1; }
        }

        return {
            outputKey,
            value: matchedRow!.value,
            details: {
                lookupKey, lookupValue, matchedRow, matchedIndex,
                selectedValue: matchedRow!.value, totalRows: data.length,
            },
        };
    }

    private async executeInterpolation(
        node: { id: string },
        config: NodeConfig,
        variables: VariableContext
    ) {
        let points: { x: number; y: number }[];
        let inputVar: string;
        let outputKey: string;
        let method: string;
        let extrapolation: string;

        if (config.source === "registry" && config.registry_id) {
            const registry = await registryResolver.resolveTable(
                this.db,
                config.registry_id,
                config.registry_version ?? null
            );

            const bindings = config.variable_bindings ?? {};
            const inputDef = (registry.inputKeys as { notation: string; key: string }[])[0];
            inputVar = bindings[inputDef.notation] ?? inputDef.key;
            outputKey =
                bindings[(registry.outputKey as { notation: string }).notation] ??
                (registry.outputKey as { key: string }).key;
            points = registry.data as { x: number; y: number }[];
            const interpConfig = registry.interpolationConfig as {
                method?: string; extrapolation?: string;
            } | null;
            method =
                (config.overrides?.interpolation_method as string) ??
                interpConfig?.method ?? "linear";
            extrapolation = interpConfig?.extrapolation ?? "clamp";
        } else {
            inputVar = config.input_variable ?? "";
            outputKey = config.result_variable ?? "result";
            points = (config.data_points ?? []) as { x: number; y: number }[];
            method = config.interpolation_method ?? "linear";
            extrapolation = config.extrapolation ?? "clamp";
        }

        const xValue = variables[inputVar] as number;
        if (xValue === undefined) {
            throw new Error(`Interpolation input "${inputVar}" not found in variables`);
        }

        const value = interpolate(points, xValue, method, extrapolation);

        return {
            outputKey,
            value: Math.round(value * 10000) / 10000,
            details: {
                inputVar, xValue, method, extrapolation,
                pointCount: points.length, interpolatedValue: value,
            },
        };
    }

    private executeDecision(
        node: { id: string },
        config: NodeConfig,
        variables: VariableContext,
        edges: { sourceNodeId: string; targetNodeId: string; sourceHandle: string }[]
    ) {
        let conditionResult = false;
        try {
            conditionResult = !!this.evaluateSafe(config.condition ?? "false", variables);
        } catch {
            conditionResult = false;
        }

        const branchTaken = conditionResult ? "true" : "false";
        const branchNotTaken = conditionResult ? "false" : "true";
        const branches = config.branches ?? {};
        const varsSet = (branches[branchTaken]?.set_variables ?? {}) as Record<string, unknown>;

        const skipNodeIds: string[] = [];
        const notTakenEdges = edges.filter(
            (e) => e.sourceNodeId === node.id && e.sourceHandle === branchNotTaken
        );
        const toVisit = notTakenEdges.map((e) => e.targetNodeId);
        const visited = new Set<string>();

        while (toVisit.length > 0) {
            const current = toVisit.pop()!;
            if (visited.has(current)) continue;
            visited.add(current);
            skipNodeIds.push(current);

            const downstream = edges.filter((e) => e.sourceNodeId === current);
            for (const edge of downstream) {
                if (visited.has(edge.targetNodeId)) continue;
                const alsoReachable = edges.some(
                    (e) =>
                        e.targetNodeId === edge.targetNodeId &&
                        e.sourceNodeId !== current &&
                        !visited.has(e.sourceNodeId)
                );
                if (!alsoReachable) toVisit.push(edge.targetNodeId);
            }
        }

        return { conditionResult, branchTaken, varsSet, skipNodeIds };
    }

    private executeDisplay(config: NodeConfig, variables: VariableContext) {
        const compareVars = config.compare_variables ?? [];
        const values = compareVars.map((cv) => ({
            key: cv.key,
            method: cv.method ?? cv.label ?? cv.key,
            value: (variables[cv.key] as number) ?? 0,
        }));

        let selectedValue: number;
        const outputKey = config.result_variable;
        let selectionDetails: Record<string, unknown> = {};
        const rule = config.selection_rule ?? "max";

        if (rule === "max") {
            const sorted = [...values].filter((v) => v.value > 0).sort((a, b) => b.value - a.value);
            const Q1 = sorted[0]?.value ?? 0;
            const Q2 = sorted[1]?.value ?? 0;
            const check15 = 1.5 * Q2;
            selectedValue = check15 > Q1 ? Math.round(check15) : Math.round(Q1);
            selectionDetails = {
                ranking: sorted, Q1, Q2, check_1_5_Q2: check15, adopted: selectedValue,
                adoptionRule: check15 > Q1 ? "1.5 × Q2 (exceeds Q1)" : "Q1 (highest)",
            };
        } else if (rule === "min") {
            selectedValue = Math.min(...values.filter((v) => v.value > 0).map((v) => v.value));
            selectionDetails = { rule: "minimum", selectedValue };
        } else if (rule === "average") {
            const valid = values.filter((v) => v.value > 0);
            selectedValue = valid.reduce((s, v) => s + v.value, 0) / valid.length;
            selectionDetails = { rule: "average", selectedValue };
        } else if (rule === "custom" && config.custom_selection_expr) {
            selectedValue = this.evaluateSafe(config.custom_selection_expr, variables) as number;
            selectionDetails = { rule: "custom", expr: config.custom_selection_expr, selectedValue };
        } else {
            selectedValue = Math.max(...values.map((v) => v.value));
        }

        return {
            outputKey,
            value: selectedValue,
            details: {
                mode: config.mode ?? "comparison",
                compareValues: values,
                selectionRule: rule,
                ...selectionDetails,
            },
        };
    }

    private executeValidation(config: NodeConfig, variables: VariableContext) {
        const checks = config.checks ?? [];
        const results: { expr: string; severity: string; message: string; passed: boolean }[] = [];
        const errors: { message: string; severity: string }[] = [];
        const warnings: { message: string }[] = [];

        for (const check of checks) {
            let passed = false;
            try {
                passed = !!this.evaluateSafe(check.expr, variables);
            } catch {
                passed = false;
            }
            results.push({ ...check, passed });
            if (!passed) {
                if (check.severity === "error") errors.push({ message: check.message, severity: "error" });
                else if (check.severity === "warning") warnings.push({ message: check.message });
            }
        }

        return { checks: results, errors, warnings, hasErrors: errors.length > 0, hasWarnings: warnings.length > 0 };
    }

    // ── Utilities ──────────────────────────────────────────────────────────

    private classifyError(err: Error): string {
        const msg = err.message.toLowerCase();
        if (msg.includes("not found in variables") || msg.includes("hasn't been computed") || msg.includes("is undefined"))
            return "missing_variable";
        if (msg.includes("no matching row")) return "lookup_miss";
        if (msg.includes("circular") || msg.includes("cycle")) return "circular_dependency";
        if (msg.includes("timeout")) return "timeout";
        if (msg.includes("validation")) return "validation";
        return "computation";
    }

    private evaluateSafe(expr: string, scope: VariableContext): any {
        try {
            return math.evaluate(expr, scope);
        } catch (err: any) {
            const msg = err.message;
            if (msg.includes("Undefined symbol")) {
                const match = msg.match(/Undefined symbol (\w+)/);
                const symbol = match ? match[1] : "unknown";
                const vars = Object.keys(scope).sort();
                const suggestion = vars.find(v => v.toLowerCase() === symbol.toLowerCase());

                let errorMsg = `Variable "${symbol}" is not defined in this scope. `;
                if (suggestion) errorMsg += `Did you mean "${suggestion}"? (Variable names are case-sensitive). `;
                errorMsg += `Available variables: ${vars.join(", ") || "none"}`;

                throw new Error(errorMsg);
            }
            throw err;
        }
    }

    private trackNodeOutput(
        variables: VariableContext,
        node: { id: string; label: string },
        output: Record<string, unknown>
    ) {
        if (!variables.$nodes) variables.$nodes = {};
        variables.$nodes[node.id] = output;
        variables.$nodes[node.label] = output;

        if (!variables.$results) variables.$results = {};
        variables.$results[node.id] = output;
    }

    private isBackgroundNode(type: CalcNodeType): boolean {
        const backgroundTypes: CalcNodeType[] = [
            "API_CALL", "PDF_REPORT", "CUSTOM_CODE", "PARALLEL", "SUBWORKFLOW", "LOOP",
        ];
        return backgroundTypes.includes(type);
    }
}