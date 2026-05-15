import { type PrismaClient } from "@/generated/prisma";

import { AuditLogger } from "./AuditLogger";

/**
 * CalcContext - Encapsulates the execution environment for a workflow run.
 * It carries the database client, the current actor, and the organization context.
 */
export class CalcContext {
  public readonly audit: AuditLogger;

  constructor(
    public readonly db: PrismaClient,
    public readonly actorId: string | null,
    public readonly organizationId: string,
  ) {
    this.audit = new AuditLogger(db, actorId, organizationId);
  }
}
