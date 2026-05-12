"use client";

import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Droplets,
  Anchor,
  CloudRain,
  Download,
  Upload,
  ChevronRight,
  RotateCcw,
  Calculator,
  FileSpreadsheet,
  LayoutDashboard,
  Play,
  Check,
  Info,
  History,
  ArrowLeft,
  Activity,
  Terminal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import SmoothReveal from './SmoothReveal';

// --- Types ---
interface FormulaField {
  key: string;
  label: string;
  unit: string;
  def?: number;
  hint?: string;
}

interface LookupConfig {
  title: string;
  sub: string;
  cols: string[];
  rows: string[][];
  fn: (vals: Record<string, number>) => number;
  valFn: (vals: Record<string, number>) => number;
}

interface ResultVar {
  k: string;
  d: string;
  v: number | string;
  u: string;
  result?: boolean;
}

interface ChartPoint {
  x: number;
  y: number;
}

interface CalcResult {
  Q: number;
  vars: ResultVar[];
  chartFn?: (x: number) => number;
  chartPts?: ChartPoint[];
  chartX: number;
  chartXLabel?: string;
  chartYLabel?: string;
}

interface FormulaDef {
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

interface TreeNode {
  label: string;
  icon: string | React.ReactNode;
  desc: string;
  formula?: string;
  leaf?: boolean;
  children?: Record<string, TreeNode>;
}

// --- Formula Constants & Logic ---
const FORMULAS: Record<string, FormulaDef> = {
  dicken: {
    name: "Dicken's Formula",
    expr: 'Q = C × M^(3/4)',
    ref: 'Cl.4.2, IRC:SP:13-2004 · 1865',
    region: 'Central & Northern India',
    fields: [
      { key: 'M', label: 'Catchment Area', unit: 'Km²', def: 24.1, hint: 'Total drainage area upstream of bridge' },
      { key: 'annual_rain', label: 'Annual Average Rainfall', unit: 'cm', def: 120, hint: 'From rainfall records' },
    ],
    lookup: {
      title: "Dicken's Constant (C)",
      sub: 'Based on annual average rainfall — Cl.4.2, IRC:SP:13-2004',
      cols: ['Annual Rainfall', 'C Value', 'Remarks'],
      rows: [['< 60 cm', '11', 'Dry regions'], ['60–120 cm', '14', 'Moderate rainfall'], ['120–140 cm', '15', 'High rainfall'], ['> 140 cm', '22', 'Western Ghats']],
      fn: (r) => r.annual_rain < 60 ? 0 : r.annual_rain < 120 ? 1 : r.annual_rain < 140 ? 2 : 3,
      valFn: (r) => r.annual_rain < 60 ? 11 : r.annual_rain < 120 ? 14 : r.annual_rain < 140 ? 15 : 22,
    },
    calc(r) {
      const C = this.lookup!.valFn(r);
      const Q = C * Math.pow(r.M, 0.75);
      return {
        Q,
        vars: [
          { k: 'M', d: 'Catchment Area', v: r.M, u: 'Km²' },
          { k: 'C', d: "Dicken's Constant (lookup)", v: C, u: '' },
          { k: 'Q', d: 'Q = C × M^(3/4)', v: parseFloat(Q.toFixed(3)), u: 'Cumecs', result: true }
        ],
        chartFn: x => C * Math.pow(x, 0.75),
        chartX: r.M,
        chartXLabel: 'Catchment Area M (Km²)',
        chartYLabel: 'Q (Cumecs)'
      };
    }
  },
  ryve: {
    name: "Ryve's Formula",
    expr: 'Q = C × M^(2/3)',
    ref: 'Cl.4.3, IRC:SP:13-2004 · 1884',
    region: 'Tamil Nadu, Karnataka, Andhra Pradesh',
    fields: [
      { key: 'M', label: 'Catchment Area', unit: 'Km²', def: 24.1 },
      { key: 'dist_coast', label: 'Distance from Coast', unit: 'Km', def: 41, hint: 'Determines Ryve\'s C value' },
    ],
    lookup: {
      title: "Ryve's Constant (C)",
      sub: 'Based on distance from coastline — Cl.4.3, IRC:SP:13-2004',
      cols: ['Zone', 'Distance', 'C Value'],
      rows: [['Coastal', '≤ 25 Km', '6.8'], ['Inland', '25–160 Km', '8.5'], ['Hilly (limited)', 'Any', '10.0'], ['Krishna Basin', 'CWC', '15.0']],
      fn: (r) => r.dist_coast <= 25 ? 0 : r.dist_coast <= 160 ? 1 : 2,
      valFn: (r) => r.dist_coast <= 25 ? 6.8 : r.dist_coast <= 160 ? 8.5 : 10.0,
    },
    calc(r) {
      const C = this.lookup!.valFn(r);
      const Q = C * Math.pow(r.M, 2 / 3);
      return {
        Q,
        vars: [
          { k: 'M', d: 'Catchment Area', v: r.M, u: 'Km²' },
          { k: 'dist_coast', d: 'Distance from Coast', v: r.dist_coast, u: 'Km' },
          { k: 'C', d: "Ryve's C (from lookup)", v: C, u: '' },
          { k: 'Q', d: 'Q = C × M^(2/3)', v: parseFloat(Q.toFixed(3)), u: 'Cumecs', result: true }
        ],
        chartFn: x => C * Math.pow(x, 2 / 3),
        chartX: r.M,
        chartXLabel: 'Catchment Area M (Km²)',
        chartYLabel: 'Q (Cumecs)'
      };
    }
  },
  ingli: {
    name: "Ingli's Formula",
    expr: 'Q = 125M / √(M+10)',
    ref: 'Cl.4.4, IRC:SP:13-2004 · 1930',
    region: 'Western Ghats, Maharashtra',
    fields: [
      { key: 'M', label: 'Catchment Area', unit: 'Km²', def: 24.1, hint: 'For Western Ghats catchments' },
    ],
    calc(r) {
      const Q = 125 * r.M / Math.sqrt(r.M + 10);
      return {
        Q,
        vars: [
          { k: 'M', d: 'Catchment Area', v: r.M, u: 'Km²' },
          { k: '√(M+10)', d: 'Square root term', v: parseFloat(Math.sqrt(r.M + 10).toFixed(3)), u: '' },
          { k: 'Q', d: 'Q = 125M / √(M+10)', v: parseFloat(Q.toFixed(3)), u: 'Cumecs', result: true }
        ],
        chartFn: x => 125 * x / Math.sqrt(x + 10),
        chartX: r.M,
        chartXLabel: 'Catchment Area M (Km²)',
        chartYLabel: 'Q (Cumecs)'
      };
    }
  },
  creager: {
    name: "Creager's Formula",
    expr: 'Q = C·(0.386A)^0.894·(0.386A)^(-0.048)',
    ref: 'IRC:SP:13-2004',
    region: 'Moderate Floods (C = 40–130)',
    fields: [
      { key: 'M', label: 'Catchment Area', unit: 'Km²', def: 24.1 },
      { key: 'C_cf', label: "Creager's Constant", unit: '—', def: 65, hint: '40–130; 65 for moderate floods' },
    ],
    calc(r) {
      const Q = r.C_cf * Math.pow(0.386 * r.M, 0.894) * Math.pow(0.386 * r.M, -0.048);
      return {
        Q,
        vars: [
          { k: 'A', d: 'Catchment Area', v: r.M, u: 'Km²' },
          { k: 'C', d: "Creager's Constant", v: r.C_cf, u: '' },
          { k: '0.386A', d: '0.386 × A', v: parseFloat((0.386 * r.M).toFixed(3)), u: '' },
          { k: 'Q', d: 'Q = C·(0.386A)^0.894·(0.386A)^(-0.048)', v: parseFloat(Q.toFixed(3)), u: 'Cumecs', result: true }
        ],
        chartFn: x => r.C_cf * Math.pow(0.386 * x, 0.894) * Math.pow(0.386 * x, -0.048),
        chartX: r.M,
        chartXLabel: 'Catchment Area A (Km²)',
        chartYLabel: 'Q (Cumecs)'
      };
    }
  },
  rational: {
    name: 'Modified Rational Method',
    expr: 'Q = 0.028 · P · f · A · Ic',
    ref: 'Cl.4.7.9, IRC:SP:13-2004',
    region: 'Catchments ≤ 25 sq.km.',
    notice: 'Only valid for catchments up to 25 sq.km. For larger areas use other empirical methods.',
    fields: [
      { key: 'M', label: 'Catchment Area', unit: 'Km²', def: 24.1 },
      { key: 'L', label: 'Basin Length', unit: 'Km', def: 1.506, hint: 'Longest water travel path' },
      { key: 'H_high', label: 'Highest Elevation', unit: 'm', def: 209 },
      { key: 'H_low', label: 'Lowest Elevation', unit: 'm', def: 167 },
      { key: 'F_24hr', label: '24-hr Rainfall (100-yr)', unit: 'cm', def: 25.1, hint: 'From IMD isopluvial maps' },
      { key: 'P', label: 'Runoff Coefficient (P)', unit: '—', def: 0.40, hint: 'Table 4.1, IRC:SP:13-2004' },
      { key: 'f', label: 'Areal Reduction (f)', unit: '—', def: 0.90, hint: 'Fig 4.2, IRC:SP:13-2004' },
    ],
    calc(r) {
      const H = r.H_high - r.H_low;
      const tc_c = Math.pow(0.87 * Math.pow(r.L, 3) / H, 0.385);
      const tc = Math.max(2.72, tc_c);
      const Ic = (r.F_24hr / 24) * (25 / (tc + 1));
      const Q = 0.028 * r.P * r.f * r.M * Ic;
      const pts = Array.from({ length: 20 }, (_, i) => { const t = 0.5 + i * 0.5; return { x: t, y: 0.028 * r.P * r.f * r.M * (r.F_24hr / 24) * (25 / (t + 1)) }; });
      return {
        Q,
        vars: [
          { k: 'H', d: 'Elevation difference', v: parseFloat(H.toFixed(3)), u: 'm' },
          { k: 'tc_calc', d: '(0.87·L³/H)^0.385', v: parseFloat(tc_c.toFixed(3)), u: 'hr' },
          { k: 'tc', d: 'Adopted tc (min 2.72 hr)', v: parseFloat(tc.toFixed(3)), u: 'hr' },
          { k: 'Ic', d: 'Ic = (F/24)·(25/(tc+1))', v: parseFloat(Ic.toFixed(3)), u: 'cm/hr' },
          { k: 'P', d: 'Runoff Coefficient', v: r.P, u: '' },
          { k: 'f', d: 'Areal Reduction Factor', v: r.f, u: '' },
          { k: 'Q', d: 'Q = 0.028·P·f·A·Ic', v: parseFloat(Q.toFixed(3)), u: 'Cumecs', result: true }
        ],
        chartPts: pts,
        chartX: tc,
        chartXLabel: 'Time of Concentration tc (hr)',
        chartYLabel: 'Q (Cumecs)'
      };
    }
  },
  // Stubs
  feh: { name: 'FEH Method', expr: 'Q = QMED × GEH(T)', ref: 'UK Flood Estimation Handbook', region: 'UK Catchments', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  fia: { name: 'FIA Formula', expr: 'Q = C · A^0.77', ref: 'FIA Report', region: 'UK / International', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  snyder: { name: "Snyder's UH", expr: 'Qp = 2.78 · Cp · A / tp', ref: 'Snyder 1938', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  scs: { name: 'SCS Curve Number', expr: 'Q = (P-Ia)² / (P-Ia+S)', ref: 'SCS-CN Method', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  cwc: { name: 'CWC Method', expr: 'CWC-SUH', ref: 'CWC India', region: 'India', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  gumbel: { name: 'Gumbel EV-I', expr: 'xT = x̄ + KσT', ref: 'Gumbel 1941', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  lpiii: { name: 'Log-Pearson III', expr: 'log xT = ȳ + KSy', ref: 'Bulletin 17C', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  hec18: { name: 'HEC-18 Pier Scour', expr: 'ys = 2.0·y1·K1...', ref: 'HEC-18, FHWA', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  lacey_scour: { name: "Lacey's Scour", expr: 'R = 0.473·(Q/f)^(1/3)', ref: 'IRC:78-2000', region: 'India', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  fhwa_ab: { name: 'FHWA Abutment Scour', expr: 'ys = 2.27·(L/y1)^0.43', ref: 'HEC-18', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  m_bernard: { name: 'Modified Bernard', expr: 'i = CT^x / t^n', ref: 'Bernard 1932', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
  arf_fsr: { name: 'FSR ARF Method', expr: 'ARF = 1 - 0.00115A^0.4', ref: 'UK FSR', region: 'General', stub: true, fields: [], calc: () => ({ Q: 0, vars: [], chartX: 0 }) },
};

const TREE: Record<string, TreeNode> = {
  flood: {
    label: 'Flood Discharge', icon: <Droplets />,
    desc: 'IRC-compliant peak flood estimation for bridge site design',
    children: {
      empirical: {
        label: 'Empirical Method', icon: '📐',
        desc: 'Catchment area based formulas — quick estimation using field parameters',
        children: {
          indian: {
            label: 'Indian Formulas', icon: '🇮🇳',
            desc: 'Formulas developed specifically for Indian catchment conditions',
            children: {
              dicken: { label: "Dicken's Formula", icon: 'ƒ', formula: 'dicken', leaf: true, desc: '' },
              ryve: { label: "Ryve's Formula", icon: 'ƒ', formula: 'ryve', leaf: true, desc: '' },
              ingli: { label: "Ingli's Formula", icon: 'ƒ', formula: 'ingli', leaf: true, desc: '' },
              creager: { label: "Creager's Formula", icon: 'ƒ', formula: 'creager', leaf: true, desc: '' },
              rational: { label: 'Modified Rational', icon: 'ƒ', formula: 'rational', leaf: true, desc: '' },
            }
          },
          uk: {
            label: 'UK / International', icon: '🇬🇧',
            desc: 'CIRIA / FSR methods from UK Flood Studies Report',
            children: {
              feh: { label: 'FEH Method', icon: 'ƒ', formula: 'feh', leaf: true, desc: '' },
              fia: { label: 'FIA Formula', icon: 'ƒ', formula: 'fia', leaf: true, desc: '' },
            }
          }
        }
      },
      unit_hydrograph: {
        label: 'Unit Hydrograph', icon: '📈',
        desc: 'Synthetic unit hydrograph method — CWC / Snyder / SCS',
        children: {
          snyder: { label: 'Snyder UH', icon: 'ƒ', formula: 'snyder', leaf: true, desc: '' },
          scs: { label: 'SCS Curve No.', icon: 'ƒ', formula: 'scs', leaf: true, desc: '' },
          cwc: { label: 'CWC Method', icon: 'ƒ', formula: 'cwc', leaf: true, desc: '' },
        }
      },
      frequency: {
        label: 'Flood Frequency', icon: '📉',
        desc: 'Statistical analysis of historical flood data — Gumbel / LP-III',
        children: {
          gumbel: { label: 'Gumbel EV-I', icon: 'ƒ', formula: 'gumbel', leaf: true, desc: '' },
          lpiii: { label: 'Log-Pearson III', icon: 'ƒ', formula: 'lpiii', leaf: true, desc: '' },
        }
      }
    }
  },
  scour: {
    label: 'Scour Assessment', icon: <Anchor />,
    desc: 'Bridge scour depth estimation at piers, abutments and approaches',
    children: {
      pier_scour: {
        label: 'Pier Scour', icon: '🔩', desc: 'HEC-18 / Laursen pier scour formula', children: {
          hec18: { label: 'HEC-18 Method', icon: 'ƒ', formula: 'hec18', leaf: true, desc: '' },
          lacey: { label: "Lacey's Regime", icon: 'ƒ', formula: 'lacey_scour', leaf: true, desc: '' },
        }
      },
      abutment: {
        label: 'Abutment Scour', icon: '🧱', desc: 'FHWA abutment scour formulae', children: {
          fhwa: { label: 'FHWA Method', icon: 'ƒ', formula: 'fhwa_ab', leaf: true, desc: '' },
        }
      },
    }
  },
  rainfall: {
    label: 'Rainfall Analysis', icon: <CloudRain />,
    desc: 'IDF curves, depth-duration-frequency and areal rainfall estimation',
    children: {
      idf: {
        label: 'IDF Curve', icon: '📊', desc: 'Intensity-Duration-Frequency analysis', children: {
          modified_bernard: { label: 'Modified Bernard', icon: 'ƒ', formula: 'm_bernard', leaf: true, desc: '' },
        }
      },
      arf: {
        label: 'Areal Reduction', icon: '🗺', desc: 'Point-to-areal rainfall conversion', children: {
          arf_fsr: { label: 'FSR Method', icon: 'ƒ', formula: 'arf_fsr', leaf: true, desc: '' },
        }
      },
    }
  }
};

const EngineeringPlatform: React.FC = () => {
  const [mode, setMode] = useState<'manual' | 'batch'>('manual');
  const [currentModule, setModule] = useState('flood');
  const [path, setPath] = useState<string[]>([]);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [result, setResult] = useState<CalcResult | null>(null);
  const [batchFile, setBatchFile] = useState<File | null>(null);
  const [batchProcessedData, setBatchProcessedData] = useState<any[] | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // Initialize inputs when leaf is reached
  const node = getNode(currentModule, path);
  useEffect(() => {
    if (node?.leaf && node.formula) {
      const fDef = FORMULAS[node.formula];
      const newInputs: Record<string, number> = {};
      fDef.fields.forEach(f => {
        newInputs[f.key] = f.def || 0;
      });
      setInputs(newInputs);
      setResult(null);
    }
  }, [path, currentModule]);

  function getNode(modId: string, pIds: string[]) {
    let curr = TREE[modId];
    if (!curr) return null;
    for (const pid of pIds) {
      if (curr.children?.[pid]) {
        curr = curr.children[pid];
      } else {
        break;
      }
    }
    return curr;
  }

  const handleNav = (modId: string) => {
    setModule(modId);
    setPath([]);
    setResult(null);
    setMode('manual');
  };

  const handleSelectChild = (id: string) => {
    setPath([...path, id]);
    setResult(null);
  };

  const handleGoBack = (idx: number) => {
    setPath(path.slice(0, idx));
    setResult(null);
  };

  const calculate = () => {
    if (node?.formula) {
      const fDef = FORMULAS[node.formula];
      try {
        const res = fDef.calc(inputs);
        const Qd = res.Q;
        const P_lacey = 4.8 * Math.sqrt(Qd);
        const W_linear = 4.5 * Math.sqrt(Qd);
        const W_cwc = 8.95 * Math.pow(Qd, 1 / 3);

        setResult({
          ...res,
          waterway: {
            Qd,
            P_lacey,
            W_linear,
            W_cwc,
            min: Math.min(P_lacey, W_linear)
          }
        } as any);

        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleBatchFile = (file: File) => {
    setBatchFile(file);
  };

  const processBatch = () => {
    if (!batchFile || !node?.formula) return;
    const fDef = FORMULAS[node.formula];

    const reader = new FileReader();
    reader.onload = (e) => {
      const bstr = e.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);

      const processed = data.map((row: any) => {
        const rowInputs: Record<string, number> = {};
        fDef.fields.forEach(f => {
          rowInputs[f.key] = parseFloat(row[f.key]) || 0;
        });
        const res = fDef.calc(rowInputs);
        const P_l = 4.8 * Math.sqrt(res.Q);
        const W_l = 4.5 * Math.sqrt(res.Q);
        return {
          ...row,
          Q_result: parseFloat(res.Q.toFixed(3)),
          P_lacey: parseFloat(P_l.toFixed(2)),
          W_linear: parseFloat(W_l.toFixed(2))
        };
      });

      setBatchProcessedData(processed);

      const newWs = XLSX.utils.json_to_sheet(processed);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, newWs, "Results");
      XLSX.writeFile(newWb, `floodrix_batch_results_${node.formula}.xlsx`);
    };
    reader.readAsBinaryString(batchFile);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-32 selection:bg-brand-red selection:text-white">
      {/* Decorative Background Text */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none opacity-[0.01] overflow-hidden z-0 select-none">
        <span className="text-[70vh] font-serif font-bold text-brand-dark tracking-tighter uppercase whitespace-nowrap leading-none">
          FLOODRIX
        </span>
      </div>

      <div className="relative pt-40 md:pt-48 px-6 md:px-20 lg:px-32 max-w-[1920px] mx-auto">
        <SmoothReveal id="hero-section" direction="up" distance={50} delay={0.1}>
          <div className="relative overflow-hidden rounded-[4rem] p-16 md:p-24 mb-20">
            {/* Glass Background */}
            <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-3xl z-0" />
            <div className="absolute inset-0 z-[1] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(251,54,64,0.15)_0%,transparent_50%)]" />
              <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(251,54,64,0.05)_0%,transparent_50%)]" />
            </div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="max-w-4xl"
                >
                  <span className="inline-block px-5 py-2 bg-brand-red text-white text-[10px] font-bold uppercase tracking-[0.5em] rounded-full mb-8 shadow-lg shadow-brand-red/20">
                    ENGINEERING CORE v4.2.0
                  </span>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.1] font-medium tracking-tight">
                    Analytical <br /><span className="italic text-white underline decoration-brand-red decoration-2 underline-offset-8">Hydrology Engine.</span>
                  </h1>
                </motion.div>

                {/* Mode Switchers */}
                <div className="flex bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
                  <button
                    onClick={() => setMode('manual')}
                    className={`px-10 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${mode === 'manual' ? 'bg-brand-red text-white shadow-[0_8px_20px_-5px_rgba(251,54,64,0.5)]' : 'text-white/40 hover:text-white'
                      }`}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setMode('batch')}
                    className={`px-10 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 ${mode === 'batch' ? 'bg-brand-red text-white shadow-[0_8px_20px_-5px_rgba(251,54,64,0.5)]' : 'text-white/40 hover:text-white'
                      }`}
                  >
                    Batch
                  </button>
                </div>
              </div>

              {/* Module Selector Tabs */}
              <div className="flex flex-wrap gap-8 md:gap-16 border-b border-white/5 pb-10">
                {Object.entries(TREE).map(([id, item], idx) => (
                  <button
                    key={id}
                    onClick={() => handleNav(id)}
                    className={`flex items-center gap-4 transition-all relative group h-full pb-2 ${currentModule === id && mode === 'manual' ? 'text-white' : 'text-white/20 hover:text-white/60'
                      }`}
                  >
                    <div className={`p-2.5 rounded-xl transition-all duration-500 ${currentModule === id && mode === 'manual' ? 'bg-brand-red text-white scale-110 shadow-lg' : 'bg-white/5 text-white/30 group-hover:bg-white/10'
                      }`}>
                      {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20 })}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-[0.3em] leading-none pt-1">
                      {item.label}
                    </span>
                    {currentModule === id && mode === 'manual' && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute -bottom-[41px] left-0 w-full h-1 bg-brand-red z-20"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SmoothReveal>

        {/* Main Execution Area */}
        <div id="expertise" className="relative z-10 px-6 md:px-20 lg:px-32 -mt-12">
          {/* Breadcrumbs for internal navigation */}
          <div className="flex items-center gap-3 mb-16 text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400 bg-white border border-gray-100 px-8 py-5 rounded-2xl shadow-[0_15px_50px_-15px_rgba(0,0,0,0.08)] w-fit ring-1 ring-black/[0.02]">
            <button onClick={() => { setPath([]); setResult(null); setMode('manual'); }} className="hover:text-brand-red transition-all flex items-center gap-2">
              <LayoutDashboard className="w-3 h-3" />
              Home
            </button>
            <ChevronRight className="w-3 h-3 text-gray-200" />
            <span className={path.length === 0 && mode === 'manual' ? 'text-brand-dark' : ''}>{TREE[currentModule].label}</span>
            {path.map((p, i) => (
              <React.Fragment key={p}>
                <ChevronRight className="w-3 h-3 text-gray-200" />
                <button
                  onClick={() => handleGoBack(i + 1)}
                  className={`transition-all ${i === path.length - 1 ? 'text-brand-dark font-black' : 'text-gray-400 hover:text-brand-red'}`}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}
            {mode === 'batch' && (
              <>
                <ChevronRight className="w-3 h-3 text-gray-200" />
                <span className="text-brand-dark font-black">Batch Grid</span>
              </>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            {mode === 'batch' ? (
              <BatchView
                node={node}
                handleFile={handleBatchFile}
                processBatch={processBatch}
                batchFile={batchFile}
                batchProcessedData={batchProcessedData}
              />
            ) : (
              <>
                {node?.leaf ? (
                  <CalculatorView
                    node={node}
                    inputs={inputs}
                    setInputs={setInputs}
                    calculate={calculate}
                    result={result}
                    resultRef={resultRef}
                  />
                ) : (
                  <ChoiceGrid node={node || TREE[currentModule]} onSelect={handleSelectChild} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub Views ---

const ChoiceGrid = ({ node, onSelect }: { node: TreeNode, onSelect: (id: string) => void }) => {
  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      <div className="max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-serif text-brand-dark mb-8 leading-tight tracking-tight"
        >
          Select <br /><span className="italic text-brand-red">Analytical Domain.</span>
        </motion.h2>
        <p className="text-gray-400 text-xl font-light leading-relaxed max-w-2xl">{node.desc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {node.children && Object.entries(node.children).map(([id, child], idx) => {
          const fDef = child.formula ? FORMULAS[child.formula] : null;
          const isStub = fDef?.stub;
          return (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              disabled={isStub}
              onClick={() => onSelect(id)}
              className={`bg-white group text-left p-12 rounded-[3.5rem] border transition-all duration-700 relative overflow-hidden flex flex-col justify-between min-h-[440px] ${isStub
                ? 'opacity-40 cursor-not-allowed grayscale border-gray-100'
                : 'border-brand-dark/5 hover:border-brand-red/20 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.03)] hover:shadow-[0_50px_120px_-20px_rgba(251,54,64,0.12)] hover:-translate-y-4'
                }`}
            >
              <div className="absolute top-0 right-0 p-12 text-8xl text-brand-dark/[0.02] group-hover:text-brand-red/[0.05] transition-all duration-700 font-serif font-black italic">
                {(idx + 1).toString().padStart(2, '0')}
              </div>

              <div className="relative z-10">
                <div className="w-20 h-20 bg-gray-50 group-hover:bg-brand-red/5 rounded-3xl flex items-center justify-center transition-all duration-700 mb-12 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-gray-100">
                  <div className="text-4xl filter group-hover:drop-shadow-lg transition-all">{child.icon}</div>
                </div>
                <h3 className="text-3xl font-bold text-brand-dark mb-4 font-serif tracking-tight leading-none">{child.label}</h3>
                <p className="text-gray-400 text-base leading-relaxed mb-10 line-clamp-3 font-light">
                  {fDef ? `${fDef.expr} — Advanced hydrological modelling calibrated for ${fDef.region} environments.` : child.desc}
                </p>
              </div>

              <div className="relative z-10 pt-8 border-t border-gray-50 flex items-center justify-between">
                {isStub ? (
                  <span className="inline-flex items-center px-5 py-2 bg-gray-50 text-gray-400 rounded-full text-[9px] font-bold uppercase tracking-[0.3em] border border-gray-100">
                    Development Alpha
                  </span>
                ) : (
                  <>
                    <div className="flex items-center gap-4 text-brand-red text-[11px] font-bold uppercase tracking-[0.3em] group-hover:gap-6 transition-all duration-500">
                      Instantiate Module <ChevronRight className="w-5 h-5" />
                    </div>
                    <div className="w-2 h-2 rounded-full bg-brand-teal group-hover:scale-150 transition-transform duration-700" />
                  </>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

const CalculatorView = ({ node, inputs, setInputs, calculate, result, resultRef }: any) => {
  const fDef = node.formula ? FORMULAS[node.formula] : null;
  if (!fDef) return null;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-8 border-b border-gray-100">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-serif text-brand-dark mb-6 tracking-tight leading-none">{fDef.name}</h1>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Signature</span>
              <code className="bg-brand-dark text-brand-red px-4 py-1.5 rounded-lg font-mono text-xs font-bold shadow-lg">
                {fDef.expr}
              </code>
            </div>
            <div className="h-6 w-[1px] bg-gray-200 hidden md:block" />
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Compliance</span>
              <span className="text-brand-dark text-xs font-black uppercase tracking-[0.1em]">
                {fDef.ref}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-6 py-2.5 bg-brand-teal/5 rounded-full border border-brand-teal/10">
          <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
          <span className="text-brand-teal text-[10px] font-bold uppercase tracking-[0.3em]">
            Deployment: {fDef.region}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Inputs */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-[0_40px_100px_-30px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.01]">
          <div className="bg-brand-dark px-10 py-8 flex items-center gap-5">
            <div className="w-14 h-14 bg-brand-red rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
              <Calculator className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-serif">Input Vectors</h3>
              <p className="text-[9px] text-white/40 uppercase tracking-[0.4em] font-mono">Parameters Registry</p>
            </div>
          </div>
          <div className="p-10 space-y-8">
            {fDef.fields.map(field => (
              <div key={field.key} className="space-y-3 group">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] group-focus-within:text-brand-red transition-colors">
                    {field.label}
                  </label>
                  {field.unit !== '—' && (
                    <span className="text-[10px] font-mono text-brand-dark/30 font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                      {field.unit}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={inputs[field.key] || ''}
                    onChange={(e) => setInputs({ ...inputs, [field.key]: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#fcfcfc] border-2 border-gray-50 rounded-2xl px-6 py-4 text-lg font-mono font-bold text-brand-dark focus:bg-white focus:ring-8 focus:ring-brand-red/5 focus:border-brand-red/20 outline-none transition-all duration-300"
                  />
                  {field.hint && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -right-2 top-0 -translate-y-full pb-2">
                      <div className="bg-brand-dark text-white text-[9px] px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl font-mono">
                        {field.hint}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {fDef.notice && (
              <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                <Info className="w-5 h-5 text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-700 leading-relaxed font-medium italic">
                  {fDef.notice}
                </p>
              </div>
            )}

            <div className="pt-8 border-t border-gray-50">
              <button
                onClick={calculate}
                className="w-full bg-brand-dark text-white py-5 rounded-[1.5rem] font-bold text-xs tracking-[0.4em] uppercase hover:bg-brand-red transition-all duration-500 shadow-2xl hover:shadow-brand-red/20 active:scale-95 flex items-center justify-center gap-4 group"
              >
                <Play className="w-5 h-5 fill-current group-hover:translate-x-1 transition-transform" />
                Execute <span className="italic">Analysis</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div ref={resultRef} className="lg:col-span-8 space-y-12 min-h-[600px]">
          {result ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={fDef.name + result.Q}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-12"
              >
                {/* Result Hero - Brutalist Style */}
                <div className="bg-white rounded-[3.5rem] p-12 border border-gray-100 shadow-[0_50px_120px_-30px_rgba(0,0,0,0.06)] relative overflow-hidden group/res ring-1 ring-black/[0.01]">
                  <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-red/5 rounded-full blur-[100px] pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-12">
                    <div className="space-y-8 max-w-sm">
                      <div>
                        <span className="text-brand-red text-[11px] font-bold uppercase tracking-[0.5em] mb-6 block font-mono">
                          Computation Success
                        </span>
                        <h2 className="text-brand-dark text-4xl md:text-5xl font-serif font-medium leading-none tracking-tight">
                          Peak <br /><span className="italic">Discharge.</span>
                        </h2>
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed font-light">
                        Site-specific hydraulic modeling suggests the following maximum discharge volume for the 100-year return period.
                      </p>

                      <div className="pt-6 flex gap-4">
                        <button className="bg-brand-dark text-white p-4 rounded-2xl hover:bg-brand-red transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                        <button className="bg-gray-50 text-gray-400 p-4 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100">
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="relative flex flex-col items-center md:items-end justify-center">
                      <div className="text-[12px] font-mono font-bold text-gray-300 uppercase tracking-[0.6em] mb-4">Magnitude</div>
                      <div className="flex items-baseline gap-4">
                        <motion.span
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.4, type: "spring" }}
                          className="text-[120px] md:text-[160px] font-serif font-black text-brand-dark leading-none tracking-tighter"
                        >
                          {result.Q.toFixed(2)}
                        </motion.span>
                        <div className="flex flex-col">
                          <span className="text-brand-red font-serif text-3xl italic font-bold">Q</span>
                          <span className="text-gray-300 font-mono text-sm leading-none">m³/s</span>
                        </div>
                      </div>
                      <div className="absolute -bottom-6 right-0 w-full h-[6px] bg-brand-red rounded-full overflow-hidden">
                        <motion.div
                          initial={{ x: "-100%" }}
                          animate={{ x: "0%" }}
                          transition={{ duration: 1.5, delay: 0.5 }}
                          className="w-full h-full bg-brand-red"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Detailed Analysis */}
                  <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm ring-1 ring-black/[0.01]">
                    <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-500 font-mono">Mathematical Proof</h3>
                      <Terminal className="w-4 h-4 text-brand-red" />
                    </div>
                    <div className="p-10">
                      <div className="space-y-6">
                        {result.vars.map((v: any, idx: number) => (
                          <div key={idx} className={`flex justify-between items-center p-5 rounded-2xl border transition-all ${v.result ? 'bg-brand-dark border-brand-dark shadow-xl' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                            <div className="space-y-1">
                              <span className={`text-[10px] uppercase font-mono font-bold tracking-widest ${v.result ? 'text-brand-red' : 'text-gray-300'}`}>
                                Variable {idx + 1}
                              </span>
                              <h4 className={`text-sm font-bold font-serif ${v.result ? 'text-white' : 'text-brand-dark'}`}>{v.d}</h4>
                            </div>
                            <div className="text-right">
                              <div className={`text-xl font-mono font-black tracking-tight ${v.result ? 'text-white' : 'text-brand-dark'}`}>
                                {v.v}
                              </div>
                              <span className="text-[9px] uppercase font-mono text-gray-400">{v.u || 'ratio'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Waterway Card */}
                  <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm ring-1 ring-black/[0.01]">
                    <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                      <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-500 font-mono">Waterway Determination</h3>
                      <Droplets className="w-4 h-4 text-brand-teal" />
                    </div>
                    <div className="p-10 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className={`p-8 rounded-[2rem] border-2 transition-all duration-700 ${(result as any).waterway.P_lacey <= (result as any).waterway.W_linear ? 'border-brand-teal bg-brand-teal/[0.03] shadow-lg' : 'border-gray-50 bg-gray-50/50 grayscale opacity-40'}`}>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4 font-mono">Lacey's Regime</div>
                          <div className="text-3xl font-serif font-black text-brand-dark tracking-tighter">{(result as any).waterway.P_lacey.toFixed(2)}<span className="text-sm font-mono ml-1">m</span></div>
                        </div>
                        <div className={`p-8 rounded-[2rem] border-2 transition-all duration-700 ${(result as any).waterway.W_linear < (result as any).waterway.P_lacey ? 'border-brand-teal bg-brand-teal/[0.03] shadow-lg' : 'border-gray-50 bg-gray-50/50 grayscale opacity-40'}`}>
                          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] mb-4 font-mono">Linear Waterway</div>
                          <div className="text-3xl font-serif font-black text-brand-dark tracking-tighter">{(result as any).waterway.W_linear.toFixed(2)}<span className="text-sm font-mono ml-1">m</span></div>
                        </div>
                      </div>

                      <div className="p-8 bg-brand-dark rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-teal/10 rounded-full blur-3xl" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <div className="text-brand-teal text-[9px] font-black uppercase tracking-[0.4em] mb-2 font-mono">Recommendation</div>
                            <h4 className="text-white text-xl font-serif">Minimum <span className="italic">Span Required.</span></h4>
                          </div>
                          <div className="text-right">
                            <span className="text-white text-4xl font-serif font-black">{(result as any).waterway.min.toFixed(2)}</span>
                            <span className="text-brand-teal font-mono text-xs ml-2">METERS</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 italic leading-relaxed text-center px-4">
                        * Results based on IRC:SP:13-2004 compliance standards for bridge crossing optimization.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Plot Area */}
                {result.chartFn && (
                  <div className="bg-white rounded-[4rem] border border-gray-100 p-12 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.01]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
                      <div className="space-y-3">
                        <span className="text-brand-red text-[11px] font-bold uppercase tracking-[0.5em] font-mono">Analytical Curve</span>
                        <h3 className="text-3xl font-serif text-brand-dark leading-none">Sensitivity <span className="italic">Projection.</span></h3>
                      </div>
                      <div className="flex gap-3">
                        <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-red" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">Simulated</span>
                        </div>
                        <div className="px-4 py-2 bg-brand-red/5 rounded-xl border border-brand-red/10 flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-brand-dark" />
                          <span className="text-[10px] font-bold text-brand-dark uppercase tracking-widest font-mono">Computed Vector</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative h-[400px] w-full bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200 p-10 overflow-hidden">
                      <svg viewBox="0 0 400 200" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#FB3640" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#FB3640" stopOpacity="0.2" />
                          </linearGradient>
                        </defs>
                        <path
                          d={`M 0,200 ${Array.from({ length: 41 }, (_, i) => {
                            const x = i * 10;
                            const val = result.chartFn!(result.chartX * (x / 200));
                            const y = 200 - (val / (result.Q * 2)) * 200;
                            return `L ${x},${y}`;
                          }).join(' ')}`}
                          fill="none"
                          stroke="url(#curveGradient)"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="drop-shadow-2xl"
                        />
                        {/* Grid Lines */}
                        {[0, 50, 100, 150].map(y => (
                          <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#eee" strokeWidth="1" strokeDasharray="4" />
                        ))}
                        {/* Point indicator */}
                        <motion.circle
                          initial={{ r: 0 }}
                          animate={{ r: 6 }}
                          transition={{ delay: 1, type: "spring" }}
                          cx="200"
                          cy="100"
                          fill="#FB3640"
                          className="shadow-xl"
                        />
                      </svg>

                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-12 bg-white/80 backdrop-blur-md px-8 py-3 rounded-2xl border border-white/20 shadow-sm">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-mono">{result.chartXLabel || 'Parameter'}</span>
                          <span className="text-sm font-serif font-black text-brand-dark">{result.chartX.toFixed(2)}</span>
                        </div>
                        <div className="h-8 w-px bg-gray-200" />
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] text-gray-400 uppercase tracking-widest mb-1 font-mono">{result.chartYLabel || 'Output'}</span>
                          <span className="text-sm font-serif font-black text-brand-dark">{result.Q.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Lookup Details if any */}
                {fDef.lookup && (
                  <div className="bg-white rounded-[3.5rem] border border-gray-100 p-12 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.04)]">
                    <div className="flex items-center gap-6 mb-12">
                      <div className="w-16 h-16 bg-brand-teal/10 rounded-2xl flex items-center justify-center text-brand-teal shadow-inner">
                        <LayoutDashboard className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-serif text-brand-dark leading-none">{fDef.lookup.title}</h3>
                        <p className="text-gray-400 text-xs mt-2 uppercase tracking-[0.2em] font-mono">{fDef.lookup.sub}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {fDef.lookup.rows.map((row, ridx) => (
                        <div
                          key={ridx}
                          className={`p-8 rounded-3xl border-2 transition-all duration-500 relative overflow-hidden ${ridx === fDef.lookup!.fn(inputs)
                            ? 'border-brand-red bg-brand-red/[0.03] shadow-xl translate-y-[-4px]'
                            : 'border-gray-50 bg-gray-50/10 grayscale opacity-40'
                            }`}
                        >
                          {ridx === fDef.lookup!.fn(inputs) && (
                            <div className="absolute top-4 right-4">
                              <div className="w-3 h-3 bg-brand-red rounded-full animate-ping" />
                            </div>
                          )}
                          <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-4 font-mono">Reference Data</div>
                          <div className="text-base font-bold text-brand-dark mb-2 font-serif">{row[1]}</div>
                          <div className="text-[11px] text-gray-500 italic leading-relaxed">{row[2]}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in zoom-in duration-1000 grayscale opacity-30">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-red/5 blur-[100px] rounded-full" />
                <Activity className="w-40 h-40 text-gray-100 relative z-10" />
              </div>
              <div className="max-w-xs space-y-4">
                <h3 className="text-3xl font-serif text-brand-dark">Engine Standby.</h3>
                <p className="text-sm text-gray-400 leading-relaxed font-light">Computation logic is primed. Modify input vectors and execute analysis to initiate simulation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BatchView = ({ node, handleFile, processBatch, batchFile, batchProcessedData }: any) => {
  const fDef = node?.formula ? FORMULAS[node.formula] : null;
  const [isDragging, setIsDragging] = useState(false);

  if (!fDef) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-10">
        <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center border border-dashed border-gray-200">
          <Calculator className="w-12 h-12 text-gray-200" />
        </div>
        <div className="max-w-sm space-y-6">
          <h2 className="text-4xl font-serif text-brand-dark">Protocol Required.</h2>
          <p className="text-gray-400 text-lg font-light leading-relaxed">
            Navigate through the <span className="italic">Analytical Domain</span> to select a specific formula before initiating batch processing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      <div className="max-w-3xl">
        <span className="text-brand-red text-[11px] font-bold uppercase tracking-[0.5em] mb-8 block font-mono">Matrix Processing Engine</span>
        <h2 className="text-5xl md:text-6xl font-serif text-brand-dark mb-8 leading-tight tracking-tight">
          Batch <br /><span className="italic">Grid Processor.</span>
        </h2>
        <p className="text-gray-400 text-xl font-light leading-relaxed">Execute simultaneous computations for <span className="font-bold text-brand-dark">{fDef.name}</span> across large datasets via .xlsx or .csv ingestion.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-4 space-y-10">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleFile(file); }}
            onClick={() => document.getElementById('batch-file-input')?.click()}
            className={`p-12 border-2 border-dashed rounded-[3rem] transition-all duration-700 cursor-pointer flex flex-col items-center justify-center text-center gap-6 group relative overflow-hidden ${isDragging ? 'border-brand-red bg-brand-red/[0.02]' : 'border-gray-200 hover:border-brand-red/30 bg-white hover:bg-[#fcfcfc]'
              }`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,54,64,0.05)_0%,transparent_70%)]" />
            <input
              id="batch-file-input"
              type="file"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFile(file); }}
              accept=".xlsx,.csv"
            />
            <div className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all duration-700 ${isDragging ? 'bg-brand-red text-white' : 'bg-gray-50 text-gray-300 group-hover:bg-brand-red group-hover:text-white'}`}>
              {batchFile ? <FileSpreadsheet className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
            </div>
            <div className="space-y-2 relative z-10">
              <h4 className="text-xl font-bold font-serif text-brand-dark">{batchFile ? batchFile.name : 'Ingest Spreadsheet'}</h4>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Drag & Drop or Click to Select</p>
            </div>
          </div>

          <div className="bg-brand-dark rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden ring-1 ring-white/5 shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(45deg,rgba(251,54,64,0.1)_0%,transparent_100%)]" />
            <div className="space-y-4 relative z-10">
              <span className="text-[10px] font-bold text-brand-red uppercase tracking-[0.4em] block font-mono">Instructions</span>
              <p className="text-white/60 text-sm leading-relaxed font-light italic">
                Dataset columns must exactly match the computation signature keys:
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                {fDef.fields.map(f => (
                  <code key={f.key} className="bg-white/5 text-brand-red px-3 py-1 rounded-lg font-mono text-[11px] border border-white/10 uppercase">{f.key}</code>
                ))}
              </div>
            </div>

            <button
              onClick={processBatch}
              disabled={!batchFile}
              className={`w-full py-5 rounded-2xl font-black text-xs tracking-[0.5em] uppercase transition-all duration-700 relative z-10 flex items-center justify-center gap-4 group ${batchFile ? 'bg-brand-red text-white shadow-lg hover:shadow-brand-red/40 hover:-translate-y-1' : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
            >
              <Activity className={`w-5 h-5 ${batchFile ? 'animate-pulse' : ''}`} />
              Process Batch
            </button>
          </div>
        </div>

        <div className="lg:col-span-8">
          {batchProcessedData ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm ring-1 ring-black/[0.01]"
            >
              <div className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <Check className="text-brand-teal w-5 h-5" />
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-500 font-mono">Processed Output Matrix</h3>
                </div>
                <span className="bg-brand-teal/10 text-brand-teal px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] font-mono shadow-sm">
                  {batchProcessedData.length} records computed
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <th className="px-10 py-6">Record ID</th>
                      {fDef.fields.slice(0, 3).map(f => (
                        <th key={f.key} className="px-10 py-6">{f.key}</th>
                      ))}
                      <th className="px-10 py-6 text-brand-red font-black bg-brand-red/5">Result (Q)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {batchProcessedData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-10 py-6 text-xs font-mono font-bold text-gray-500">#{String(i + 1).padStart(3, '0')}</td>
                        {fDef.fields.slice(0, 3).map(f => (
                          <td key={f.key} className="px-10 py-6 text-xs font-mono text-gray-600">{row[f.key]}</td>
                        ))}
                        <td className="px-10 py-6 text-xs font-mono font-black text-brand-red bg-brand-red/[0.02]">{row.Q_result}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-10 border-t border-gray-50 bg-gray-50/20 text-center">
                <p className="text-[11px] text-gray-400 font-medium italic">
                  Only first 10 records shown in preview. Full computation result downloaded as <span className="text-brand-dark font-bold underline">floodrix_batch_results.xlsx</span>
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="h-[600px] rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center p-12 grayscale opacity-40">
              <div className="relative mb-10">
                <div className="absolute inset-0 bg-brand-red/5 blur-3xl rounded-full" />
                <Terminal className="w-32 h-32 text-gray-100 relative z-10" />
              </div>
              <div className="max-w-xs space-y-4">
                <h3 className="text-2xl font-serif text-brand-dark leading-tight">Standby for Matrix.</h3>
                <p className="text-xs text-gray-400 leading-relaxed font-light px-6">Upload a valid dataset to visualize the batch processing pipeline results in real-time.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EngineeringPlatform;
