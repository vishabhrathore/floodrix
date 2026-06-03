import prisma from "../src/lib/db";

async function main() {
  const nodeId = "ivtpxq7p1n4sg1m6n10vqrdm";
  console.log("=== INSPECTING NODE ===");
  const node = await prisma.calcNode.findUnique({
    where: { id: nodeId },
  });

  if (!node) {
    console.error("Node not found:", nodeId);
    return;
  }

  console.log("Node ID:", node.id);
  console.log("Type:", node.type);
  console.log("Label:", node.label);
  console.log("Config:", JSON.stringify(node.config, null, 2));
}

main().catch(console.error);
