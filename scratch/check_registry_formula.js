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

  console.log("=== REGISTRY FORMULA ===");
  const res = await client.query("SELECT id, name, \"outputVariable\" FROM formula_registry WHERE id = 'cmptak0sn000ged3baxoc6ya6'");
  if (res.rows.length > 0) {
    console.log(JSON.stringify(res.rows[0], null, 2));
  } else {
    console.log("Registry formula not found!");
  }

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
