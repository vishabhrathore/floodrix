"use client";

import React, { useEffect, useState } from "react";

import { Activity, ArrowRight, Calculator, Waves, Zap } from "lucide-react";
import { motion, useSpring, useTransform } from "motion/react";

import { useSectionTheme } from "../hooks/useSectionTheme";

const RunoffCalculator: React.FC = () => {
  const sectionRef = useSectionTheme("runoff-calculator", "dark");

  const [coefficient, setCoefficient] = useState(0.7); // C
  const [intensity, setIntensity] = useState(50); // i (mm/hr)
  const [area, setArea] = useState(10); // A (Hectares)

  // Calculate Q
  const q = (coefficient * intensity * area) / 360;

  // Motion value for smooth counting
  const springValue = useSpring(0, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    springValue.set(q);
  }, [q, springValue]);

  const displayResult = useTransform(springValue, (latest) =>
    latest.toFixed(3),
  );

  const getSeverityColor = (val: number) => {
    if (val < 0.5) return "text-brand-teal";
    if (val < 2) return "text-brand-red/80";
    return "text-brand-red";
  };

  return (
    <section
      ref={sectionRef}
      data-header-theme="dark"
      className="relative z-10 py-32 bg-black border-b border-white/5"
    >
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.08)_0%,transparent_70%)] -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_bottom_left,rgba(13,148,136,0.08)_0%,transparent_70%)] -z-10" />

      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32 items-center">
          {/* Left Column: Info */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-12"
          >
            <div className="space-y-6">
              <h3 className="text-h1 text-white font-serif tracking-tight leading-[1.1]">
                Advanced Hydrological{" "}
                <span className="text-brand-red italic">Solutions.</span>
              </h3>
              <p className="text-lg text-white/40 font-light leading-relaxed max-w-2xl">
                FloodRix pairs deep engineering expertise with proprietary
                digital tools to solve complex water infrastructure challenges.
                Our end-to-end capabilities cover every critical phase of
                hydrological analysis, hydraulic design, and flood risk
                mitigation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {[
                {
                  icon: Waves,
                  color: "text-brand-teal",
                  border: "group-hover:border-brand-teal/30",
                  title: "Flood Modeling",
                  desc: "Empirical flood frequency analysis and advanced catchment simulations.",
                },
                {
                  icon: Activity,
                  color: "text-brand-red",
                  border: "group-hover:border-brand-red/30",
                  title: "Scour Analysis",
                  desc: "Complex bridge scour and pier protection modeling (HEC-18 compliant).",
                },
                {
                  icon: Calculator,
                  color: "text-brand-teal",
                  border: "group-hover:border-brand-teal/30",
                  title: "Precipitation Analytics",
                  desc: "High-fidelity IDF curves and return period estimations.",
                },
                {
                  icon: Zap,
                  color: "text-brand-red",
                  border: "group-hover:border-brand-red/30",
                  title: "Hydraulic Structures",
                  desc: "Energy dissipator and spillway design calculations.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * i }}
                  className="space-y-4 group"
                >
                  <div
                    className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10 ${item.border} transition-colors`}
                  >
                    <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <h4 className="text-white text-h4 font-medium tracking-tight">
                    {item.title}
                  </h4>
                  <p className="text-base text-white/50 leading-relaxed">
                    {item.desc}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="pt-8">
              <button className="bg-brand-red text-white px-10 py-5 rounded-full font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-all flex items-center gap-4 group shadow-lg hover:shadow-[0_0_30px_rgba(251,54,64,0.3)] hover:-translate-y-1">
                Access Digital Tools
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>

          {/* Right Column: Mac Screen */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            {/* The "Mac" Frame */}
            <div className="relative bg-[#0f0f0f] rounded-[2.5rem] border border-white/10 shadow-xl overflow-hidden">
              {/* Header Bar */}
              <div className="bg-[#1a1a1a] px-6 py-4 flex items-center border-b border-white/10">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#ff5f56] shadow-inner" />
                  <div className="w-3 h-3 rounded-full bg-[#ffbd2e] shadow-inner" />
                  <div className="w-3 h-3 rounded-full bg-[#27c93f] shadow-inner" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[9px] font-mono text-white/40 uppercase tracking-[0.3em] ml-[-40px]">
                    Rational_Runoff_Simulator.dmg
                  </span>
                </div>
              </div>

              {/* Browser/App Content */}
              <div className="p-8 lg:p-12 space-y-12">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-serif text-h3 leading-none">
                      Rational Method
                    </h3>
                  </div>
                  <div className="bg-brand-red/10 px-4 py-2 rounded-lg border border-brand-red/20">
                    <span className="text-brand-red font-mono font-bold text-sm">
                      Q = CiA / 360
                    </span>
                  </div>
                </div>

                <div className="space-y-10">
                  {/* Params Grid */}
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40 font-mono">
                        <span>Runoff Coeff (C)</span>
                        <span className="text-brand-red">
                          {coefficient.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.95"
                        step="0.01"
                        value={coefficient}
                        onChange={(e) =>
                          setCoefficient(parseFloat(e.target.value))
                        }
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-red"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40 font-mono">
                        <span>Intensity (mm/h)</span>
                        <span className="text-brand-red">{intensity}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="250"
                        step="1"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-red"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-white/40 font-mono">
                        <span>Area (ha)</span>
                        <span className="text-brand-red">{area}</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="100"
                        step="0.1"
                        value={area}
                        onChange={(e) => setArea(parseFloat(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-red"
                      />
                    </div>
                  </div>

                  {/* Result Box */}
                  <div className="bg-black border border-white/10 rounded-[2rem] p-10 text-center relative group overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-red/20 to-transparent" />
                    <div className="absolute inset-0 bg-brand-red/[0.02] opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10 space-y-4">
                      <h4 className="text-[10px] font-mono tracking-[0.5em] uppercase text-white/40">
                        Peak Discharge
                      </h4>
                      <motion.div
                        className={`text-h1 font-serif font-bold tracking-tighter ${getSeverityColor(q)}`}
                      >
                        {displayResult}
                      </motion.div>
                      <div className="text-white/20 text-[10px] font-mono font-bold tracking-[0.3em] uppercase">
                        m³/sec
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating elements for style */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.1)_0%,transparent_70%)] -z-10" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[radial-gradient(circle_at_center,rgba(13,148,136,0.15)_0%,transparent_70%)] -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default RunoffCalculator;
