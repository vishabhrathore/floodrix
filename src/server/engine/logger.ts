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
