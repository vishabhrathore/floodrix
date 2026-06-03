import prisma from "../src/lib/db";

async function main() {
  const orgs = await prisma.organization.findMany();
  console.log("=== ALL ORGANIZATIONS ===");
  console.log(orgs.map(o => ({ id: o.id, name: o.name, slug: o.slug })));
}

main().catch(console.error);
