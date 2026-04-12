// use-formulas-params.ts
import { useQueryStates } from "nuqs";
import { formulaParams } from "../params";

export const useFormulasParams = () => {
  return useQueryStates(formulaParams);
};