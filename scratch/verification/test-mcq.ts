import { InputHandler } from "../src/server/engine/handlers/InputHandler";
import { DefaultVariableStore } from "../src/server/engine/VariableStore";
import type { ExecutionContext, NodeOutcome } from "../src/server/engine/types";

async function runTest() {
  console.log("Starting MCQ InputHandler Test...");

  const handler = new InputHandler();

  // 1. Create a mock execution context with an MCQ input field config
  const mockNode = {
    id: "node_1",
    type: "INPUT" as const,
    label: "Soil Properties",
    config: {
      fields: [
        {
          key: "soil_type",
          label: "Soil Type",
          data_type: "mcq" as const,
          mcq_options: [
            {
              label: "Sandy Soil",
              variables: [
                { key: "C", value: 0.3 },
                { key: "n", value: 0.45 }
              ]
            },
            {
              label: "Clayey Soil",
              variables: [
                { key: "C", value: 0.8 },
                { key: "n", value: 0.25 }
              ]
            }
          ]
        }
      ],
      pause_execution: true
    }
  };

  const variablesStore = new DefaultVariableStore();

  const ctx: ExecutionContext = {
    node: mockNode as any,
    variables: variablesStore,
    session: {
      id: "session_1",
      calcWorkflowId: "wf_1",
      actorId: "actor_1",
      status: "RUNNING",
      variables: {},
      currentIndex: 0,
      executionOrder: [],
      createdAt: new Date(),
      updatedAt: new Date()
    } as any,
    workflow: {
      id: "wf_1",
      name: "Test Workflow",
      organizationId: "org_1",
      slug: "test-workflow",
      createdAt: new Date(),
      updatedAt: new Date()
    } as any,
    systemVariables: new Map()
  };

  // 2. Execute with no variables set. Should return paused (awaiting_user_input)
  console.log("\n--- Test Case 1: Execute with no variables set ---");
  let outcome = await handler.execute(ctx);
  console.log("Outcome kind:", outcome.kind);
  if (outcome.kind === "paused") {
    console.log("Reason:", outcome.reason);
    console.log("Fields expected:", outcome.fields.map(f => f.key));
  } else {
    console.error("FAIL: Expected paused outcome");
  }

  // 3. Set MCQ selection to "Sandy Soil" and execute again
  console.log("\n--- Test Case 2: Set MCQ option to 'Sandy Soil' and execute ---");
  ctx.variables.set("soil_type", "Sandy Soil" as any);
  outcome = await handler.execute(ctx);
  console.log("Outcome kind:", outcome.kind);
  if (outcome.kind === "completed") {
    console.log("Outputs resolved:", outcome.outputs);
    console.log("Variable store contains C:", ctx.variables.get("C"));
    console.log("Variable store contains n:", ctx.variables.get("n"));

    if (ctx.variables.get("C") === 0.3 && ctx.variables.get("n") === 0.45) {
      console.log("SUCCESS: MCQ option variables injected successfully!");
    } else {
      console.error("FAIL: Incorrect MCQ option variables injected");
    }
  } else {
    console.error("FAIL: Expected completed outcome");
  }

  // 4. Create another context, set MCQ selection to "Clayey Soil" and execute again
  console.log("\n--- Test Case 3: Set MCQ option to 'Clayey Soil' and execute ---");
  const variablesStore2 = new DefaultVariableStore();
  const ctx2: ExecutionContext = {
    ...ctx,
    variables: variablesStore2
  };
  ctx2.variables.set("soil_type", "Clayey Soil" as any);
  outcome = await handler.execute(ctx2);
  console.log("Outcome kind:", outcome.kind);
  if (outcome.kind === "completed") {
    console.log("Outputs resolved:", outcome.outputs);
    console.log("Variable store contains C:", ctx2.variables.get("C"));
    console.log("Variable store contains n:", ctx2.variables.get("n"));

    if (ctx2.variables.get("C") === 0.8 && ctx2.variables.get("n") === 0.25) {
      console.log("SUCCESS: Clayey Soil option variables injected successfully!");
    } else {
      console.error("FAIL: Incorrect MCQ option variables injected for Clayey Soil");
    }
  } else {
    console.error("FAIL: Expected completed outcome");
  }
}

runTest().catch(console.error);
