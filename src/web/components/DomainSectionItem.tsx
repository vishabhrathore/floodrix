"use client";

import React from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { DomainSection } from '../types';

interface DomainSectionItemProps {
  domain: DomainSection;
}

const DomainSectionItem: React.FC<DomainSectionItemProps> = ({ domain }) => {
  const containerRef = React.useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [150, -150]);
  const y2 = useTransform(scrollYProgress, [0, 1], [-200, 200]);

  return (
    <section ref={containerRef} className="py-20 lg:py-32 first:pt-32 overflow-hidden">
      <div className="px-6 md:px-20 lg:px-32 mb-8 lg:mb-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-end"
        >
          <div className="lg:col-span-1">
            <div className="mb-8">
              <span className="text-[11px] font-mono font-bold tracking-[0.5em] text-gray-300 uppercase block mb-4">
                {domain.tag}
              </span>
              <div className="w-16 h-[1px] bg-brand-red" />
            </div>
            <h2 className="text-h1 font-serif text-brand-dark tracking-tighter leading-[1.1]">
              <span className="italic text-brand-red block mb-1">{domain.titleEmphasis}</span>
              {domain.title}
            </h2>
          </div>
          <div className="lg:col-span-1">
            <p className="text-body-large text-gray-400 font-light leading-relaxed max-w-full">
              {domain.intro}
            </p>
          </div>
        </motion.div>
      </div>

      <div className="px-6 md:px-20 lg:px-32 space-y-0">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
        >
          <motion.div style={{ y: y1 }} className="relative group overflow-hidden bg-brand-dark rounded-[2.5rem] shadow-2xl aspect-square">
            <motion.img
              whileInView={{ scale: [1, 1.4] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              viewport={{ once: false }}
              src={domain.problem.image}
              alt={`${domain.title} — the problem`}
              className="w-full h-full object-cover opacity-100"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent" />
            <div className="absolute bottom-10 left-10 right-10">
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em] mb-4">Field Reality</div>
              <p className="text-white text-h3 font-serif italic leading-snug">"{domain.problem.title}"</p>
            </div>
          </motion.div>

          <div className="py-8 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-3 h-3 rounded-full bg-brand-red" />
              <span className="text-[11px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">The Vulnerability</span>
            </div>

            <h3 className="text-h2 font-serif text-brand-dark mb-6 leading-tight">
              {domain.problem.vulnerabilityHeading}
            </h3>

            <p className="text-gray-500 text-lg leading-relaxed mb-10 font-sans">
              {domain.problem.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
              {domain.problem.points.map((point, pIdx) => (
                <div key={pIdx} className="space-y-2">
                  <span className="text-brand-red font-mono text-[10px] font-bold uppercase tracking-widest">Risk 0{pIdx + 1}</span>
                  <p className="text-base text-gray-600 leading-relaxed">{point}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5 mt-12 pt-10 border-t border-gray-100">
              {domain.problem.tags.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="group relative px-4 py-1.5 border border-gray-100 rounded-full text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-white hover:text-brand-red hover:border-brand-red transition-all pl-7"
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-brand-red transition-colors" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="py-24 lg:py-40 flex flex-col items-center justify-center relative overflow-hidden">
          <motion.div
            style={{ y: useTransform(scrollYProgress, [0, 1], [-150, 150]), opacity: 0.03 }}
            className="absolute inset-0 pointer-events-none"
          >
            <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          </motion.div>
          <div className="absolute top-0 bottom-0 w-px bg-brand-red/10" />
          {/* Technical Vertical Connector - Dotted with Signal Pulse */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full overflow-hidden pointer-events-none">
            {/* The Dotted Track */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `linear-gradient(to bottom, var(--brand-red) 50%, transparent 50%)`,
                backgroundSize: '1px 8px'
              }}
            />

            {/* The Traveling Signal */}
            <motion.div
              animate={{
                y: ["-10%", "110%"],
                opacity: [0, 1, 1, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
              className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-transparent via-brand-red to-transparent z-10"
            />
          </div>
          <motion.div
            style={{ y: useTransform(scrollYProgress, [0.5, 0.85], [0, 400]) }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative px-16 py-6 bg-white border border-gray-100 rounded-full shadow-[0_40px_100px_rgba(0,0,0,0.12)] flex items-center gap-12 overflow-hidden z-20 group/capsule"
          >
            {/* Liquid Flow Background Effect - Now precisely synced with scroll */}
            <motion.div
              style={{
                x: useTransform(scrollYProgress, [0.2, 0.8], ["-100%", "200%"]),
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-red/10 to-transparent -skew-x-12 pointer-events-none"
            />

            <span className="text-[9px] font-mono font-bold tracking-[0.5em] text-gray-400 uppercase whitespace-nowrap relative z-10">
              Vulnerability Audit
            </span>

            <div className="relative flex items-center justify-center">
              <div className="w-12 h-[1px] bg-gray-100 absolute -left-14" />
              <div className="relative z-10 bg-white p-2 rounded-full border border-gray-50 shadow-sm">
                <ArrowRight className="w-4 h-4 text-brand-red group-hover/capsule:translate-x-1 transition-transform" />
              </div>
              <div className="w-12 h-[1px] bg-gray-100 absolute -right-14" />

              {/* Enhanced Pulse */}
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.2, 0, 0.2] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-brand-red/30 rounded-full blur-[10px]"
              />
            </div>

            <span className="text-[9px] font-mono font-bold tracking-[0.5em] text-brand-red uppercase whitespace-nowrap relative z-10">
              Engineering Resolution
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
        >
          <div className="py-8 flex flex-col justify-center order-2 lg:order-1">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-3 h-3 rounded-full bg-brand-teal" />
              <span className="text-[11px] font-mono font-bold tracking-[0.4em] text-brand-teal uppercase">The Engineered Result</span>
            </div>
            <h3 className="text-h2 font-serif text-brand-dark mb-6 leading-tight">{domain.solution.title}</h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-12 font-sans">{domain.solution.description}</p>
            <div className="space-y-0">
              {domain.solution.services.map((service, sIdx) => (
                <div key={sIdx} className="group py-7 border-t border-gray-100 last:border-b hover:bg-gray-50/50 px-4 -mx-4 rounded-xl transition-all">
                  <div className="grid grid-cols-12 gap-6 items-start">
                    <span className="col-span-1 text-xs font-mono text-brand-red font-bold pt-0.5">0{sIdx + 1}</span>
                    <div className="col-span-11 space-y-2">
                      <h4 className="text-h5 font-bold text-brand-dark font-sans group-hover:text-brand-red transition-colors">{service.title}</h4>
                      <p className="text-base text-gray-500 leading-relaxed">{service.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <motion.div style={{ y: y2 }} className="relative group overflow-hidden order-1 lg:order-2 bg-gray-100 rounded-[2.5rem] shadow-2xl aspect-square">
            <motion.img
              whileInView={{ scale: [1, 1.4] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              viewport={{ once: false }}
              src={domain.solution.image}
              alt={`${domain.title} — our solution`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-brand-dark/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-10 left-10 z-20">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-white/[0.03] backdrop-blur-xl px-10 py-8 rounded-[1.5rem] shadow-2xl border border-white/10 flex flex-col gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-brand-red uppercase tracking-[0.4em]">{domain.solution.outcomeLabel}</span>
                </div>
                <div>
                  <div className="text-h2 font-serif text-white tracking-tight leading-none mb-1">{domain.solution.outcomeValue}</div>
                  <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.1em] leading-relaxed max-w-[160px]">{domain.solution.outcomeDesc}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default DomainSectionItem;
