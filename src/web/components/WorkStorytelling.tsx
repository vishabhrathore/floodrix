"use client";

import React, { useState, useEffect, useRef } from 'react';
import { workflows } from './workflow';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  ArrowRight,
  Waves, 
  Activity, 
  Map,
  ShieldCheck
} from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

interface StoryChapter {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  services: string[];
  detailedServices: string[];
  applications: string[];
  image: string;
  icon: React.ReactNode;
}

const chapters: StoryChapter[] = [
  { 
    id: "highway", 
    title: "Highway Drainage", 
    subtitle: "Transportation & Infrastructure", 
    description: "Centimetre-precision hydraulic models for high-speed corridors. We protect civil assets by simulating extreme rainfall events and optimizing discharge structures.", 
    services: ["Hydrology & Hydraulics", "Design", "Safety Features"],
    detailedServices: ["Bridge Hydrology & Scour", "Storm Drainage Networks", "Culvert Optimization", "Energy Dissipator Design"],
    applications: ["Highways & Expressways", "Bridge Crossings", "Infrastructure Corridors"],
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auhref=format&fit=crop&q=80&w=2000", 
    icon: <Waves className="w-5 h-5" />
  },
  { 
    id: "infrastructure", 
    title: "Urban Infra & Flood", 
    subtitle: "Urban Resilience", 
    description: "Digital twin simulations for citywide stormwater management. We build 1D/2D coupled models that synchronize pipe networks with surface flow behavior.", 
    services: ["Network Planning", "Water Management", "Advanced Simulation"],
    detailedServices: ["1D/2D Pluvial Modelling", "Fluvial Flood Modelling", "Attenuation Structures", "Climate Resilience Studies"],
    applications: ["Smart Cities & Urban Areas", "Industrial Parks", "Solar Farms"],
    image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auhref=format&fit=crop&q=80&w=2000", 
    icon: <Activity className="w-5 h-5" />
  },
  { 
    id: "groundwater", 
    title: "Groundwater Services", 
    subtitle: "Subsurface Matrix", 
    description: "Numerical groundwater modeling to predict aquifer behavior. From dewatering optimization to contaminant transport, we solve complex subsurface challenges.", 
    services: ["Groundwater Modelling", "Impact Assessment", "Aquifer Mapping"],
    detailedServices: ["Numerical Aquifer Simulation", "Contaminant Transport", "Dewatering Patterns", "Sustainable Yield Estimation"],
    applications: ["Mining Operations", "Construction Dewatering", "Utility Water Planning"],
    image: "https://images.unsplash.com/photo-1542385151-efd9000785a0?auhref=format&fit=crop&q=80&w=2000", 
    icon: <Map className="w-5 h-5" />
  }
];

const WorkStorytelling: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState<string>(chapters[0].id);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      chapters.forEach((chapter, idx) => {
        ScrollTrigger.create({
          trigger: sectionsRef.current[idx],
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            if (self.isActive) {
              setActiveChapter(chapter.id);
            }
          }
        });
      });
    });

    return () => ctx.revert();
  }, []);

  const scrollToChapter = (index: number) => {
    const element = sectionsRef.current[index];
    if (element) {
      const offset = 100; // Header offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section id="storytelling" className="bg-[#fcfcfc] border-t border-gray-100 py-32">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-32 items-start">
          
          {/* Left Sidebar Navigation - Sticky */}
          <div className="lg:col-span-4 sticky top-40 space-y-12">
            <div>
              <span className="text-sm text-brand-red font-bold uppercase tracking-[0.5em] block mb-6 font-sans">SPECIALISED DOMAINS</span>
              <h2 className="text-5xl font-serif text-brand-dark leading-[1.1] mb-4">
                Vertical <br/><span className="italic text-brand-dark">Expertise.</span>
              </h2>
              <p className="text-gray-500 text-base font-sans max-w-xs leading-relaxed">
                Precision-engineered water management strategies for the most demanding infrastructure environments.
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              {chapters.map((chapter, idx) => (
                <button
                  key={chapter.id}
                  onClick={() => scrollToChapter(idx)}
                  className={`group relative text-left py-8 px-8 transition-all duration-700 rounded-3xl border border-transparent ${
                    activeChapter === chapter.id 
                      ? 'bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border-gray-100 translate-x-4' 
                      : 'opacity-30 hover:opacity-100'
                  }`}
                >
                  <div className="relative z-10 flex items-center gap-6">
                    <div className={`text-sm font-mono font-bold transition-all duration-500 ${
                      activeChapter === chapter.id ? 'text-brand-red scale-110' : 'text-gray-300'
                    }`}>
                      0{idx + 1}
                    </div>
                    <h4 className={`text-xl font-serif transition-colors duration-500 leading-tight ${
                      activeChapter === chapter.id ? 'text-brand-dark' : 'text-gray-400'
                    }`}>
                      {chapter.title}
                    </h4>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-12 border-t border-gray-100 hidden lg:block">
              <div className="flex items-center gap-4 text-brand-teal mb-4">
                <ShieldCheck className="w-6 h-6" />
                <span className="text-sm font-bold uppercase tracking-[0.2em]">Industry Standards</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed max-w-[280px] font-sans">
                Our internal assessments are following ISO-9001 certification and CWC technical compliance guidelines.
              </p>
            </div>
          </div>

          {/* Right Content Area - Long Scroll */}
          <div className="lg:col-span-8 flex flex-col gap-40 lg:gap-64 pt-10">
            {chapters.map((chapter, idx) => (
              <div 
                key={chapter.id}
                ref={(el) => { sectionsRef.current[idx] = el; }}
                className="space-y-16"
              >
                {/* Header & Description */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-brand-dark text-white rounded-xl flex items-center justify-center shadow-xl shadow-brand-dark/10">
                      {chapter.icon}
                    </div>
                    <div className="h-[1px] w-12 bg-brand-red/20" />
                    <span className="text-sm font-mono font-bold uppercase tracking-[0.3em] text-brand-red uppercase">
                      Domain Specialty {idx + 1}
                    </span>
                  </div>
                  <h3 className="text-6xl font-serif text-brand-dark leading-[1.05]">
                    {chapter.title}
                  </h3>
                  <p className="text-2xl text-gray-600 leading-relaxed font-light font-sans max-w-2xl border-l-2 border-brand-red/10 pl-8 transition-colors hover:text-brand-dark">
                    {chapter.description}
                  </p>
                </div>

                {/* Imagery */}
                <div className="relative aspect-[16/8] rounded-[2.5rem] overflow-hidden shadow-2xl group">
                  <img 
                    src={chapter.image} 
                    alt={chapter.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 via-transparent to-transparent" />
                </div>

                {/* Detailed Workflow - Professional Vertical Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 pt-4">
                  <div className="lg:col-span-7 space-y-12">
                    <div className="relative space-y-16 pl-6">
                      {/* Subdued Progress Line */}
                      <div className="absolute left-0 top-2 bottom-2 w-[1px] bg-gray-100" />
                      
                      {workflows[chapter.id]?.steps.map((step, sIdx) => (
                        <div key={sIdx} className="relative group/step">
                          {/* Node Dot */}
                          <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-gray-200" />
                          
                          <div className="space-y-4">
                            <h6 className="text-3xl font-serif text-brand-dark tracking-tight">
                              {step.title}
                            </h6>
                            <p className="text-lg text-gray-600 leading-relaxed font-sans max-w-lg">
                              {step.desc}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-8">
                    <div className="text-sm uppercase tracking-[0.4em] font-bold text-gray-400 pb-4 border-b border-gray-100">
                      Standard Deliverables
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {workflows[chapter.id]?.outputs.map((output, oIdx) => (
                        <div 
                          key={oIdx} 
                          className="flex items-center gap-4 py-3 group/out"
                        >
                          <div className={`w-2 h-2 rounded-full ${output.highlighted ? 'bg-brand-red' : 'bg-gray-200'}`} />
                          <span className={`text-base font-sans tracking-tight transition-colors ${
                            output.highlighted ? 'text-brand-dark font-semibold' : 'text-gray-600'
                          }`}>
                            {output.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-12 p-8 rounded-3xl bg-gray-50 border border-gray-100 italic">
                       <p className="text-sm text-gray-500 leading-relaxed font-serif">
                          "Our verification process ensures that every deliverable aligns with the specific regulatory frameworks of the project region."
                       </p>
                    </div>
                  </div>
                </div>

                {/* Final Action */}
                <div className="pt-12 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="flex -space-x-3">
                       {[1,2,3].map(i => (
                         <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">
                            ISO
                         </div>
                       ))}
                    </div>
                    <div className="w-[1px] h-8 bg-gray-100" />
                    <span className="text-sm font-mono font-bold uppercase tracking-widest text-brand-teal">Technical Standards 2024</span>
                  </div>
                  <button className="group relative px-10 py-5 bg-brand-dark text-white rounded-2xl overflow-hidden transition-all hover:pr-14 active:scale-95">
                    <span className="relative z-10 text-sm font-bold uppercase tracking-[0.3em]">Explore Domain Analytics</span>
                    <ArrowRight className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-0 group-hover:opacity-100 transition-all text-brand-red" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default WorkStorytelling;
