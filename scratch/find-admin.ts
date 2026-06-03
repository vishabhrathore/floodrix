import prisma from "../src/lib/db";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "admin@floodrix.com" },
    include: {
      calcActors: {
        include: {
          organization: true,
        }
      }
    }
  });

  if (!user) {
    console.error("Admin user not found!");
    return;
  }

  console.log("=== ADMIN USER FOUND ===");
  console.log("User ID:", user.id);
  console.log("Actors found:", user.calcActors.map(a => ({
    actorId: a.id,
    displayName: a.displayName,
    organizationId: a.organizationId,
    organizationName: a.organization.name
  })));
}

main().catch(console.error);
