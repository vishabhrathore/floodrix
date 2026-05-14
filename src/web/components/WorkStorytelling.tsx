"use client";

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import {
  Waves,
  Activity,
  Map,
  ShieldCheck
} from 'lucide-react';

import { useSectionTheme } from '../hooks/useSectionTheme';

interface Domain {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  description: string;
  metrics: string[];
  image: string;
}

const DomainItem: React.FC<{ domain: Domain; idx: number }> = ({ domain, idx }) => {
  const containerRef = useRef(null);
  const isContentRight = idx % 2 === 0;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const yImage = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const yText = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const yBgIndex = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  // Mapping domain IDs to brand themes
  const theme =
    domain.id === 'storm-drainage' ? 'red' :
      domain.id === 'groundwater' ? 'blue' :
        domain.id === 'irrigation' ? 'teal' : 'dark';

  const accentClass =
    theme === 'red' ? 'bg-brand-red' :
      theme === 'blue' ? 'bg-brand-blue' :
        theme === 'teal' ? 'bg-brand-teal' : 'bg-brand-dark';

  const textClass =
    theme === 'red' ? 'text-brand-red' :
      theme === 'blue' ? 'text-brand-blue' :
        theme === 'teal' ? 'text-brand-teal' : 'text-brand-dark';

  const bgSubtleClass =
    theme === 'red' ? 'bg-brand-red/5 border-brand-red/10' :
      theme === 'blue' ? 'bg-brand-blue/5 border-brand-blue/10' :
        theme === 'teal' ? 'bg-brand-teal/5 border-brand-teal/10' : 'bg-brand-dark/5 border-brand-dark/10';

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 1 }}
      className="relative grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-center"
    >
      {/* Background Floating Index */}
      <motion.div
        style={{ y: yBgIndex }}
        className={`absolute -top-20 ${isContentRight ? '-left-10' : '-right-10'} text-[20rem] font-serif font-bold text-gray-50 select-none -z-10 opacity-60 hidden lg:block`}
      >
        0{idx + 1}
      </motion.div>

      {/* Image Section */}
      <div className={`w-full lg:col-span-6 relative group ${isContentRight ? 'lg:order-1' : 'lg:order-2'}`}>
        <motion.div
          style={{ y: yImage }}
          className="relative aspect-[3/2] rounded-[2rem] overflow-hidden bg-gray-100 shadow-2xl shadow-black/5"
        >
          <motion.img
            src={domain.image}
            alt={domain.title}
            className="absolute inset-0 w-full h-full object-cover z-10"
            animate={{ scale: [1, 1.4] }}
            transition={{ duration: 30, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          />
          <div className="absolute inset-0 bg-brand-dark/10 group-hover:bg-transparent transition-colors duration-700 z-20" />
        </motion.div>
      </div>

      {/* Consultancy Content */}
      <motion.div
        style={{ y: yText }}
        className={`w-full lg:col-span-6 ${isContentRight ? 'lg:order-2' : 'lg:order-1'}`}
      >
        <div className="flex items-center gap-3 mb-8">
          <span className={`text-[11px] font-mono font-bold ${textClass} ${bgSubtleClass} px-4 py-1.5 rounded-full border uppercase tracking-[0.3em]`}>
            Sector 0{idx + 1}
          </span>
        </div>

        <h3 className="text-h2 font-serif text-brand-dark mb-6 tracking-tight leading-tight">
          {domain.title}
        </h3>

        <div className="mb-8 flex items-center gap-3">
          <div className={`w-12 h-[1px] ${accentClass} opacity-30`} />
          <span className={`text-[10px] font-mono font-bold uppercase tracking-[0.2em] ${textClass}`}>
            {domain.subtitle}
          </span>
        </div>

        <p className="text-gray-600 text-body leading-relaxed font-light mb-12">
          {domain.description}
        </p>

        {/* Technical Specifications Grid */}
        <div className="grid grid-cols-1 gap-y-4 border-t border-gray-100 pt-10">
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-gray-400 mb-2">
            Core Deliverables
          </div>
          {domain.metrics.map((metric, mIdx) => (
            <div key={mIdx} className="flex items-center gap-4 group/item">
              <div className={`w-2 h-2 rounded-full ${accentClass} opacity-40 group-hover/item:opacity-100 group-hover/item:scale-150 transition-all`} />
              <span className="text-h5 text-gray-700 font-medium tracking-wide group-hover/item:text-brand-dark transition-colors">{metric}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

const WorkStorytelling: React.FC = () => {
  const domains = [
    {
      id: "storm-drainage",
      title: "Storm Drainage & Flood Management",
      subtitle: "Highway & Urban Drainage Engineering",
      icon: <Waves className="w-5 h-5" />,
      description:
        "We deliver integrated stormwater and flood management solutions for highways, urban infrastructure, and industrial developments. Our expertise includes hydrologic analysis, highway drainage networks, culvert hydraulics, scour assessment, and resilient stormwater systems designed for long-term infrastructure performance.",
      metrics: [
        "Highway Drainage Design",
        "Culvert & Cross-Drainage Structures",
        "Urban Stormwater Networks",
        "Scour & Energy Dissipation Analysis"
      ],
      image: "https://res.cloudinary.com/dpdkzg4ld/image/upload/v1778512475/floodrix/make_realistic_highway_drainage_image_202605092110.jpg"
    },

    {
      id: "groundwater",
      title: "Groundwater & Hydrogeology",
      subtitle: "Aquifer Assessment & Subsurface Modeling",
      icon: <Map className="w-5 h-5" />,
      description:
        "Our groundwater consultancy services support sustainable water resource planning through advanced hydrogeological investigations and numerical groundwater modeling. We help clients understand aquifer behavior, groundwater availability, recharge dynamics, and subsurface water interactions for infrastructure and environmental projects.",
      metrics: [
        "Groundwater Modeling",
        "Aquifer Mapping & Assessment",
        "Hydrogeological Investigations",
        "Recharge & Dewatering Studies"
      ],
      image: "https://res.cloudinary.com/dpdkzg4ld/image/upload/v1778512319/floodrix/Cross-section_scientific_illustration_of_underground_202605092110.jpg"
    },

    {
      id: "irrigation",
      title: "Irrigation Water Management",
      subtitle: "Efficient Agricultural Water Systems",
      icon: <Activity className="w-5 h-5" />,
      description:
        "We provide engineering solutions for modern irrigation infrastructure focused on water-use efficiency, reliable distribution, and sustainable agricultural development. Our services include command area planning, sprinkler irrigation systems, and hydraulic design of pressurized irrigation networks.",
      metrics: [
        "Command Area Development",
        "Sprinkler System Design",
        "Irrigation Pressure Networks",
        "Water Distribution Optimization"
      ],
      image: "https://res.cloudinary.com/dpdkzg4ld/image/upload/v1778512329/floodrix/Wide_cinematic_aerial_photograph_of_202605092111.jpg"
    },

    {
      id: "hydraulic-structures",
      title: "Hydraulic Structures Engineering",
      subtitle: "Water Control & Conveyance Infrastructure",
      icon: <ShieldCheck className="w-5 h-5" />,
      description:
        "We specialize in the hydraulic design of water control and conveyance structures for irrigation, drainage, river engineering, and infrastructure projects. Our solutions focus on hydraulic efficiency, structural reliability, flood resilience, and sustainable water management.",
      metrics: [
        "Spillways & Weirs",
        "Canal & Cross-Drainage Structures",
        "Check Dams & River Training Works",
        "Energy Dissipators & Intake Structures"
      ],
      image: "https://res.cloudinary.com/dpdkzg4ld/image/upload/v1778512372/floodrix/create_this_realistic_image_for_202605092110.jpg"
    }
  ];

  const sectionRef = useSectionTheme('home-domains', 'light');

  return (
    <section ref={sectionRef} className="bg-white py-24 lg:py-32 border-t border-gray-200 overflow-hidden relative">
      <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">

        {/* Header Section - Professional & Grounded */}
        <div className="mb-20 pb-16">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-8 h-[1px] bg-brand-red" />
            <span className="text-[10px] font-mono font-bold tracking-[0.5em] text-brand-red uppercase">Our Domains</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <h2 className="text-h1 font-serif text-brand-dark leading-tight tracking-tight">
                Technical expertise across <br />
                <span className="italic text-brand-red">specialized water domains.</span>
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="text-gray-600 text-lg leading-relaxed font-light border-l-2 border-brand-red pl-6">
                Strategic consultancy and engineering solutions for complex stormwater, groundwater, and irrigation infrastructure.
              </p>
            </div>
          </div>
        </div>

        {/* Consultancy Portfolio Items */}
        <div className="space-y-40">
          {domains.map((domain, idx) => (
            <DomainItem key={domain.id} domain={domain} idx={idx} />
          ))}
        </div>

      </div>
    </section>
  );
};

export default WorkStorytelling;