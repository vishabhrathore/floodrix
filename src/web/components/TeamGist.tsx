"use client";


import React from 'react';
import { TEAM } from '../constants';
import { ArrowRight } from 'lucide-react';
import { } from 'next/navigation'
import Link from 'next/link';
import { useSectionTheme } from '../hooks/useSectionTheme';
import SmoothReveal from './SmoothReveal';

const TeamGist: React.FC = () => {
  const sectionRef = useSectionTheme<HTMLElement>('home-team', 'light');
  return (
    <section ref={sectionRef} className="py-32 bg-white overflow-hidden">
      <div className="px-6 md:px-20 lg:px-32">
        <SmoothReveal direction="up" distance={30}>
          <div className="flex flex-col lg:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-[1px] bg-brand-red" />
                <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Our Leadership</span>
              </div>
              <h2 className="text-h1 font-serif text-brand-dark tracking-tight leading-tight">
                The engineers behind the <span className="italic text-brand-red">infrastructure.</span>
              </h2>
            </div>
            <Link
              href="/team"
              className="group flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.3em] text-brand-dark hover:text-brand-red transition-all pb-2 border-b border-brand-dark/10 hover:border-brand-red"
            >
              Meet the entire panel <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>
        </SmoothReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {TEAM.slice(0, 4).map((member, idx) => (
            <SmoothReveal key={member.id} delay={idx * 0.1} distance={40}>
              <div className="group">
                <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden mb-6">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-8 transform translate-y-4 group-hover:translate-y-0">
                    <p className="text-white/80 text-xs font-light leading-relaxed italic mb-4 line-clamp-4">
                      "{member.bio}"
                    </p>
                    <div className="h-[1px] w-8 bg-brand-red mb-4" />
                    <span className="text-white text-[9px] font-bold uppercase tracking-[0.3em] opacity-50">{member.role}</span>
                  </div>
                </div>
                <h3 className="text-h3 font-serif text-brand-dark mb-1 group-hover:text-brand-red transition-colors">{member.name}</h3>
                <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest leading-relaxed">
                  {member.edu.split(' - ')[1] || member.edu}
                </p>
              </div>
            </SmoothReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamGist;
