import { useQueryStates } from "nuqs";

import { adminUserParams } from "../params";

export const useAdminUsersParams = () => {
  return useQueryStates(adminUserParams);
};
