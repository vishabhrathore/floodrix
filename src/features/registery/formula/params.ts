import {
  createLoader,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

import { PAGINATION } from "@/config/constants";

export const formulaParams = {
  // Pagination
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),

  // Text Search
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),

  // Sorting
  sortBy: parseAsStringEnum(["createdAt", "updatedAt", "name"])
    .withDefault("updatedAt")
    .withOptions({ clearOnDefault: true }),
  sortOrder: parseAsStringEnum(["asc", "desc"])
    .withDefault("desc")
    .withOptions({ clearOnDefault: true }),

  // Categorization
  category: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  subCategory: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
  tags: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),

  // State & Visibility
  isPublished: parseAsBoolean
    .withDefault(true)
    .withOptions({ clearOnDefault: true }),
  visibility: parseAsStringEnum(["PRIVATE", "PUBLIC"])
    .withDefault("PRIVATE")
    .withOptions({ clearOnDefault: true }),

  // Authorship & Administration
  createdBy: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
  showDeleted: parseAsBoolean
    .withDefault(false)
    .withOptions({ clearOnDefault: true }),
};
