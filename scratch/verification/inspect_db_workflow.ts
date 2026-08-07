import prisma from "../src/lib/db";

async function main() {
  const workflow = await prisma.calcWorkflow.findUnique({
    where: { id: "cmprtvv6l00075n3bzb7i7vz2" },
    include: { nodes: true }
  });
  if (!workflow) return;
  const hyeto = workflow.nodes.find(n => n.id === "node_cc_hyeto");
  console.log("=== node_cc_hyeto config ===");
  console.log(JSON.stringify(hyeto?.config, null, 2));
}

main().catch(console.error);
