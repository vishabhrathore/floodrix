"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PROJECTS as BASE_PROJECTS } from '../constants';
import { ArrowUpRight, Globe, CheckCircle2, ChevronRight, X } from 'lucide-react';
import Link from 'next/link';

// Mosaic layout configuration based on a 12-column grid
const MOSAIC_CONFIG = [
  { col: '1 / span 5', row: '1 / span 6' },
  { col: '6 / span 4', row: '1 / span 4' },
  { col: '10 / span 3', row: '1 / span 3' },
  { col: '10 / span 3', row: '4 / span 4' },
  { col: '6 / span 2', row: '5 / span 3' },
  { col: '8 / span 2', row: '5 / span 3' },
  { col: '1 / span 3', row: '7 / span 4' },
  { col: '4 / span 3', row: '7 / span 4' },
  { col: '7 / span 3', row: '8 / span 3' },
  { col: '10 / span 3', row: '8 / span 3' },
];

const WorksGist: React.FC = () => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  
  // Extend Projects to 5 items for the collage
  const displayProjects = [
    { ...BASE_PROJECTS[0], id: '1-0', uniqueKey: 0 },
    { ...BASE_PROJECTS[1], id: '2-0', uniqueKey: 1 },
    { ...BASE_PROJECTS[2], id: '3-0', uniqueKey: 2 },
    { ...BASE_PROJECTS[0], id: '1-1', uniqueKey: 3, title: "Urban Drainage Network", category: "Infrastructure" },
    { ...BASE_PROJECTS[1], id: '2-1', uniqueKey: 4, title: "Coastal Surge Protection", category: "Coastal" },
  ];

  const gridClasses = [
    "md:col-span-8 md:row-span-2 min-h-[400px]",
    "md:col-span-4 md:row-span-1 min-h-[292px]",
    "md:col-span-4 md:row-span-1 min-h-[292px]",
    "md:col-span-7 md:row-span-1 min-h-[240px]",
    "md:col-span-5 md:row-span-1 min-h-[240px]"
  ];

  return (
    <section id="projects" className="py-32 bg-brand-dark overflow-hidden">
      <div className="px-6 md:px-20 lg:px-32">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-12 mb-20">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-[1px] bg-brand-red" />
              <span className="text-sm font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Engineering Portfolio</span>
            </div>
            <h2 className="text-5xl md:text-7xl font-serif text-white tracking-tighter leading-tight">
              Selected <span className="italic text-white/40">Benchmarks.</span>
            </h2>
          </div>
          <Link 
            href="/works" 
            className="group flex items-center gap-4 text-white hover:text-brand-red transition-colors mb-4"
          >
            <span className="text-sm font-bold uppercase tracking-[0.3em]">Full Portfolio [12]</span>
            <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:border-brand-red transition-all">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </Link>
        </div>

        {/* Collage Grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-12 gap-4 mb-24 min-h-[600px]">
          {displayProjects.map((project, idx) => {
            const isExpanded = expandedIdx === idx;
            const isAnyExpanded = expandedIdx !== null;
            
            return (
              <motion.div
                key={project.id}
                layout
                transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                className={`relative group cursor-pointer overflow-hidden rounded-[2rem] border border-white/5 ${
                  isExpanded 
                    ? 'md:col-span-12 md:row-span-2 z-50 h-[600px]' 
                    : gridClasses[idx]
                } ${
                  isAnyExpanded && !isExpanded ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100'
                } transition-all duration-500`}
              >
                <motion.img 
                  layout
                  src={project.image} 
                  alt={project.title} 
                  className={`absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ${
                    isExpanded ? 'brightness-[0.4] scale-100' : 'group-hover:scale-110'
                  }`}
                />
                
                {/* Close Button when expanded */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedIdx(null);
                      }}
                      className="absolute top-8 right-8 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-brand-red transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Content Overlay */}
                <div className={`absolute inset-0 flex flex-col transition-all duration-500 ${
                  isExpanded ? 'p-12 md:p-20 justify-center' : 'p-8 justify-end bg-gradient-to-t from-brand-dark/80 to-transparent'
                }`}>
                  <motion.div layout className="relative z-10">
                    <div className={`font-bold text-brand-red uppercase tracking-[0.3em] mb-4 ${isExpanded ? 'text-sm' : 'text-xs'}`}>
                      {project.category}
                    </div>
                    
                    <h4 className={`text-white font-serif leading-tight mb-4 ${
                      isExpanded ? 'text-4xl md:text-6xl max-w-3xl' : 'text-xl md:text-2xl'
                    }`}>
                      {project.title}
                    </h4>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ delay: 0.2 }}
                          className="space-y-8"
                        >
                          <div className="flex items-center gap-3 text-sm font-mono text-white/50 uppercase tracking-[0.3em]">
                            <Globe className="w-4 h-4 text-brand-red" /> {project.location}
                          </div>
                          
                          <p className="text-lg md:text-xl text-white/60 font-light leading-relaxed italic border-l-2 border-brand-red/30 pl-6 max-w-2xl">
                             "{project.challenge}"
                          </p>

                          <div className="flex flex-wrap gap-8">
                             {project.impact?.map((item, i) => (
                               <div key={i} className="flex gap-3 items-center group">
                                 <CheckCircle2 className="w-4 h-4 text-brand-red shrink-0" />
                                 <span className="text-sm font-light text-white/40 group-hover:text-white transition-colors">
                                   {item}
                                 </span>
                               </div>
                             ))}
                          </div>

                          <Link 
                            href={`/project/${project.id.split('-')[0]}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-4 px-10 py-4 bg-brand-red text-white text-sm font-bold uppercase tracking-[0.3em] rounded-full hover:bg-white hover:text-brand-dark transition-all"
                          >
                             Analysis Report <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Advisory Box Below */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
           <div className="md:col-span-8">
              <div className="flex items-center gap-6">
                 <div className="w-16 h-[1px] bg-white/10" />
                 <p className="text-sm font-mono text-white/40 uppercase tracking-[0.5em]">Global Hydraulic Verification Partners</p>
              </div>
           </div>
           <div className="md:col-span-4 translate-y-4">
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Globe className="w-24 h-24 text-brand-red" />
                 </div>
                 <h4 className="text-white font-serif mb-4">Strategic Advisory</h4>
                 <Link href="/contact" className="inline-flex items-center gap-2 text-brand-red text-sm font-bold uppercase tracking-widest hover:translate-x-2 transition-transform">
                    Request Briefing <ArrowUpRight className="w-4 h-4" />
                 </Link>
              </div>
           </div>
        </div>
      </div>
    </section>
  );
};

export default WorksGist;
