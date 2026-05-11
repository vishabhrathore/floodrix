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
  Box
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

  // Find parent workspace for breadcrumbs
  const workspace = PLATFORM_DATA.find(ws =>
    getAllCalculators(ws.children).some(c => c.id === id)
  );

  useEffect(() => {
    if (calculator) {
      const initial: Record<string, number> = {};
      calculator.variables.forEach(v => initial[v.key] = v.defaultValue);
      setInputs(initial);
      setResult(calculator.formula.logic(initial));
    }
  }, [calculator]);

  if (!calculator) return <div className="p-20 text-center font-serif text-brand-dark">Calculator not found.</div>;

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
      // Simulate batch processing of multiple rows
      const results = [1, 2, 3].map(() => {
        const mockInputs = { ...inputs };
        // Slightly vary inputs for demo rows
        return calculator.formula.logic(mockInputs).result;
      });
      setBatchResults(results);
      setIsBatchProcessing(false);
    }, 800);
  };

  // Applicability Warning Logic
  const areaValue = inputs['area'] || 0;
  const showApplicabilityWarning = calculator.id === 'calc-rational' && areaValue > 50;

  return (
    <div className="mx-auto max-w-[1800px] space-y-8 md:space-y-10">
      {/* Structural Header Section */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between border-b border-border pb-8 md:pb-10">
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <Link href="/platform" className="hover:text-brand-red transition-colors">Workspaces</Link>
            <ChevronRight size={10} />
            {workspace && (
              <>
                <Link href={`/platform/${workspace.id}`} className="hover:text-brand-red transition-colors">{workspace.name}</Link>
                <ChevronRight size={10} />
              </>
            )}
            <span className="text-brand-red">{calculator.name}</span>
          </div>

          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-xl bg-brand-dark text-white">
              <Sigma size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="space-y-2">
              <h1 className="text-[22px] font-medium tracking-tight text-brand-dark">{calculator.name}</h1>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                 <span className="text-brand-red font-mono font-bold tracking-normal text-sm px-2 bg-brand-red/5 rounded border border-brand-red/10">
                   {calculator.formula.expression.replace(/\*/g, ' · ')}
                 </span>
                 <span>•</span>
                 <span>{calculator.formula.reference}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Switcher - Technical Style */}
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
          <button
            onClick={() => setMode('single')}
            className={cn(
              "flex items-center gap-3 rounded-lg px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
              mode === 'single' ? "bg-white text-brand-red shadow-sm border border-border" : "text-muted-foreground hover:text-brand-dark"
            )}
          >
            <Play size={12} fill="currentColor" />
            Single Run
          </button>
          <button
            onClick={() => setMode('batch')}
            className={cn(
              "flex items-center gap-3 rounded-lg px-6 py-2 text-[10px] font-bold uppercase tracking-widest transition-all",
              mode === 'batch' ? "bg-white text-brand-red shadow-sm border border-border" : "text-muted-foreground hover:text-brand-dark"
            )}
          >
            <LayersIcon size={12} />
            Batch Process
          </button>
        </div>
      </section>

      {/* Architectural Grid Content */}
      <div className="overflow-hidden rounded-2xl border border-border grid grid-cols-1 lg:grid-cols-12 shadow-sm">
        
        {/* Input & Parameters - Column */}
        <div className={cn(
          "border-r border-border bg-white transition-all duration-500",
          mode === 'single' ? "lg:col-span-6 p-6 md:p-10" : "lg:col-span-12 p-8 md:p-12"
        )}>
          {mode === 'single' ? (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-border pb-6">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-brand-dark">Analytical Inputs</h3>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Parameter Specification</p>
                </div>
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-brand-dark bg-slate-100 px-3 py-1 rounded border border-border">
                  <ShieldCheck size={12} />
                  Validated Method
                </div>
              </div>

              {/* Applicability Warning */}
              <AnimatePresence>
                {showApplicabilityWarning && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3"
                  >
                    <AlertCircle className="text-amber-600 shrink-0" size={18} />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-amber-900 uppercase tracking-tight">Applicability Warning</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        The Rational Method is deterministic and primarily intended for small catchments. Areas exceeding 50 acres (currently {areaValue} acres) may require unit hydrograph or simulation methods for accurate peak discharge.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
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

              <div className="pt-4">
                <button
                  onClick={runCalculation}
                  disabled={isProcessing}
                  className="flex w-full items-center justify-center gap-3 rounded-lg bg-brand-dark py-4 text-[11px] font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-brand-red active:scale-[0.99] disabled:opacity-50"
                >
                  {isProcessing ? 'Computing Analysis...' : 'Run Analysis'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {/* Batch Engine Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-border pb-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-brand-dark">Batch Analytics Engine</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                    Execute large-scale computational sweeps by uploading dataset files or entering parameters manually in the technical grid below.
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-brand-dark hover:bg-slate-50 transition-all">
                    <Download size={14} />
                    Download Template
                  </button>
                  <button className="flex items-center gap-2 rounded-lg bg-brand-dark px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-brand-red transition-all">
                    <UploadCloud size={14} />
                    Process Dataset
                  </button>
                </div>
              </div>

              {/* Batch Interaction Areas */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Drag & Drop Zone */}
                <div className="lg:col-span-4">
                  <div className="group relative h-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-slate-50/50 p-8 text-center transition-all hover:border-brand-red/50 hover:bg-brand-red/[0.02]">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-border group-hover:ring-brand-red/20 transition-all">
                      <FileText className="text-muted-foreground group-hover:text-brand-red transition-all" size={24} />
                    </div>
                    <h4 className="text-sm font-semibold text-brand-dark mb-2">Technical Dataset Upload</h4>
                    <p className="text-[11px] text-muted-foreground leading-relaxed px-4">
                      Drag and drop your .xlsx or .csv engineering sheet here to begin batch processing.
                    </p>
                    <input type="file" className="absolute inset-0 cursor-pointer opacity-0" />
                  </div>
                </div>

                {/* Manual Technical Grid */}
                <div className="lg:col-span-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manual Parameter Grid</h4>
                      <p className="text-[9px] text-muted-foreground">Direct tabular entry for computational sweeps</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {batchResults.length > 0 && (
                        <button className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-widest hover:underline underline-offset-4">
                          <Download size={14} />
                          Download Results (.xlsx)
                        </button>
                      )}
                      <button 
                        onClick={runBatchCalculation}
                        disabled={isBatchProcessing}
                        className="flex items-center gap-2 rounded-lg bg-brand-dark px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-brand-red transition-all shadow-lg disabled:opacity-50"
                      >
                        {isBatchProcessing ? 'Processing...' : 'Run Batch Analysis'}
                        {!isBatchProcessing && <ArrowRight size={14} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                    <table className="w-full text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-border">
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground text-[9px] w-12 text-center">#</th>
                          {calculator.variables.map(v => (
                            <th key={v.key} className="px-4 py-3 font-bold uppercase tracking-widest text-muted-foreground text-[9px]">
                              {v.notation || v.label} ({v.unit})
                            </th>
                          ))}
                          <th className="px-4 py-3 font-bold uppercase tracking-widest text-brand-red text-[9px] text-right">Analytical Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {[0, 1, 2].map((idx) => (
                          <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground font-mono text-center">{idx + 1}</td>
                            {calculator.variables.map(v => (
                              <td key={v.key} className="px-2 py-1">
                                <input 
                                  type="text" 
                                  defaultValue={v.defaultValue}
                                  className="w-full bg-transparent px-2 py-1.5 outline-none font-mono text-brand-dark border-b border-transparent focus:border-brand-red/30 transition-all"
                                />
                              </td>
                            ))}
                            <td className="px-4 py-3 text-right font-mono font-bold text-brand-dark">
                              {batchResults[idx] ? (
                                <span className="text-brand-red">{batchResults[idx].toFixed(2)}</span>
                              ) : (
                                <span className="text-muted-foreground/30">--</span>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <td colSpan={calculator.variables.length + 2} className="px-4 py-3 text-center bg-slate-50/30">
                            <button className="text-[9px] font-bold uppercase tracking-widest text-brand-red hover:underline">+ Initialize New Analysis Row</button>
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
          <div className="lg:col-span-6 bg-slate-50/50 p-6 md:p-10 space-y-10">
            {result && (
            <div className="space-y-10">
              {/* Flip Hierarchy: Audit Trail First */}
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-brand-dark">Computational Audit</h3>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Detailed Step-by-Step Derivation</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                  <table className="w-full text-left text-[12px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-border">
                        <th className="px-5 py-3 font-bold uppercase tracking-widest text-muted-foreground text-[10px]">Notation</th>
                        <th className="px-5 py-3 font-bold uppercase tracking-widest text-muted-foreground text-[10px]">Description</th>
                        <th className="px-5 py-3 font-bold uppercase tracking-widest text-muted-foreground text-[10px]">Value</th>
                        <th className="px-5 py-3 font-bold uppercase tracking-widest text-muted-foreground text-[10px] text-right">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {result.steps.map((step: any, i: number) => (
                        <tr key={i} className={cn("transition-colors hover:bg-slate-50/50", step.isResult && "bg-brand-red/[0.03] font-semibold")}>
                          <td className="px-5 py-3 font-mono text-brand-red">{step.notation}</td>
                          <td className="px-5 py-3 text-brand-dark/80">{step.label}</td>
                          <td className="px-5 py-3 font-mono text-brand-dark">{step.value}</td>
                          <td className="px-5 py-3 text-muted-foreground uppercase tracking-tight text-right text-[10px]">{step.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Results Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border bg-white p-6 space-y-4 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Activity size={32} />
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Peak Runoff Rate</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-brand-dark tracking-tighter">
                          {result.result.toFixed(2)}
                        </span>
                        <span className="text-sm font-medium text-brand-red">
                          {calculator.formula.region.includes('India') ? 'cumecs' : 'cfs'}
                        </span>
                      </div>
                   </div>
                </div>

                <div className="rounded-xl border border-border bg-white p-6 space-y-4 shadow-sm">
                   <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Method Reliability</span>
                        <p className="text-xs font-semibold text-brand-dark">Deterministic Output — No Uncertainty Bounds</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Analysis Tier</span>
                        <p className="text-xs font-semibold text-brand-dark">Preliminary Design Level</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* Technical Modules (Lacey's calculation) */}
              {result && calculator.id === 'calc-rational' && (
                <div className="rounded-xl border border-border bg-white p-6 space-y-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-3">
                      <Waves size={16} className="text-brand-blue" />
                      <h4 className="text-[10px] font-bold text-brand-dark uppercase tracking-widest">Waterway Reference (Lacey's)</h4>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-normal">Regime Width Calculation</span>
                      <span className="text-sm font-mono font-medium text-brand-dark">{(4.8 * Math.sqrt(result.result)).toFixed(2)} m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-normal">Reference Design Width (Safety Factor 0.9)</span>
                      <span className="text-sm font-mono font-medium text-slate-500">{(4.5 * Math.sqrt(result.result)).toFixed(2)} m</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Documentation Module */}
              <div className="rounded-xl border border-border bg-white p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2">
                   <Box size={14} className="text-muted-foreground" />
                   <h3 className="text-[10px] font-bold uppercase tracking-widest text-brand-dark">Methodology Standards</h3>
                </div>
                <p className="text-xs text-muted-foreground font-normal leading-relaxed">
                  Computational logic derived from <span className="font-bold text-brand-dark">{calculator.formula.reference}</span>. This deterministic method is calibrated for peak runoff estimation in small catchments under 50 acres.
                </p>
                <div className="flex items-center gap-4 pt-2">
                  <button className="flex items-center gap-2 text-[10px] font-bold text-brand-red uppercase tracking-widest hover:underline underline-offset-4">
                    <Download size={14} />
                    Export Sheet
                  </button>
                  <Link href="/platform" className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-brand-dark transition-colors">
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
