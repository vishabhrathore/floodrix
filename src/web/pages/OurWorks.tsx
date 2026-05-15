"use client";

import React from "react";

import Link from "next/link";

import { ArrowUpRight, Zap } from "lucide-react";
import { motion } from "motion/react";

import WorksHero from "../components/WorksHero";
import { PROJECTS } from "../constants";

const OurWorks: React.FC = () => {
  return (
    <div className="min-h-screen bg-white pb-32 selection:bg-brand-red/10 selection:text-brand-dark">
      <WorksHero />

      <main className="w-full px-6 md:px-20 lg:px-32 py-24">
        {/* ── High-Density Project Grid ── */}
        <section className="pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-24">
            {PROJECTS.map((project, idx) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: idx * 0.08,
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="group"
              >
                <Link
                  href={`/project/${project.id}`}
                  className="block space-y-8"
                >
                  {/* ── Image — Premium Rounding ── */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gray-50 rounded-[2.5rem] border border-gray-100 shadow-lg shadow-black/[0.02]">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover transition-all duration-1000 group-hover:scale-105"
                    />
                    {/* Subtle Sector Badge */}
                    <div className="absolute top-6 left-6">
                      <span className="bg-white/95 backdrop-blur-sm px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest text-brand-dark rounded-full border border-gray-100">
                        {project.category}
                      </span>
                    </div>
                  </div>

                  {/* ── Card Body ── */}
                  <div className="space-y-4 px-2">
                    {/* Meta: Location · Status */}
                    <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                      <span>{project.location}</span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full" />
                      <span>{project.status || project.year}</span>
                    </div>

                    {/* Title */}
                    <h2
                      className="font-serif text-brand-dark tracking-tight leading-tight group-hover:text-brand-red transition-colors duration-500"
                      style={{ fontSize: "clamp(1.25rem, 2vw, 1.5rem)" }}
                    >
                      {project.title}
                    </h2>

                    {/* Summary */}
                    <p
                      className="text-gray-500 font-sans font-light leading-relaxed line-clamp-2"
                      style={{ fontSize: "clamp(0.875rem, 1.2vw, 1rem)" }}
                    >
                      {project.description}
                    </p>

                    {/* Technical Footer */}
                    <div className="pt-4 flex items-center justify-between border-t border-gray-50 mt-4">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-brand-dark uppercase tracking-widest group-hover:text-brand-red transition-colors">
                        Case Study <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[10px] font-mono text-gray-300 font-medium">
                        #{project.id.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Contact Section ── */}
        <section className="mt-32 pt-32 border-t border-gray-100">
          <div className="max-w-4xl">
            <h2 className="text-4xl font-serif text-brand-dark tracking-tight mb-8">
              Ready to solve your next{" "}
              <span className="italic text-brand-red">
                technical challenge?
              </span>
            </h2>
            <Link
              href="/contact"
              className="inline-flex items-center gap-4 text-[11px] font-mono font-bold uppercase tracking-[0.4em] bg-brand-dark text-white px-10 py-5 rounded-full hover:bg-brand-red transition-all shadow-xl shadow-brand-dark/10 active:scale-95"
            >
              Start an Enquiry
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default OurWorks;
