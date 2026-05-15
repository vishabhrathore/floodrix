import {
  createLoader,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

import { PAGINATION } from "@/config/constants";
import { LibraryStatus, Visibility, WorkflowStatus } from "@/generated/prisma";

export const calcWorkflowParams = {
  page: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE)
    .withOptions({ clearOnDefault: true }),
  pageSize: parseAsInteger
    .withDefault(PAGINATION.DEFAULT_PAGE_SIZE)
    .withOptions({ clearOnDefault: true }),
  search: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  organizationId: parseAsString
    .withDefault("")
    .withOptions({ clearOnDefault: true }),

  sortBy: parseAsStringEnum(["createdAt", "updatedAt", "name"])
    .withDefault("updatedAt")
    .withOptions({ clearOnDefault: true }),
  sortOrder: parseAsStringEnum(["asc", "desc"])
    .withDefault("desc")
    .withOptions({ clearOnDefault: true }),

  status: parseAsStringEnum(Object.values(WorkflowStatus)).withOptions({
    clearOnDefault: true,
  }),
  visibility: parseAsStringEnum(Object.values(Visibility)).withOptions({
    clearOnDefault: true,
  }),
  libraryStatus: parseAsStringEnum(Object.values(LibraryStatus)).withOptions({
    clearOnDefault: true,
  }),

  category: parseAsString.withDefault("").withOptions({ clearOnDefault: true }),
  tags: parseAsArrayOf(parseAsString)
    .withDefault([])
    .withOptions({ clearOnDefault: true }),
};
