import { parseAsInteger, parseAsString, createLoader } from "nuqs/server";
import { PAGINATION } from "@/config/constants";

export const calcWorkflowParams = {
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),
  search: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
  organizationId: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
  status: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
};

export const calcWorkflowParamsLoader = createLoader(calcWorkflowParams);