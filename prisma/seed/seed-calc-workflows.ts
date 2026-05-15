// ═══════════════════════════════════════════════════════════════════════════
//  prisma/seed/seed-calc-workflows.ts
//  Run: npx tsx prisma/seed/seed-calc-workflows.ts
// ═══════════════════════════════════════════════════════════════════════════
import { PrismaClient } from "../../src/generated/prisma";

const prisma = new PrismaClient();

// ─── Formula definitions ─────────────────────────────────────────────────

const FORMULAS = [
  {
    slug: "dickens-formula",
    name: "Dicken's Formula",
    description:
      "Empirical flood estimation using catchment area and regional constant C. Widely used in Central & Northern India.",
    category: "Flood Discharge",
    tags: ["empirical", "indian", "IRC:SP:13-2004", "dicken"],
    expression: "C * M ^ (3/4)",
    displayExpression: "Q = C × M^(3/4)",
    reference: "Cl.4.2, IRC:SP:13-2004 · 1865",
    region: "Central & Northern India",
    resultVariable: "Q_dicken",
    resultUnit: "Cumecs",
    inputFields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        default: 24.1,
        hint: "Total drainage area upstream of bridge",
      },
      {
        key: "annual_rain",
        label: "Annual Average Rainfall",
        unit: "cm",
        default: 120,
        hint: "From rainfall records",
      },
    ],
    lookupTable: {
      name: "Dicken's Constant (C)",
      key: "annual_rain",
      resultVar: "C_dicken",
      matchMode: "range",
      rows: [
        { range: [0, 60], value: 11, label: "< 60 cm — Dry regions" },
        { range: [60, 120], value: 14, label: "60–120 cm — Moderate rainfall" },
        { range: [120, 140], value: 15, label: "120–140 cm — High rainfall" },
        { range: [140, null], value: 22, label: "> 140 cm — Western Ghats" },
      ],
    },
  },
  {
    slug: "ryves-formula",
    name: "Ryve's Formula",
    description:
      "Empirical method based on distance from coast. Applicable to Tamil Nadu, Karnataka, Andhra Pradesh.",
    category: "Flood Discharge",
    tags: ["empirical", "indian", "IRC:SP:13-2004", "ryve"],
    expression: "C * M ^ (2/3)",
    displayExpression: "Q = C × M^(2/3)",
    reference: "Cl.4.3, IRC:SP:13-2004 · 1884",
    region: "Tamil Nadu, Karnataka, Andhra Pradesh",
    resultVariable: "Q_ryve",
    resultUnit: "Cumecs",
    inputFields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        default: 24.1,
        hint: "Total drainage area",
      },
      {
        key: "dist_coast",
        label: "Distance from Coast",
        unit: "Km",
        default: 41,
        hint: "Determines Ryve's C value",
      },
    ],
    lookupTable: {
      name: "Ryve's Constant (C)",
      key: "dist_coast",
      resultVar: "C_ryve",
      matchMode: "range",
      rows: [
        { range: [0, 25], value: 6.8, label: "Coastal — ≤ 25 Km" },
        { range: [25, 160], value: 8.5, label: "Inland — 25–160 Km" },
        { range: [160, null], value: 10.0, label: "Hilly — > 160 Km" },
      ],
    },
  },
  {
    slug: "inglis-formula",
    name: "Ingli's Formula",
    description:
      "Empirical formula for Western Ghats and Maharashtra catchments.",
    category: "Flood Discharge",
    tags: ["empirical", "indian", "IRC:SP:13-2004", "ingli"],
    expression: "125 * M / sqrt(M + 10)",
    displayExpression: "Q = 125M / √(M+10)",
    reference: "Cl.4.4, IRC:SP:13-2004 · 1930",
    region: "Western Ghats, Maharashtra",
    resultVariable: "Q_ingli",
    resultUnit: "Cumecs",
    inputFields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        default: 24.1,
        hint: "For Western Ghats catchments",
      },
    ],
    lookupTable: null,
  },
  {
    slug: "creagers-formula",
    name: "Creager's Formula",
    description:
      "Empirical formula with adjustable constant C for moderate to high floods.",
    category: "Flood Discharge",
    tags: ["empirical", "indian", "IRC:SP:13-2004", "creager"],
    expression: "C_cf * (0.386 * M)^0.894 * (0.386 * M)^(-0.048)",
    displayExpression: "Q = C·(0.386A)^0.894·(0.386A)^(-0.048)",
    reference: "IRC:SP:13-2004",
    region: "Moderate Floods (C = 40–130)",
    resultVariable: "Q_creager",
    resultUnit: "Cumecs",
    inputFields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        default: 24.1,
        hint: "Total drainage area",
      },
      {
        key: "C_cf",
        label: "Creager's Constant",
        unit: "—",
        default: 65,
        hint: "40–130; 65 for moderate floods",
      },
    ],
    lookupTable: null,
  },
  {
    slug: "modified-rational-method",
    name: "Modified Rational Method",
    description:
      "For catchments ≤ 25 sq.km. Uses time of concentration and rainfall intensity.",
    category: "Flood Discharge",
    tags: ["empirical", "indian", "IRC:SP:13-2004", "rational"],
    expression: "0.028 * P * f * M * Ic",
    displayExpression: "Q = 0.028 · P · f · A · Ic",
    reference: "Cl.4.7.9, IRC:SP:13-2004",
    region: "Catchments ≤ 25 sq.km.",
    resultVariable: "Q_rational",
    resultUnit: "Cumecs",
    inputFields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        default: 24.1,
        hint: "Total drainage area",
      },
      {
        key: "L",
        label: "Basin Length",
        unit: "Km",
        default: 1.506,
        hint: "Longest water travel path",
      },
      {
        key: "H_high",
        label: "Highest Elevation",
        unit: "m",
        default: 209,
        hint: "Max elevation in catchment",
      },
      {
        key: "H_low",
        label: "Lowest Elevation",
        unit: "m",
        default: 167,
        hint: "Min elevation at bridge",
      },
      {
        key: "F_24hr",
        label: "24-hr Rainfall (100-yr)",
        unit: "cm",
        default: 25.1,
        hint: "From IMD isopluvial maps",
      },
      {
        key: "P",
        label: "Runoff Coefficient (P)",
        unit: "—",
        default: 0.4,
        hint: "Table 4.1, IRC:SP:13-2004",
      },
      {
        key: "f",
        label: "Areal Reduction (f)",
        unit: "—",
        default: 0.9,
        hint: "Fig 4.2, IRC:SP:13-2004",
      },
    ],
    lookupTable: null,
  },
  {
    slug: "fullers-formula",
    name: "Fuller's Formula",
    description: "Peak 24-hr flood estimation using return period.",
    category: "Flood Discharge",
    tags: ["empirical", "indian", "IRC:SP:13-2004", "fuller"],
    expression: "1.88 * M^0.8 * (1 + 0.8 * log10(T_return))",
    displayExpression: "QTP = 1.88 · M^0.8 · (1 + 0.8 log T)",
    reference: "IRC:SP:13-2004",
    region: "Peak 24-hr flood",
    resultVariable: "Q_fuller",
    resultUnit: "Cumecs",
    inputFields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        default: 24.1,
        hint: "Total drainage area",
      },
      {
        key: "T_return",
        label: "Return Period",
        unit: "years",
        default: 100,
        hint: "Design return period",
      },
    ],
    lookupTable: null,
  },
];

// ─── Main seed function ──────────────────────────────────────────────────

async function main() {
  console.log("\n🌊 FloodRix — Seeding calc workflows...\n");

  // 1. Find user & org
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    console.error("❌ No user found. Sign up first, then re-run this seed.");
    return;
  }
  console.log(`  User: ${user.name} (${user.email})`);

  let org = await prisma.organization.findFirst({
    where: { members: { some: { userId: user.id } } },
  });
  if (!org) {
    console.log("  Creating personal organization...");
    org = await prisma.organization.create({
      data: {
        name: `${user.name}'s Org`,
        founderId: user.id,
        isPersonal: true,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  }
  console.log(`  Org: ${org.name} (${org.id})`);

  // 2. Ensure CalcActor
  const actor = await prisma.calcActor.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: org.id },
    },
    create: { userId: user.id, organizationId: org.id, displayName: user.name },
    update: {},
  });
  console.log(`  Actor: ${actor.displayName} (${actor.id})\n`);

  // 3. Create workflows
  const createdWorkflows: { id: string; name: string; slug: string }[] = [];

  for (const formula of FORMULAS) {
    // Skip if already exists
    const existing = await prisma.calcWorkflow.findUnique({
      where: {
        organizationId_slug: { organizationId: org.id, slug: formula.slug },
      },
      select: { id: true },
    });
    if (existing) {
      console.log(`  ⏭  ${formula.name} — already exists (${existing.id})`);
      createdWorkflows.push({
        id: existing.id,
        name: formula.name,
        slug: formula.slug,
      });
      continue;
    }

    const wf = await prisma.$transaction(
      async (tx) => {
        // Create workflow
        const workflow = await tx.calcWorkflow.create({
          data: {
            organizationId: org!.id,
            name: formula.name,
            slug: formula.slug,
            description: formula.description,
            category: formula.category,
            tags: formula.tags,
            status: "DRAFT",
            visibility: "PRIVATE",
            metadata: {
              reference: formula.reference,
              region: formula.region,
            },
          },
        });

        // ── Create nodes (batch where possible) ───────────────

        // INPUT node
        const inputNode = await tx.calcNode.create({
          data: {
            calcWorkflowId: workflow.id,
            type: "INPUT",
            label: "Input Parameters",
            positionX: 100,
            positionY: 200,
            sortOrder: 0,
            config: {
              fields: formula.inputFields.map((f) => ({
                key: f.key,
                label: f.label,
                unit: f.unit,
                default: f.default,
                hint: f.hint,
                data_type: "number",
                required: true,
              })),
              pause_execution: true,
            },
          },
        });

        let prevNodeId = inputNode.id;
        let prevX = 100;
        let lookupNodeId: string | null = null;

        // LOOKUP_TABLE node (if formula has one)
        if (formula.lookupTable) {
          const lookupNode = await tx.calcNode.create({
            data: {
              calcWorkflowId: workflow.id,
              type: "LOOKUP_TABLE",
              label: formula.lookupTable.name,
              positionX: 450,
              positionY: 200,
              sortOrder: 1,
              config: {
                source: "inline",
                lookup_key: formula.lookupTable.key,
                result_variable: formula.lookupTable.resultVar,
                match_mode: formula.lookupTable.matchMode,
                rows: formula.lookupTable.rows,
                reference: formula.reference,
              },
            },
          });
          lookupNodeId = lookupNode.id;
          prevNodeId = lookupNode.id;
          prevX = 450;
        }

        // FORMULA node
        const formulaNode = await tx.calcNode.create({
          data: {
            calcWorkflowId: workflow.id,
            type: "FORMULA",
            label: formula.name,
            positionX: prevX + 350,
            positionY: 200,
            sortOrder: 2,
            config: {
              source: "inline",
              expression: formula.expression,
              display_expression: formula.displayExpression,
              result_variable: formula.resultVariable,
              result_unit: formula.resultUnit,
              reference: formula.reference,
            },
          },
        });

        // DISPLAY node
        const displayNode = await tx.calcNode.create({
          data: {
            calcWorkflowId: workflow.id,
            type: "DISPLAY",
            label: "Design Discharge",
            positionX: formulaNode.positionX + 350,
            positionY: 200,
            sortOrder: 3,
            config: {
              mode: "single",
              compare_variables: [
                {
                  key: formula.resultVariable,
                  method: formula.name,
                  label: formula.name,
                },
              ],
              selection_rule: "max",
              result_variable: "Qd",
              result_unit: "Cumecs",
            },
          },
        });

        // COMMENT node
        await tx.calcNode.create({
          data: {
            calcWorkflowId: workflow.id,
            type: "COMMENT",
            label: "Reference",
            positionX: 100,
            positionY: 50,
            sortOrder: 10,
            config: {
              text: `${formula.name}\n${formula.displayExpression}\n\nRef: ${formula.reference}\nRegion: ${formula.region}`,
              color: "#fef3c7",
            },
          },
        });

        // ── Create edges (batch) ──────────────────────────────

        const edgesData = [];

        if (formula.lookupTable && lookupNodeId) {
          // INPUT → LOOKUP
          edgesData.push({
            calcWorkflowId: workflow.id,
            sourceNodeId: inputNode.id,
            targetNodeId: lookupNodeId,
            sourceHandle: "output",
            targetHandle: "input",
          });
          // LOOKUP → FORMULA
          edgesData.push({
            calcWorkflowId: workflow.id,
            sourceNodeId: lookupNodeId,
            targetNodeId: formulaNode.id,
            sourceHandle: "output",
            targetHandle: "input",
          });
        } else {
          // INPUT → FORMULA
          edgesData.push({
            calcWorkflowId: workflow.id,
            sourceNodeId: inputNode.id,
            targetNodeId: formulaNode.id,
            sourceHandle: "output",
            targetHandle: "input",
          });
        }

        // FORMULA → DISPLAY
        edgesData.push({
          calcWorkflowId: workflow.id,
          sourceNodeId: formulaNode.id,
          targetNodeId: displayNode.id,
          sourceHandle: "output",
          targetHandle: "input",
        });

        await tx.calcEdge.createMany({ data: edgesData });

        // ── Create variables (batch) ──────────────────────────

        const variablesData = [];

        // Input variables
        for (let i = 0; i < formula.inputFields.length; i++) {
          const f = formula.inputFields[i];
          variablesData.push({
            calcWorkflowId: workflow.id,
            contextKey: f.key,
            displayLabel: f.label,
            notation: f.key,
            dataType: "NUMBER" as const,
            unit: f.unit === "—" ? null : f.unit,
            defaultValue: f.default,
            sourceNodeId: inputNode.id,
            sourceType: "USER_INPUT" as const,
            scope: "GLOBAL" as const,
            sortOrder: i,
          });
        }

        // Lookup result variable
        if (formula.lookupTable && lookupNodeId) {
          variablesData.push({
            calcWorkflowId: workflow.id,
            contextKey: formula.lookupTable.resultVar,
            displayLabel: formula.lookupTable.name,
            notation: formula.lookupTable.resultVar,
            dataType: "NUMBER" as const,
            unit: null,
            defaultValue: null,
            sourceNodeId: lookupNodeId,
            sourceType: "LOOKUP_RESULT" as const,
            scope: "GLOBAL" as const,
            sortOrder: 100,
          });
        }

        // Formula result variable
        variablesData.push({
          calcWorkflowId: workflow.id,
          contextKey: formula.resultVariable,
          displayLabel: `${formula.name} Result`,
          notation: formula.resultVariable,
          dataType: "NUMBER" as const,
          unit: formula.resultUnit,
          defaultValue: null,
          sourceNodeId: formulaNode.id,
          sourceType: "FORMULA_OUTPUT" as const,
          scope: "GLOBAL" as const,
          sortOrder: 200,
        });

        // Design discharge variable
        variablesData.push({
          calcWorkflowId: workflow.id,
          contextKey: "Qd",
          displayLabel: "Design Discharge",
          notation: "Qd",
          dataType: "NUMBER" as const,
          unit: "Cumecs",
          defaultValue: null,
          sourceNodeId: displayNode.id,
          sourceType: "COMPUTED" as const,
          scope: "GLOBAL" as const,
          sortOrder: 300,
        });

        await tx.calcVariable.createMany({ data: variablesData });

        return workflow;
      },
      { timeout: 30000 },
    );

    createdWorkflows.push({ id: wf.id, name: wf.name, slug: wf.slug });
    console.log(`  ✅ ${wf.name} — ${wf.id}`);
  }

  // 4. Create workspace tree
  console.log("\n📁 Creating workspace tree...\n");

  let workspace = await prisma.workspace.findFirst({
    where: { organizationId: org.id, name: "Flood Discharge" },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        organizationId: org.id,
        name: "Flood Discharge",
        description:
          "IRC-compliant peak flood estimation for bridge site design",
        icon: "🌊",
      },
    });

    const root = await prisma.workspaceNode.create({
      data: {
        workspaceId: workspace.id,
        nodeType: "ROOT",
        name: "Flood Discharge",
        icon: "🌊",
        sortOrder: 0,
      },
    });

    const empirical = await prisma.workspaceNode.create({
      data: {
        workspaceId: workspace.id,
        parentId: root.id,
        nodeType: "FOLDER",
        name: "Empirical Method",
        icon: "📐",
        sortOrder: 0,
      },
    });

    const indian = await prisma.workspaceNode.create({
      data: {
        workspaceId: workspace.id,
        parentId: empirical.id,
        nodeType: "FOLDER",
        name: "Indian Formulas",
        icon: "🇮🇳",
        sortOrder: 0,
      },
    });

    // Link each workflow — batch
    await prisma.workspaceNode.createMany({
      data: createdWorkflows.map((wf, i) => ({
        workspaceId: workspace!.id,
        parentId: indian.id,
        nodeType: "WORKFLOW_LINK" as const,
        name: wf.name,
        linkedWorkflowId: wf.id,
        sortOrder: i,
      })),
    });

    console.log("  ✅ Workspace tree created");
  } else {
    console.log("  ⏭  Workspace already exists");
  }

  // 5. Print summary
  console.log("\n" + "═".repeat(60));
  console.log("  WORKFLOW IDS — use these to test the canvas editor");
  console.log("═".repeat(60) + "\n");

  for (const wf of createdWorkflows) {
    console.log(`  ${wf.name.padEnd(30)} ${wf.id}`);
    console.log(
      `  ${"".padEnd(30)} http://localhost:3000/calc-workflows/${wf.id}`,
    );
    console.log();
  }

  console.log("═".repeat(60));
  console.log(`  Workspace: ${workspace.id}`);
  console.log("═".repeat(60) + "\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
