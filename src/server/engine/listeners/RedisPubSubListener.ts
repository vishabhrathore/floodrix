import { redisCacheClient, BYPASS_REDIS } from "@/lib/redis";
import type { ExecutionEvent } from "../types";
import { logger } from "@/server/engine/logger";

export class RedisPubSubListener {
  async handle(event: ExecutionEvent): Promise<void> {
    if (BYPASS_REDIS || !redisCacheClient) {
      return;
    }

    const channel = `workflow:${event.sessionId}`;
    let pubEvent: any = null;

    switch (event.type) {
      case "session:started":
        pubEvent = {
          type: "WORKFLOW_STARTED",
          executionId: event.sessionId,
          timestamp: Date.now(),
        };
        break;

      case "node:started":
        pubEvent = {
          type: "NODE_STARTED",
          executionId: event.sessionId,
          nodeId: event.nodeId,
          nodeLabel: event.nodeLabel,
          nodeType: event.nodeType,
          stepNumber: event.stepNumber,
          timestamp: Date.now(),
        };
        break;

      case "node:completed":
        pubEvent = {
          type: "NODE_COMPLETED",
          executionId: event.sessionId,
          nodeId: event.nodeId,
          nodeLabel: event.nodeLabel,
          nodeType: event.nodeType,
          stepNumber: event.stepNumber,
          output: event.outputs,
          result: event.result,
          durationMs: event.durationMs,
          timestamp: Date.now(),
        };
        break;

      case "node:errored":
        pubEvent = {
          type: "NODE_FAILED",
          executionId: event.sessionId,
          nodeId: event.nodeId,
          nodeLabel: event.nodeLabel,
          error: event.error.message,
          timestamp: Date.now(),
        };
        break;

      case "session:completed":
        pubEvent = {
          type: "WORKFLOW_COMPLETED",
          executionId: event.sessionId,
          timestamp: Date.now(),
        };
        break;

      case "session:errored":
        pubEvent = {
          type: "WORKFLOW_FAILED",
          executionId: event.sessionId,
          error: event.error,
          timestamp: Date.now(),
        };
        break;

      case "session:cancelled":
        pubEvent = {
          type: "WORKFLOW_CANCELLED",
          executionId: event.sessionId,
          timestamp: Date.now(),
        };
        break;

      default:
        // No-op for skipped, waiting, paused internal transitions
        return;
    }

    if (pubEvent) {
      try {
        await redisCacheClient.publish(channel, JSON.stringify(pubEvent));
      } catch (err) {
        logger.error({ channel, err }, `[RedisPubSubListener] Failed to publish event to channel`);
      }
    }
  }
}
