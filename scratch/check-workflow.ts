import prisma from "../src/lib/db";

async function main() {
  const workflow = await prisma.calcWorkflow.findUnique({
    where: { id: "cmprtvv6l00075n3bzb7i7vz2" },
    include: {
      collaborators: true,
      nodes: true,
      variables: true
    }
  });
  if (!workflow) {
    console.error("Workflow not found!");
    return;
  }
  console.log("=== WORKFLOW DETAIL ===");
  console.log("ID:", workflow.id);
  console.log("Org ID:", workflow.organizationId);
  console.log("Slug:", workflow.slug);
  console.log("Collaborators:", workflow.collaborators);
  console.log("Nodes count:", workflow.nodes.length);
  console.log("Variables count:", workflow.variables.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
