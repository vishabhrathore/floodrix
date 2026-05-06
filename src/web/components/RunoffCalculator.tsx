"use client";


import React, { useState, useEffect } from 'react';
import { gsap } from 'gsap';
import { Calculator, Info, Zap, Activity, Waves, ArrowRight } from 'lucide-react';

const RunoffCalculator: React.FC = () => {
  const [coefficient, setCoefficient] = useState(0.70); // C
  const [intensity, setIntensity] = useState(50); // i (mm/hr)
  const [area, setArea] = useState(10); // A (Hectares)
  const [result, setResult] = useState(0);

  useEffect(() => {
    // Rational Method Formula: Q = (C * i * A) / 360
    const q = (coefficient * intensity * area) / 360;
    
    // Animate the result value
    const obj = { value: result };
    gsap.to(obj, {
      value: q,
      duration: 0.8,
      ease: "power2.out",
      onUpdate: () => {
        setResult(obj.value);
      }
    });
  }, [coefficient, intensity, area]);

  const getSeverityColor = () => {
    if (result < 0.5) return 'text-brand-teal';
    if (result < 2) return 'text-brand-red';
    return 'text-red-800';
  };

  return (
    <section id="calculator" className="relative z-10 py-32 bg-[#0a0a0a] border-b border-white/5 overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-teal/5 blur-[150px] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-red/5 blur-[150px] -z-10" />

      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          
          {/* Left Column: Info */}
          <div className="space-y-12 reveal-on-scroll">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-brand-teal animate-pulse" />
              </div>
              <h3 className="text-5xl md:text-7xl font-medium text-white font-serif leading-[0.9] tracking-tighter">
                Scientific <span className="text-brand-red">Calculation</span> Suite.
              </h3>
              <p className="text-xl text-white/40 font-light leading-relaxed max-w-xl">
                We offer a comprehensive library of specialized calculators for water engineering. 
                Our tools cover every critical phase of hydrological analysis and hydraulic design.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              <div className="space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-brand-teal/30 transition-colors">
                  <Waves className="w-6 h-6 text-brand-teal" />
                </div>
                <h4 className="text-white text-xl font-medium tracking-tight">Flood Models</h4>
                <p className="text-base text-white/60 leading-relaxed">Rational Method, Unit Hydrograph, and empirical flood frequency analysis.</p>
              </div>
              <div className="space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-brand-red/30 transition-colors">
                  <Activity className="w-6 h-6 text-brand-red" />
                </div>
                <h4 className="text-white text-xl font-medium tracking-tight">Scour Analysis</h4>
                <p className="text-base text-white/60 leading-relaxed">Detailed bridge scour and pier protection modeling per HEC-18 standards.</p>
              </div>
              <div className="space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-brand-teal/30 transition-colors">
                  <Calculator className="w-6 h-6 text-brand-teal" />
                </div>
                <h4 className="text-white text-xl font-medium tracking-tight">Rainfall Data</h4>
                <p className="text-base text-white/60 leading-relaxed">Intensity-Duration-Frequency (IDF) curves and return period estimations.</p>
              </div>
              <div className="space-y-4 group">
                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-brand-red/30 transition-colors">
                  <Zap className="w-6 h-6 text-brand-red" />
                </div>
                <h4 className="text-white text-xl font-medium tracking-tight">Energy Mapping</h4>
                <p className="text-base text-white/60 leading-relaxed">Hydraulic jump and energy dissipator calculations for spillway design.</p>
              </div>
            </div>

            <div className="pt-8">
              <button className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-10 py-5 rounded-2xl font-bold transition-all flex items-center gap-4 group">
                Access All Calculators
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Mac Screen */}
          <div className="relative reveal-on-scroll">
            {/* The "Mac" Frame */}
            <div className="relative bg-[#1a1a1a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-1">
              {/* Header Bar */}
              <div className="bg-[#252525] px-6 py-4 flex items-center border-b border-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Rational_Runoff_Simulator.dmg</span>
                </div>
              </div>

              {/* Browser/App Content */}
              <div className="bg-[#0f0f0f] p-8 lg:p-12 space-y-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-xl font-medium tracking-tight leading-none">Rational Method</h3>
                    <p className="text-white/30 text-[10px] font-mono tracking-widest mt-2 uppercase">Input Stream_04</p>
                  </div>
                  <div className="bg-brand-red/10 px-4 py-2 rounded-lg border border-brand-red/20">
                    <span className="text-brand-red font-mono font-bold text-sm">Q = CiA / 360</span>
                  </div>
                </div>

                <div className="space-y-10">
                  {/* Params Grid */}
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40">
                        <span>Runoff Coeff (C)</span>
                        <span className="text-brand-teal">{coefficient.toFixed(2)}</span>
                      </div>
                      <input 
                        type="range" min="0.05" max="0.95" step="0.01" 
                        value={coefficient} 
                        onChange={(e) => setCoefficient(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-teal"
                      />
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40">
                        <span>Intensity (mm/h)</span>
                        <span className="text-brand-teal">{intensity}</span>
                      </div>
                      <input 
                        type="range" min="1" max="250" step="1" 
                        value={intensity} 
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-teal"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40">
                        <span>Area (ha)</span>
                        <span className="text-brand-teal">{area}</span>
                      </div>
                      <input 
                        type="range" min="0.1" max="100" step="0.1" 
                        value={area} 
                        onChange={(e) => setArea(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-teal"
                      />
                    </div>
                  </div>

                  {/* Result Box */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-10 text-center relative group overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-teal/20 to-transparent" />
                    <div className="absolute inset-0 bg-brand-teal/5 opacity-0 group-hover:opacity-100 transition-opacity blur-2xl" />
                    
                    <div className="relative z-10 space-y-4">
                      <h4 className="text-[10px] font-mono tracking-[0.4em] uppercase text-white/20">Peak Discharge</h4>
                      <div className={`text-6xl md:text-7xl font-bold tracking-tighter ${getSeverityColor()}`}>
                        {result.toFixed(3)}
                      </div>
                      <div className="text-white/40 text-xs font-bold tracking-widest uppercase">m³/sec</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements for style */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-red/10 rounded-full blur-[100px] -z-10" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-brand-teal/10 rounded-full blur-[100px] -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default RunoffCalculator;
