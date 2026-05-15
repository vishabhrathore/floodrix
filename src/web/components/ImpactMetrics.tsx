"use client";

import React, { useEffect, useRef, useState } from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { useSectionTheme } from "../hooks/useSectionTheme";
import SmoothReveal from "./SmoothReveal";

gsap.registerPlugin(ScrollTrigger);

interface MetricItem {
  label: string;
  target: number;
  suffix: string;
  detail: string;
}

const Metric: React.FC<MetricItem> = ({ label, target, suffix, detail }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obj = { value: 0 };
    gsap.to(obj, {
      value: target,
      duration: 2.5,
      ease: "power3.out",
      scrollTrigger: {
        trigger: elementRef.current,
        start: "top 90%",
        once: true,
      },
      onUpdate: () => {
        setCount(Math.floor(obj.value));
      },
    });
  }, [target]);

  return (
    <div
      ref={elementRef}
      className="py-8 lg:py-12 border-l border-white/10 pl-8 first:border-l-0"
    >
      <div className="text-5xl md:text-6xl font-serif font-medium text-white leading-none mb-4 flex items-baseline">
        <span className="tabular-nums">{count.toLocaleString()}</span>
        <span className="text-brand-red ml-1">{suffix}</span>
      </div>
      <div className="space-y-2">
        <div className="text-white text-xs font-bold uppercase tracking-widest">
          {label}
        </div>
        <p className="text-white/60 text-sm font-light leading-relaxed max-w-[240px]">
          {detail}
        </p>
      </div>
    </div>
  );
};

const ImpactMetrics: React.FC = () => {
  const sectionRef = useSectionTheme("impact-metrics", "dark");

  const metrics: MetricItem[] = [
    {
      label: "Projects Delivered",
      target: 450,
      suffix: "+",
      detail:
        "Providing technical oversight for large-scale highway and railway bridge developments.",
    },
    {
      label: "Drainage Network",
      target: 1200,
      suffix: "km",
      detail:
        "Optimized hydraulic design for high-capacity arterial drainage and urban runoff systems.",
    },
    {
      label: "Flood Scenarios",
      target: 25,
      suffix: "K+",
      detail:
        "Utilizing high-fidelity hydrodynamic modeling to ensure regulatory safety compliance.",
    },
    {
      label: "Aquifers Mapped",
      target: 180,
      suffix: "",
      detail:
        "Systematic hydrogeological surveying for sustainable groundwater resource management.",
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="bg-brand-dark w-full px-6 md:px-12 lg:px-24 py-16 lg:py-24"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-8 border-b border-white/10 pb-12">
        <div className="max-w-3xl">
          <SmoothReveal direction="up" distance={20} delay={0.1}>
            <h2 className="text-brand-red text-xs font-bold uppercase tracking-widest mb-6">
              Impact and Resilience Report
            </h2>
          </SmoothReveal>
          <SmoothReveal direction="up" distance={30} delay={0.2}>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif text-white leading-tight">
              Quantifying the stability of our global infrastructure.
            </h3>
          </SmoothReveal>
        </div>

        <SmoothReveal direction="up" distance={20} delay={0.3}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-[1px] bg-white/20" />
            <span className="text-white/60 text-xs font-bold uppercase tracking-widest whitespace-nowrap">
              Updated Fiscal Year 2026
            </span>
          </div>
        </SmoothReveal>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-b border-white/10 pb-8">
        {metrics.map((m, idx) => (
          <SmoothReveal key={m.label} delay={idx * 0.15} distance={30}>
            <Metric {...m} />
          </SmoothReveal>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-white/40 text-xs uppercase tracking-wider max-w-2xl leading-relaxed">
          All metrics are validated against international engineering standards
          and subject to annual third-party verification protocols.
        </p>
      </div>
    </section>
  );
};

export default ImpactMetrics;
