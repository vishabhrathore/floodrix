"use client";

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Linkedin, Mail, ArrowRight, Award, GraduationCap, Briefcase, Droplets, Shield } from 'lucide-react';
import { TEAM } from '../constants';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);


const MeetOurTeam: React.FC = () => {
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
    <div className="min-h-screen bg-[#fcfcfc] pb-32 selection:bg-brand-red selection:text-white">
      {/* Editorial Hero */}
      <section className="hero-section relative min-h-[90vh] bg-brand-dark flex flex-col justify-end px-6 md:px-20 lg:px-32 pb-24 overflow-hidden pt-32">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="hero-bg-text text-[50vh] font-serif font-bold text-white tracking-tighter leading-none opacity-0 block transform-gpu uppercase whitespace-nowrap">
            EXPERTISE
          </span>
        </div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-end max-w-7xl w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[1px] bg-brand-red" />
              <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Expertise Protocol</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white tracking-tight leading-[1.1] mb-8">
              The <span className="italic text-white/40">Expert Panel.</span>
            </h1>
          </motion.div>
          
          <div className="space-y-12">
            <p className="max-w-2xl text-white/50 text-xl font-light leading-relaxed">
              We've assembled the most disciplined minds in hydrology. Our team bridges the gap between academic theory and hardened infrastructure reality.
            </p>
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

      {/* Team Bento Grid */}
      <section className="px-6 md:px-20 lg:px-32 py-32 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {TEAM.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              className="bg-white rounded-[3.5rem] overflow-hidden border border-gray-100 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.06)] group hover:border-brand-red/20 transition-all duration-700"
            >
              <div className="p-10 lg:p-14">
                <div className="flex flex-col lg:flex-row gap-12">
                  {/* Image side */}
                  <div className="w-full lg:w-1/3 shrink-0">
                    <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl relative">
                       <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" />
                       <div className="absolute inset-0 bg-brand-red/5 mix-blend-overlay" />
                    </div>
                    <div className="mt-8 flex gap-3">
                       <button className="bg-gray-50 p-3 rounded-xl hover:bg-brand-red hover:text-white transition-all text-gray-400">
                          <Linkedin className="w-4 h-4" />
                       </button>
                       <button className="bg-gray-50 p-3 rounded-xl hover:bg-brand-red hover:text-white transition-all text-gray-400">
                          <Mail className="w-4 h-4" />
                       </button>
                    </div>
                  </div>

                  {/* Content side */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-brand-red text-[10px] font-bold uppercase tracking-[0.3em] mb-4 block font-mono">
                         {member.role}
                      </span>
                      <h3 className="text-4xl font-serif text-brand-dark mb-6 tracking-tight">{member.name}</h3>
                      <p className="text-gray-500 text-base leading-relaxed mb-10 font-light italic">
                        "{member.bio}"
                      </p>
                      
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                           <GraduationCap className="w-5 h-5 text-brand-red" />
                           <span className="text-sm font-bold text-brand-dark uppercase tracking-wide">{member.edu}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {member.expertise.map(exp => (
                             <span key={exp} className="px-4 py-1.5 bg-gray-50 text-gray-400 rounded-full text-[9px] font-bold border border-gray-100 uppercase tracking-widest">
                               {exp}
                             </span>
                           ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-10 border-t border-gray-50 mt-12 flex items-center justify-between">
                       <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] font-mono">Profile Verified</span>
                       <button className="flex items-center gap-3 text-brand-red text-xs font-bold uppercase tracking-widest hover:gap-5 transition-all">
                          Full CV <ArrowRight className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Advisory Section */}
      <section className="px-6 md:px-20 lg:px-32 py-32">
        <div className="bg-brand-dark rounded-[4rem] p-12 md:p-24 relative overflow-hidden text-center md:text-left">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_100%_0%,rgba(251,54,64,0.1)_0%,transparent_70%)]" />
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                 <h2 className="text-4xl md:text-5xl font-serif text-white mb-8 tracking-tight">Need expert <span className="italic">consultation?</span></h2>
                 <p className="text-white/50 text-lg font-light leading-relaxed mb-12 max-w-md">
                   Our panel is available for high-level site assessment, custom formula calibration, and large-scale infrastructure planning.
                 </p>
                 <button className="bg-brand-red text-white px-12 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-[0.4em] hover:bg-white hover:text-brand-dark transition-all shadow-2xl">
                    Request Assessment
                 </button>
              </div>
              <div className="grid grid-cols-2 gap-8">
                 {[
                   { icon: <Award />, label: "Certified", sub: "IRC / FEMA Standards" },
                   { icon: <Briefcase />, label: "Global", sub: "32 Nations Operations" },
                   { icon: <Droplets />, label: "Precision", sub: "Hydro-Logic Model" },
                   { icon: <Shield />, label: "Reliability", sub: "99.8% Success rate" }
                 ].map((box, i) => (
                   <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-xl">
                      <div className="text-brand-red mb-4">{React.cloneElement(box.icon as React.ReactElement<any>, { size: 28 })}</div>
                      <div className="text-white text-sm font-bold uppercase tracking-widest mb-1">{box.label}</div>
                      <div className="text-white/30 text-[10px] font-mono">{box.sub}</div>
                   </div>
                 ))}
              </div>
           </div>
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

export default MeetOurTeam;
