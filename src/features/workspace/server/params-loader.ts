import { createLoader } from "nuqs/server";

import { workspaceParams } from "../params";

export const workspaceParamsLoader = createLoader(workspaceParams);
