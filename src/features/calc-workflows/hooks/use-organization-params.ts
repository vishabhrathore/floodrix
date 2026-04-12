import { useQueryStates } from "nuqs";
import { calcWorkflowParams } from "../params";

export const useCalcWorkflowsParams = () => {
  return useQueryStates(calcWorkflowParams);
};