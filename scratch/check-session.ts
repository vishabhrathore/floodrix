import prisma from "../src/lib/db";

async function main() {
  console.log("\n=== OUTBOX JOBS WITH DETAILS ===");
  const outboxJobs = await prisma.outboxJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const job of outboxJobs) {
    console.log(`- Job: ${job.id}`);
    console.log(`  Queue: ${job.queueName}`);
    console.log(`  JobName: ${job.jobName}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Payload:`, JSON.stringify(job.payload, null, 2));
    console.log(`  Error: ${job.lastError}`);
    console.log("-----------------------------------------");
  }
}

main().catch(console.error);
