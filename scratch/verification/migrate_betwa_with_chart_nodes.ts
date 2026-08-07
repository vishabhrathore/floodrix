import prisma from "../../src/lib/db";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function main() {
  const workflowId = "cmprtvv6l00075n3bzb7i7vz2";

  console.log("Starting Betwa River SUH/PMF workflow migration to use dynamic CHART nodes...");

  // 1. Fetch node_cc_uh and node_cc_pmf to get coordinates
  const node_uh = await prisma.calcNode.findFirstOrThrow({
    where: { id: "node_cc_uh", calcWorkflowId: workflowId }
  });
  const node_pmf = await prisma.calcNode.findFirstOrThrow({
    where: { id: "node_cc_pmf", calcWorkflowId: workflowId }
  });

  // 2. Clean up node_cc_uh code & markdownTemplate
  const newCodeUh = `
const Qp = inputs.Qp;
const Tm = inputs.Tm;
const TB = inputs.TB;
const W50 = inputs.W50;
const W75 = inputs.W75;
const WR50 = inputs.WR50;
const WR75 = inputs.WR75;
const catchment_area = inputs.catchment_area;
const tp = inputs.tp;

const kp = [
  { t: 0,              q: 0        },
  { t: Tm - WR75,      q: 0.75*Qp  },
  { t: Tm - WR50,      q: 0.50*Qp  },
  { t: Tm,             q: Qp       },
  { t: Tm + (W75-WR75), q: 0.75*Qp },
  { t: Tm + (W50-WR50), q: 0.50*Qp },
  { t: TB,             q: 0        }
].sort((a,b) => a.t - b.t);

const maxT = Math.ceil(TB);
const t = [], q = [];
const coords = [];
for (let h = 0; h <= maxT; h++) {
  t.push(h);
  let v = 0;
  for (let i = 0; i < kp.length - 1; i++) {
    if (h >= kp[i].t && h <= kp[i+1].t) {
      const f = (h - kp[i].t) / (kp[i+1].t - kp[i].t);
      v = kp[i].q + f * (kp[i+1].q - kp[i].q);
      break;
    }
  }
  const val = Math.max(0, v);
  q.push(val);
  coords.push({
    hour: h,
    discharge: val.toFixed(2)
  });
}
let vol = 0;
for (let i = 0; i < t.length - 1; i++) {
  vol += 0.5 * (q[i] + q[i+1]);
}
const depth_cm = vol * 3600 / (catchment_area * 1e6) * 100;

return {
  uh_times: t,
  uh_ordinates: q,
  uh_depth_cm: depth_cm,
  uh_coordinates: coords,
  TD: (1.1 * tp).toFixed(3)
};
`.trim();

  const newTemplateUh = `
### 📊 1-Hour Synthetic Unit Hydrograph Parameters & Ordinates

#### Table 2 - Computation of 1-hour Synthetic Unit hydrograph Parameters
| Sl. No. | Parameter | Unit | Formula / Coefficient Source | Computed Value | Adopted Value |
| :---: | :--- | :---: | :--- | :---: | :---: |
| 1 | **tr** | Hours | Unit duration | **{{variables.tr}}** | **1** |
| 2 | **tp** | Hours | $tp = a_{tp} \cdot (L/S)^{b_{tp}}$ | **{{variables.tp}}** | **{{variables.tp}}** |
| 3 | **qp** | Cumec/sq.km | $qp = a_{qp} \cdot (L/S)^{b_{qp}}$ | **{{variables.qp}}** | **{{variables.qp}}** |
| 4 | **Qp** | Cumec | $Qp = qp \cdot A$ | **{{variables.Qp}}** | **{{variables.Qp}}** |
| 5 | **Tm** | Hours | $Tm = tp + tr/2$ | **{{variables.Tm}}** | **{{variables.Tm}}** |
| 6 | **W50** | Hours | $W_{50} = a_{W50} \cdot qp^{b_{W50}}$ | **{{variables.W50}}** | **{{variables.W50}}** |
| 7 | **W75** | Hours | $W_{75} = a_{W75} \cdot qp^{b_{W75}}$ | **{{variables.W75}}** | **{{variables.W75}}** |
| 8 | **WR50** | Hours | $WR_{50} = a_{WR50} \cdot qp^{b_{WR50}}$ | **{{variables.WR50}}** | **{{variables.WR50}}** |
| 9 | **WR75** | Hours | $WR_{75} = a_{WR75} \cdot qp^{b_{WR75}}$ | **{{variables.WR75}}** | **{{variables.WR75}}** |
| 10 | **TB** | Hours | $TB = a_{TB} \cdot tp^{b_{TB}}$ | **{{variables.TB}}** | **{{variables.TB}}** |
| 11 | **TD** | Hours | $TD = 1.1 \cdot tp$ | **{{outputs.TD}}** | **{{outputs.TD}}** |

---

#### Table 4 - Adjusted Unit Hydrograph Coordinates
| Sno. | Time (hours) | Ordinates of 1 hour SUH (cumec) |
| :---: | :---: | :---: |
{{#each outputs.uh_coordinates}}
| {{this.hour}} | {{this.hour}}.00 | **{{this.discharge}}** |
{{/each}}

**Total Volume Check**: **{{outputs.uh_depth_cm}} cm** (Target: ≈ 1.0 cm)
`.trim();

  // 3. Clean up node_cc_pmf code & markdownTemplate
  const newCodePmf = `
const drh = inputs.drh_ordinates;
const Qb  = inputs.base_flow_total;
const pmf = drh.map(v => v + Qb);
let peak = 0, idx = 0;
pmf.forEach((v,i) => { if (v > peak) { peak = v; idx = i; } });

const rows = [];
pmf.forEach((v, i) => {
  rows.push({
    hour: i,
    drh: drh[i].toFixed(2),
    base: Qb.toFixed(2),
    pmf: v.toFixed(2)
  });
});

return {
  pmf_ordinates: pmf,
  pmf_peak: peak,
  pmf_peak_hr: idx,
  pmf_table_rows: rows
};
`.trim();

  const newTemplatePmf = `
### 🏔️ 24-Hour Probable Maximum Flood (PMF) – Final Hydrograph & Peak

By adding the base flow to each ordinate of the Direct Runoff Hydrograph (DRH), the final Probable Maximum Flood (PMF) is computed.

#### 🔑 Peak Flood Results
* **Peak PMF Discharge**: **{{outputs.pmf_peak}}** cumec
* **Time of Peak**: Hour **{{outputs.pmf_peak_hr}}**
* **Total Base Flow**: **{{variables.base_flow_total}}** cumec

---

#### Table 7 - PMF Hydrograph Coordinates
| Hour | DRH Ordinate (cumec) | Base Flow (cumec) | PMF Ordinate (cumec) |
| :---: | :---: | :---: | :---: |
{{#each outputs.pmf_table_rows}}
| {{this.hour}} | {{this.drh}} | {{this.base}} | **{{this.pmf}}** |
{{/each}}
`.trim();

  // Update node_cc_uh
  await prisma.calcNode.update({
    where: { id: "node_cc_uh" },
    data: {
      config: {
        ...(node_uh.config as any),
        code: newCodeUh,
        markdownTemplate: newTemplateUh
      }
    }
  });
  console.log("Updated node_cc_uh config.");

  // Update node_cc_pmf
  await prisma.calcNode.update({
    where: { id: "node_cc_pmf" },
    data: {
      config: {
        ...(node_pmf.config as any),
        code: newCodePmf,
        markdownTemplate: newTemplatePmf
      }
    }
  });
  console.log("Updated node_cc_pmf config.");

  // 4. Create CHART node 1: node_chart_uh
  const chartUhId = "node_chart_uh";
  await prisma.calcNode.upsert({
    where: { id: chartUhId },
    update: {
      label: "Unit Hydrograph Chart",
      type: "CHART",
      positionX: node_uh.positionX + 350,
      positionY: node_uh.positionY,
      config: {
        title: "1-Hour Synthetic Unit Hydrograph (SUH)",
        chart_type: "line",
        x_variable: "uh_times",
        y_variables: ["uh_ordinates"],
        x_label: "Time (hours)",
        y_label: "Discharge (cumec)",
        y_labels: ["Unit Hydrograph"],
        width: 600,
        height: 280,
        output_variable: "uh_svg_chart"
      }
    },
    create: {
      id: chartUhId,
      calcWorkflowId: workflowId,
      label: "Unit Hydrograph Chart",
      type: "CHART",
      positionX: node_uh.positionX + 350,
      positionY: node_uh.positionY,
      config: {
        title: "1-Hour Synthetic Unit Hydrograph (SUH)",
        chart_type: "line",
        x_variable: "uh_times",
        y_variables: ["uh_ordinates"],
        x_label: "Time (hours)",
        y_label: "Discharge (cumec)",
        y_labels: ["Unit Hydrograph"],
        width: 600,
        height: 280,
        output_variable: "uh_svg_chart"
      }
    }
  });
  console.log("Upserted node_chart_uh.");

  // 5. Create CHART node 2: node_chart_pmf
  const chartPmfId = "node_chart_pmf";
  await prisma.calcNode.upsert({
    where: { id: chartPmfId },
    update: {
      label: "PMF Hydrograph Chart",
      type: "CHART",
      positionX: node_pmf.positionX + 350,
      positionY: node_pmf.positionY,
      config: {
        title: "Probable Maximum Flood (PMF) Hydrograph",
        chart_type: "area",
        y_variables: ["pmf_ordinates", "drh_ordinates"],
        x_label: "Time (hours)",
        y_label: "Discharge (cumec)",
        y_labels: ["PMF Hydrograph", "Direct Runoff (DRH)"],
        width: 600,
        height: 280,
        output_variable: "pmf_svg_chart"
      }
    },
    create: {
      id: chartPmfId,
      calcWorkflowId: workflowId,
      label: "PMF Hydrograph Chart",
      type: "CHART",
      positionX: node_pmf.positionX + 350,
      positionY: node_pmf.positionY,
      config: {
        title: "Probable Maximum Flood (PMF) Hydrograph",
        chart_type: "area",
        y_variables: ["pmf_ordinates", "drh_ordinates"],
        x_label: "Time (hours)",
        y_label: "Discharge (cumec)",
        y_labels: ["PMF Hydrograph", "Direct Runoff (DRH)"],
        width: 600,
        height: 280,
        output_variable: "pmf_svg_chart"
      }
    }
  });
  console.log("Upserted node_chart_pmf.");

  // 6. Connect edges
  // node_cc_uh -> node_chart_uh
  await prisma.calcEdge.upsert({
    where: { id: "edge_uh_chart" },
    update: { deletedAt: null },
    create: {
      id: "edge_uh_chart",
      calcWorkflowId: workflowId,
      sourceNodeId: "node_cc_uh",
      targetNodeId: "node_chart_uh",
      sourceHandle: "output",
      targetHandle: "input"
    }
  });

  // node_cc_pmf -> node_chart_pmf
  await prisma.calcEdge.upsert({
    where: { id: "edge_pmf_chart" },
    update: { deletedAt: null },
    create: {
      id: "edge_pmf_chart",
      calcWorkflowId: workflowId,
      sourceNodeId: "node_cc_pmf",
      targetNodeId: "node_chart_pmf",
      sourceHandle: "output",
      targetHandle: "input"
    }
  });
  console.log("Upserted edges.");

  // 7. Invalidate Redis cache
  const keys = await redis.keys(`workflow:${workflowId}*`);
  for (const k of keys) {
    await redis.del(k);
  }
  await redis.del(`workflow_meta:${workflowId}`);
  console.log("Cleared Redis workflow cache.");

  console.log("Betwa River SUH/PMF workflow migration complete!");
}

main().finally(() => {
  redis.disconnect();
  prisma.$disconnect();
});
