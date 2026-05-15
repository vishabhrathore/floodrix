// use-tables-params.ts
import { useQueryStates } from "nuqs";

import { tableParams } from "../params";

export const useTablesParams = () => {
  return useQueryStates(tableParams);
};
