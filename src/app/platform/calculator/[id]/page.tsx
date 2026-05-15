"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator as CalculatorIcon,
  FileText,
  Play,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Info,
  ChevronRight,
  Waves,
  ArrowRight,
  Sigma,
  Zap,
  ShieldCheck,
  Activity,
  Box,
  FileDown,
  Bookmark,
  Share2,
  Layers
} from 'lucide-react';
import { PLATFORM_DATA, getAllCalculators } from '@/lib/platform-data';
import { cn } from '@/lib/utils';
import { AnalyticalField } from '@/components/ui/analytical-field';

export default function CalculatorPage() {
  const { id } = useParams();
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputs, setInputs] = useState<Record<string, number>>({});
  const [result, setResult] = useState<any>(null);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Find calculator using recursive search
  const allCalculators = getAllCalculators(PLATFORM_DATA.flatMap(ws => ws.children));
  const calculator = allCalculators.find(c => c.id === id);

  useEffect(() => {
    if (calculator) {
      const initial: Record<string, number> = {};
      calculator.variables.forEach(v => initial[v.key] = v.defaultValue);
      setInputs(initial);
      setResult(calculator.formula.logic(initial));
    }
  }, [calculator]);

  if (!calculator) return <div className="p-20 text-center font-serif text-[#0a0a0a]">Calculator not found.</div>;

  const handleInputChange = (key: string, val: string) => {
    const num = parseFloat(val) || 0;
    const newInputs = { ...inputs, [key]: num };
    setInputs(newInputs);
  };

  const runCalculation = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setResult(calculator.formula.logic(inputs));
      setIsProcessing(false);
    }, 400);
  };

  const runBatchCalculation = () => {
    setIsBatchProcessing(true);
    setTimeout(() => {
      const results = [1, 2, 3].map(() => {
        const mockInputs = { ...inputs };
        return calculator.formula.logic(mockInputs).result;
      });
      setBatchResults(results);
      setIsBatchProcessing(false);
    }, 800);
  };

  const areaValue = inputs['area'] || 0;
  const showApplicabilityWarning = calculator.id === 'calc-rational' && areaValue > 50;

  return (
    <div className="px-7 md:px-10 py-7 md:py-10 w-full space-y-8 md:space-y-10">
      {/* Structural Header Section */}
      <section className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between border-b border-[#e8e8e8] pb-10">
        <div className="flex items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0a0a0a] text-white shadow-lg">
            <Sigma size={22} />
          </div>
          <div className="space-y-3">
            <h3 className="text-h3 font-semibold tracking-tight text-[#0a0a0a] leading-tight">
              {calculator.name}
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-[#fff1f2] border border-[#fecdd3] px-2.5 py-1 rounded text-[#e11d48] font-mono font-bold text-[13px] tracking-wide">
                {calculator.formula.expression.replace(/\*/g, ' · ')}
              </div>
              <span className="text-[#d4d4d4]">•</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#a1a1a1]">{calculator.formula.reference}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-[320px]">
          {/* Main Mode Toggle */}
          <div className="flex p-1 bg-[#f5f5f5] rounded-xl border border-[#e8e8e8]">
            <button
              onClick={() => setMode('single')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-lg",
                mode === 'single' ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#a1a1a1] hover:text-[#525252]"
              )}
            >
              <Play size={12} fill={mode === 'single' ? "currentColor" : "none"} />
              Single Run
            </button>
            <button
              onClick={() => setMode('batch')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-widest transition-all rounded-lg",
                mode === 'batch' ? "bg-white text-[#0a0a0a] shadow-sm" : "text-[#a1a1a1] hover:text-[#525252]"
              )}
            >
              <Layers size={12} />
              Batch Process
            </button>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center gap-2">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[10px] font-bold uppercase tracking-widest text-[#525252] hover:bg-[#fafafa] hover:border-[#d4d4d4] transition-all shadow-sm">
              <FileDown size={14} className="text-[#0a0a0a]" />
              Export PDF
            </button>
            <button className="p-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[#a1a1a1] hover:text-[#0a0a0a] hover:border-[#d4d4d4] transition-all shadow-sm group">
              <Bookmark size={16} className="group-hover:fill-current transition-all" />
            </button>
            <button className="p-2.5 bg-white border border-[#e8e8e8] rounded-xl text-[#a1a1a1] hover:text-[#0a0a0a] hover:border-[#d4d4d4] transition-all shadow-sm">
              <Share2 size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Architectural Grid Content */}
      <div className="overflow-hidden rounded-2xl border border-[#e8e8e8] grid grid-cols-1 lg:grid-cols-12 shadow-sm">

        {/* Input & Parameters - Column */}
        <div className={cn(
          "border-r border-[#e8e8e8] bg-white transition-all duration-500",
          "p-7 md:p-10 lg:col-span-6",
          mode === 'batch' && "lg:col-span-12"
        )}>
          {mode === 'single' ? (
            <div className="space-y-10">
              <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-6">
                <div className="space-y-1">
                  <h4 className="text-[16px] font-semibold text-[#0a0a0a]">Analytical Inputs</h4>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a1a1a1]">Parameter Specification</p>
                </div>
              </div>

              {/* Applicability Warning */}
              <AnimatePresence>
                {showApplicabilityWarning && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#fffbeb] border border-[#fef3c7] rounded-xl p-4 flex gap-3 mb-8"
                  >
                    <AlertCircle className="text-[#d97706] shrink-0" size={18} />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-[#92400e] uppercase tracking-tight">Applicability Warning</p>
                      <p className="text-[12px] text-[#b45309] leading-relaxed">
                        The Rational Method is deterministic and primarily intended for small catchments. Areas exceeding 50 acres (currently {areaValue} acres) may require unit hydrograph or simulation methods for accurate peak discharge.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 gap-x-10 gap-y-6 md:grid-cols-2">
                {calculator.variables.map(v => (
                  <AnalyticalField
                    key={v.key}
                    label={v.label}
                    placeholder={v.defaultValue.toString()}
                    unit={v.unit}
                    value={inputs[v.key]?.toString() || ''}
                    onChange={(e) => handleInputChange(v.key, (e.target as HTMLInputElement).value)}
                    hint={v.hint}
                    notation={v.notation}
                    type="number"
                    step="any"
                  />
                ))}
              </div>

              <div className="pt-10">
                <button
                  onClick={runCalculation}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#0a0a0a] py-4 text-[12px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-[#1a1a1a] active:scale-[0.99] disabled:opacity-50"
                >
                  {isProcessing ? 'Computing Analysis...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-[#e8e8e8] pb-6">
                <div className="space-y-1">
                  <h4 className="text-[16px] font-semibold text-[#0a0a0a]">Batch Analytics Engine</h4>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a1a1a1]">High-Throughput Computation</p>
                </div>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 rounded-lg border border-[#e8e8e8] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#0a0a0a] hover:bg-[#fafafa] transition-all">
                    <Download size={14} />
                    Template
                  </button>
                  <button className="flex items-center gap-2 rounded-lg bg-[#0a0a0a] px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-[#1a1a1a] transition-all">
                    <UploadCloud size={14} />
                    Process
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-10">
                {/* Drag & Drop Zone */}
                <div className="group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e8e8e8] bg-[#fafafa] p-10 text-center transition-all hover:border-[#0070f3]/50 hover:bg-[#0070f3]/[0.02]">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#e8e8e8] group-hover:ring-[#0070f3]/20 transition-all">
                    <FileText className="text-[#a1a1a1] group-hover:text-[#0070f3] transition-all" size={24} />
                  </div>
                  <h5 className="text-[15px] font-semibold text-[#0a0a0a] mb-2">Technical Dataset Upload</h5>
                  <p className="text-[12px] text-[#a1a1a1] leading-relaxed max-w-md mx-auto">
                    Drag and drop your .xlsx or .csv engineering sheet here to begin high-throughput batch processing across all methodology parameters.
                  </p>
                  <input type="file" className="absolute inset-0 cursor-pointer opacity-0" />
                </div>

                <div className="space-y-10">
                  <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-6">
                    <div className="space-y-1">
                      <h5 className="text-[16px] font-semibold text-[#0a0a0a]">Manual Parameter Grid</h5>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a1a1a1]">Direct Tabular Entry</p>
                    </div>
                    <div className="flex items-center gap-6">
                      {batchResults.length > 0 && (
                        <button className="flex items-center gap-2 text-[11px] font-bold text-[#00b341] uppercase tracking-widest hover:underline underline-offset-4">
                          <Download size={14} />
                          Results (.xlsx)
                        </button>
                      )}
                      <button
                        onClick={runBatchCalculation}
                        disabled={isBatchProcessing}
                        className="flex items-center gap-3 rounded-xl bg-[#0a0a0a] px-8 py-3 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-[#1a1a1a] transition-all shadow-lg disabled:opacity-50"
                      >
                        {isBatchProcessing ? 'Processing Dataset...' : 'Run Batch Analysis'}
                        {!isBatchProcessing && <ArrowRight size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                          <th className="px-5 py-4 font-bold uppercase tracking-widest text-[#a1a1a1] text-[10px] w-16 text-center">#</th>
                          {calculator.variables.map(v => (
                            <th key={v.key} className="px-5 py-4 font-bold uppercase tracking-widest text-[#a1a1a1] text-[10px] min-w-[120px]">
                              {v.notation || v.label} ({v.unit})
                            </th>
                          ))}
                          <th className="px-5 py-4 font-bold uppercase tracking-widest text-[#e11d48] text-[10px] text-right min-w-[150px]">Analytical Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e8e8]/50">
                        {[0, 1, 2].map((idx) => (
                          <tr key={idx} className="group hover:bg-[#fafafa] transition-colors">
                            <td className="px-5 py-3.5 text-[#a1a1a1] font-mono text-center">{idx + 1}</td>
                            {calculator.variables.map(v => (
                              <td key={v.key} className="px-3 py-2">
                                <input
                                  type="text"
                                  defaultValue={v.defaultValue}
                                  className="w-full bg-transparent px-3 py-2 outline-none font-mono text-[14px] text-[#0a0a0a] border-b border-transparent focus:border-[#e11d48]/30 transition-all"
                                />
                              </td>
                            ))}
                            <td className="px-5 py-3.5 text-right font-mono font-bold text-[14px] text-[#0a0a0a]">
                              {batchResults[idx] ? (
                                <span className="text-[#e11d48]">{batchResults[idx].toFixed(3)}</span>
                              ) : (
                                <span className="text-[#a1a1a1]/30">--</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={calculator.variables.length + 2} className="px-5 py-4 text-center bg-[#fafafa]/30">
                            <button className="text-[10px] font-bold uppercase tracking-widest text-[#e11d48] hover:underline transition-all">+ Initialize New Analysis Row</button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results & Audit Trail - Column (Only in Single Mode) */}
        {mode === 'single' && (
          <div className="lg:col-span-6 bg-[#fafafa]/50 p-7 md:p-10 space-y-10">
            {result && (
              <div className="space-y-10">
                <div className="space-y-10">
                  <div className="flex items-center justify-between border-b border-[#e8e8e8] pb-6">
                    <div className="space-y-1">
                      <h4 className="text-[16px] font-semibold text-[#0a0a0a]">Computational Audit</h4>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#a1a1a1]">Detailed Step-by-Step Derivation</p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-[#e8e8e8] bg-white shadow-sm">
                    <table className="w-full text-left text-[12px]">
                      <thead>
                        <tr className="bg-[#fafafa] border-b border-[#e8e8e8]">
                          <th className="px-5 py-4 font-bold uppercase tracking-widest text-[#a1a1a1] text-[10px]">Notation</th>
                          <th className="px-5 py-4 font-bold uppercase tracking-widest text-[#a1a1a1] text-[10px]">Description</th>
                          <th className="px-5 py-4 font-bold uppercase tracking-widest text-[#a1a1a1] text-[10px]">Value</th>
                          <th className="px-5 py-4 font-bold uppercase tracking-widest text-[#a1a1a1] text-[10px] text-right">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e8e8]/50">
                        {result.steps.map((step: any, i: number) => (
                          <tr key={i} className={cn("transition-colors hover:bg-[#fafafa]", step.isResult && "bg-[#fff1f2] font-semibold")}>
                            <td className="px-5 py-3.5 font-mono text-[#e11d48]">{step.notation}</td>
                            <td className="px-5 py-3.5 text-[#0a0a0a]/80">{step.label}</td>
                            <td className="px-5 py-3.5 font-mono text-[#0a0a0a]">{step.value}</td>
                            <td className="px-5 py-3.5 text-[#a1a1a1] uppercase tracking-tight text-right text-[10px]">{step.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="rounded-xl border border-[#e8e8e8] bg-white p-6 space-y-4 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Activity size={32} />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-[#a1a1a1] uppercase tracking-[0.15em]">Peak Runoff Rate</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-[#0a0a0a] tracking-tighter">
                          {result.result.toFixed(3)}
                        </span>
                        <span className="text-sm font-bold text-[#e11d48] uppercase tracking-wide">
                          {calculator.formula.region.includes('India') ? 'cumecs' : 'cfs'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e8e8e8] bg-white p-7 space-y-5 shadow-sm">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#fafafa] border border-[#e8e8e8]">
                      <Box size={14} className="text-[#525252]" />
                    </div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#0a0a0a]">Methodology Standards</h4>
                  </div>
                  <p className="text-[13px] text-[#525252] font-normal leading-relaxed">
                    Computational logic derived from <span className="font-bold text-[#0a0a0a]">{calculator.formula.reference}</span>. This deterministic method is calibrated for peak runoff estimation in small catchments under 50 acres.
                  </p>
                  <div className="flex items-center gap-4 pt-2">
                    <button className="flex items-center gap-2 text-[11px] font-bold text-[#e11d48] uppercase tracking-widest hover:underline underline-offset-8 transition-all">
                      <Download size={14} />
                      Export Data Sheet
                    </button>
                    <Link href="/platform" className="flex items-center gap-2 text-[11px] font-bold text-[#a1a1a1] uppercase tracking-widest hover:text-[#0a0a0a] transition-colors">
                      <ArrowRight size={14} />
                      Back to Registry
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LayersIcon({ size, className }: { size?: number, className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
