"use client";

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Droplets, 
  Map, 
  Database,
  ArrowRight,
  Globe,
  Shield,
  Activity,
  CheckCircle2
} from 'lucide-react';
import {} from 'next/navigation'
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface DomainSection {
  id: string;
  tag: string;
  title: string;
  titleEmphasis: string;
  intro: string;
  problem: {
    title: string;
    description: string;
    points: string[];
    image: string;
    tags: string[];
  };
  solution: {
    title: string;
    description: string;
    services: { title: string; desc: string }[];
    image: string;
    outcomeLabel: string;
    outcomeValue: string;
    outcomeDesc: string;
  };
}

const domains: DomainSection[] = [
  {
    id: "highway",
    tag: "Domain 01 of 03",
    title: "Highway",
    titleEmphasis: "Drainage",
    intro: "Transportation networks are only as reliable as the drainage systems beneath them. Inadequate stormwater control is one of the leading causes of premature road failure, bridge scour, and costly emergency repair.",
    problem: {
      title: "Poor drainage destroys road infrastructure from the inside out.",
      description: "Without properly designed stormwater systems, highways erode, embankments fail, and bridge foundations are compromised — often without any visible warning until critical damage has occurred.",
      points: [
        "Undersized culverts that overflow and washout road beds during storms",
        "Bridge scour quietly undermining foundations over multiple seasons",
        "Inadequate roadside ditching causing dangerous ponding and hydroplaning",
        "No energy dissipation at outfalls, triggering downstream erosion cascades"
      ],
      image: "https://images.unsplash.com/photo-1547949003-9792a18a2601?auhref=format&fit=crop&q=80&w=1200",
      tags: ["Highways", "Expressways", "Bridge Crossings", "Road Widening", "Infrastructure Corridors"]
    },
    solution: {
      title: "Purpose-built drainage, calibrated to every site condition.",
      description: "We design highway drainage systems from first principles — accounting for local hydrology, traffic load, and long-term climate projections.",
      services: [
        { title: "Hydrology & Hydraulic Analysis", desc: "Bridge hydrology, hydraulic modelling, and scour protection assessment for all crossing types." },
        { title: "Storm Drainage Network Design", desc: "Complete highway networks — pipes, culverts, channels, and roadside ditch systems." },
        { title: "Energy Dissipation & Erosion Control", desc: "Outfall protection structures and dissipator design to prevent downstream damage." }
      ],
      image: "https://images.unsplash.com/photo-1449156001533-cb39c87b5954?auhref=format&fit=crop&q=80&w=1200",
      outcomeLabel: "Quality Standard",
      outcomeValue: "ISO-9001",
      outcomeDesc: "Every design independently reviewed to international standards"
    }
  },
  {
    id: "infrastructure",
    tag: "Domain 02 of 03",
    title: "Infrastructure &",
    titleEmphasis: "Flood Modelling",
    intro: "Urban areas face accelerating rainfall intensity from climate change. Without rigorous flood modelling, cities and developments are exposed to catastrophic and entirely preventable risk.",
    problem: {
      title: "Cities are unprepared for the next major flood event.",
      description: "Rapid urbanisation increases impermeable surfaces while ageing drainage infrastructure buckles under intensifying storms. Developers face regulatory rejection.",
      points: [
        "Urban drainage networks designed for past rainfall, not future climate",
        "No flood hazard mapping to identify at-risk zones before investment",
        "Planning applications rejected without statutory Flood Risk Assessments",
        "Industrial sites discharging directly to watercourses with no attenuation"
      ],
      image: "https://images.unsplash.com/photo-1533923156684-f7614e59f49e?auhref=format&fit=crop&q=80&w=1200",
      tags: ["Smart Cities", "Industrial Parks", "Solar Farms", "River Floodplains", "Urban Campuses"]
    },
    solution: {
      title: "Digital simulation that guides physical design decisions.",
      description: "We combine advanced 1D/2D modelling with hands-on infrastructure design — giving planners the evidence they need to build confidently.",
      services: [
        { title: "1D/2D Pluvial & Fluvial Flood Modelling", desc: "High-fidelity digital models simulating real storm events across complex urban terrain." },
        { title: "Drainage Network Planning & Hydraulics", desc: "Commercial and residential drainage from feasibility through to detailed design." },
        { title: "Flood Attenuation Design", desc: "Retention ponds, soakaways, and attenuation structures matched to site constraints." },
        { title: "Flood Risk Assessments (FRA)", desc: "Statutory FRAs and climate resilience reports for planning authority approval." }
      ],
      image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auhref=format&fit=crop&q=80&w=1200",
      outcomeLabel: "Design Velocity",
      outcomeValue: "4× faster",
      outcomeDesc: "Sim-X methodology accelerates every phase of design"
    }
  },
  {
    id: "groundwater",
    tag: "Domain 03 of 03",
    title: "Groundwater",
    titleEmphasis: "Services",
    intro: "Below the surface lies a resource that, when mismanaged, can undermine structures, contaminate supply, and attract severe regulatory liability.",
    problem: {
      title: "The most dangerous water is the water you cannot see.",
      description: "Groundwater problems are slow, invisible, and expensive. From construction dewatering that triggers settlement to contamination plumes that migrate silently.",
      points: [
        "Mining and construction dewatering without proper aquifer impact assessment",
        "Contamination plumes migrating undetected through subsurface geology",
        "Agricultural over-extraction depleting shared aquifer systems",
        "No recharge zone mapping, creating regulatory exposure"
      ],
      image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auhref=format&fit=crop&q=80&w=1200",
      tags: ["Agriculture", "Mining", "Large Construction", "Government Planning", "Industrial Ops"]
    },
    solution: {
      title: "Full-spectrum subsurface water management.",
      description: "We bring numerical modelling, field investigation, and regulatory knowledge together to understand and control the water beneath your assets.",
      services: [
        { title: "Groundwater Numerical Modelling", desc: "Aquifer behaviour simulation and contaminant transport analysis at scale." },
        { title: "Dewatering Impact Assessment", desc: "Mine and construction dewatering analysis, sustainable yield estimation." },
        { title: "Aquifer Mapping & Vulnerability", desc: "Recharge zone delineation, boundary mapping, and vulnerability assessments." },
        { title: "Regulatory Compliance Studies", desc: "Decision-support modelling for water planning authorities and licensing bodies." }
      ],
      image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?auhref=format&fit=crop&q=80&w=1200",
      outcomeLabel: "Compliance Rate",
      outcomeValue: "100%",
      outcomeDesc: "Every regulatory submission approved on first review"
    }
  }
];

const Capabilities: React.FC = () => {
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
    <div className="bg-white min-h-screen">
      {/* Editorial Hero */}
      <section className="hero-section relative min-h-[90vh] bg-brand-dark flex flex-col justify-end px-6 md:px-20 lg:px-32 pb-24 overflow-hidden pt-32">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
          <span className="hero-bg-text text-[60vh] font-serif font-bold text-white tracking-tighter leading-none opacity-0 block transform-gpu uppercase whitespace-nowrap">
            WATER
          </span>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-end max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-8 h-[1px] bg-brand-red" />
              <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Engineering Capabilities</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white tracking-tight leading-[1.1] mb-8">
              We solve<br/>water's <span className="italic text-white/40">hardest</span><br/>problems.
            </h1>
          </div>
          
          <div className="space-y-12">
            <p className="text-lg text-white/40 leading-relaxed max-w-md">
              Every engagement begins with a real problem — failing drainage, flood risk, depleted aquifers. FloodRix delivers scientifically rigorous solutions built to outlast the challenge.
            </p>
            
            <div className="grid grid-cols-3 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-6 border-r border-white/10">
                <div className="text-3xl font-serif text-white mb-1">450+</div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Projects</div>
              </div>
              <div className="p-6 border-r border-white/10">
                <div className="text-3xl font-serif text-white mb-1">99.9%</div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Precision</div>
              </div>
              <div className="p-6">
                <div className="text-3xl font-serif text-white mb-1">3</div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Domains</div>
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

      {/* Domain Sections */}
      <div className="w-full">
        {domains.map((domain, index) => (
          <section key={domain.id} className="pt-48 lg:pt-80 pb-32">
            {/* Domain Header */}
            <div className="px-6 md:px-20 lg:px-32 mb-32 lg:mb-48">
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end"
              >
                <div className="lg:col-span-12 mb-12">
                  <span className="text-[11px] font-mono font-bold tracking-[0.5em] text-gray-300 uppercase block mb-4">
                    {domain.tag}
                  </span>
                  <div className="w-16 h-[1px] bg-brand-red" />
                </div>
                <div className="lg:col-span-6">
                  <h2 className="text-3xl md:text-4xl lg:text-[60.8px] font-serif text-brand-dark tracking-tighter leading-[1.1] mb-0">
                    <span className="italic text-brand-red block mb-2">{domain.titleEmphasis}</span>
                    {domain.title} 
                  </h2>
                </div>
                <div className="lg:col-span-6">
                  <p className="text-base md:text-lg text-gray-400 font-light leading-relaxed max-w-xl font-sans">
                    {domain.intro}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Problem/Solution Block */}
            <div className="px-6 md:px-20 lg:px-32 space-y-0">
              {/* Problem Panel */}
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
              >
                <div className="relative group overflow-hidden bg-brand-dark rounded-[3rem] lg:rounded-[4rem] shadow-2xl aspect-[4/5] lg:aspect-square">
                  <img src={domain.problem.image} alt="Site problem" className="w-full h-full object-cover opacity-60 transition-transform duration-[2s] group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 to-transparent" />
                  <div className="absolute bottom-12 left-12 right-12">
                    <div className="text-[10px] font-mono text-white/40 uppercase tracking-[0.4em] mb-4">Asset Exposure</div>
                    <div className="text-white text-3xl font-serif max-w-md italic">"{domain.problem.title}"</div>
                  </div>
                </div>
                <div className="py-12 flex flex-col justify-center">
                  <div>
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-3 h-3 rounded-full bg-brand-red animate-pulse" />
                      <span className="text-[11px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">The Vulnerability</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-serif text-brand-dark mb-8 leading-tight">
                      Infrastructure degradation begins with water mismanagement.
                    </h3>
                    <p className="text-gray-500 text-lg md:text-xl leading-relaxed mb-12 font-sans">
                      {domain.problem.description}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      {domain.problem.points.map((point, pIdx) => (
                        <div key={pIdx} className="space-y-3">
                          <span className="text-brand-red font-mono text-xs font-bold uppercase tracking-widest">Risk 0{pIdx + 1}</span>
                          <p className="text-sm text-gray-600 leading-relaxed font-sans">{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-16 pt-10 border-t border-gray-100">
                    {domain.problem.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="px-5 py-2 border border-gray-100 rounded-full text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-white hover:text-brand-red hover:border-brand-red transition-colors">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* The Bridge Transition */}
              <div className="py-24 flex items-center justify-center">
                <div className="flex flex-col items-center gap-8">
                  <div className="w-[1px] h-32 bg-gradient-to-b from-gray-100 via-brand-red to-brand-dark" />
                  <div className="px-10 py-4 bg-white border border-gray-100 rounded-full shadow-lg">
                    <span className="text-[10px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">Analytical Transition — Solution Architecture</span>
                  </div>
                </div>
              </div>

              {/* Solution Panel */}
              <motion.div 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
              >
                <div className="py-12 flex flex-col justify-center order-2 lg:order-1">
                  <div>
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-3 h-3 rounded-full bg-brand-teal" />
                      <span className="text-[11px] font-mono font-bold tracking-[0.4em] text-brand-teal uppercase">The Engineered Result</span>
                    </div>
                    <h3 className="text-3xl md:text-4xl font-serif text-brand-dark mb-8 leading-tight">
                      {domain.solution.title}
                    </h3>
                    <p className="text-gray-500 text-lg md:text-xl leading-relaxed mb-16 font-sans">
                      {domain.solution.description}
                    </p>
                    <div className="space-y-0">
                      {domain.solution.services.map((service, sIdx) => (
                        <div key={sIdx} className="group py-8 border-t border-gray-100 last:border-b transition-all hover:bg-gray-50/50 px-4 -mx-4 rounded-xl">
                          <div className="grid grid-cols-12 gap-6 items-start">
                            <span className="col-span-1 text-xs font-mono text-brand-red font-bold">/0{sIdx + 1}</span>
                            <div className="col-span-11 space-y-3">
                              <h4 className="text-xl font-bold text-brand-dark font-sans group-hover:text-brand-red transition-colors">{service.title}</h4>
                              <p className="text-base text-gray-500 leading-relaxed font-sans max-w-lg">{service.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative group overflow-hidden order-1 lg:order-2 bg-gray-100 rounded-[3rem] lg:rounded-[4rem] shadow-2xl aspect-[4/5] lg:aspect-square">
                  <img src={domain.solution.image} alt="Site solution" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105" />
                  <div className="absolute inset-0 bg-brand-dark/10 group-hover:bg-transparent transition-all duration-700" />
                  
                  {/* Floating Metric Card */}
                  <div className="absolute bottom-8 left-8 right-8 z-20">
                    <motion.div 
                      initial={{ y: 50, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      className="bg-brand-dark/95 backdrop-blur-2xl p-8 lg:p-10 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8"
                    >
                      <div className="text-center md:text-left">
                        <div className="text-[9px] font-mono font-bold text-brand-red uppercase tracking-[0.4em] mb-2">{domain.solution.outcomeLabel}</div>
                        <div className="text-4xl md:text-5xl font-serif text-white tracking-tighter">{domain.solution.outcomeValue}</div>
                      </div>
                      <div className="hidden md:block w-[1px] h-12 bg-white/10" />
                      <div className="max-w-[150px] text-center md:text-right">
                        <p className="text-[10px] font-mono text-white/40 uppercase tracking-[0.1em] leading-relaxed">
                          {domain.solution.outcomeDesc}
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        ))}
      </div>

      {/* CTA Methodology Section */}
      <section className="px-6 md:px-20 lg:px-32 pb-40">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-[#f7f5f2] rounded-[2.5rem] p-12 md:p-24 border border-gray-100 grid grid-cols-1 lg:grid-cols-12 gap-20 items-center max-w-7xl mx-auto"
        >
          <div className="lg:col-span-7 space-y-8">
            <h2 className="text-4xl md:text-6xl font-serif text-brand-dark leading-[1.1] tracking-tight">
              Proprietary <span className="italic text-brand-red">Sim-X</span> Methodology.
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed max-w-xl">
              Our bespoke civil simulation engine integrates with industry-standard solvers — delivering 4× faster design cycles, early-stage conflict detection, and an 85% reduction in design-phase risk exposure across all domains.
            </p>
          </div>
          <div className="lg:col-span-5 space-y-12">
            <div className="grid grid-cols-2 border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="p-8 border-r border-b border-gray-200">
                <div className="text-3xl font-serif text-brand-dark mb-2">99.98%</div>
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Accuracy</div>
              </div>
              <div className="p-8 border-b border-gray-200">
                <div className="text-3xl font-serif text-brand-dark mb-2">85%</div>
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Risk Mitigation</div>
              </div>
              <div className="p-8 border-r border-gray-200">
                <div className="text-3xl font-serif text-brand-dark mb-2">450+</div>
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Projects</div>
              </div>
              <div className="p-8">
                <div className="text-3xl font-serif text-brand-dark mb-2">100%</div>
                <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Compliant</div>
              </div>
            </div>
            
            <Link 
              href="/#contact"
              className="inline-flex items-center gap-4 bg-brand-dark text-white hover:bg-brand-red px-10 py-5 rounded-full font-mono text-[10px] font-bold uppercase tracking-[0.3em] transition-all transform hover:-translate-y-1 shadow-2xl"
            >
              Engineering Brochure
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
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

export default Capabilities;
