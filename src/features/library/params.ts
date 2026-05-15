import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

import { PAGINATION } from "@/config/constants";

export const libraryParams = {
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  status: parseAsString
    .withDefault("PENDING") // Default to the review queue view
    .withOptions({ clearOnDefault: true }),
};

export const libraryParamsLoader = createLoader(libraryParams);
