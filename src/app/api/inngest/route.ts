import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { executeWorkflow } from "@/inngest/functions";

// Create an API that serves zero functions
import { processBatchJob } from "@/features/workflow-canvas/engine/batch-executor";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    processBatchJob,
  ],
});
