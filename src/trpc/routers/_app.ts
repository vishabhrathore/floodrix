import { createTRPCRouter } from '../init';
import { workflowsRouter } from '@/features/workflows/server/routers';
import { credentialsRouter } from '@/features/credentials/server/routers';
import { executionsRouter } from '@/features/executions/server/routers';
import { dashboardRouter } from '@/features/admin/dashboard/server/routers';
import { organizationsRouter } from '@/features/organizations/server/routers';
import { calcWorkflowsRouter } from '@/features/calc-workflows/server/routers';
import { workspacesRouter } from '@/features/workspace/server/routers';
import { librarySubmissionsRouter } from '@/features/library/server/routers';
import { formulasRouter } from '@/features/registery/formula/server/routers';
import { tablesRouter } from '@/features/registery/table/server/routers';
import { calcWorkflowCanvasRouter } from '@/features/workflow-canvas/server/router';
import { calcExecutionRouter } from '@/features/workflow-canvas/server/execution-router';

import { workspaceCanvasRouter } from '@/features/workspace-canvas/server/router';

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  dashboard: dashboardRouter,
  organizations: organizationsRouter,
  calcWorkflows: calcWorkflowsRouter,
  workspaces: workspacesRouter,
  librarySubmissions: librarySubmissionsRouter,
  tables: tablesRouter,
  formulas: formulasRouter,
  calcWorkflowCanvas: calcWorkflowCanvasRouter,
  calcExecution: calcExecutionRouter,
  workspaceCanvas: workspaceCanvasRouter,
});
// export type definition of API
export type AppRouter = typeof appRouter;
