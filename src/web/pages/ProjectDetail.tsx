"use client";

import React, { useEffect } from 'react';
import { useParams, } from 'next/navigation'
import Link from 'next/link';
import { motion } from 'motion/react';
import { PROJECTS } from '../constants';
import { ArrowLeft, Share2, CheckCircle2 } from 'lucide-react';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const project = PROJECTS.find(p => p.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-4xl font-serif text-brand-dark mb-4">Project not found</h1>
          <Link href="/" className="text-brand-red hover:underline flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Editorial Header */}
      <header className="pt-40 pb-12 px-6 md:px-20 lg:px-32">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col md:flex-row justify-between items-start gap-8"
        >
          <div className="max-w-3xl">
            <Link href="/works" className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-red transition-colors mb-8 uppercase text-[10px] font-bold tracking-[0.3em]">
              <ArrowLeft className="w-4 h-4" /> Back to Portfolio
            </Link>
            <h1 className="text-4xl md:text-6xl font-serif text-brand-dark tracking-tight leading-[1.1]">
              {project.title}
            </h1>
          </div>
          <div className="text-right">
             <span className="text-gray-400 text-lg md:text-xl font-light">{project.category}</span>
          </div>
        </motion.div>
      </header>

      {/* Full Width Rounded Image */}
      <section className="px-6 md:px-20 lg:px-32 mb-12">
        <motion.div 
          initial={{ opacity: 0, scale: 1.02 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
          className="relative aspect-[21/9] w-full overflow-hidden rounded-[2.5rem] md:rounded-[4rem] shadow-2xl border border-gray-100"
        >
          <img 
            src={project.image} 
            alt={project.title} 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </section>

      {/* Metadata Row */}
      <section className="px-6 md:px-20 lg:px-32 mb-20">
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-gray-100 pb-8 gap-8">
           <div className="flex flex-wrap gap-12 lg:gap-24">
              <div className="space-y-3">
                 <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Location</span>
                 <p className="text-sm font-medium text-brand-dark">{project.location}</p>
              </div>
              <div className="space-y-3">
                 <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Markets</span>
                 <p className="text-sm font-medium text-brand-dark">{project.category}</p>
              </div>
              <div className="space-y-3">
                 <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">Clients</span>
                 <p className="text-sm font-medium text-brand-dark">{project.client}</p>
              </div>
           </div>
           <div>
              <button className="flex items-center gap-3 px-6 py-2.5 rounded-full border border-gray-200 text-[10px] font-bold uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all group">
                 Share <Share2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-red" />
              </button>
           </div>
        </div>
      </section>

      {/* Detailed Content Grid */}
      <section className="px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Main Text Content */}
          <div className="lg:col-span-8 space-y-16">
            <div className="space-y-8">
              <h2 className="text-3xl md:text-4xl font-serif text-brand-dark max-w-2xl">
                {project.challenge}
              </h2>
              <div className="h-[1px] w-12 bg-brand-red" />
              <p className="text-lg text-gray-500 font-light leading-relaxed">
                {project.solution}
              </p>
            </div>
            
            <p className="text-gray-400 leading-relaxed font-light italic border-l-2 border-gray-100 pl-8">
              {project.description}
            </p>
          </div>

          {/* Impact Sidebar */}
          <div className="lg:col-span-4 translate-y-8 lg:-translate-y-8">
            <div className="bg-brand-dark p-10 rounded-[3rem] text-white">
              <h3 className="text-2xl font-serif mb-8 italic">Quantifiable <span className="text-brand-red">Impact</span></h3>
              <div className="space-y-6">
                {project.impact?.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start group">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-red mt-2 transition-transform group-hover:scale-150" />
                    <span className="text-sm font-light text-white/70 group-hover:text-white transition-colors">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectDetail;
