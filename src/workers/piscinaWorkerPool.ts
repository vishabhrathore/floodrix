import { join } from "node:path";
import * as os from "node:os";
import { Piscina } from "piscina";

let piscinaInstance: Piscina | null = null;

export function getWorkflowPiscinaPool(): Piscina {
  if (!piscinaInstance) {
    piscinaInstance = new Piscina({
      filename: join(process.cwd(), "src/workers/piscinaWorker.ts"),
      minThreads: 2,
      maxThreads: Math.max(2, os.cpus().length),
      execArgv: ["--import", "tsx"],
    });
  }
  return piscinaInstance;
}
