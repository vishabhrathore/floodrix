import { realtimeMiddleware } from "@inngest/realtime/middleware";
import { Inngest } from "inngest";

// ─── Event Types ─────────────────────────────────────────────────────────

type Events = {
  // Batch processing — triggered when user uploads Excel and clicks "Process"
  "batch/process": {
    data: {
      batchJobId: string;
      workflowId: string;
      userId: string;
    };
  };

  // Workflow timeout — scheduled when a workflow starts, cancelled on completion
  "workflow/run.timeout": {
    data: {
      sessionId: string;
      workflowId: string;
      userId: string;
      timeoutMs: number;
    };
  };

  // Audit log cleanup — runs on a cron schedule
  "audit/cleanup": {
    data: {
      retentionDays: number;
    };
  };

  // Registry update notification — when a formula/table is published
  "registry/version.published": {
    data: {
      registryType: "FORMULA" | "TABLE";
      registryId: string;
      version: number;
      publishedBy: string;
      affectedWorkflowCount: number;
    };
  };

  // Legacy/Automation execute workflow
  "workflows/execute.workflow": {
    data: {
      workflowId: string;
      initialData?: any;
    }
  }
};

export const inngest = new Inngest({
  id: "Floodrix",
  schemas: new Map() as any, // Type inference comes from Events generic
  middleware: [realtimeMiddleware()],
});

export type { Events };
