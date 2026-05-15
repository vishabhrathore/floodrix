export type WorkflowContext = Record<string, unknown>;

export interface StepTools {
  run: <T>(id: string, fn: () => Promise<T>) => Promise<T>;
}

export interface NodeExecutorParams<TData = Record<string, unknown>> {
  data: TData;
  nodeId: string;
  userId: string;
  context: WorkflowContext;
  step: StepTools;
  publish: (event: any) => Promise<void>;
}

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
