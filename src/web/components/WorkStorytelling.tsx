"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Waves,
  Activity,
  Map,
  ShieldCheck
} from 'lucide-react';

const ProgressiveImage: React.FC<{ src: string; alt: string; className?: string }> = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = React.useState(false);

  return (
    <img
      src={src}
      alt={alt}
      onLoad={() => setIsLoaded(true)}
      className={`${className} transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
    />
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
      imageLow: "/Realistic_highway_drainage_image_202605092058.jpeg",
      imageHigh: "/make_realistic_highway_drainage_image_202605092110.jpeg"
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
      imageLow: "/Aquifer_layers_beneath_landscape…_202605092108.jpeg",
      imageHigh: "/Cross-section_scientific_illustration_of_underground_202605092110.jpeg"
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
      imageLow: "/irrigation.jpeg",
      imageHigh: "/Wide_cinematic_aerial_photograph_of_202605092111.jpeg"
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
      imageLow: "/Create_realistic_image_hydraulic…_202605092103.jpeg",
      imageHigh: "/create_this_realistic_image_for_202605092110.jpeg"
    }
  ];

  return (
    <section className="bg-white py-24 lg:py-32 border-t border-gray-200 overflow-hidden relative">
      <div className="w-full px-6 md:px-12 lg:px-24 relative z-10">

        {/* Header Section - Aligned to the 12-column structural grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mb-24 border-b border-gray-200 pb-12">
          <div className="lg:col-span-7">
            <h2 className="text-h1 font-serif text-brand-dark leading-tight tracking-tight mb-6">
              Core Practice Areas
            </h2>
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Global Technical Assurance</span>
            </div>
          </div>

          <div className="lg:col-span-5 flex items-end">
            <p className="text-gray-600 text-body-large leading-relaxed font-light border-l-2 border-brand-red pl-6">
              FloodRix serves as a strategic technical partner to governmental and private entities, delivering high-fidelity engineering consultancy for mission-critical infrastructure.
            </p>
          </div>
        </div>

        {/* Consultancy Portfolio Items */}
        <div className="space-y-32">
          {domains.map((domain, idx) => {
            // Determine content orientation
            const isContentRight = idx % 2 === 0;

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

            const iconBgClass =
              theme === 'red' ? 'bg-brand-red/5 text-brand-red' :
                theme === 'blue' ? 'bg-brand-blue/5 text-brand-blue' :
                  theme === 'teal' ? 'bg-brand-teal/5 text-brand-teal' : 'bg-brand-dark/5 text-brand-dark';

            return (
              <motion.div
                key={domain.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center`}
              >

                {/* Image Section */}
                <div className={`w-full lg:col-span-7 relative group ${isContentRight ? 'lg:order-1' : 'lg:order-2'}`}>
                  <div className="relative aspect-[4/3] rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-2xl shadow-black/5">
                    {/* Low Quality Placeholder (Blurry) */}
                    <img
                      src={domain.imageLow}
                      alt={domain.title}
                      className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-60"
                    />

                    {/* High Quality Image with Progressive Fade-in */}
                    <ProgressiveImage
                      src={domain.imageHigh}
                      alt={domain.title}
                      className="relative z-10 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 border border-black/5 rounded-3xl md:rounded-[2.5rem] z-20 pointer-events-none" />
                  </div>
                </div>


                {/* Consultancy Content */}
                <div className={`w-full lg:col-span-5 ${isContentRight ? 'lg:order-2' : 'lg:order-1'}`}>
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`${iconBgClass} p-3 rounded-xl transition-colors duration-500`}>
                      {domain.icon}
                    </div>
                    <span className="text-[10px] font-bold text-brand-dark uppercase tracking-widest border border-gray-200 px-4 py-2 rounded-full">
                      Sector 0{idx + 1}
                    </span>
                  </div>

                  <h3 className="text-h2 font-serif text-brand-dark mb-6 tracking-tight leading-tight">
                    {domain.title}
                  </h3>

                  <div className="mb-6 flex items-center gap-3">
                    {/* Dynamic Accent Dot for Subtitle */}
                    <div className={`w-1.5 h-1.5 rounded-full ${accentClass}`} />
                    <span className={`text-xs font-bold uppercase tracking-widest ${textClass}`}>
                      {domain.subtitle}
                    </span>
                  </div>

                  <p className="text-gray-600 text-body leading-relaxed font-light mb-10">
                    {domain.description}
                  </p>

                  {/* Technical Specifications Grid */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-gray-200 pt-8">
                    <div className="col-span-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                      Key Deliverables
                    </div>
                    {domain.metrics.map((metric, mIdx) => (
                      <div key={mIdx} className="col-span-2 flex items-start gap-3">
                        {/* Dynamic Accent Dot for List Items */}
                        <div className={`w-1.5 h-1.5 rounded-sm ${accentClass} mt-1.5 shrink-0 opacity-80`} />
                        <span className="text-sm text-gray-700 font-medium tracking-wide">{metric}</span>
                      </div>
                    ))}
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};

export default WorkStorytelling;