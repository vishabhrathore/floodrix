// src/policy/policy.types.ts
import { RequestContext } from "../context/context.types";

export type ActionType = "view" | "edit" | "delete" | "create" | "run";
export type ResourceType =
  | "workflow"
  | "formula"
  | "table"
  | "workspace"
  | "batch";

export interface PolicyInput {
  action: ActionType;
  resource: ResourceType;
  context: RequestContext;
}

export type PolicyResult = boolean;

// The standard contract for every feature
export type PolicyHandler = (ctx: RequestContext) => boolean;
export type ResourcePolicyMap = Partial<Record<ActionType, PolicyHandler>>;
