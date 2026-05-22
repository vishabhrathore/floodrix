import { workflowPolicies } from "@/features/calc-workflows/server/policy";
import { formulaPolicies } from "@/features/registery/formula/server/policy";
import { tablePolicies } from "@/features/registery/table/server/policy";
import { workspacePolicies } from "@/features/workspace-canvas/server/policy";

import {
  PolicyInput,
  PolicyResult,
  ResourcePolicyMap,
  ResourceType,
} from "./policy.types";

const policyRegistry: Record<ResourceType, ResourcePolicyMap> = {
  workflow: workflowPolicies, // workflowPolicies,
  formula: formulaPolicies,
  table: tablePolicies, // tablePolicies,
  workspace: workspacePolicies,
  batch: {}, // Default empty, add batchPolicies later
};

export function evaluatePolicy(input: PolicyInput): PolicyResult {
  const { action, resource, context } = input;

  if (context.user.globalRole === "SUPER_ADMIN") return true;
  const resourcePolicy = policyRegistry[resource];
  const handler = resourcePolicy?.[action];

  if (!handler) {
    console.warn(
      JSON.stringify({
        type: "POLICY_UNHANDLED",
        resource,
        action,
        timestamp: new Date().toISOString(),
      }),
    );
    return false; // Default Deny
  }

  // 3. Execute the handler
  return handler(context);
}
