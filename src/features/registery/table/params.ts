import {
  createLoader,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

import { PAGINATION } from "@/config/constants";
import { TableType, Visibility } from "@/generated/prisma";

export const tableParams = {
  // Pagination
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),

  // Search & Sort
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  sortBy: parseAsStringEnum([
    "createdAt",
    "updatedAt",
    "name",
    "currentVersion",
  ])
    .withDefault("updatedAt")
    .withOptions({ clearOnDefault: true }),
  sortOrder: parseAsStringEnum(["asc", "desc"])
    .withDefault("desc")
    .withOptions({ clearOnDefault: true }),

  // Table Specific Filters
  tableType: parseAsStringEnum(Object.values(TableType)).withOptions({
    clearOnDefault: true,
  }),
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
  visibility: parseAsStringEnum(Object.values(Visibility))
    .withDefault("PRIVATE")
    .withOptions({ clearOnDefault: true }),

  // Auditing
  createdBy: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),
  showDeleted: parseAsBoolean
    .withDefault(false)
    .withOptions({ clearOnDefault: true }),
};
