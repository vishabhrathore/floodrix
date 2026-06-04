import pino from "pino";

let prettyStream: any = undefined;

if (process.env.NODE_ENV !== "production") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pretty = require("pino-pretty");
    prettyStream = pretty({
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    });
  } catch (err) {
    // Fallback if pino-pretty isn't available
  }
}

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
    base: process.env.NODE_ENV === "production" ? {
      env: process.env.NODE_ENV,
    } : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  prettyStream
);

/**
 * Sanitizes an object before it is passed to the logger to avoid
 * serializing massive datasets (e.g. 100M element matrices), preventing
 * Out-Of-Memory (OOM) crashes in the logger.
 */
export function sanitizeForLog(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "number" || typeof obj === "boolean") return obj;
  if (typeof obj === "string") {
    return obj.length > 500 ? obj.slice(0, 500) + "..." : obj;
  }
  if (Array.isArray(obj)) {
    if (obj.length > 20) {
      return `[Array of length ${obj.length}]`;
    }
    return obj.map(sanitizeForLog);
  }
  if (typeof obj === "object") {
    // Detect MathJS matrix
    if (obj.isMatrix || (obj.constructor && obj.constructor.name === "Matrix")) {
      const sizeStr = Array.isArray(obj.size) ? obj.size.join("x") : String(obj.size);
      return `[Matrix: ${sizeStr}]`;
    }
    const keys = Object.keys(obj);
    if (keys.length > 50) {
      return `[Object with ${keys.length} keys]`;
    }
    const result: Record<string, any> = {};
    for (const key of keys) {
      result[key] = sanitizeForLog(obj[key]);
    }
    return result;
  }
  return String(obj);
}
