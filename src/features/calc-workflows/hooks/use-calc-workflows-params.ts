// src/features/calc-workflows/hooks/use-calc-workflows-params.ts
import { useQueryStates } from "nuqs";

import { calcWorkflowParams } from "../params";

export function useCalcWorkflowsParams() {
  return useQueryStates(calcWorkflowParams);
}
