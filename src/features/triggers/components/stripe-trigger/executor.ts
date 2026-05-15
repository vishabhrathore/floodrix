import type { NodeExecutor } from "@/features/executions/types";

type StripeTriggerData = Record<string, unknown>;

export const stripeTriggerExecutor: NodeExecutor<StripeTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  const result = await step.run("stripe-trigger", async () => context);

  return result;
};
