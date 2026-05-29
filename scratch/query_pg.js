const { Client } = require("pg");
const fs = require("fs");
const dotenv = require("dotenv");

if (fs.existsSync(".env")) {
  const envConfig = dotenv.parse(fs.readFileSync(".env"));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();

  console.log("--- EXPLAIN ANALYZE SELECT * FROM \"user\" WHERE id = 'user_superadmin' ---");
  const res1 = await client.query("EXPLAIN ANALYZE SELECT * FROM \"user\" WHERE id = 'user_superadmin'");
  console.log(res1.rows.map(r => r["QUERY PLAN"]).join("\n"));

  console.log("\n--- EXPLAIN ANALYZE SELECT * FROM \"organization_members\" WHERE \"userId\" = 'user_superadmin' AND \"organizationId\" = 'org_admin_personal' ---");
  const res2 = await client.query("EXPLAIN ANALYZE SELECT * FROM \"organization_members\" WHERE \"userId\" = 'user_superadmin' AND \"organizationId\" = 'org_admin_personal'");
  console.log(res2.rows.map(r => r["QUERY PLAN"]).join("\n"));

  console.log("\n--- EXPLAIN ANALYZE SELECT * FROM \"calc_actors\" WHERE \"userId\" = 'user_superadmin' AND \"organizationId\" = 'org_admin_personal' ---");
  const res3 = await client.query("EXPLAIN ANALYZE SELECT * FROM \"calc_actors\" WHERE \"userId\" = 'user_superadmin' AND \"organizationId\" = 'org_admin_personal'");
  console.log(res3.rows.map(r => r["QUERY PLAN"]).join("\n"));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
