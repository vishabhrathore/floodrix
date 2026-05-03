// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/NodeHandlerRegistry.ts
//
//  The registry that maps CalcNodeType → NodeHandler.
//
//  Bootstrap registers every handler. The executor looks up by type and
//  dispatches. If a node type has no registered handler, the executor
//  treats it as "skipped" (good for COMMENT, GROUP, REFERENCE_IMAGE) but
//  validate() at boot time complains if a non-structural type is missing.
// ═══════════════════════════════════════════════════════════════════════════

import type { CalcNodeType } from "@/generated/prisma";
import type { NodeHandler } from "./NodeHandler";
import {
    ASYNC_NODE_TYPES,
    STRUCTURAL_NODE_TYPES,
    SYNC_NODE_TYPES,
} from "./types";

/** Every node type that MUST have a handler registered. */
const EXPECTED_NODE_TYPES: readonly CalcNodeType[] = [
    ...SYNC_NODE_TYPES,
    ...ASYNC_NODE_TYPES,
];

export class NodeHandlerRegistry {
    private handlers = new Map<CalcNodeType, NodeHandler>();

    register(handler: NodeHandler): this {
        if (this.handlers.has(handler.type)) {
            throw new Error(
                `NodeHandler for "${handler.type}" already registered. ` +
                `Each node type may have exactly one handler.`
            );
        }
        this.handlers.set(handler.type, handler);
        return this;
    }

    /**
     * Look up a handler. Returns undefined for structural nodes (COMMENT,
     * GROUP, REFERENCE_IMAGE) and for types not yet implemented.
     * The executor handles undefined by emitting node:skipped.
     */
    get(type: CalcNodeType): NodeHandler | undefined {
        return this.handlers.get(type);
    }

    has(type: CalcNodeType): boolean {
        return this.handlers.has(type);
    }

    /**
     * Called from bootstrap after all handlers are registered.
     *
     * Throws if any expected (non-structural) node type lacks a handler.
     * In production this means "you forgot to wire something" — fail loud.
     *
     * Returns a list of missing types so callers can downgrade to a warning
     * if they're intentionally running a partial registry (e.g. tests).
     */
    validate(opts: { strict?: boolean } = {}): { missing: CalcNodeType[]; structural: CalcNodeType[] } {
        const missing: CalcNodeType[] = [];

        for (const type of EXPECTED_NODE_TYPES) {
            if (!this.handlers.has(type)) missing.push(type);
        }

        if (opts.strict !== false && missing.length > 0) {
            throw new Error(
                `NodeHandlerRegistry is missing handlers for: ${missing.join(", ")}. ` +
                `Register them in bootstrap.ts.`
            );
        }

        return {
            missing,
            structural: [...STRUCTURAL_NODE_TYPES],
        };
    }

    registeredTypes(): CalcNodeType[] {
        return Array.from(this.handlers.keys());
    }
}