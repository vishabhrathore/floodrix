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

  console.log("=== UPDATING REGISTRY FORMULA ===");
  const res = await client.query("UPDATE formula_registry SET \"useWorker\" = true WHERE id = 'cmptak0sn000ged3baxoc6ya6'");
  console.log("Updated rows:", res.rowCount);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
