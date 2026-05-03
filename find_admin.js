const { Client } = require('pg');
const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function main() {
    await client.connect();

    const superAdminId = 'user_superadmin';

    // Find organizations the super admin is in
    const orgsRes = await client.query(`
    SELECT o.id, o.name 
    FROM organizations o
    JOIN organization_members om ON o.id = om."organizationId"
    WHERE om."userId" = $1
  `, [superAdminId]);

    console.log("Organizations for Super Admin:");
    console.log(JSON.stringify(orgsRes.rows, null, 2));

    if (orgsRes.rows.length > 0) {
        const orgIds = orgsRes.rows.map(o => o.id);
        const workflows = await client.query(`
      SELECT id, name, slug, "organizationId"
      FROM calc_workflows 
      WHERE "organizationId" = ANY($1)
    `, [orgIds]);

        console.log("Workflows in these Orgs:");
        console.log(JSON.stringify(workflows.rows, null, 2));
    }

    // Also check all workflows just in case
    const allWorkflows = await client.query("SELECT id, name, slug FROM calc_workflows LIMIT 20");
    console.log("First 20 Workflows overall:");
    console.log(JSON.stringify(allWorkflows.rows, null, 2));

    await client.end();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
