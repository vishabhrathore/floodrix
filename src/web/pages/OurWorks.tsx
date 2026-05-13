"use client";

import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Zap } from 'lucide-react';
import { PROJECTS } from '../constants';
import Link from 'next/link';
import WorksHero from '../components/WorksHero';

const OurWorks: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfc] pb-32 selection:bg-brand-red selection:text-white">
      <WorksHero />

      {/* ── Portfolio Grid ── */}
      <section id="portfolio" className="px-6 md:px-20 lg:px-32 py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {PROJECTS.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08, duration: 0.6 }}
            >
              <Link href={`/project/${project.id}`} className="group block">

                {/* ── Image ── */}
                <div className="relative aspect-[3/2] overflow-hidden rounded-[2.5rem] shadow-sm">
                  <img
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Hover overlay — dark tint + arrow, no blur */}
                  <div className="absolute inset-0 bg-brand-dark/50 opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

                  {/* Arrow — top-right, not centered */}
                  <div className="absolute top-5 right-5 w-10 h-10 bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowUpRight className="w-5 h-5 text-brand-dark" />
                  </div>

                  {/* Category pill — top left */}
                  <div className="absolute top-5 left-5">
                    <span className="bg-white/95 backdrop-blur-sm px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-brand-dark">
                      {project.category}
                    </span>
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className="pt-7 pb-8 px-1 bg-transparent">

                  {/* Location + Year meta */}
                  <div className="flex items-center gap-2 mb-3 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    <span>{project.location}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                    <span>{project.year}</span>
                  </div>

                  {/* Title */}
                  <h3
                    className="font-sans font-bold text-brand-dark tracking-tight leading-snug mb-3 group-hover:text-brand-red transition-colors duration-300"
                    style={{ fontSize: 'clamp(1.15rem, 1.8vw, 1.5rem)' }}
                  >
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm font-sans text-gray-500 leading-relaxed line-clamp-2 mb-6">
                    {project.description}
                  </p>

                  {/* Footer: Partner + Impact */}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-5">

                    {/* Partner */}
                    <div>
                      <span className="text-[9px] font-mono text-gray-400 uppercase tracking-[0.2em] block mb-1">
                        Partner
                      </span>
                      <span className="text-[11px] font-bold text-brand-dark uppercase tracking-wider">
                        {/* Prevent truncation — show full name */}
                        {project.client}
                      </span>
                    </div>

                    {/* Impact Metric — de-emphasised, right aligned */}
                    {project.impact && project.impact.length > 0 && (
                      <div className="text-right max-w-[48%]">
                        <span className="text-[9px] font-mono text-gray-400 uppercase tracking-[0.2em] block mb-1">
                          Key Outcome
                        </span>
                        <span className="text-[10px] font-mono font-bold text-brand-red leading-snug">
                          {project.impact[0]}
                        </span>
                      </div>
                    )}

                  </div>
                </div>

              </Link>
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        <div className="mt-20 text-center">
          <button className="bg-brand-dark text-white px-12 py-5 text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-brand-red transition-all shadow-xl active:scale-95 rounded-full">
            Load More Case Studies
          </button>
        </div>
      </section>
    </div>
  );
};

export default OurWorks;