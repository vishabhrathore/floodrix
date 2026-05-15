import React from "react";

import { Anchor, CloudRain, Droplets, Mountain } from "lucide-react";

// --- Types ---
export interface FormulaField {
  key: string;
  label: string;
  unit: string;
  def?: number;
  hint?: string;
}

export interface LookupConfig {
  title: string;
  sub: string;
  cols: string[];
  rows: string[][];
  fn: (vals: Record<string, number>) => number;
  valFn: (vals: Record<string, number>) => number;
}

export interface ResultVar {
  k: string;
  d: string;
  v: number | string;
  u: string;
  result?: boolean;
}

export interface ChartPoint {
  x: number;
  y: number;
}

export interface CalcResult {
  Q: number;
  vars: ResultVar[];
  chartFn?: (x: number) => number;
  chartPts?: ChartPoint[];
  chartX: number;
  chartXLabel?: string;
  chartYLabel?: string;
  waterway?: {
    Qd: number;
    P_lacey: number;
    W_linear: number;
    W_cwc: number;
    min: number;
  };
}

export interface FormulaDef {
  name: string;
  expr: string;
  ref: string;
  region: string;
  notice?: string;
  stub?: boolean;
  fields: FormulaField[];
  lookup?: LookupConfig;
  calc: (vals: Record<string, number>) => CalcResult;
}

export interface TreeNode {
  label: string;
  icon: string | React.ReactNode;
  desc: string;
  formula?: string;
  leaf?: boolean;
  children?: Record<string, TreeNode>;
}

// --- Helper for formatting ---
const fmt = (v: number, dp: number = 3) => parseFloat(v.toFixed(dp));

// --- Formula Constants & Logic ---
export const FORMULAS: Record<string, FormulaDef> = {
  dicken: {
    name: "Dicken's Formula",
    expr: "Q = C × M^(3/4)",
    ref: "Cl.4.2, IRC:SP:13-2004 · 1865",
    region: "Central & Northern India",
    fields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        def: 24.1,
        hint: "Total drainage area upstream of bridge",
      },
      {
        key: "annual_rain",
        label: "Annual Average Rainfall",
        unit: "cm",
        def: 120,
        hint: "From rainfall records",
      },
    ],
    lookup: {
      title: "Dicken's Constant (C)",
      sub: "Based on annual average rainfall — Cl.4.2, IRC:SP:13-2004",
      cols: ["Annual Rainfall", "C Value", "Remarks"],
      rows: [
        ["< 60 cm", "11", "Dry regions"],
        ["60–120 cm", "14", "Moderate rainfall"],
        ["120–140 cm", "15", "High rainfall"],
        ["> 140 cm", "22", "Western Ghats"],
      ],
      fn: (r) =>
        r.annual_rain < 60
          ? 0
          : r.annual_rain < 120
            ? 1
            : r.annual_rain < 140
              ? 2
              : 3,
      valFn: (r) =>
        r.annual_rain < 60
          ? 11
          : r.annual_rain < 120
            ? 14
            : r.annual_rain < 140
              ? 15
              : 22,
    },
    calc(r) {
      const C = this.lookup!.valFn(r);
      const Q = C * Math.pow(r.M, 0.75);
      return {
        Q,
        vars: [
          { k: "M", d: "Catchment Area", v: r.M, u: "Km²" },
          { k: "C", d: "Dicken's Constant (lookup)", v: C, u: "" },
          {
            k: "Q",
            d: "Q = C × M^(3/4)",
            v: fmt(Q),
            u: "Cumecs",
            result: true,
          },
        ],
        chartFn: (x) => C * Math.pow(x, 0.75),
        chartX: r.M,
        chartXLabel: "Catchment Area M (Km²)",
        chartYLabel: "Q (Cumecs)",
      };
    },
  },
  ryve: {
    name: "Ryve's Formula",
    expr: "Q = C × M^(2/3)",
    ref: "Cl.4.3, IRC:SP:13-2004 · 1884",
    region: "Tamil Nadu, Karnataka, Andhra Pradesh",
    fields: [
      { key: "M", label: "Catchment Area", unit: "Km²", def: 24.1 },
      {
        key: "dist_coast",
        label: "Distance from Coast",
        unit: "Km",
        def: 41,
        hint: "Determines Ryve's C value",
      },
    ],
    lookup: {
      title: "Ryve's Constant (C)",
      sub: "Based on distance from coastline — Cl.4.3, IRC:SP:13-2004",
      cols: ["Zone", "Distance", "C Value"],
      rows: [
        ["Coastal", "≤ 25 Km", "6.8"],
        ["Inland", "25–160 Km", "8.5"],
        ["Hilly (limited)", "Any", "10.0"],
        ["Krishna Basin", "CWC", "15.0"],
      ],
      fn: (r) => (r.dist_coast <= 25 ? 0 : r.dist_coast <= 160 ? 1 : 2),
      valFn: (r) =>
        r.dist_coast <= 25 ? 6.8 : r.dist_coast <= 160 ? 8.5 : 10.0,
    },
    calc(r) {
      const C = this.lookup!.valFn(r);
      const Q = C * Math.pow(r.M, 2 / 3);
      return {
        Q,
        vars: [
          { k: "M", d: "Catchment Area", v: r.M, u: "Km²" },
          {
            k: "dist_coast",
            d: "Distance from Coast",
            v: r.dist_coast,
            u: "Km",
          },
          { k: "C", d: "Ryve's C (from lookup)", v: C, u: "" },
          {
            k: "Q",
            d: "Q = C × M^(2/3)",
            v: fmt(Q),
            u: "Cumecs",
            result: true,
          },
        ],
        chartFn: (x) => C * Math.pow(x, 2 / 3),
        chartX: r.M,
        chartXLabel: "Catchment Area M (Km²)",
        chartYLabel: "Q (Cumecs)",
      };
    },
  },
  ingli: {
    name: "Ingli's Formula",
    expr: "Q = 125M / √(M+10)",
    ref: "Cl.4.4, IRC:SP:13-2004 · 1930",
    region: "Western Ghats, Maharashtra",
    fields: [
      {
        key: "M",
        label: "Catchment Area",
        unit: "Km²",
        def: 24.1,
        hint: "For Western Ghats catchments",
      },
    ],
    calc(r) {
      const Q = (125 * r.M) / Math.sqrt(r.M + 10);
      return {
        Q,
        vars: [
          { k: "M", d: "Catchment Area", v: r.M, u: "Km²" },
          {
            k: "√(M+10)",
            d: "Square root term",
            v: fmt(Math.sqrt(r.M + 10)),
            u: "",
          },
          {
            k: "Q",
            d: "Q = 125M / √(M+10)",
            v: fmt(Q),
            u: "Cumecs",
            result: true,
          },
        ],
        chartFn: (x) => (125 * x) / Math.sqrt(x + 10),
        chartX: r.M,
        chartXLabel: "Catchment Area M (Km²)",
        chartYLabel: "Q (Cumecs)",
      };
    },
  },
  creager: {
    name: "Creager's Formula",
    expr: "Q = C·(0.386A)^0.894·(0.386A)^(-0.048)",
    ref: "IRC:SP:13-2004",
    region: "Moderate Floods (C = 40–130)",
    fields: [
      { key: "M", label: "Catchment Area", unit: "Km²", def: 24.1 },
      {
        key: "C_cf",
        label: "Creager's Constant",
        unit: "—",
        def: 65,
        hint: "40–130; 65 for moderate floods",
      },
    ],
    calc(r) {
      const Q =
        r.C_cf * Math.pow(0.386 * r.M, 0.894) * Math.pow(0.386 * r.M, -0.048);
      return {
        Q,
        vars: [
          { k: "A", d: "Catchment Area", v: r.M, u: "Km²" },
          { k: "C", d: "Creager's Constant", v: r.C_cf, u: "" },
          { k: "0.386A", d: "0.386 × A", v: fmt(0.386 * r.M), u: "" },
          {
            k: "Q",
            d: "Q = C·(0.386A)^0.894·(0.386A)^(-0.048)",
            v: fmt(Q),
            u: "Cumecs",
            result: true,
          },
        ],
        chartFn: (x) =>
          r.C_cf * Math.pow(0.386 * x, 0.894) * Math.pow(0.386 * x, -0.048),
        chartX: r.M,
        chartXLabel: "Catchment Area A (Km²)",
        chartYLabel: "Q (Cumecs)",
      };
    },
  },
  fuller: {
    name: "Fuller's Formula",
    expr: "QTP = 1.88 · M^0.8 · (1 + 0.8 log T)",
    ref: "IRC:SP:13-2004",
    region: "Peak 24-hr flood (Cf = 0.18–1.88)",
    fields: [
      { key: "M", label: "Catchment Area", unit: "Km²", def: 24.1 },
      {
        key: "T_return",
        label: "Return Period",
        unit: "years",
        def: 100,
        hint: "Design return period",
      },
    ],
    calc(r) {
      const Q = 1.88 * Math.pow(r.M, 0.8) * (1 + 0.8 * Math.log10(r.T_return));
      const pts = [2, 5, 10, 25, 50, 100, 200, 500].map((t) => ({
        x: t,
        y: 1.88 * Math.pow(r.M, 0.8) * (1 + 0.8 * Math.log10(t)),
      }));
      return {
        Q,
        vars: [
          { k: "M", d: "Catchment Area", v: r.M, u: "Km²" },
          { k: "T", d: "Return Period", v: r.T_return, u: "yr" },
          { k: "M^0.8", d: "M^0.8", v: fmt(Math.pow(r.M, 0.8)), u: "" },
          { k: "log T", d: "log₁₀(T)", v: fmt(Math.log10(r.T_return)), u: "" },
          {
            k: "Q",
            d: "QTP = 1.88·M^0.8·(1+0.8·logT)",
            v: fmt(Q),
            u: "Cumecs",
            result: true,
          },
        ],
        chartPts: pts,
        chartX: r.T_return,
        chartXLabel: "Return Period T (years)",
        chartYLabel: "Q (Cumecs)",
      };
    },
  },
  rational: {
    name: "Modified Rational Method",
    expr: "Q = 0.028 · P · f · A · Ic",
    ref: "Cl.4.7.9, IRC:SP:13-2004",
    region: "Catchments ≤ 25 sq.km.",
    notice:
      "Only valid for catchments up to 25 sq.km. For larger areas use other empirical methods.",
    fields: [
      { key: "M", label: "Catchment Area", unit: "Km²", def: 24.1 },
      {
        key: "L",
        label: "Basin Length",
        unit: "Km",
        def: 1.506,
        hint: "Longest water travel path",
      },
      { key: "H_high", label: "Highest Elevation", unit: "m", def: 209 },
      { key: "H_low", label: "Lowest Elevation", unit: "m", def: 167 },
      {
        key: "F_24hr",
        label: "24-hr Rainfall (100-yr)",
        unit: "cm",
        def: 25.1,
        hint: "From IMD isopluvial maps",
      },
      {
        key: "P",
        label: "Runoff Coefficient (P)",
        unit: "—",
        def: 0.4,
        hint: "Table 4.1, IRC:SP:13-2004",
      },
      {
        key: "f",
        label: "Areal Reduction (f)",
        unit: "—",
        def: 0.9,
        hint: "Fig 4.2, IRC:SP:13-2004",
      },
    ],
    calc(r) {
      const H = r.H_high - r.H_low;
      const tc_c = Math.pow((0.87 * Math.pow(r.L, 3)) / H, 0.385);
      const tc = Math.max(2.72, tc_c);
      const Ic = (r.F_24hr / 24) * (25 / (tc + 1));
      const Q = 0.028 * r.P * r.f * r.M * Ic;
      const pts = Array.from({ length: 20 }, (_, i) => {
        const t = 0.5 + i * 0.5;
        return {
          x: t,
          y: 0.028 * r.P * r.f * r.M * (r.F_24hr / 24) * (25 / (t + 1)),
        };
      });
      return {
        Q,
        vars: [
          { k: "H", d: "Elevation difference", v: fmt(H), u: "m" },
          { k: "tc_calc", d: "(0.87·L³/H)^0.385", v: fmt(tc_c), u: "hr" },
          { k: "tc", d: "Adopted tc (min 2.72 hr)", v: fmt(tc), u: "hr" },
          { k: "Ic", d: "Ic = (F/24)·(25/(tc+1))", v: fmt(Ic), u: "cm/hr" },
          { k: "P", d: "Runoff Coefficient", v: r.P, u: "" },
          { k: "f", d: "Areal Reduction Factor", v: r.f, u: "" },
          {
            k: "Q",
            d: "Q = 0.028·P·f·A·Ic",
            v: fmt(Q),
            u: "Cumecs",
            result: true,
          },
        ],
        chartPts: pts,
        chartX: tc,
        chartXLabel: "Time of Concentration tc (hr)",
        chartYLabel: "Q (Cumecs)",
      };
    },
  },
  // Stubs
  feh: {
    name: "FEH Method",
    expr: "Q = QMED × GEH(T)",
    ref: "UK Flood Estimation Handbook",
    region: "UK Catchments",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  fia: {
    name: "FIA Formula",
    expr: "Q = C · A^0.77",
    ref: "FIA Report",
    region: "UK / International",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  snyder: {
    name: "Snyder's UH",
    expr: "Qp = 2.78 · Cp · A / tp",
    ref: "Snyder 1938",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  scs: {
    name: "SCS Curve Number",
    expr: "Q = (P-Ia)² / (P-Ia+S)",
    ref: "SCS-CN Method",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  cwc: {
    name: "CWC Method",
    expr: "CWC-SUH",
    ref: "CWC India",
    region: "India",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  gumbel: {
    name: "Gumbel EV-I",
    expr: "xT = x̄ + KσT",
    ref: "Gumbel 1941",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  lpiii: {
    name: "Log-Pearson III",
    expr: "log xT = ȳ + KSy",
    ref: "Bulletin 17C",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  hec18: {
    name: "HEC-18 Pier Scour",
    expr: "ys = 2.0·y1·K1...",
    ref: "HEC-18, FHWA",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  lacey_scour: {
    name: "Lacey's Scour",
    expr: "R = 0.473·(Q/f)^(1/3)",
    ref: "IRC:78-2000",
    region: "India",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  fhwa_ab: {
    name: "FHWA Abutment Scour",
    expr: "ys = 2.27·(L/y1)^0.43",
    ref: "HEC-18",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  m_bernard: {
    name: "Modified Bernard",
    expr: "i = CT^x / t^n",
    ref: "Bernard 1932",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  arf_fsr: {
    name: "FSR ARF Method",
    expr: "ARF = 1 - 0.00115A^0.4",
    ref: "UK FSR",
    region: "General",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  terzaghi: {
    name: "Terzaghi Bearing",
    expr: "qult = cNc + qNq + 0.5γBNγ",
    ref: "IS-6403",
    region: "Geotechnical",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
  settlement: {
    name: "Consolidation Settlement",
    expr: "Sc = [Cc/(1+e0)] H log...",
    ref: "Soil Mechanics",
    region: "Geotechnical",
    stub: true,
    fields: [],
    calc: () => ({ Q: 0, vars: [], chartX: 0 }),
  },
};

export const TREE: Record<string, TreeNode> = {
  flood: {
    label: "Flood Discharge",
    icon: <Droplets />,
    desc: "IRC-compliant peak flood estimation for bridge site design",
    children: {
      empirical: {
        label: "Empirical Method",
        icon: "📐",
        desc: "Catchment area based formulas — quick estimation using field parameters",
        children: {
          indian: {
            label: "Indian Formulas",
            icon: "🇮🇳",
            desc: "Formulas developed specifically for Indian catchment conditions",
            children: {
              dicken: {
                label: "Dicken's Formula",
                icon: "ƒ",
                formula: "dicken",
                leaf: true,
                desc: "",
              },
              ryve: {
                label: "Ryve's Formula",
                icon: "ƒ",
                formula: "ryve",
                leaf: true,
                desc: "",
              },
              ingli: {
                label: "Ingli's Formula",
                icon: "ƒ",
                formula: "ingli",
                leaf: true,
                desc: "",
              },
              creager: {
                label: "Creager's Formula",
                icon: "ƒ",
                formula: "creager",
                leaf: true,
                desc: "",
              },
              rational: {
                label: "Modified Rational",
                icon: "ƒ",
                formula: "rational",
                leaf: true,
                desc: "",
              },
            },
          },
          uk: {
            label: "UK / International",
            icon: "🇬🇧",
            desc: "CIRIA / FSR methods from UK Flood Studies Report",
            children: {
              feh: {
                label: "FEH Method",
                icon: "ƒ",
                formula: "feh",
                leaf: true,
                desc: "",
              },
              fia: {
                label: "FIA Formula",
                icon: "ƒ",
                formula: "fia",
                leaf: true,
                desc: "",
              },
            },
          },
        },
      },
      unit_hydrograph: {
        label: "Unit Hydrograph",
        icon: "📈",
        desc: "Synthetic unit hydrograph method — CWC / Snyder / SCS",
        children: {
          snyder: {
            label: "Snyder UH",
            icon: "ƒ",
            formula: "snyder",
            leaf: true,
            desc: "",
          },
          scs: {
            label: "SCS Curve No.",
            icon: "ƒ",
            formula: "scs",
            leaf: true,
            desc: "",
          },
          cwc: {
            label: "CWC Method",
            icon: "ƒ",
            formula: "cwc",
            leaf: true,
            desc: "",
          },
        },
      },
      frequency: {
        label: "Flood Frequency",
        icon: "📉",
        desc: "Statistical analysis of historical flood data — Gumbel / LP-III",
        children: {
          gumbel: {
            label: "Gumbel EV-I",
            icon: "ƒ",
            formula: "gumbel",
            leaf: true,
            desc: "",
          },
          lpiii: {
            label: "Log-Pearson III",
            icon: "ƒ",
            formula: "lpiii",
            leaf: true,
            desc: "",
          },
        },
      },
    },
  },
  scour: {
    label: "Scour Assessment",
    icon: <Anchor />,
    desc: "Bridge scour depth estimation at piers, abutments and approaches",
    children: {
      pier_scour: {
        label: "Pier Scour",
        icon: "🔩",
        desc: "HEC-18 / Laursen pier scour formula",
        children: {
          hec18: {
            label: "HEC-18 Method",
            icon: "ƒ",
            formula: "hec18",
            leaf: true,
            desc: "",
          },
          lacey: {
            label: "Lacey's Regime",
            icon: "ƒ",
            formula: "lacey_scour",
            leaf: true,
            desc: "",
          },
        },
      },
      abutment: {
        label: "Abutment Scour",
        icon: "🧱",
        desc: "FHWA abutment scour formulae",
        children: {
          fhwa: {
            label: "FHWA Method",
            icon: "ƒ",
            formula: "fhwa_ab",
            leaf: true,
            desc: "",
          },
        },
      },
    },
  },
  rainfall: {
    label: "Rainfall Analysis",
    icon: <CloudRain />,
    desc: "IDF curves, depth-duration-frequency and areal rainfall estimation",
    children: {
      idf: {
        label: "IDF Curve",
        icon: "📊",
        desc: "Intensity-Duration-Frequency analysis",
        children: {
          modified_bernard: {
            label: "Modified Bernard",
            icon: "ƒ",
            formula: "m_bernard",
            leaf: true,
            desc: "",
          },
        },
      },
      arf: {
        label: "Areal Reduction",
        icon: "🗺",
        desc: "Point-to-areal rainfall conversion",
        children: {
          arf_fsr: {
            label: "FSR Method",
            icon: "ƒ",
            formula: "arf_fsr",
            leaf: true,
            desc: "",
          },
        },
      },
    },
  },
  ground: {
    label: "Ground Analysis",
    icon: <Mountain />,
    desc: "Geotechnical assessment including bearing capacity and settlement",
    children: {
      bearing: {
        label: "Bearing Capacity",
        icon: "🏗",
        desc: "Terzaghi / IS-6403 bearing capacity",
        children: {
          terzaghi: {
            label: "Terzaghi Method",
            icon: "ƒ",
            formula: "terzaghi",
            leaf: true,
            desc: "",
          },
        },
      },
      settlement: {
        label: "Settlement",
        icon: "📉",
        desc: "Primary consolidation settlement",
        children: {
          consolidation: {
            label: "Consolidation",
            icon: "ƒ",
            formula: "settlement",
            leaf: true,
            desc: "",
          },
        },
      },
    },
  },
};
