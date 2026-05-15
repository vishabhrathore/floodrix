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

  const orgs = await client.query("SELECT id, name FROM organizations");
  console.log("All Organizations:");
  console.log(JSON.stringify(orgs.rows, null, 2));

  const workflows = await client.query(
    'SELECT id, name, slug, "organizationId" FROM calc_workflows',
  );
  console.log("All Workflows:");
  console.log(JSON.stringify(workflows.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
