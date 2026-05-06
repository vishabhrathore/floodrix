"use client";

import React, { useEffect, useState, useRef } from 'react';
import { MetricProps } from '../types';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Metric: React.FC<MetricProps> = ({ label, target, suffix = "" }) => {
  const [count, setCount] = useState(0);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obj = { value: 0 };
    gsap.to(obj, {
      value: target,
      duration: 2.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: elementRef.current,
        start: 'top 85%',
        once: true
      },
      onUpdate: () => {
        setCount(Math.floor(obj.value));
      }
    });
  }, [target]);

  return (
    <div ref={elementRef} className="flex flex-col items-center p-10 bg-white rounded-[2rem] shadow-sm border border-gray-50 hover:-translate-y-2 hover:shadow-xl transition-all duration-300">
      <div className="text-5xl font-bold text-brand-red mb-3">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">{label}</div>
    </div>
  );
};

const ImpactMetrics: React.FC = () => {
  return (
    <section className="py-24 bg-[#fdfdfd] overflow-hidden">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="w-full mb-16">
          <h2 className="text-gray-400 text-label-caps tracking-[0.2em] text-[10px] mb-4">IMPACT REPORT</h2>
          <h3 className="text-section-title text-brand-dark leading-tight">
            Engineering a more <span className="italic text-brand-red">resilient</span> infrastructure.
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Metric label="Projects Delivered" target={450} suffix="+" />
          <Metric label="Km of Highway Drainage" target={1200} suffix="+" />
          <Metric label="Flood Scenarios Simulated" target={25} suffix="K" />
          <Metric label="Aquifers Mapped" target={180} />
        </div>
      </div>
    </section>
  );
};

export default ImpactMetrics;