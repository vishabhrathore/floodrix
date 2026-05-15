const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
});

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Please provide a query");
    process.exit(1);
  }
  const result = await prisma.$queryRawUnsafe(query);
  console.log(
    JSON.stringify(
      result,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
