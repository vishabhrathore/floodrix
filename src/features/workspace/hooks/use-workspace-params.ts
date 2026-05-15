import { useQueryStates } from "nuqs";

import { workspaceParams } from "../params";

export const useWorkspacesParams = () => {
  return useQueryStates(workspaceParams);
};
