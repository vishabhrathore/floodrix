"use client";

import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { domains } from '../constants';
import DomainSectionItem from '../components/DomainSectionItem';
import CapabilitiesHero from '../components/CapabilitiesHero';

const Capabilities: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-32 selection:bg-brand-red selection:text-white">
      <CapabilitiesHero />

      <div className="w-full">
        {domains.map((domain) => (
          <DomainSectionItem key={domain.id} domain={domain} />
        ))}
      </div>

      {/* Trust & Quality Section */}
      {/* <section className="px-6 md:px-20 lg:px-32 py-32 lg:py-56 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-black rounded-[2.5rem] p-12 md:p-24 border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-20 items-center max-w-7xl mx-auto shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/5 blur-[100px] pointer-events-none" />

          <div className="lg:col-span-7 space-y-8 relative z-10">
            <p className="text-[10px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Technical Assurance</p>
            <h2 className="text-h2 font-serif text-white leading-[1.1] tracking-tight">
              Every deliverable reviewed against{" "}
              <span className="italic text-brand-red">IRC, IS, CWC &amp; BIS</span>{" "}standards.
            </h2>
            <p className="text-body text-white/40 leading-relaxed max-w-xl font-light">
              FloodRix operates under a documented quality management framework. All hydraulic designs, flood models, and hydrogeological reports are independently reviewed prior to submission — ensuring technical defensibility at every regulatory interface.
            </p>
          </div>
          <div className="lg:col-span-5 space-y-10 relative z-10">
            <div className="grid grid-cols-2 border border-white/10 rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm shadow-sm">
              {[{ value: "60+", label: "Projects Delivered" }, { value: "100%", label: "Regulatory Approval" }, { value: "8", label: "States Active" }, { value: "4", label: "Core Domains" }].map((s, i) => (
                <div key={i} className={`p-7 ${i % 2 === 0 ? "border-r" : ""} ${i < 2 ? "border-b" : ""} border-white/10`}>
                  <div className="text-3xl font-serif text-white mb-1.5">{s.value}</div>
                  <div className="text-[9px] font-mono text-white/40 uppercase tracking-widest">{s.label}</div>
                </div>
              ))}
            </div>
            <Link href="/#contact" className="inline-flex items-center gap-4 bg-brand-red text-white hover:bg-white hover:text-black px-10 py-5 rounded-full font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-all hover:-translate-y-1 shadow-xl">
              Request a Capability Brief
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section> */}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }` }} />
    </div>
  );
};

export default Capabilities;