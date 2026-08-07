import prisma from "../../src/lib/db";
import * as fs from "fs";
import * as path from "path";

const stripLeadingHeader = (text: string): string => {
  if (!text) return "";
  let lines = text.split("\n");
  let firstNonEmptyIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== "") {
      firstNonEmptyIdx = i;
      break;
    }
  }
  if (firstNonEmptyIdx !== -1) {
    const firstLine = lines[firstNonEmptyIdx].trim();
    if (firstLine.startsWith("#")) {
      lines = lines.slice(firstNonEmptyIdx + 1);
    }
  }
  return lines.join("\n");
};

const isDisplayableScalar = (val: any) => {
  if (val === null || val === undefined) return false;
  if (typeof val === "object") return false;
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("<svg") || trimmed.startsWith("[")) return false;
  }
  return true;
};

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz2";

  // 1. Fetch workflow and its variables
  const wf = await prisma.calcWorkflow.findUniqueOrThrow({
    where: { id: workflowId },
    include: {
      variables: { where: { deletedAt: null } }
    }
  });

  // 2. Fetch the latest COMPLETED session on this workflow
  const lastSession = await prisma.calcSession.findFirst({
    where: { calcWorkflowId: workflowId, status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    include: {
      nodeExecutions: {
        orderBy: { stepNumber: "asc" }
      }
    }
  });

  if (!lastSession) {
    console.error("No completed session found!");
    return;
  }

  console.log(`Using session: ${lastSession.id} created at ${lastSession.createdAt}`);

  // Build variable metadata dictionary
  const dynamicMetadata: Record<string, { label: string; unit: string; desc: string }> = {};
  wf.variables.forEach((v) => {
    dynamicMetadata[v.contextKey] = {
      label: v.displayLabel || v.notation || v.contextKey,
      unit: v.unit || "—",
      desc: v.description || "—",
    };
  });

  const variables = lastSession.variables as Record<string, any>;
  const visibleVariables = Object.entries(variables).filter(
    ([k, v]) => !k.startsWith("$") && isDisplayableScalar(v)
  );

  const currentDate = lastSession.createdAt.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // Re-build markdown report following workflow-report.tsx
  let md = `# Calculation Report: ${wf.name}\n\n`;
  md += `*Description:* ${wf.description || "Calculation workflow report"}\n\n`;
  md += `## Metadata\n`;
  md += `- **Date/Time:** ${currentDate}\n`;
  const metadata = (wf.metadata as any) ?? {};
  if (metadata.referenceStandard) md += `- **Reference Standard:** ${metadata.referenceStandard}\n`;
  if (metadata.geographicRegion) md += `- **Geographic Region:** ${metadata.geographicRegion}\n`;
  md += `\n`;

  md += `## 1.0 Executive Summary & Variables\n\n`;
  md += `| Variable | Label | Value | Unit | Description |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- |\n`;

  visibleVariables.forEach(([k, v]) => {
    const val =
      typeof v === "number"
        ? v.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : String(v);
    const meta = dynamicMetadata[k] || { label: k, unit: "—", desc: "—" };
    md += `| \`${k}\` | **${meta.label}** | **${val}** | \`${meta.unit}\` | ${meta.desc} |\n`;
  });
  md += `\n`;

  md += `## 2.0 Calculation Methodology & Proof\n\n`;
  
  const markdownSteps = lastSession.nodeExecutions
    .filter((exec) => exec.result && (exec.result as any).markdown)
    .sort((a, b) => (a.stepNumber ?? 0) - (b.stepNumber ?? 0));

  for (let idx = 0; idx < markdownSteps.length; idx++) {
    const step = markdownSteps[idx];
    const node = await prisma.calcNode.findUnique({ where: { id: step.calcNodeId } });
    const stepTitle = step.nodeLabel || node?.label || `Step ${idx + 1}`;
    md += `### 2.${idx + 1} ${stepTitle} (${node?.type || "Calculation"})\n\n`;
    const cleanedMarkdown = stripLeadingHeader((step.result as any).markdown);
    md += `${cleanedMarkdown}\n\n`;
  }

  md += `---\n*Report generated automatically by Floodrix Workflow Engine.*\n`;

  const targetPath = path.resolve(__dirname, "../../betwa.md");
  fs.writeFileSync(targetPath, md, "utf8");
  console.log(`Successfully generated report and wrote to ${targetPath}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
