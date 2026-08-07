import prisma from "../../src/lib/db";
import { AppCache } from "../../src/lib/cache";

async function main() {
  const wfId = "cmprtvv6l00075n3bzb7i7vz2";

  console.log("=== UPDATING NODE CODE & MARKDOWN TEMPLATES FOR BETWA WORKFLOW ===");

  // 1. node_cc_slope (Equivalent Stream Slope)
  const code_slope = `const pts = typeof inputs.stream_profile === 'string' ? JSON.parse(inputs.stream_profile) : inputs.stream_profile;
const L   = inputs.stream_length;
const last = pts[pts.length - 1].rl;
let sum = 0;
const rows = [];
for (let i = 1; i < pts.length; i++) {
  const Li      = pts[i].chainage - pts[i-1].chainage;
  const Di_prev = pts[i-1].rl - last;
  const Di      = pts[i].rl    - last;
  const weighted = Li * (Di_prev + Di);
  sum += weighted;
  rows.push({
    s_no: i,
    chainage: pts[i].chainage.toFixed(3),
    rl: pts[i].rl.toFixed(2),
    segment: Li.toFixed(3),
    d_prev: Di_prev.toFixed(2),
    d: Di.toFixed(2),
    d_sum: (Di_prev + Di).toFixed(2),
    weighted: weighted.toFixed(2)
  });
}
return {
  equiv_slope: sum / (L * L),
  sum_li_di_prev_di: sum,
  slope_table_rows: rows,
  initial_rl: pts[0].rl.toFixed(2)
};`;

  const template_slope = `### 📐 Equivalent Stream Slope (S)

#### Table 1 - Computation of Equivalent Slope (S)
| S.No. | Chainage (Kms) | RL of River bed (m) | each Segment | above datum (Di) | Di-1 + Di (m) | Li × (Di-1 + Di) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| — | 0.000 | {{outputs.initial_rl}} | 0.000 | 0.00 | 0.00 | 0.00 |
{{#each outputs.slope_table_rows}}
| {{this.s_no}} | {{this.chainage}} | {{this.rl}} | {{this.segment}} | {{this.d}} | {{this.d_sum}} | **{{this.weighted}}** |
{{/each}}
| **TOTAL** | | | | | | **{{outputs.sum_li_di_prev_di}}** |

- **Equivalent stream Slope (S)** = $\\Sigma(L_i \\cdot (D_{i-1} + D_i)) / L^2$ = **{{outputs.equiv_slope}} m/Km**`;

  // 2. node_cc_uh (Build 1-hr UH Ordinate Array)
  const code_uh = `const Qp = inputs.Qp;
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

function generateSvg(title, times, ordinates, xLabel, yLabel) {
  const width = 600;
  const height = 300;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 40;
  const paddingBottom = 40;
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const maxX = Math.max(...times, 1);
  const maxY = Math.max(...ordinates, 1) * 1.1;
  
  const points = times.map((t, i) => {
    const x = paddingLeft + (t / maxX) * chartWidth;
    const y = height - paddingBottom - (ordinates[i] / maxY) * chartHeight;
    return \`\${x.toFixed(1)},\${y.toFixed(1)}\`;
  }).join(" ");
  
  let gridLines = "";
  for (let i = 0; i <= 5; i++) {
    const val = (maxX * i / 5);
    const x = paddingLeft + (i / 5) * chartWidth;
    gridLines += \`<line x1="\${x}" y1="\${paddingTop}" x2="\${x}" y2="\${height - paddingBottom}" stroke="#e5e7eb" stroke-dasharray="2 2" />\`;
    gridLines += \`<text x="\${x}" y="\${height - paddingBottom + 15}" font-size="10" text-anchor="middle" fill="#6b7280">\text{\${val.toFixed(0)}}</text>\`;
  }
  for (let i = 0; i <= 5; i++) {
    const val = (maxY * i / 5);
    const y = height - paddingBottom - (i / 5) * chartHeight;
    gridLines += \`<line x1="\${paddingLeft}" y1="\${y}" x2="\${width - paddingRight}" y2="\${y}" stroke="#e5e7eb" stroke-dasharray="2 2" />\`;
    gridLines += \`<text x="\${paddingLeft - 8}" y="\${y + 4}" font-size="10" text-anchor="end" fill="#6b7280">\text{\${val.toFixed(0)}}</text>\`;
  }
  
  return \`<svg width="100%" height="280" viewBox="0 0 \${width} \${height}" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: sans-serif;">
  <text x="\${width / 2}" y="\${paddingTop - 15}" font-size="14" font-weight="bold" text-anchor="middle" fill="#1f2937">\${title}</text>
  \${gridLines}
  <text x="\${width / 2}" y="\${height - 8}" font-size="11" text-anchor="middle" fill="#4b5563">\${xLabel}</text>
  <text x="15" y="\${height / 2}" font-size="11" text-anchor="middle" transform="rotate(-90 15 \${height / 2})" fill="#4b5563">\${yLabel}</text>
  <polyline points="\${points}" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
  <line x1="\${paddingLeft}" y1="\${paddingTop}" x2="\${paddingLeft}" y2="\${height - paddingBottom}" stroke="#9ca3af" stroke-width="1" />
  <line x1="\${paddingLeft}" y1="\${height - paddingBottom}" x2="\${width - paddingRight}" y2="\${height - paddingBottom}" stroke="#9ca3af" stroke-width="1" />
</svg>\`;
}

const svgChart = generateSvg("1-Hour Synthetic Unit Hydrograph (SUH)", t, q, "Time (hours)", "Discharge (cumec)");

return {
  uh_times: t,
  uh_ordinates: q,
  uh_depth_cm: depth_cm,
  uh_coordinates: coords,
  uh_svg_chart: svgChart,
  TD: (1.1 * tp).toFixed(3)
};`;

  const template_uh = `### 📊 1-Hour Synthetic Unit Hydrograph Parameters & Ordinates

#### Table 2 - Computation of 1-hour Synthetic Unit hydrograph Parameters
| Sl. No. | Parameter | Unit | Formula / Coefficient Source | Computed Value | Adopted Value |
| :---: | :--- | :---: | :--- | :---: | :---: |
| 1 | **tr** | Hours | Unit duration | **{{variables.tr}}** | **1** |
| 2 | **tp** | Hours | $tp = a_{tp} \\cdot (L/S)^{b_{tp}}$ | **{{variables.tp}}** | **{{variables.tp}}** |
| 3 | **qp** | Cumec/sq.km | $qp = a_{qp} \\cdot (L/S)^{b_{qp}}$ | **{{variables.qp}}** | **{{variables.qp}}** |
| 4 | **Qp** | Cumec | $Qp = qp \\cdot A$ | **{{variables.Qp}}** | **{{variables.Qp}}** |
| 5 | **Tm** | Hours | $Tm = tp + tr/2$ | **{{variables.Tm}}** | **{{variables.Tm}}** |
| 6 | **W50** | Hours | $W_{50} = a_{W50} \\cdot qp^{b_{W50}}$ | **{{variables.W50}}** | **{{variables.W50}}** |
| 7 | **W75** | Hours | $W_{75} = a_{W75} \\cdot qp^{b_{W75}}$ | **{{variables.W75}}** | **{{variables.W75}}** |
| 8 | **WR50** | Hours | $WR_{50} = a_{WR50} \\cdot qp^{b_{WR50}}$ | **{{variables.WR50}}** | **{{variables.WR50}}** |
| 9 | **WR75** | Hours | $WR_{75} = a_{WR75} \\cdot qp^{b_{WR75}}$ | **{{variables.WR75}}** | **{{variables.WR75}}** |
| 10 | **TB** | Hours | $TB = a_{TB} \\cdot tp^{b_{TB}}$ | **{{variables.TB}}** | **{{variables.TB}}** |
| 11 | **TD** | Hours | $TD = 1.1 \\cdot tp$ | **{{outputs.TD}}** | **{{outputs.TD}}** |

---

#### Table 4 - Adjusted Unit Hydrograph Coordinates
| Sno. | Time (hours) | Ordinates of 1 hour SUH (cumec) |
| :---: | :---: | :---: |
{{#each outputs.uh_coordinates}}
| {{this.hour}} | {{this.hour}}.00 | **{{this.discharge}}** |
{{/each}}

**Total Volume Check**: **{{outputs.uh_depth_cm}} cm** (Target: ≈ 1.0 cm)

---

#### 📈 Unit Hydrograph Chart
{{outputs.uh_svg_chart}}`;

  // 3. node_cc_hyeto (Hyetograph + Loss + Critical Sequencing)
  const code_hyeto = `const cum = [15.1, 25.5, 31.6, 36.9, 42.2, 47.1, 51.8, 56.4, 60.8, 65.2, 69.3, 73.0];
let incr = cum.map((v, i) => i === 0 ? v : v - cum[i-1]);
const norm = 100 / incr.reduce((s,v) => s+v, 0);
incr = incr.map(v => v * norm);

function critical(depth) {
  const hourly = incr.map(p => (p/100) * depth);
  const excess = hourly.map(r => Math.max(0, r - inputs.loss_rate));
  return [...excess].sort((a,b) => b - a);
}
const b1 = critical(inputs.bell1_cm);
const b2 = critical(inputs.bell2_cm);

const rows = [];
for (let i = 0; i < 12; i++) {
  rows.push({
    hour: i + 1,
    bell1_gross: ((incr[i]/100) * inputs.bell1_cm).toFixed(3),
    bell1_excess: b1[i].toFixed(3),
    bell2_gross: ((incr[i]/100) * inputs.bell2_cm).toFixed(3),
    bell2_excess: b2[i].toFixed(3)
  });
}

return {
  excess_bell1: b1,
  excess_bell2: b2,
  hyeto_table_rows: rows
};`;

  const template_hyeto = `### 🌦️ Hyetograph Distribution, Loss Application & Critical Sequencing

The 24-hour storm is divided into two 12-hour bells. Hourly rainfall is distributed using the 12-hour sub-duration cumulative percentage curve and sorted in descending order (critical sequencing) after subtracting the uniform loss rate of **{{variables.loss_rate}} cm/hr**.

#### Table 5 - Hourly Rainfall & Excess Distribution
| Hour | Bell 1 Gross (cm) | Bell 1 Excess (cm) | Bell 2 Gross (cm) | Bell 2 Excess (cm) |
| :---: | :---: | :---: | :---: | :---: |
{{#each outputs.hyeto_table_rows}}
| {{this.hour}} | {{this.bell1_gross}} | **{{this.bell1_excess}}** | {{this.bell2_gross}} | **{{this.bell2_excess}}** |
{{/each}}`;

  // 4. node_cc_conv (Convolve UH × Excess → DRH)
  const code_conv = `const uh = inputs.uh_ordinates;
function conv(rain) {
  const out = new Array(uh.length + rain.length - 1).fill(0);
  for (let i = 0; i < rain.length; i++) {
    for (let j = 0; j < uh.length; j++) {
      out[i+j] += rain[i] * uh[j];
    }
  }
  return out;
}
const d1 = conv(inputs.excess_bell1);
const d2 = conv(inputs.excess_bell2);
const len = Math.max(d1.length, d2.length + 12);
const drh = new Array(len).fill(0);
d1.forEach((v,i) => drh[i]    += v);
d2.forEach((v,i) => drh[i+12] += v);

const rows = [];
drh.forEach((v, i) => {
  rows.push({
    hour: i,
    drh: v.toFixed(2)
  });
});

return {
  drh_ordinates: drh,
  drh_table_rows: rows
};`;

  const template_conv = `### 🌊 Direct Runoff Hydrograph (DRH) Convolution

The hourly excess rainfall arrays from Bell 1 and Bell 2 (shifted by 12 hours) are convolved with the 1-hour Synthetic Unit Hydrograph.

#### Table 6 - Direct Runoff Hydrograph Coordinates
| Hour | DRH Ordinate (cumec) |
| :---: | :---: |
{{#each outputs.drh_table_rows}}
| {{this.hour}} | **{{this.drh}}** |
{{/each}}`;

  // 5. node_cc_pmf (PMF = DRH + Base Flow)
  const code_pmf_safe = `const drh = inputs.drh_ordinates;
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

// Build SVG chart string cleanly
const width = 600;
const height = 300;
const paddingLeft = 60;
const paddingRight = 30;
const paddingTop = 40;
const paddingBottom = 40;

const chartWidth = width - paddingLeft - paddingRight;
const chartHeight = height - paddingTop - paddingBottom;

const maxX = pmf.length - 1;
const maxY = peak * 1.1;

let pointsStr = "";
for (let i = 0; i < pmf.length; i++) {
  const x = paddingLeft + (i / maxX) * chartWidth;
  const y = height - paddingBottom - (pmf[i] / maxY) * chartHeight;
  pointsStr += x.toFixed(1) + "," + y.toFixed(1) + " ";
}

let gridLines = "";
for (let i = 0; i <= 5; i++) {
  const val = (maxX * i / 5);
  const x = paddingLeft + (i / 5) * chartWidth;
  gridLines += '<line x1="' + x + '" y1="' + paddingTop + '" x2="' + x + '" y2="' + (height - paddingBottom) + '" stroke="#e5e7eb" stroke-dasharray="2 2" />';
  gridLines += '<text x="' + x + '" y="' + (height - paddingBottom + 15) + '" font-size="10" text-anchor="middle" fill="#6b7280">' + val.toFixed(0) + '</text>';
}
for (let i = 0; i <= 5; i++) {
  const val = (maxY * i / 5);
  const y = height - paddingBottom - (i / 5) * chartHeight;
  gridLines += '<line x1="' + paddingLeft + '" y1="' + y + '" x2="' + (width - paddingRight) + '" y2="' + y + '" stroke="#e5e7eb" stroke-dasharray="2 2" />';
  gridLines += '<text x="' + (paddingLeft - 8) + '" y="' + (y + 4) + '" font-size="10" text-anchor="end" fill="#6b7280">' + val.toFixed(0) + '</text>';
}

const svgChart = '<svg width="100%" height="280" viewBox="0 0 ' + width + ' ' + height + '" style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; font-family: sans-serif;">' +
  '<text x="' + (width / 2) + '" y="' + (paddingTop - 15) + '" font-size="14" font-weight="bold" text-anchor="middle" fill="#1f2937">Probable Maximum Flood (PMF) Hydrograph</text>' +
  gridLines +
  '<text x="' + (width / 2) + '" y="' + (height - 8) + '" font-size="11" text-anchor="middle" fill="#4b5563">Time (hours)</text>' +
  '<text x="15" y="' + (height / 2) + '" font-size="11" text-anchor="middle" transform="rotate(-90 15 ' + (height / 2) + ')" fill="#4b5563">Discharge (cumec)</text>' +
  '<polyline points="' + pointsStr + '" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />' +
  '<line x1="' + paddingLeft + '" y1="' + paddingTop + '" x2="' + paddingLeft + '" y2="' + (height - paddingBottom) + '" stroke="#9ca3af" stroke-width="1" />' +
  '<line x1="' + paddingLeft + '" y1="' + (height - paddingBottom) + '" x2="' + (width - paddingRight) + '" y2="' + (height - paddingBottom) + '" stroke="#9ca3af" stroke-width="1" />' +
  '</svg>';

return {
  pmf_ordinates: pmf,
  pmf_peak: peak,
  pmf_peak_hr: idx,
  pmf_table_rows: rows,
  pmf_svg_chart: svgChart
};`;

  const template_pmf = `### 🏔️ 24-Hour Probable Maximum Flood (PMF) – Final Hydrograph & Peak

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

---

#### 📈 PMF Hydrograph Chart
{{outputs.pmf_svg_chart}}`;

  const nodeUpdates = [
    { id: "node_cc_slope", code: code_slope, template: template_slope },
    { id: "node_cc_uh", code: code_uh, template: template_uh },
    { id: "node_cc_hyeto", code: code_hyeto, template: template_hyeto },
    { id: "node_cc_conv", code: code_conv, template: template_conv },
    { id: "node_cc_pmf", code: code_pmf_safe, template: template_pmf }
  ];

  for (const update of nodeUpdates) {
    const node = await prisma.calcNode.findFirst({
      where: { calcWorkflowId: wfId, id: update.id }
    });

    if (!node) {
      console.warn(`Node ${update.id} not found in database!`);
      continue;
    }

    const currentConfig = node.config as any;
    const newConfig = {
      ...currentConfig,
      code: update.code,
      markdownTemplate: update.template
    };

    await prisma.calcNode.update({
      where: { id: node.id },
      data: { config: newConfig }
    });

    console.log(`Updated node: ${update.id}`);
  }

  // Clear Redis Cache
  console.log("Invalidating workflow loaded cache...");
  await AppCache.invalidateWorkflow(wfId);

  console.log("=== WORKFLOW NODES SUCCESSFULLY UPDATED ===");
}

main().finally(() => prisma.$disconnect());
