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

  const res = await client.query("SELECT id, name FROM workspaces LIMIT 10");
  console.log("Workspaces:");
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
