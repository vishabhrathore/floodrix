// ═══════════════════════════════════════════════════════════════════════════
//  src/app/demo-workflow/page.tsx
//  Demo route for the calculation workflow canvas (no TRPC dependencies)
// ═══════════════════════════════════════════════════════════════════════════
import { WorkflowCanvas } from "@/features/workflow-canvas/components/workflow-canvas";

export default function Page() {
  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
      <WorkflowCanvas workflowId="demo-workflow" />
    </div>
  );
}
