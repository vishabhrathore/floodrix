import * as dotenv from "dotenv";
dotenv.config();

import prisma from "../../src/lib/db";
import {
  CalcNodeType,
  VariableDataType,
  VariableSourceType,
  VariableScope,
  CollaboratorPermission,
} from "../../src/generated/prisma";

const WORKFLOW_ID = "mock_node_capability_demo_id";
const WORKFLOW_SLUG = "node-capability-demo";

async function main() {
  console.log("🌱 Starting seeding of Complete Node Capability Demo workflow...");

  const orgId = "org_admin_personal";
  const actorId = "actor_superadmin";

  // Check that admin org and actor exist
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new Error(`Organization with ID ${orgId} not found.`);
  }

  const actor = await prisma.calcActor.findUnique({ where: { id: actorId } });
  if (!actor) {
    throw new Error(`Actor with ID ${actorId} not found.`);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Cleanup existing if it exists
    const existing = await tx.calcWorkflow.findUnique({
      where: {
        organizationId_slug: {
          organizationId: orgId,
          slug: WORKFLOW_SLUG,
        },
      },
      select: { id: true },
    });

    if (existing) {
      console.log(`  🗑️ Removing existing workflow ${existing.id}...`);
      await tx.calcEdge.deleteMany({ where: { calcWorkflowId: existing.id } });
      await tx.calcNode.deleteMany({ where: { calcWorkflowId: existing.id } });
      await tx.calcVariable.deleteMany({ where: { calcWorkflowId: existing.id } });
      await tx.calcCollaborator.deleteMany({ where: { calcWorkflowId: existing.id } });
      await tx.calcVersion.deleteMany({ where: { calcWorkflowId: existing.id } });
      await tx.calcWorkflow.delete({ where: { id: existing.id } });
    }

    // 2. Create the workflow
    console.log("  Creating workflow...");
    const workflow = await tx.calcWorkflow.create({
      data: {
        id: WORKFLOW_ID,
        organizationId: orgId,
        name: "Complete Node Capability Demo",
        slug: WORKFLOW_SLUG,
        description: "A comprehensive calculation workflow exercising all 11 core node types and functionalities.",
        category: "Hydrology",
        tags: ["demo", "capability", "test"],
        status: "PUBLISHED",
        visibility: "PRIVATE",
        metadata: {
          reference: "Floodrix QA Specs",
          region: "Test Beds",
        },
      },
    });

    // 3. Create the nodes
    console.log("  Creating nodes...");
    
    // INPUT Node
    const inputNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_input",
        type: "INPUT",
        label: "Catchment Inputs",
        description: "Enter catchment properties and choose zone",
        positionX: 100,
        positionY: 200,
        sortOrder: 0,
        config: {
          fields: [
            {
              key: "x_area",
              label: "Catchment Area",
              data_type: "number",
              unit: "Km²",
              default: 10.0,
              required: true,
              hint: "Total catchment drainage area",
            },
            {
              key: "x_slope",
              label: "Average Slope",
              data_type: "number",
              unit: "ratio",
              default: 0.02,
              required: true,
              hint: "Catchment slope as a decimal ratio",
            },
            {
              key: "x_zone",
              label: "Hydrological Zone",
              data_type: "mcq",
              unit: "—",
              default: "Zone 3a",
              required: true,
              hint: "Regional hydrological division",
              mcq_options: [
                {
                  label: "Zone 3a",
                  variables: [{ key: "zone_factor", value: 1.25 }],
                },
                {
                  label: "Zone 3b",
                  variables: [{ key: "zone_factor", value: 1.75 }],
                },
              ],
            },
          ],
          pause_execution: true,
        },
      },
    });

    // FORMULA Node
    const formulaNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_formula",
        type: "FORMULA",
        label: "Area Factor Calculation",
        description: "Evaluates the area-zone empirical factor",
        positionX: 450,
        positionY: 200,
        sortOrder: 1,
        config: {
          source: "inline",
          expression: "x_area * zone_factor + 5",
          display_expression: "area_factor = Area * ZoneFactor + 5",
          result_variable: "area_factor",
          result_unit: "—",
        },
      },
    });

    // MULTI_FORMULA Node
    const multiFormulaNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_multi_formula",
        type: "MULTI_FORMULA",
        label: "Intermediate Variables",
        description: "Evaluates intermediate factors in sequence",
        positionX: 800,
        positionY: 200,
        sortOrder: 2,
        config: {
          formulas: [
            {
              expr: "area_factor * 2",
              result_var: "multi_a",
              label: "Multi-A Factor",
              unit: "—",
            },
            {
              expr: "multi_a + 10",
              result_var: "multi_b",
              label: "Multi-B Threshold",
              unit: "—",
            },
          ],
        },
      },
    });

    // LOOKUP_TABLE Node
    const lookupNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_lookup",
        type: "LOOKUP_TABLE",
        label: "Soil Hydrologic Group Coefficient",
        description: "Looks up soil coefficient exact value",
        positionX: 1150,
        positionY: 200,
        sortOrder: 3,
        config: {
          source: "inline",
          lookup_key: "x_zone",
          result_variable: "lookup_val",
          match_mode: "exact",
          rows: [
            { key: "Zone 3a", value: 1.15, label: "Zone 3a Hydrologic Soil Coeff" },
            { key: "Zone 3b", value: 1.85, label: "Zone 3b Hydrologic Soil Coeff" },
          ],
        },
      },
    });

    // GRAPH_INTERPOLATION Node
    const interpNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_interp",
        type: "GRAPH_INTERPOLATION",
        label: "Discharge Rate Interpolation",
        description: "Interpolates a curve to find y based on multi_b",
        positionX: 1500,
        positionY: 200,
        sortOrder: 4,
        config: {
          source: "inline",
          input_variable: "multi_b",
          result_variable: "interp_y",
          interpolation_method: "linear",
          extrapolation: "clamp",
          data_points: [
            { x: 0, y: 10 },
            { x: 10, y: 25 },
            { x: 20, y: 50 },
            { x: 50, y: 150 },
            { x: 100, y: 400 },
          ],
        },
      },
    });

    // DECISION Node
    const decisionNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_decision",
        type: "DECISION",
        label: "Multi-Threshold Routing Path",
        description: "Determines the peak routing multiplier",
        positionX: 1850,
        positionY: 200,
        sortOrder: 5,
        config: {
          condition: "interp_y > 45",
          branches: {
            true: {
              label: "High Flow Routing",
              set_variables: { dec_multiplier: 1.5 },
            },
            false: {
              label: "Normal Flow Routing",
              set_variables: { dec_multiplier: 1.0 },
            },
          },
        },
      },
    });

    // CUSTOM_CODE Node
    const customCodeNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_custom_code",
        type: "CUSTOM_CODE",
        label: "Hydrograph Matrix Generator",
        description: "Computes flow rates series in JS",
        positionX: 2200,
        positionY: 200,
        sortOrder: 6,
        config: {
          code: `const area = inputs.x_area || 10;
const mult = inputs.dec_multiplier || 1.0;
const lookup = inputs.lookup_val || 1.0;
const interp = inputs.interp_y || 10.0;

// Generate a 12-hour times series and flow rates series
const times = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const flows = times.map(t => {
  const base = Math.sin(t * Math.PI / 12);
  const val = base * base * (interp + area * lookup * mult);
  return Math.round(val * 100) / 100;
});
const peak = Math.max(...flows);

return {
  times_arr: times,
  flows_arr: flows,
  peak_flow_val: peak
};`,
          output_variables: ["times_arr", "flows_arr", "peak_flow_val"],
          use_worker: true,
        },
      },
    });

    // UNIT_CONVERSION Node
    const unitConvNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_unit_conv",
        type: "UNIT_CONVERSION",
        label: "Peak Flow Unit Conversion",
        description: "Converts simulated peak flow from Cumecs to cusecs",
        positionX: 2550,
        positionY: 200,
        sortOrder: 7,
        config: {
          input_variable: "peak_flow_val",
          result_variable: "peak_flow_cusecs",
          input_unit: "Cumecs",
          output_unit: "cusecs",
        },
      },
    });

    // VALIDATION Node
    const validationNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_validation",
        type: "VALIDATION",
        label: "Safety Margins Check",
        description: "Validates peak flow and catchment size warnings",
        positionX: 2900,
        positionY: 200,
        sortOrder: 8,
        config: {
          checks: [
            {
              expr: "peak_flow_val > 0",
              severity: "error",
              message: "Peak flow must be positive and non-zero",
            },
            {
              expr: "x_area < 50",
              severity: "warning",
              message: "Catchment area is large; routing checks recommended",
            },
          ],
          on_error: "warn",
        },
      },
    });

    // CHART Node
    const chartNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_chart",
        type: "CHART",
        label: "Discharge Hydrograph Visualization",
        description: "Generates simulated flow SVG graph",
        positionX: 3250,
        positionY: 200,
        sortOrder: 9,
        config: {
          chart_type: "area",
          title: "Simulated Runoff Hydrograph",
          x_variable: "times_arr",
          y_variables: ["flows_arr"],
          x_label: "Time (hours)",
          y_label: "Discharge (Cumecs)",
          colors: ["#2563eb"],
          width: 600,
          height: 300,
          output_variable: "hydrograph_svg",
        },
      },
    });

    // DISPLAY Node
    const displayNode = await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_display",
        type: "DISPLAY",
        label: "Final Peak Selection",
        description: "Computes adopted design peak flow rate",
        positionX: 3600,
        positionY: 200,
        sortOrder: 10,
        config: {
          mode: "single",
          compare_variables: [
            {
              key: "peak_flow_val",
              method: "Simulated Peak Flow",
              label: "Simulated Peak",
            },
          ],
          selection_rule: "max",
          result_variable: "adopted_peak_flow",
          result_unit: "Cumecs",
        },
      },
    });

    // COMMENT Node
    await tx.calcNode.create({
      data: {
        calcWorkflowId: workflow.id,
        id: "node_comment",
        type: "COMMENT",
        label: "Workflow Overview",
        description: "Capability overview comment block",
        positionX: 100,
        positionY: 50,
        sortOrder: 11,
        config: {
          text: "This workflow serves as a comprehensive capability test. It exercises:\n1. INPUT (User selection & numerical input)\n2. FORMULA (Registry evaluation)\n3. MULTI_FORMULA (Sequence evaluation)\n4. LOOKUP_TABLE (Key matching)\n5. GRAPH_INTERPOLATION (Spline/linear curve search)\n6. DECISION (Conditional branching)\n7. CUSTOM_CODE (Multi-variable matrix generator in JS)\n8. UNIT_CONVERSION (Standard units library)\n9. VALIDATION (Rules & warnings assertions)\n10. CHART (Dynamic SVG rendering)\n11. DISPLAY (Design value optimization and ranking)",
          color: "#e0f2fe",
        },
      },
    });

    // 4. Create Edges
    console.log("  Creating edges...");
    const edgesDef = [
      { source: "node_input", target: "node_formula" },
      { source: "node_formula", target: "node_multi_formula" },
      { source: "node_multi_formula", target: "node_lookup" },
      { source: "node_lookup", target: "node_interp" },
      { source: "node_interp", target: "node_decision" },
      { source: "node_decision", target: "node_custom_code" },
      { source: "node_custom_code", target: "node_unit_conv" },
      { source: "node_unit_conv", target: "node_validation" },
      { source: "node_validation", target: "node_chart" },
      { source: "node_chart", target: "node_display" },
    ];

    await tx.calcEdge.createMany({
      data: edgesDef.map((e, idx) => ({
        calcWorkflowId: workflow.id,
        sourceNodeId: e.source,
        targetNodeId: e.target,
        sourceHandle: "output",
        targetHandle: "input",
        sortOrder: idx,
      })),
    });

    // 5. Create Variables
    console.log("  Creating variables...");
    const variablesDef = [
      // Input Variables
      {
        contextKey: "x_area",
        displayLabel: "Catchment Area",
        notation: "x_area",
        dataType: VariableDataType.NUMBER,
        unit: "Km²",
        defaultValue: 10.0,
        sourceNodeId: "node_input",
        sourceType: VariableSourceType.USER_INPUT,
      },
      {
        contextKey: "x_slope",
        displayLabel: "Average Slope",
        notation: "x_slope",
        dataType: VariableDataType.NUMBER,
        unit: "ratio",
        defaultValue: 0.02,
        sourceNodeId: "node_input",
        sourceType: VariableSourceType.USER_INPUT,
      },
      {
        contextKey: "x_zone",
        displayLabel: "Hydrological Zone",
        notation: "x_zone",
        dataType: VariableDataType.STRING,
        unit: null,
        defaultValue: "Zone 3a",
        sourceNodeId: "node_input",
        sourceType: VariableSourceType.USER_INPUT,
      },
      {
        contextKey: "zone_factor",
        displayLabel: "Zone Factor",
        notation: "zone_factor",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: 1.25,
        sourceNodeId: "node_input",
        sourceType: VariableSourceType.USER_INPUT,
      },
      // Formula Output Variable
      {
        contextKey: "area_factor",
        displayLabel: "Area Factor",
        notation: "area_factor",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_formula",
        sourceType: VariableSourceType.FORMULA_OUTPUT,
      },
      // Multi Formula Output Variables
      {
        contextKey: "multi_a",
        displayLabel: "Multi-A Factor",
        notation: "multi_a",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_multi_formula",
        sourceType: VariableSourceType.FORMULA_OUTPUT,
      },
      {
        contextKey: "multi_b",
        displayLabel: "Multi-B Threshold",
        notation: "multi_b",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_multi_formula",
        sourceType: VariableSourceType.FORMULA_OUTPUT,
      },
      // Lookup Variable
      {
        contextKey: "lookup_val",
        displayLabel: "Soil Coefficient",
        notation: "lookup_val",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_lookup",
        sourceType: VariableSourceType.LOOKUP_RESULT,
      },
      // Interpolation Variable
      {
        contextKey: "interp_y",
        displayLabel: "Discharge Interpolated",
        notation: "interp_y",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_interp",
        sourceType: VariableSourceType.INTERPOLATION_RESULT,
      },
      // Decision Variable
      {
        contextKey: "dec_multiplier",
        displayLabel: "Routing Multiplier",
        notation: "dec_multiplier",
        dataType: VariableDataType.NUMBER,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_decision",
        sourceType: VariableSourceType.DECISION_SET,
      },
      // Custom Code Variable
      {
        contextKey: "times_arr",
        displayLabel: "Hydrograph Time Steps",
        notation: "times_arr",
        dataType: VariableDataType.ARRAY,
        unit: "hr",
        defaultValue: null,
        sourceNodeId: "node_custom_code",
        sourceType: VariableSourceType.COMPUTED,
      },
      {
        contextKey: "flows_arr",
        displayLabel: "Hydrograph Flows",
        notation: "flows_arr",
        dataType: VariableDataType.ARRAY,
        unit: "Cumecs",
        defaultValue: null,
        sourceNodeId: "node_custom_code",
        sourceType: VariableSourceType.COMPUTED,
      },
      {
        contextKey: "peak_flow_val",
        displayLabel: "Simulated Peak Flow",
        notation: "peak_flow_val",
        dataType: VariableDataType.NUMBER,
        unit: "Cumecs",
        defaultValue: null,
        sourceNodeId: "node_custom_code",
        sourceType: VariableSourceType.COMPUTED,
      },
      // Unit Conversion Variable
      {
        contextKey: "peak_flow_cusecs",
        displayLabel: "Peak Flow in Cusecs",
        notation: "peak_flow_cusecs",
        dataType: VariableDataType.NUMBER,
        unit: "cusecs",
        defaultValue: null,
        sourceNodeId: "node_unit_conv",
        sourceType: VariableSourceType.COMPUTED,
      },
      // Chart Variable
      {
        contextKey: "hydrograph_svg",
        displayLabel: "Hydrograph SVG Chart",
        notation: "hydrograph_svg",
        dataType: VariableDataType.STRING,
        unit: null,
        defaultValue: null,
        sourceNodeId: "node_chart",
        sourceType: VariableSourceType.COMPUTED,
      },
      // Display Variable
      {
        contextKey: "adopted_peak_flow",
        displayLabel: "Adopted Peak Flow",
        notation: "adopted_peak_flow",
        dataType: VariableDataType.NUMBER,
        unit: "Cumecs",
        defaultValue: null,
        sourceNodeId: "node_display",
        sourceType: VariableSourceType.COMPUTED,
      },
    ];

    await tx.calcVariable.createMany({
      data: variablesDef.map((v, idx) => ({
        calcWorkflowId: workflow.id,
        contextKey: v.contextKey,
        displayLabel: v.displayLabel,
        notation: v.notation,
        dataType: v.dataType,
        unit: v.unit,
        defaultValue: v.defaultValue !== null ? v.defaultValue : undefined,
        sourceNodeId: v.sourceNodeId,
        sourceType: v.sourceType,
        scope: VariableScope.GLOBAL,
        sortOrder: idx,
      })),
    });

    // 6. Create Collaborator
    await tx.calcCollaborator.create({
      data: {
        calcWorkflowId: workflow.id,
        actorId,
        permission: CollaboratorPermission.ADMIN,
      },
    });

    // 7. Create initial Version
    const version = await tx.calcVersion.create({
      data: {
        calcWorkflowId: workflow.id,
        version: 1,
        changelog: "Seeded complete node capability demo workflow",
        publishedBy: actorId,
        snapshot: {
          nodesCount: 12,
          edgesCount: edgesDef.length,
        },
      },
    });

    // 8. Update workflow current version
    await tx.calcWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentVersionId: version.id,
      },
    });

    // 9. Add to WorkspaceNode folder if missing
    // Find the folder named "Indian Formulas" under the "Flood Discharge" workspace
    const folder = await tx.workspaceNode.findFirst({
      where: {
        workspace: { organizationId: orgId },
        nodeType: "FOLDER",
        name: "Indian Formulas",
      },
    });

    if (folder) {
      console.log(`  Adding workflow link to workspace folder "${folder.name}" (${folder.id})...`);
      // Check if already linked
      const existingLink = await tx.workspaceNode.findFirst({
        where: {
          parentId: folder.id,
          linkedWorkflowId: workflow.id,
        },
      });

      if (!existingLink) {
        // Find max sortOrder
        const maxSort = await tx.workspaceNode.aggregate({
          where: { parentId: folder.id },
          _max: { sortOrder: true },
        });
        const nextSort = (maxSort._max.sortOrder ?? 0) + 1;

        await tx.workspaceNode.create({
          data: {
            workspaceId: folder.workspaceId,
            parentId: folder.id,
            nodeType: "WORKFLOW_LINK",
            name: workflow.name,
            linkedWorkflowId: workflow.id,
            sortOrder: nextSort,
          },
        });
      }
    }
  });

  console.log(`\n🎉 Seeded Complete Capability Demo workflow successfully with ID: ${WORKFLOW_ID}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
