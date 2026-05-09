"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Globe, ArrowLeft, ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';

const SAMPLE_PROJECTS = [
  {
    id: 'project-kinetic',
    title: 'Offshore Turbine Scour Protection',
    category: 'Renewable Infrastructure',
    challenge: 'Securing offshore wind infrastructure against catastrophic scour events.',
    description: 'Implemented advanced hydrodynamic modeling to prevent subsea erosion, extending the asset lifecycle of offshore wind infrastructure by over a decade.',
    image: 'https://images.unsplash.com/photo-1509395176047-4a66953fd231?auto=format&fit=crop&q=80&w=1200',
    location: 'North Sea',
    impact: ['12yr Life Extension', '99.9% Asset Integrity']
  },
  {
    id: 'project-catalyst',
    title: 'Urban Catchment & Stormwater Masterplan',
    category: 'Municipal Infrastructure',
    challenge: 'Resolving legacy drainage bottlenecks in dense metropolitan corridors.',
    description: 'A citywide flood mitigation strategy using high-fidelity hydraulic modeling to protect high-value urban assets and align with long-term climate adaptation mandates.',
    image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&q=80&w=1200',
    location: 'Singapore',
    impact: ['60% Faster Response', 'Zero Inundation Events']
  },
  {
    id: 'project-alpine',
    title: 'Alpine Watershed Runoff Analysis',
    category: 'Resource Management',
    challenge: 'Developing high-fidelity runoff simulations for high-altitude hydroelectric catchments.',
    description: 'We deployed advanced numerical models to optimize water retention strategies in the Alpine range, increasing energy yield by 15% through precision forecasting.',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1200',
    location: 'Swiss Alps',
    impact: ['15% Energy Gain', '85M Data Points']
  },
  {
    id: 'project-azure',
    title: 'Coastal Flood Mitigation Strategy',
    category: 'Marine Engineering',
    challenge: 'Designing scalable flood defenses for high-value coastal infrastructure.',
    description: 'A comprehensive coastal protection framework integrating natural breakwaters and sensor-driven surge gates to protect urban settlements from rising sea levels.',
    image: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&q=80&w=1200',
    location: 'Mediterranean Coast',
    impact: ['3.2k km² Protected', 'ISO 14001 Compliant']
  }
];

const WorksGist: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const projects = SAMPLE_PROJECTS;
  const activeProject = projects[currentIndex];

  useEffect(() => {
    setIsMounted(true);
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDimensions = (isActive: boolean) => {
    if (!isMounted || windowWidth === 0) return { width: 0, height: 0 };
    if (windowWidth >= 1280) {
      return { width: isActive ? 920 : 380, height: isActive ? 640 : 540 };
    } else if (windowWidth >= 1024) {
      return { width: isActive ? 800 : 320, height: isActive ? 600 : 500 };
    } else if (windowWidth >= 768) {
      const w = windowWidth - 160;
      return { width: isActive ? w : 280, height: isActive ? 500 : 420 };
    } else {
      const w = windowWidth - 48;
      return { width: isActive ? w : 80, height: isActive ? 480 : 400 };
    }
  };

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % projects.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev === 0 ? projects.length - 1 : prev - 1));

  useEffect(() => {
    const timer = setInterval(handleNext, 8000);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const smoothTransition = {
    duration: 0.9,
    ease: [0.22, 1, 0.36, 1] as const
  };

  return (
    <section id="projects" className="py-24 lg:py-32 bg-white border-t border-gray-200 overflow-hidden flex flex-col justify-center">
      <div className="w-full overflow-x-hidden">

        {/* Top Section - Cleaner and Seamless */}
        <div className="px-6 md:px-12 lg:px-24 mb-12">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end">

            <div style={{ width: isMounted ? getDimensions(true).width : 'auto' }}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={smoothTransition}
              >
                <div className="text-brand-red text-xs font-bold uppercase tracking-widest mb-4">
                  Global Portfolio
                </div>
                {/* Utilizing fluid typography scales */}
                <h2 className="text-h1 font-serif text-brand-dark leading-none mb-6">
                  Engineering the <br className="hidden md:block" /> built environment.
                </h2>
              </motion.div>

              <div className="overflow-hidden h-[3.25em]">
                <motion.p
                  key={currentIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-gray-600 text-body-large font-light leading-relaxed border-l-2 border-brand-red pl-6 line-clamp-2"
                >
                  {activeProject.challenge}
                </motion.p>
              </div>
            </div>

            {/* Navigation Controls - Minimal and Sharp */}
            <div className="flex flex-col items-end gap-6 shrink-0 mt-8 lg:mt-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center text-brand-dark hover:bg-brand-red hover:text-white hover:border-brand-red transition-all duration-500 shadow-sm"
                  aria-label="Previous Project"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="w-14 h-14 rounded-full border border-gray-200 flex items-center justify-center text-brand-dark hover:bg-brand-red hover:text-white hover:border-brand-red transition-all duration-500 shadow-sm"
                  aria-label="Next Project"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Line */}
              <div className="flex gap-2 w-full justify-end">
                {projects.map((_, i) => (
                  <div
                    key={i}
                    className={`h-[6px] rounded-full transition-all duration-500 ${i === currentIndex ? 'w-12 bg-brand-dark' : 'w-4 bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Content */}
        <div
          className="relative flex items-end overflow-hidden"
          style={{ height: getDimensions(true).height }}
        >
          <div className="px-6 md:px-12 lg:px-24 w-full h-full">
            <motion.div
              className="flex gap-6 items-end h-full w-full"
              animate={{ x: -currentIndex * (getDimensions(false).width + 24) }}
              transition={smoothTransition}
            >
              {projects.map((project, idx) => {
                const isActive = idx === currentIndex;
                const dims = getDimensions(isActive);

                return (
                  <motion.div
                    key={project.id}
                    initial={false}
                    animate={{ width: dims.width, height: dims.height }}
                    transition={smoothTransition}
                    className="shrink-0 relative overflow-hidden group cursor-pointer bg-brand-dark rounded-3xl md:rounded-[2.5rem]"
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {/* Image Layer */}
                    <div className="absolute inset-0 z-0">
                      <motion.img
                        src={project.image}
                        alt={project.title}
                        animate={{
                          scale: isActive ? 1 : 1.05,
                          opacity: 1,
                          filter: 'grayscale(0%)'
                        }}
                        transition={smoothTransition}
                        className="w-full h-full object-cover"
                      />
                      {/* Gradient Overlay focused at the bottom text area - Only for active slide */}
                      <motion.div
                        animate={{ opacity: isActive ? 1 : 0 }}
                        transition={smoothTransition}
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none"
                      />
                    </div>

                    {/* Meta Top Tag */}
                    <div className="absolute top-6 left-6 md:left-10 z-10">
                      <motion.div
                        animate={{ opacity: isActive ? 1 : 0 }}
                        transition={smoothTransition}
                        className="bg-white text-brand-dark px-4 py-2 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 rounded-full"
                      >
                        <Globe className="w-3 h-3 text-brand-red" />
                        {project.location}
                      </motion.div>
                    </div>

                    {/* Content Block */}
                    <div className="absolute bottom-0 left-0 w-full z-10 p-6 md:p-10 flex flex-col justify-end">

                      <motion.div
                        animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
                        transition={{ ...smoothTransition, delay: isActive ? 0.2 : 0 }}
                        className="w-full max-w-2xl"
                      >
                        <div className="text-white/60 text-xs font-bold uppercase tracking-widest mb-3">
                          {project.category}
                        </div>
                        {/* Utilizing fluid typography scales */}
                        <h4 className="text-white font-serif text-h2 leading-tight mb-4">
                          {project.title}
                        </h4>

                        <p className="text-white/80 text-body leading-relaxed font-light hidden md:block mb-6 max-w-xl">
                          {project.description}
                        </p>

                        {/* Impact Metrics - Seamless without dividers */}
                        <div className="flex flex-wrap gap-x-8 gap-y-3">
                          {project.impact.map((metric, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <Activity className="w-4 h-4 text-brand-red shrink-0 mt-1" />
                              <span className="text-white text-[var(--fs-caption)] font-medium tracking-wide">
                                {metric}
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>

                      {/* Read More Link */}
                      <motion.div
                        animate={{ opacity: isActive ? 1 : 0 }}
                        className="absolute bottom-6 md:bottom-10 right-6 md:right-10 hidden lg:block"
                      >
                        <Link
                          href={`/project/${project.id}`}
                          // Link button also rounded to match card
                          className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-brand-dark hover:bg-brand-red hover:text-white transition-colors group shadow-lg"
                        >
                          <ArrowUpRight className="w-6 h-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                        </Link>
                      </motion.div>

                    </div>
                  </motion.div>
                );
              })}
              <div className="shrink-0 w-[20vw] h-1" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorksGist;