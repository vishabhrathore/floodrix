// src/features/calc-workflows/server/params-loader.ts

import { createLoader } from "nuqs/server";
import { calcWorkflowParams } from "../params";

export const calcWorkflowParamsLoader = createLoader(calcWorkflowParams);
