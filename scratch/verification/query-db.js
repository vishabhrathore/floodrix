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

  // Get latest session
  const sessionRes = await client.query("SELECT * FROM calc_sessions WHERE \"calcWorkflowId\" = 'cmprtvv6l00075n3bzb7i7vz2' ORDER BY \"updatedAt\" DESC LIMIT 1");
  if (sessionRes.rows.length === 0) {
    console.log("No sessions found for this workflow.");
    await client.end();
    return;
  }

  const session = sessionRes.rows[0];
  console.log("Latest Session:", {
    id: session.id,
    status: session.status,
    error: session.error,
    updatedAt: session.updatedAt
  });

  // Get node executions for this session
  const nodeExecsRes = await client.query(
    "SELECT id, \"calcNodeId\", status, stepNumber, error, \"inputVars\", \"outputVars\" FROM calc_node_executions WHERE \"sessionId\" = $1 ORDER BY \"stepNumber\" ASC",
    [session.id]
  );
  console.log("Node Executions:");
  console.log(JSON.stringify(nodeExecsRes.rows, null, 2));

  await client.end();
}

main().catch(console.error);
