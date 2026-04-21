// ═══════════════════════════════════════════════════════════════════════════
//  src/server/engine/ExecutionEventEmitter.ts
//
//  Typed event bus the executor uses to fan out execution events to listeners.
//
//  Bug 12 fix (from mental model): listener error isolation.
//    If DatabaseListener throws, AuditListener still runs.
//    All listener errors are collected; the FIRST one is rethrown to the
//    caller after all listeners have completed.
//
//  This means a misbehaving audit listener can't break a workflow's DB writes,
//  and vice versa.
// ═══════════════════════════════════════════════════════════════════════════

import type { ExecutionEvent } from "./types";

export type ListenerFn = (event: ExecutionEvent) => void | Promise<void>;

/**
 * Listeners can declare a priority. Lower numbers run first.
 * Useful when one listener depends on another's side effects (rare).
 *
 * Default priority is 100. DatabaseListener uses 50 (DB writes happen first),
 * AuditListener uses 100, MetricsListener can use 200 (after everything else).
 */
export interface RegisteredListener {
    fn: ListenerFn;
    priority: number;
    name: string;
}

export class ExecutionEventEmitter {
    private listeners: RegisteredListener[] = [];

    on(fn: ListenerFn, opts: { priority?: number; name?: string } = {}): void {
        this.listeners.push({
            fn,
            priority: opts.priority ?? 100,
            name: opts.name ?? "anonymous",
        });
        // Keep listeners sorted so iteration order is deterministic.
        this.listeners.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Emit an event to all listeners.
     *
     * Returns a promise that resolves when every listener has finished.
     * If any listener threw, the FIRST error is rethrown after all complete.
     *
     * The executor MUST await this — Bug 6 from the mental model was the
     * executor dropping this promise, swallowing DB errors.
     */
    async emit(event: ExecutionEvent): Promise<void> {
        const errors: Error[] = [];

        for (const listener of this.listeners) {
            try {
                await listener.fn(event);
            } catch (err) {
                const wrapped = err instanceof Error ? err : new Error(String(err));
                // Annotate so we can tell which listener failed
                wrapped.message = `[listener:${listener.name}] ${wrapped.message}`;
                errors.push(wrapped);
            }
        }

        if (errors.length > 0) {
            // Surface the first error; log the rest so they're not silently lost
            if (errors.length > 1) {
                for (let i = 1; i < errors.length; i++) {
                    console.error("Additional listener error:", errors[i]);
                }
            }
            throw errors[0];
        }
    }

    /** For tests — clear all listeners. */
    clear(): void {
        this.listeners = [];
    }

    /** Introspection — useful in bootstrap to verify wiring. */
    listenerNames(): string[] {
        return this.listeners.map((l) => l.name);
    }
}