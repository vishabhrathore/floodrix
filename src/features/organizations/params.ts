import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

import { PAGINATION } from "@/config/constants";

export const organizationParams = {
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  status: parseAsString.withDefault("").withOptions({ clearOnDefault: true }), // For filtering by Active/Suspended
};

export const organizationParamsLoader = createLoader(organizationParams);
