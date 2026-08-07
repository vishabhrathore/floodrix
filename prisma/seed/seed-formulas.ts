import * as dotenv from "dotenv";
dotenv.config();

import * as path from "path";
import * as fs from "fs";
import prisma from "../../src/lib/db";

async function main() {
  console.log("🌱 Starting seeding of system formulas...");

  // 1. Find the admin user
  const adminUser = await prisma.user.findFirst({
    where: { globalRole: "SUPER_ADMIN" },
  }) || await prisma.user.findFirst({
    where: { email: "admin@floodrix.com" },
  }) || await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!adminUser) {
    console.error("❌ No admin user found. Please run the main seed first.");
    process.exit(1);
  }
  console.log(`👤 Found Admin User: ${adminUser.name} (${adminUser.email})`);

  // 2. Find the admin organization
  const adminOrg = await prisma.organization.findFirst({
    where: {
      OR: [
        { id: "org_admin_personal" },
        { id: "cmpqr1gdv0000ni3bjwr1fgqd" },
        { name: "Super Admin's Org" },
        { name: "Admin Personal" },
        { members: { some: { userId: adminUser.id } } },
      ],
    },
  });

  if (!adminOrg) {
    console.error("❌ No admin organization found. Please run the main seed first.");
    process.exit(1);
  }
  console.log(`🏢 Found Admin Organization: ${adminOrg.name} (${adminOrg.id})`);

  // 3. Find the admin actor
  const adminActor = await prisma.calcActor.findFirst({
    where: { userId: adminUser.id, organizationId: adminOrg.id },
  });
  const createdBy = adminActor ? adminActor.id : null;
  console.log(`🎭 Found Admin Actor ID: ${createdBy}`);

  // 4. Read formula.json
  const formulaJsonPath = path.join(__dirname, "../../formula.json");
  if (!fs.existsSync(formulaJsonPath)) {
    console.error(`❌ formula.json not found at: ${formulaJsonPath}`);
    process.exit(1);
  }

  const formulaData = JSON.parse(fs.readFileSync(formulaJsonPath, "utf-8"));
  const formulas = formulaData.formulas;
  console.log(`📄 Loaded ${formulas.length} formulas from formula.json`);

  // 5. Seed formulas
  let successCount = 0;
  for (const formula of formulas) {
    const inputVariables = (formula.inputs || []).map((input: any) => ({
      key: input.key,
      label: input.label || input.key,
      unit: input.unit || null,
    }));

    const outputVariable = formula.output
      ? {
          key: formula.output.key,
          label: formula.output.label || formula.output.key,
          unit: formula.output.unit || null,
        }
      : {
          key: "result",
          label: "Result",
          unit: null,
        };

    const id = `freg_${formula.id.replace(/-/g, "_")}`;
    const slug = formula.id;

    try {
      await prisma.formulaRegistryItem.upsert({
        where: { id },
        update: {
          organizationId: adminOrg.id,
          slug,
          name: formula.name,
          description: formula.notes || `System formula for ${formula.category}`,
          category: formula.category,
          tags: [formula.category.toLowerCase(), "system", "published"],
          expressionNotation: formula.expression,
          displayExpression: formula.math_form || formula.expression,
          inputVariables,
          outputVariable,
          reference: formula.source || null,
          isPublished: true,
          isSystem: true,
          visibility: "PUBLIC",
          createdBy,
        },
        create: {
          id,
          organizationId: adminOrg.id,
          slug,
          name: formula.name,
          description: formula.notes || `System formula for ${formula.category}`,
          category: formula.category,
          tags: [formula.category.toLowerCase(), "system", "published"],
          expressionNotation: formula.expression,
          displayExpression: formula.math_form || formula.expression,
          inputVariables,
          outputVariable,
          reference: formula.source || null,
          isPublished: true,
          isSystem: true,
          visibility: "PUBLIC",
          createdBy,
        },
      });
      console.log(`✅ Seeded formula: ${formula.name} (${id})`);
      successCount++;
    } catch (err) {
      console.error(`❌ Failed to seed formula ${formula.name}:`, err);
    }
  }

  console.log(`\n🎉 Seeded ${successCount}/${formulas.length} formulas successfully!`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
