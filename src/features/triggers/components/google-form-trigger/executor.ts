import type { NodeExecutor } from "@/features/executions/types";

type GoogleFormTriggerData = Record<string, unknown>;

export const googleFormTriggerExecutor: NodeExecutor<GoogleFormTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  const result = await step.run("google-form-trigger", async () => context);

  return result;
};
