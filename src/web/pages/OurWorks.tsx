"use client";

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Filter, Globe, Droplets, Shield, Zap } from 'lucide-react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

import { PROJECTS } from '../constants';
import {} from 'next/navigation'
import Link from 'next/link';

const OurWorks: React.FC = () => {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".hero-bg-text", 
        { y: 100, opacity: 0 },
        { y: 0, opacity: 0.03, duration: 2, ease: "power4.out" }
      );
      
      gsap.to(".hero-bg-text", {
        y: -100,
        scrollTrigger: {
          trigger: ".hero-section",
          start: "top top",
          end: "bottom top",
          scrub: true
        }
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-32">
      {/* Editorial Hero */}
      <section className="hero-section relative min-h-[90vh] bg-brand-dark flex flex-col justify-end px-6 md:px-20 lg:px-32 pb-24 overflow-hidden pt-32">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="hero-bg-text text-[60vh] font-serif font-bold text-white tracking-tighter leading-none opacity-0 block transform-gpu uppercase whitespace-nowrap">
            IMPACT
          </span>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-end w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[1px] bg-brand-red" />
              <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Global Portfolio</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white tracking-tight leading-[1.1] mb-8">
              Impact at <br/><span className="italic text-white/40">Planetary scale.</span>
            </h1>
          </motion.div>
          
          <div className="space-y-12">
            <p className="text-lg text-white/40 leading-relaxed max-w-md">
              From precision basin modeling in South Asia to coastal resilience systems in the Americas, Floodrix engineering defines the frontier of water management.
            </p>
            
            <div className="grid grid-cols-3 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-r border-white/10">
                <div className="text-3xl font-serif text-white mb-1">450+</div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Completed</div>
              </div>
              <div className="p-6 border-r border-white/10">
                <div className="text-3xl font-serif text-white mb-1">32</div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Countries</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-serif text-white mb-1">100%</div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Reliability</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Cue */}
        <div className="absolute bottom-12 right-6 md:right-32 flex items-center gap-4 group cursor-default text-white/20">
          <div className="relative w-12 h-[1px] bg-white/10 overflow-hidden">
            <div className="absolute inset-0 bg-white/40 -translate-x-full animate-[shimmer_2s_infinite]" />
          </div>
          <span className="text-[9px] font-mono font-bold tracking-[0.3em] uppercase">Scroll to explore</span>
        </div>
      </section>


      {/* Portfolio Grid */}
      <section className="px-6 md:px-20 lg:px-32 py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {PROJECTS.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group cursor-pointer"
            >
              <Link href={`/project/${project.id}`}>
                <div className="relative aspect-[4/3] rounded-[2.5rem] overflow-hidden mb-0 shadow-sm z-10 transition-transform duration-500 group-hover:-translate-y-2">
                  <img 
                    src={project.image} 
                    alt={project.title} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                     <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500">
                        <ArrowUpRight className="text-brand-dark w-8 h-8" />
                     </div>
                  </div>
                  <div className="absolute top-8 left-8 bg-white/90 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-dark">
                    {project.category}
                  </div>
                </div>
                
                <div className="px-8 pt-10 pb-8 bg-white border border-gray-100 border-t-0 rounded-b-[2.5rem] -mt-8 relative z-0 group-hover:border-gray-200 transition-colors duration-500">
                  <div className="flex flex-col gap-6">
                    {/* Header: Title & Year */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-2xl lg:text-3xl font-serif text-brand-dark mb-2 tracking-tight group-hover:text-brand-red transition-colors duration-500">
                          {project.title}
                        </h3>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-mono uppercase tracking-wider">
                            <Globe className="w-3 h-3 text-brand-teal" />
                            {project.location}
                          </div>
                          <span className="w-1 h-1 rounded-full bg-gray-200" />
                          <div className="text-gray-400 text-[10px] font-mono uppercase tracking-wider">
                            {project.year}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 border border-gray-100 px-3 py-1 rounded-lg">
                        <span className="text-[9px] font-mono font-bold text-brand-dark/40 uppercase tracking-widest">{project.category}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 font-sans opacity-80 group-hover:opacity-100 transition-opacity">
                      {project.description}
                    </p>

                    {/* Footer: Client & Impact Badge */}
                    <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-mono text-gray-400 uppercase tracking-[0.2em] mb-1">Partner</span>
                        <span className="text-[11px] font-bold text-brand-dark uppercase tracking-wider truncate max-w-[140px]">
                          {project.client}
                        </span>
                      </div>

                      {project.impact && project.impact.length > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] font-mono text-gray-400 uppercase tracking-[0.2em] mb-1">Impact Metric</span>
                          <div className="flex items-center gap-2 bg-brand-red/5 px-3 py-1.5 rounded-xl border border-brand-red/10">
                            <Zap className="w-3 h-3 text-brand-red" />
                            <span className="text-xs font-bold text-brand-red font-mono">{project.impact[0]}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
        
        <div className="mt-24 text-center">
           <button className="bg-brand-dark text-white px-12 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-brand-red transition-all shadow-xl active:scale-95">
              Load More Case Studies
           </button>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}} />
    </div>
  );
};

export default OurWorks;
