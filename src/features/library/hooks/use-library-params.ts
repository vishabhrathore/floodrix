import { useQueryStates } from "nuqs";

import { libraryParams } from "@/features/library/params";

export const useLibraryParams = () => {
  return useQueryStates(libraryParams);
};
