import { createLoader } from "nuqs/server";
import { calcWorkflowParams } from "../params";

export const calcWorkflowParamsLoader = createLoader(calcWorkflowParams);
