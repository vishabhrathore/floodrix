import * as dotenv from "dotenv";
dotenv.config();

import prisma from "../../src/lib/db";
import {
  CalcNodeType,
  VariableDataType,
  VariableSourceType,
  VariableScope,
  CollaboratorPermission,
} from "../../src/generated/prisma";

async function main() {
  console.log("🌱 Starting seeding of Betwa River SUH / PMF workflow using system formulas...");

  const orgId = "org_admin_personal";
  const actorId = "actor_superadmin";

  // Check that admin org and actor exist
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new Error(`Organization with ID ${orgId} not found.`);
  }

  const actor = await prisma.calcActor.findUnique({ where: { id: actorId } });
  if (!actor) {
    throw new Error(`Actor with ID ${actorId} not found.`);
  }

  const WORKFLOW_ID = "cmprtvv6l00075n3bzb7i7vz2";
  const slug = "betwa-river-suh-pmf";

  // Clean up existing workflow of the same slug/id
  try {
    await prisma.calcWorkflow.delete({
      where: { id: WORKFLOW_ID },
    });
    console.log(`Deleted existing workflow with ID ${WORKFLOW_ID}`);
  } catch (err) {
    // Doesn't exist, ignore
  }

  try {
    await prisma.calcWorkflow.delete({
      where: { organizationId_slug: { organizationId: orgId, slug } },
    });
    console.log(`Deleted existing workflow with slug ${slug}`);
  } catch (err) {
    // Doesn't exist, ignore
  }

  const nodesDef = [
    /* ─── Level 0 — INPUTS ───────── */
    {
      id: "in-catchment",
      type: CalcNodeType.INPUT,
      level: 0,
      col: 0,
      label: "Catchment Parameters",
      description: "Site-specific physiographic and hydrologic inputs.",
      outputs: [
        { key: "catchment_area", label: "Catchment area A", unit: "sq.km", default: 875.41, dataType: VariableDataType.NUMBER },
        { key: "stream_length", label: "Length of longest stream L", unit: "km", default: 79.367, dataType: VariableDataType.NUMBER },
        { key: "centroid_length", label: "Length to centroid Lc", unit: "km", default: 76.044, dataType: VariableDataType.NUMBER },
        { key: "loss_rate", label: "Uniform loss φ", unit: "cm/hr", default: 0.23, dataType: VariableDataType.NUMBER },
        { key: "base_flow", label: "Base flow per sq.km", unit: "cumec/sqkm", default: 0.018, dataType: VariableDataType.NUMBER },
        { key: "tr", label: "Unit rainfall duration tr", unit: "hr", default: 1, dataType: VariableDataType.NUMBER },
        { key: "sub_zone", label: "CWC sub-zone (MCQ)", unit: "—", default: "3a", dataType: VariableDataType.STRING }
      ],
      options: {
        sub_zone: ["1b", "1c", "2a", "3a", "3b", "3c", "3d", "3e", "3f", "3h", "3i", "5a", "7"]
      }
    },
    {
      id: "in-profile",
      type: CalcNodeType.INPUT,
      level: 0,
      col: 1,
      label: "Stream Profile (chainage, RL)",
      description: "Survey points along the longest stream, chainage in km and reduced level in m.",
      outputs: [
        {
          key: "stream_profile",
          label: "Profile points [{chainage, rl}]",
          unit: "km, m",
          dataType: VariableDataType.ARRAY,
          default: [
            { chainage: 0, rl: 497 },
            { chainage: 4.367, rl: 492 },
            { chainage: 11.867, rl: 468 },
            { chainage: 19.367, rl: 439 },
            { chainage: 26.867, rl: 425 },
            { chainage: 34.367, rl: 404 },
            { chainage: 41.867, rl: 391 },
            { chainage: 49.367, rl: 375 },
            { chainage: 56.867, rl: 365 },
            { chainage: 64.367, rl: 360 },
            { chainage: 71.867, rl: 355 },
            { chainage: 79.367, rl: 348 }
          ]
        }
      ]
    },
    {
      id: "in-iso",
      type: CalcNodeType.INPUT,
      level: 0,
      col: 2,
      label: "Isohyetal Bands",
      description: "Area-by-band table from the PMP Atlas. Each band is bounded by two isohyet contours.",
      outputs: [
        {
          key: "isohyet_bands",
          label: "[{area_sqkm, iso_min_mm, iso_max_mm}]",
          unit: "sq.km, mm",
          dataType: VariableDataType.ARRAY,
          default: [
            { area_sqkm: 200, iso_min_mm: 100, iso_max_mm: 120 },
            { area_sqkm: 300, iso_min_mm: 120, iso_max_mm: 140 },
            { area_sqkm: 375.41, iso_min_mm: 140, iso_max_mm: 160 }
          ]
        }
      ]
    },
    {
      id: "in-storm",
      type: CalcNodeType.INPUT,
      level: 0,
      col: 3,
      label: "Storm Duration",
      description: "Which design-storm duration to compute.",
      outputs: [
        { key: "storm_duration_hr", label: "Storm duration (MCQ)", unit: "hr", default: 24, dataType: VariableDataType.NUMBER }
      ],
      options: {
        storm_duration_hr: [24, 48, 72]
      }
    },
    {
      id: "in-adj",
      type: CalcNodeType.INPUT,
      level: 0,
      col: 4,
      label: "PMP Adjustments",
      description: "Atlas factors. Defaults match the CWC PMP Atlas Ganga for sub-zone 3.",
      outputs: [
        { key: "clock_hour_corr", label: "Clock-Hour Correction", unit: "—", default: 1.15, dataType: VariableDataType.NUMBER },
        { key: "mmf", label: "Moisture Maximisation Factor", unit: "—", default: 1.12, dataType: VariableDataType.NUMBER },
        { key: "bell_pct_1st", label: "1st 12-hr bell %", unit: "%", default: 73, dataType: VariableDataType.NUMBER }
      ]
    },

    /* ─── Level 1 — slope + lookup ──────────────────────────────── */
    {
      id: "cc-slope",
      type: CalcNodeType.CUSTOM_CODE,
      level: 1,
      col: 0,
      label: "Equivalent Stream Slope",
      description: "Σ Lᵢ·(Dᵢ₋₁+Dᵢ) / L² over the stream profile. Returns S in m/km.",
      inputs: [
        { key: "stream_profile" }, { key: "stream_length" }
      ],
      outputs: [
        { key: "equiv_slope", label: "Equivalent slope S", unit: "m/km", dataType: VariableDataType.NUMBER },
        { key: "sum_li_di_prev_di", label: "Σ Lᵢ·(Dᵢ₋₁+Dᵢ)", dataType: VariableDataType.NUMBER }
      ],
      code: `const pts = typeof inputs.stream_profile === 'string' ? JSON.parse(inputs.stream_profile) : inputs.stream_profile;
const L   = inputs.stream_length;
const last = pts[pts.length - 1].rl;
let sum = 0;
for (let i = 1; i < pts.length; i++) {
  const Li      = pts[i].chainage - pts[i-1].chainage;
  const Di_prev = pts[i-1].rl - last;
  const Di      = pts[i].rl    - last;
  sum += Li * (Di_prev + Di);
}
return {
  equiv_slope: sum / (L * L),
  sum_li_di_prev_di: sum
};`
    },
    {
      id: "cc-lookup",
      type: CalcNodeType.CUSTOM_CODE,
      level: 1,
      col: 1,
      label: "Lookup Sub-zone Coefficients",
      description: "Excel VLOOKUP into the SUH sub-zone table.",
      inputs: [{ key: "sub_zone" }],
      outputs: [
        { key: "a_tp", dataType: VariableDataType.NUMBER }, { key: "b_tp", dataType: VariableDataType.NUMBER },
        { key: "a_qp", dataType: VariableDataType.NUMBER }, { key: "b_qp", dataType: VariableDataType.NUMBER },
        { key: "a_TB", dataType: VariableDataType.NUMBER }, { key: "b_TB", dataType: VariableDataType.NUMBER },
        { key: "a_W50", dataType: VariableDataType.NUMBER }, { key: "b_W50", dataType: VariableDataType.NUMBER },
        { key: "a_W75", dataType: VariableDataType.NUMBER }, { key: "b_W75", dataType: VariableDataType.NUMBER },
        { key: "a_WR50", dataType: VariableDataType.NUMBER }, { key: "b_WR50", dataType: VariableDataType.NUMBER },
        { key: "a_WR75", dataType: VariableDataType.NUMBER }, { key: "b_WR75", dataType: VariableDataType.NUMBER }
      ],
      code: `// CWC sub-zone regression coefficients
const table = {
  "3a":  {a_tp:0.433,  b_tp:0.704,   a_qp:1.161,  b_qp:0.635,   a_TB:8.375, b_TB:0.512, a_W50:2.284, b_W50:1.000,  a_W75:1.331, b_W75:0.991,  a_WR50:0.827, b_WR50:1.023, a_WR75:0.561, b_WR75:1.037},
  "3b":  {a_tp:0.523,  b_tp:0.323,   a_qp:1.915,  b_qp:-0.780,  a_TB:6.908, b_TB:0.592, a_W50:1.830, b_W50:-0.970, a_W75:0.924, b_W75:-0.792, a_WR50:0.745, b_WR50:-0.725, a_WR75:0.434, b_WR75:-0.616},
  "3c":  {a_tp:0.854,  b_tp:0.280,   a_qp:2.009,  b_qp:-0.850,  a_TB:4.840, b_TB:0.740, a_W50:2.259, b_W50:-1.080, a_W75:1.519, b_W75:-0.990, a_WR50:0.844, b_WR50:-1.240, a_WR75:0.583, b_WR75:-1.190},
  "3d":  {a_tp:1.757,  b_tp:0.261,   a_qp:1.260,  b_qp:-0.725,  a_TB:5.411, b_TB:0.826, a_W50:1.974, b_W50:-1.104, a_W75:0.961, b_W75:-1.125, a_WR50:1.150, b_WR50:-0.829, a_WR75:0.527, b_WR75:-0.932},
  "3e":  {a_tp:0.727,  b_tp:0.590,   a_qp:2.020,  b_qp:0.880,   a_TB:5.485, b_TB:0.730, a_W50:2.228, b_W50:1.040,  a_W75:1.301, b_W75:0.960,  a_WR50:0.880, b_WR50:1.010, a_WR75:0.540, b_WR75:0.960},
  "3f":  {a_tp:0.348,  b_tp:0.454,   a_qp:1.842,  b_qp:-0.804,  a_TB:4.589, b_TB:0.894, a_W50:2.353, b_W50:-1.005, a_W75:1.351, b_W75:-0.992, a_WR50:0.936, b_WR50:-1.047, a_WR75:0.579, b_WR75:-1.004},
  "3h":  {a_tp:0.325,  b_tp:0.447,   a_qp:0.996,  b_qp:-0.497,  a_TB:7.392, b_TB:0.524, a_W50:2.389, b_W50:-1.065, a_W75:1.415, b_W75:-1.067, a_WR50:0.755, b_WR50:-1.229, a_WR75:0.558, b_WR75:-1.088},
  "3i":  {a_tp:0.553,  b_tp:0.405,   a_qp:2.043,  b_qp:0.872,   a_TB:5.083, b_TB:0.733, a_W50:2.197, b_W50:1.067,  a_W75:1.325, b_W75:1.088,  a_WR50:0.799, b_WR50:1.138, a_WR75:0.536, b_WR75:1.109},
  "2a":  {a_tp:2.164,  b_tp:-0.940,  a_qp:2.272,  b_qp:-0.409,  a_TB:5.428, b_TB:0.852, a_W50:2.084, b_W50:-1.065, a_W75:1.028, b_W75:-1.071, a_WR50:0.856, b_WR50:-0.865, a_WR75:0.440, b_WR75:-0.918},
  "1b":  {a_tp:0.339,  b_tp:0.826,   a_qp:1.251,  b_qp:-0.610,  a_TB:6.662, b_TB:0.613, a_W50:2.215, b_W50:-1.034, a_W75:1.190, b_W75:-1.057, a_WR50:0.834, b_WR50:-1.077, a_WR75:0.502, b_WR75:-1.065},
  "1c":  {a_tp:2.195,  b_tp:-0.944,  a_qp:1.331,  b_qp:-0.492,  a_TB:3.917, b_TB:0.990, a_W50:2.040, b_W50:-1.026, a_W75:1.250, b_W75:-0.864, a_WR50:0.739, b_WR50:-0.968, a_WR75:0.500, b_WR75:-0.813},
  "5a":  {a_tp:1.5607, b_tp:-1.0814, a_qp:0.9178, b_qp:-0.4313, a_TB:7.380, b_TB:0.734, a_W50:1.925, b_W50:-1.090, a_W75:1.019, b_W75:-1.044, a_WR50:0.579, b_WR50:-1.107, a_WR75:0.347, b_WR75:-1.054},
  "7":   {a_tp:2.498,  b_tp:0.156,   a_qp:1.048,  b_qp:-0.178,  a_TB:7.845, b_TB:0.453, a_W50:1.954, b_W50:0.099,  a_W75:0.972, b_W75:0.124,  a_WR50:0.189, b_WR50:1.769, a_WR75:0.419, b_WR75:1.246}
};
return table[inputs.sub_zone] || table["3a"];`
    },

    /* ─── Level 2 — tp & qp (Formula Nodes using System Registry) ────────────────────────────── */
    {
      id: "f-tp",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 0,
      label: "Time to Peak (tp)",
      description: "Power-law regression on Peak Unit Discharge (qp) with sub-zone coefficients.",
      registryId: "freg_suh_tp",
      bindings: {
        a_tp: "a_tp",
        b_tp: "b_tp",
        qp: "qp"
      },
      outputs: [{ key: "tp", label: "Time to peak", unit: "hr", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-qp",
      type: CalcNodeType.FORMULA,
      level: 2,
      col: 1,
      label: "Peak Unit Discharge (qp)",
      description: "Power-law regression on L/S with qp-specific coefficients.",
      registryId: "freg_suh_qp",
      bindings: {
        a_qp: "a_qp",
        b_qp: "b_qp",
        stream_length: "stream_length",
        equiv_slope: "equiv_slope"
      },
      outputs: [{ key: "qp", label: "Peak unit discharge", unit: "cumec/sqkm", dataType: VariableDataType.NUMBER }]
    },

    /* ─── Level 3 — all SUH params (Formula Nodes using System Registry) ─────────────────── */
    {
      id: "f-Qp",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 0,
      label: "Peak Discharge (Qp)",
      description: "Multiply unit discharge by the catchment area.",
      registryId: "freg_suh_Qp",
      bindings: {
        qp: "qp",
        catchment_area: "catchment_area"
      },
      outputs: [{ key: "Qp", label: "Peak discharge", unit: "cumec", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-Tm",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 1,
      label: "Time to Rise (Tm)",
      description: "Half of the unit duration plus the lag tp.",
      registryId: "freg_suh_Tm",
      bindings: {
        tp: "tp",
        tr: "tr"
      },
      outputs: [{ key: "Tm", label: "Time to rise", unit: "hr", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-W50",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 2,
      label: "Width at 50% Qp (W50)",
      description: "Width of unit hydrograph at 50% of peak discharge.",
      registryId: "freg_suh_W50",
      bindings: {
        a_W50: "a_W50",
        b_W50: "b_W50",
        qp: "qp"
      },
      outputs: [{ key: "W50", unit: "hr", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-W75",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 3,
      label: "Width at 75% Qp (W75)",
      description: "Width of unit hydrograph at 75% of peak discharge.",
      registryId: "freg_suh_W75",
      bindings: {
        a_W75: "a_W75",
        b_W75: "b_W75",
        qp: "qp"
      },
      outputs: [{ key: "W75", unit: "hr", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-WR50",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 4,
      label: "Rising Limb Width 50% (WR50)",
      description: "Rising limb width at 50% of peak discharge.",
      registryId: "freg_suh_WR50",
      bindings: {
        a_WR50: "a_WR50",
        b_WR50: "b_WR50",
        qp: "qp"
      },
      outputs: [{ key: "WR50", unit: "hr", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-WR75",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 5,
      label: "Rising Limb Width 75% (WR75)",
      description: "Rising limb width at 75% of peak discharge.",
      registryId: "freg_suh_WR75",
      bindings: {
        a_WR75: "a_WR75",
        b_WR75: "b_WR75",
        qp: "qp"
      },
      outputs: [{ key: "WR75", unit: "hr", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-TB",
      type: CalcNodeType.FORMULA,
      level: 3,
      col: 6,
      label: "Base Width (TB)",
      description: "Total base width of the unit hydrograph.",
      registryId: "freg_suh_TB",
      bindings: {
        a_TB: "a_TB",
        b_TB: "b_TB",
        tp: "tp"
      },
      outputs: [{ key: "TB", unit: "hr", dataType: VariableDataType.NUMBER }]
    },

    /* ─── Level 4 — UH ordinates ───────────────────── */
    {
      id: "cc-uh",
      type: CalcNodeType.CUSTOM_CODE,
      level: 4,
      col: 0,
      label: "Build 1-hr UH Ordinate Array",
      description: "Construct key-points and interpolate hourly.",
      inputs: [
        { key: "Qp" }, { key: "Tm" }, { key: "TB" },
        { key: "W50" }, { key: "W75" }, { key: "WR50" }, { key: "WR75" },
        { key: "catchment_area" }
      ],
      outputs: [
        { key: "uh_times", unit: "hr", dataType: VariableDataType.ARRAY },
        { key: "uh_ordinates", unit: "cumec", dataType: VariableDataType.ARRAY },
        { key: "uh_depth_cm", unit: "cm", label: "UH volume check (≈1 cm)", dataType: VariableDataType.NUMBER }
      ],
      code: `const Qp = inputs.Qp;
const Tm = inputs.Tm;
const TB = inputs.TB;
const W50 = inputs.W50;
const W75 = inputs.W75;
const WR50 = inputs.WR50;
const WR75 = inputs.WR75;
const catchment_area = inputs.catchment_area;

const kp = [
  { t: 0,              q: 0        },
  { t: Tm - WR75,      q: 0.50*Qp  },
  { t: Tm - WR50,      q: 0.75*Qp  },
  { t: Tm,             q: Qp       },
  { t: Tm + (W75-WR75), q: 0.75*Qp },
  { t: Tm + (W50-WR50), q: 0.50*Qp },
  { t: TB,             q: 0        }
].sort((a,b) => a.t - b.t);

const maxT = Math.ceil(TB);
const t = [], q = [];
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
  q.push(Math.max(0, v));
}
let vol = 0;
for (let i = 0; i < t.length - 1; i++) {
  vol += 0.5 * (q[i] + q[i+1]);
}
const depth_cm = vol * 3600 / (catchment_area * 1e6) * 100;
return { uh_times: t, uh_ordinates: q, uh_depth_cm: depth_cm };`
    },

    /* ─── Level 5 — weighted rainfall ───────────────────── */
    {
      id: "cc-weighted",
      type: CalcNodeType.CUSTOM_CODE,
      level: 5,
      col: 0,
      label: "Weighted Mean Rainfall (Isohyetal)",
      description: "Compute Σ(Aᵢ × mean_iso) / ΣAᵢ across bands.",
      inputs: [{ key: "isohyet_bands" }, { key: "storm_duration_hr" }],
      outputs: [
        { key: "weighted_rainfall_mm", unit: "mm", dataType: VariableDataType.NUMBER },
        { key: "sps_point_cm", unit: "cm", dataType: VariableDataType.NUMBER }
      ],
      code: `let bands = typeof inputs.isohyet_bands === 'string' ? JSON.parse(inputs.isohyet_bands) : inputs.isohyet_bands;
const duration = inputs.storm_duration_hr;
if (duration === 48) {
  bands = [
    { area_sqkm: 38.5361719457, iso_min_mm: 508, iso_max_mm: 510 },
    { area_sqkm: 355.495911188, iso_min_mm: 510, iso_max_mm: 520 },
    { area_sqkm: 274.429577645, iso_min_mm: 520, iso_max_mm: 530 },
    { area_sqkm: 128.622084648, iso_min_mm: 530, iso_max_mm: 540 },
    { area_sqkm: 72.3963626754, iso_min_mm: 540, iso_max_mm: 550 },
    { area_sqkm: 5.92573570696, iso_min_mm: 550, iso_max_mm: 560 }
  ];
} else if (duration === 72) {
  bands = [
    { area_sqkm: 98.08962474, iso_min_mm: 730, iso_max_mm: 740 },
    { area_sqkm: 635.56809816, iso_min_mm: 740, iso_max_mm: 750 },
    { area_sqkm: 141.748120908, iso_min_mm: 750, iso_max_mm: 760 }
  ];
}
let sumAP = 0, sumA = 0;
for (const b of bands) {
  const mean = (b.iso_min_mm + b.iso_max_mm) / 2;
  sumAP += b.area_sqkm * mean;
  sumA  += b.area_sqkm;
}
const mm = sumAP / sumA;
return { weighted_rainfall_mm: mm, sps_point_cm: mm / 10 };`
    },

    /* ─── Level 6 — ARF interpolation ────────────── */
    {
      id: "cc-arf",
      type: CalcNodeType.CUSTOM_CODE,
      level: 6,
      col: 0,
      label: "Areal Reduction Factor (interpolated)",
      description: "Pick lookup table for storm duration and interpolate by catchment area.",
      inputs: [{ key: "catchment_area" }, { key: "storm_duration_hr" }],
      outputs: [{ key: "areal_reduction", label: "Point-to-areal factor", dataType: VariableDataType.NUMBER }],
      code: `const tables = {
  24: [[500,0.94],[1000,0.91],[1500,0.90],[2000,0.88],[3000,0.86],[4000,0.83],[5000,0.81]],
  48: [[500,0.95],[1000,0.92],[1500,0.91],[2000,0.89],[3000,0.87],[4000,0.85],[5000,0.83]],
  72: [[500,0.96],[1000,0.94],[1500,0.93],[2000,0.92],[3000,0.90],[4000,0.88],[5000,0.86]]
};
const T = tables[inputs.storm_duration_hr] || tables[24];
const A = inputs.catchment_area;
let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
const n = T.length;
for (let i = 0; i < n; i++) {
  const x = T[i][0];
  const y = T[i][1];
  sumX += x;
  sumY += y;
  sumXY += x * y;
  sumXX += x * x;
}
const meanX = sumX / n;
const meanY = sumY / n;
const num = sumXY - n * meanX * meanY;
const den = sumXX - n * meanX * meanX;
const slope = num / den;
const intercept = meanY - slope * meanX;
const arf = slope * A + intercept;
return { areal_reduction: arf };`
    },

    /* ─── Level 7 — Storm SPS (Formula Node using System Registry) ────────────── */
    {
      id: "f-sps",
      type: CalcNodeType.FORMULA,
      level: 7,
      col: 0,
      label: "Storm-duration SPS",
      description: "Apply clock-hour correction and areal reduction to the point SPS.",
      registryId: "freg_sps_corrected",
      bindings: {
        sps_point_cm: "sps_point_cm",
        clock_hour_corr: "clock_hour_corr",
        areal_reduction: "areal_reduction"
      },
      outputs: [{ key: "sps_dur_cm", label: "SPS for storm duration", unit: "cm", dataType: VariableDataType.NUMBER }]
    },

    /* ─── Level 8 — PMP Depth (Formula Node using System Registry) ────────────── */
    {
      id: "f-pmp",
      type: CalcNodeType.FORMULA,
      level: 8,
      col: 0,
      label: "PMP Depth",
      description: "Final PMP = corrected SPS × Moisture Maximisation Factor.",
      registryId: "freg_pmp_from_sps",
      bindings: {
        sps_dur_cm: "sps_dur_cm",
        mmf: "mmf"
      },
      outputs: [{ key: "pmp_cm", label: "PMP for storm duration", unit: "cm", dataType: VariableDataType.NUMBER }]
    },

    /* ─── Level 9 — Bell Depths (Formula Nodes using System Registry) ────────────── */
    {
      id: "f-bell1",
      type: CalcNodeType.FORMULA,
      level: 9,
      col: 0,
      label: "1st 12-hr Bell Depth",
      description: "Depth for the first 12-hour period.",
      registryId: "freg_bell_depth",
      bindings: {
        pmp_total_cm: "pmp_cm",
        bell_pct: "bell_pct_1st"
      },
      outputs: [{ key: "bell1_cm", unit: "cm", dataType: VariableDataType.NUMBER }]
    },
    {
      id: "f-bell2",
      type: CalcNodeType.FORMULA,
      level: 9,
      col: 1,
      label: "2nd 12-hr Bell Depth",
      description: "Depth for the second 12-hour period.",
      registryId: "freg_bell_residual",
      bindings: {
        pmp_total_cm: "pmp_cm",
        bell_depth_cm: "bell1_cm"
      },
      outputs: [{ key: "bell2_cm", unit: "cm", dataType: VariableDataType.NUMBER }]
    },

    /* ─── Level 10 — Hyetograph ────────────── */
    {
      id: "cc-hyeto",
      type: CalcNodeType.CUSTOM_CODE,
      level: 10,
      col: 0,
      label: "Hyetograph + Loss + Critical Sequencing",
      description: "Distribute each bell across 12 hours and apply uniform loss.",
      inputs: [
        { key: "bell1_cm" }, { key: "bell2_cm" }, { key: "loss_rate" },
        { key: "storm_duration_hr" }, { key: "catchment_area" }, { key: "uh_ordinates" }
      ],
      outputs: [
        { key: "excess_bell1", label: "Bell-1 critical hourly excess", unit: "cm/hr", dataType: VariableDataType.ARRAY },
        { key: "excess_bell2", label: "Bell-2 critical hourly excess", unit: "cm/hr", dataType: VariableDataType.ARRAY }
      ],
      code: `const duration = inputs.storm_duration_hr || 24;
const loss_rate = inputs.loss_rate || 0.23;
const catchment_area = inputs.catchment_area || 875.41;
const mmf = 1.12;
const clock_hour_corr = 1.15;
const uh_ordinates = inputs.uh_ordinates;

const bands_data = {
  24: [
    { area_sqkm: 178.60653743, iso_min_mm: 380, iso_max_mm: 390 },
    { area_sqkm: 687.136908761, iso_min_mm: 390, iso_max_mm: 400 },
    { area_sqkm: 9.66239761711, iso_min_mm: 400, iso_max_mm: 410 }
  ],
  48: [
    { area_sqkm: 38.5361719457, iso_min_mm: 508, iso_max_mm: 510 },
    { area_sqkm: 355.495911188, iso_min_mm: 510, iso_max_mm: 520 },
    { area_sqkm: 274.429577645, iso_min_mm: 520, iso_max_mm: 530 },
    { area_sqkm: 128.622084648, iso_min_mm: 530, iso_max_mm: 540 },
    { area_sqkm: 72.3963626754, iso_min_mm: 540, iso_max_mm: 550 },
    { area_sqkm: 5.92573570696, iso_min_mm: 550, iso_max_mm: 560 }
  ],
  72: [
    { area_sqkm: 98.08962474, iso_min_mm: 730, iso_max_mm: 740 },
    { area_sqkm: 635.56809816, iso_min_mm: 740, iso_max_mm: 750 },
    { area_sqkm: 141.748120908, iso_min_mm: 750, iso_max_mm: 760 }
  ]
};

function get_pmp(dur) {
  const bands = bands_data[dur];
  let sumAP = 0, sumA = 0;
  for (const b of bands) {
    const mean = (b.iso_min_mm + b.iso_max_mm) / 2;
    sumAP += b.area_sqkm * mean;
    sumA  += b.area_sqkm;
  }
  const point_sps_cm = (sumAP / sumA) / 10;
  
  const tables = {
    24: [[500,0.94],[1000,0.91],[1500,0.90],[2000,0.88],[3000,0.86],[4000,0.83],[5000,0.81]],
    48: [[500,0.95],[1000,0.92],[1500,0.91],[2000,0.89],[3000,0.87],[4000,0.85],[5000,0.83]],
    72: [[500,0.96],[1000,0.94],[1500,0.93],[2000,0.92],[3000,0.90],[4000,0.88],[5000,0.86]]
  };
  const T = tables[dur];
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = T.length;
  for (let i = 0; i < n; i++) {
    const x = T[i][0];
    const y = T[i][1];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const num = sumXY - n * meanX * meanY;
  const den = sumXX - n * meanX * meanX;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  const arf = slope * catchment_area + intercept;
  
  const sps = point_sps_cm * clock_hour_corr * arf;
  return sps * mmf;
}

const pmp24 = get_pmp(24);
const pmp48 = get_pmp(48);
const pmp72 = get_pmp(72);

const day1_pmp = pmp24;
const day2_pmp = pmp48 - pmp24;
const day3_pmp = pmp72 - pmp48;

let bells = [];
if (duration === 24) {
  bells = [day1_pmp * 0.73, day1_pmp * 0.27];
} else if (duration === 48) {
  bells = [
    day1_pmp * 0.73, day1_pmp * 0.27,
    day2_pmp * 0.73, day2_pmp * 0.27
  ];
} else {
  bells = [
    day1_pmp * 0.73, day1_pmp * 0.27,
    day2_pmp * 0.73, day2_pmp * 0.27,
    day3_pmp * 0.73, day3_pmp * 0.27
  ];
}

const cum = [15.1, 25.5, 31.6, 36.9, 42.2, 47.1, 51.8, 56.4, 60.8, 65.2, 69.3, 73.0];
let incr = cum.map((v, i) => i === 0 ? v : v - cum[i-1]);
const norm = 100 / incr.reduce((s,v) => s+v, 0);
incr = incr.map(v => v * norm);

const ranks = [12, 10, 8, 6, 4, 2, 1, 3, 5, 7, 9, 11];
const bell_excess_blocks = [];

for (let idx = 0; idx < bells.length; idx++) {
  const b_depth = bells[idx];
  const hourly = incr.map(p => (p / 100) * b_depth);
  if (duration === 72) {
    const sorted = [...hourly].sort((a, b) => b - a);
    const aligned = [];
    for (const r of ranks) {
      aligned.push(sorted[r - 1]);
    }
    bell_excess_blocks.push(aligned.reverse());
  } else {
    const excess = hourly.map(v => Math.max(0, v - loss_rate));
    const sorted = [...excess].sort((a, b) => b - a);
    const aligned = [];
    for (const r of ranks) {
      aligned.push(sorted[r - 1]);
    }
    bell_excess_blocks.push(aligned.reverse());
  }
}

function permute(arr) {
  if (arr.length === 0) return [[]];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const current = arr[i];
    const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPerms = permute(remaining);
    for (let j = 0; j < remainingPerms.length; j++) {
      result.push([current].concat(remainingPerms[j]));
    }
  }
  return result;
}

let best_order = [];
let best_excess = [];
let best_peak = -1;

const num_blocks = bell_excess_blocks.length;
const p_list = duration === 24 ? [[0, 1]] : permute(Array.from({length: num_blocks}, (_, i) => i));

for (const p of p_list) {
  let combined = [];
  for (const idx of p) {
    combined = combined.concat(bell_excess_blocks[idx]);
  }
  const out = new Array(uh_ordinates.length + combined.length - 1).fill(0);
  for (let i = 0; i < combined.length; i++) {
    for (let j = 0; j < uh_ordinates.length; j++) {
      out[i+j] += combined[i] * uh_ordinates[j];
    }
  }
  let peak = 0;
  for (const v of out) {
    if (v > peak) peak = v;
  }
  if (peak > best_peak) {
    best_peak = peak;
    best_order = p;
    best_excess = combined;
  }
}

return {
  excess_bell1: best_excess,
  excess_bell2: [0]
};`
    },

    /* ─── Level 11 — Convolution ────────────── */
    {
      id: "cc-conv",
      type: CalcNodeType.CUSTOM_CODE,
      level: 11,
      col: 0,
      label: "Convolve UH × Excess → DRH",
      description: "Discrete linear convolution of the UH with hourly excess.",
      inputs: [
        { key: "uh_ordinates" },
        { key: "excess_bell1" }, { key: "excess_bell2" }
      ],
      outputs: [{ key: "drh_ordinates", label: "Direct runoff hydrograph", unit: "cumec", dataType: VariableDataType.ARRAY }],
      code: `const uh = inputs.uh_ordinates;
function conv(rain) {
  if (!rain || rain.length === 0) return [];
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
let drh;
if (d2.length <= 1) {
  drh = d1;
} else {
  const len = Math.max(d1.length, d2.length + 12);
  drh = new Array(len).fill(0);
  d1.forEach((v,i) => drh[i]    += v);
  d2.forEach((v,i) => drh[i+12] += v);
}
return { drh_ordinates: drh };`
    },

    /* ─── Level 12 — Total Baseflow (Formula Node using System Registry) ────────────── */
    {
      id: "f-baseflow",
      type: CalcNodeType.FORMULA,
      level: 12,
      col: 0,
      label: "Total Base Flow",
      description: "Convert unit base flow to a discharge by multiplying by area.",
      registryId: "freg_base_flow_discharge",
      bindings: {
        base_flow_unit: "base_flow",
        catchment_area: "catchment_area"
      },
      outputs: [{ key: "base_flow_total", label: "Base flow", unit: "cumec", dataType: VariableDataType.NUMBER }]
    },

    /* ─── Level 13 — PMF ────────────── */
    {
      id: "cc-pmf",
      type: CalcNodeType.CUSTOM_CODE,
      level: 13,
      col: 0,
      label: "PMF = DRH + Base Flow",
      description: "Add the base flow to each ordinate of the DRH.",
      inputs: [{ key: "drh_ordinates" }, { key: "base_flow_total" }],
      outputs: [
        { key: "pmf_ordinates", label: "PMF hydrograph", unit: "cumec", dataType: VariableDataType.ARRAY },
        { key: "pmf_peak", label: "Peak PMF", unit: "cumec", dataType: VariableDataType.NUMBER },
        { key: "pmf_peak_hr", label: "Time of peak", unit: "hr", dataType: VariableDataType.NUMBER }
      ],
      code: `const drh = inputs.drh_ordinates;
const Qb  = inputs.base_flow_total;
const pmf = drh.map(v => v + Qb);
let peak = 0, idx = 0;
pmf.forEach((v,i) => { if (v > peak) { peak = v; idx = i; } });
return { pmf_ordinates: pmf, pmf_peak: peak, pmf_peak_hr: idx };`
    }
  ];

  const edgesDef = [
    { from: "in-catchment", to: "cc-slope" },
    { from: "in-catchment", to: "cc-lookup" },
    { from: "in-profile", to: "cc-slope" },

    { from: "f-qp", to: "f-tp" },
    { from: "cc-slope", to: "f-qp" },
    { from: "cc-lookup", to: "f-tp" },
    { from: "cc-lookup", to: "f-qp" },

    { from: "f-qp", to: "f-Qp" },
    { from: "f-tp", to: "f-Tm" },
    { from: "f-qp", to: "f-W50" },
    { from: "f-qp", to: "f-W75" },
    { from: "f-qp", to: "f-WR50" },
    { from: "f-qp", to: "f-WR75" },
    { from: "f-tp", to: "f-TB" },

    { from: "f-Qp", to: "cc-uh" },
    { from: "f-Tm", to: "cc-uh" },
    { from: "f-W50", to: "cc-uh" },
    { from: "f-W75", to: "cc-uh" },
    { from: "f-WR50", to: "cc-uh" },
    { from: "f-WR75", to: "cc-uh" },
    { from: "f-TB", to: "cc-uh" },
    { from: "in-catchment", to: "cc-uh" },

    { from: "in-iso", to: "cc-weighted" },
    { from: "in-storm", to: "cc-weighted" },
    { from: "in-catchment", to: "cc-arf" },
    { from: "in-storm", to: "cc-arf" },
    { from: "cc-weighted", to: "f-sps" },
    { from: "cc-arf", to: "f-sps" },
    { from: "in-adj", to: "f-sps" },
    { from: "f-sps", to: "f-pmp" },
    { from: "in-adj", to: "f-pmp" },
    { from: "f-pmp", to: "f-bell1" },
    { from: "in-adj", to: "f-bell1" },
    { from: "f-pmp", to: "f-bell2" },
    { from: "f-bell1", to: "f-bell2" },

    { from: "f-bell1", to: "cc-hyeto" },
    { from: "f-bell2", to: "cc-hyeto" },
    { from: "in-catchment", to: "cc-hyeto" },
    { from: "in-storm", to: "cc-hyeto" },
    { from: "cc-uh", to: "cc-hyeto" },
    { from: "cc-uh", to: "cc-conv" },
    { from: "cc-hyeto", to: "cc-conv" },

    { from: "in-catchment", to: "f-baseflow" },
    { from: "cc-conv", to: "cc-pmf" },
    { from: "f-baseflow", to: "cc-pmf" }
  ];

  // Calculate coordinates dynamically
  const ROW_H = 145;
  const COL_W = 250;
  const NODE_W = 220;
  const LEFT_PAD = 80;
  const TOP_PAD = 60;

  const levels: Record<number, any[]> = {};
  for (const n of nodesDef) {
    if (!levels[n.level]) levels[n.level] = [];
    levels[n.level].push(n);
  }

  let svgWidth = 0;
  for (const lvlNodes of Object.values(levels)) {
    const w = LEFT_PAD * 2 + lvlNodes.length * COL_W;
    if (w > svgWidth) svgWidth = w;
  }
  svgWidth = Math.max(svgWidth, 1200);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const [lvlStr, lvlNodes] of Object.entries(levels)) {
    const lvl = Number(lvlStr);
    lvlNodes.sort((a, b) => a.col - b.col);
    const totalW = lvlNodes.length * NODE_W + (lvlNodes.length - 1) * (COL_W - NODE_W);
    const startX = (svgWidth - totalW) / 2;
    lvlNodes.forEach((n, i) => {
      positions[n.id] = {
        x: startX + i * COL_W,
        y: TOP_PAD + lvl * ROW_H,
      };
    });
  }

  // Insert inside transaction
  await prisma.$transaction(async (tx) => {
    // 1. Create CalcWorkflow
    const workflow = await tx.calcWorkflow.create({
      data: {
        id: WORKFLOW_ID,
        organizationId: orgId,
        name: "Betwa River SUH / PMF",
        slug,
        description: "Calculation workflow for 27-node synthetic unit hydrograph (SUH), storm depth, and PMF convolution (Registry Formula integration).",
        category: "Hydrology",
        tags: ["hydrology", "suh", "pmf", "betwa", "cwc"],
        status: "DRAFT",
        visibility: "PRIVATE",
      },
    });

    // 2. Create CalcNodes
    const createdNodes: Record<string, any> = {};
    for (const n of nodesDef) {
      const pos = positions[n.id];
      let config: any = {};
      if (n.type === CalcNodeType.INPUT) {
        config = {
          fields: n.outputs.map((o: any) => ({
            key: o.key,
            label: o.label || o.key,
            unit: o.unit || "—",
            default: o.default,
            data_type: o.dataType.toLowerCase(),
            required: true,
            mcq_options: n.options?.[o.key] ? n.options[o.key].map((opt: any) => ({ label: String(opt), variables: [] })) : undefined,
          })),
          pause_execution: true,
        };
      } else if (n.type === CalcNodeType.FORMULA) {
        const registryFormula = await tx.formulaRegistryItem.findUnique({
          where: { id: n.registryId },
        });
        if (!registryFormula) {
          throw new Error(`Formula registry item ${n.registryId} not found in DB!`);
        }

        const regInputs = (registryFormula.inputVariables || []) as any[];
        const regOutput = registryFormula.outputVariable as any;
        const requiredVars = regInputs.map(v => v.notation || v.key);

        const showVars = requiredVars.map(v => {
          const regVar = regInputs.find(ri => (ri.notation || ri.key) === v);
          const boundKey = n.bindings?.[v] || v;
          return {
            key: boundKey,
            label: regVar?.displayLabel || regVar?.label || v,
            unit: regVar?.unit || "",
          };
        });

        config = {
          source: "registry",
          registry_id: n.registryId,
          expression: registryFormula.expressionNotation,
          display_expression: registryFormula.displayExpression,
          variable_bindings: n.bindings || {},
          result_variable: n.outputs[0].key,
          result_unit: n.outputs[0].unit || "—",
          result_precision: 3,
          use_worker: true,
          registry_inputs: regInputs,
          registry_output: regOutput,
          showVars,
        };
      } else if (n.type === CalcNodeType.CUSTOM_CODE) {
        config = {
          code: n.code,
          output_variables: n.outputs.map((o: any) => o.key),
          use_worker: true,
        };
      }

      const node = await tx.calcNode.create({
        data: {
          id: `node_${n.id.replace(/-/g, "_")}`,
          calcWorkflowId: workflow.id,
          type: n.type,
          label: n.label,
          description: n.description || null,
          positionX: pos.x,
          positionY: pos.y,
          config,
        },
      });
      createdNodes[n.id] = node;

      // Create variables associated with this node
      for (let i = 0; i < n.outputs.length; i++) {
        const o = n.outputs[i] as any;
        await tx.calcVariable.create({
          data: {
            calcWorkflowId: workflow.id,
            contextKey: o.key,
            displayLabel: o.label || o.key,
            notation: o.key,
            dataType: o.dataType || VariableDataType.NUMBER,
            unit: o.unit === "—" || !o.unit ? null : o.unit,
            defaultValue: o.default !== undefined ? o.default : null,
            sourceNodeId: node.id,
            sourceType: n.type === CalcNodeType.INPUT ? VariableSourceType.USER_INPUT : VariableSourceType.FORMULA_OUTPUT,
            scope: VariableScope.GLOBAL,
            sortOrder: i,
          },
        });
      }

      // If formula node, create FormulaRegistryUsage row
      if (n.type === CalcNodeType.FORMULA && n.registryId) {
        await tx.formulaRegistryUsage.create({
          data: {
            calcWorkflowId: workflow.id,
            calcNodeId: node.id,
            formulaRegistryId: n.registryId,
          },
        });
      }
    }

    // 3. Create CalcEdges
    for (const e of edgesDef) {
      const srcNode = createdNodes[e.from];
      const tgtNode = createdNodes[e.to];
      if (!srcNode || !tgtNode) {
        throw new Error(`Edge connection failed: ${e.from} -> ${e.to}`);
      }
      await tx.calcEdge.create({
        data: {
          calcWorkflowId: workflow.id,
          sourceNodeId: srcNode.id,
          targetNodeId: tgtNode.id,
          sourceHandle: "output",
          targetHandle: "input",
        },
      });
    }

    // 4. Create CalcCollaborator
    await tx.calcCollaborator.create({
      data: {
        calcWorkflowId: workflow.id,
        actorId,
        permission: CollaboratorPermission.ADMIN,
      },
    });

    // 5. Create initial CalcVersion
    const version = await tx.calcVersion.create({
      data: {
        calcWorkflowId: workflow.id,
        version: 1,
        changelog: "Initial seed of Betwa River SUH / PMF workflow with Registry Formula integration",
        publishedBy: actorId,
        snapshot: {
          nodesCount: nodesDef.length,
          edgesCount: edgesDef.length,
        },
      },
    });

    // 6. Update workflow current version
    await tx.calcWorkflow.update({
      where: { id: workflow.id },
      data: {
        currentVersionId: version.id,
      },
    });
  });

  console.log(`\n🎉 Seeded Betwa River workflow successfully with ID: ${WORKFLOW_ID}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
