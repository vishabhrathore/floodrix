"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
  Waves,
  Activity,
  Map,
  ShieldCheck
} from 'lucide-react';

const WorkStorytelling: React.FC = () => {
  const domains = [
    {
      id: "highway",
      title: "Transport & Highway Drainage",
      subtitle: "Strategic Infrastructure Advisory",
      icon: <Waves className="w-5 h-5" />,
      description: "We provide comprehensive hydraulic engineering for high-speed transport corridors and national infrastructure assets. Our strategies ensure effective runoff management and robust scour protection to maximize asset lifespans.",
      metrics: ["Detailed Project Reports (DPR)", "Hydraulic Peer Reviews", "Scour Vulnerability Assessments"],
      image: "https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&q=80&w=1200"
    },
    {
      id: "infrastructure",
      title: "Urban Resilience & Stormwater",
      subtitle: "Municipal & Smart City Consultancy",
      icon: <Activity className="w-5 h-5" />,
      description: "We partner with municipal bodies to develop comprehensive citywide flood mitigation masterplans. Our resilient urban drainage networks are designed to protect public health while aligning with long-term sustainability mandates.",
      metrics: ["Urban Flood Risk Analysis", "Stormwater Masterplanning", "Policy Implementation Advisory"],
      image: "https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&q=80&w=1200"
    },
    {
      id: "groundwater",
      title: "Geohydrology & Groundwater Management",
      subtitle: "Subsurface Engineering Services",
      icon: <Map className="w-5 h-5" />,
      description: "We utilize advanced numerical groundwater modeling to solve complex geological challenges. Our consultancy mitigates subsurface water risks, ranging from deep excavation dewatering to environmental impact feasibility studies.",
      metrics: ["Hydrogeological Surveys", "Aquifer Yield Modeling", "Environmental Impact Assessments (EIA)"],
      image: "https://images.unsplash.com/photo-1582214400344-f1797e56b826?auto=format&fit=crop&q=80&w=1200"
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

            // Explicitly assign colors based on sector theme to match TechnicalAssurance
            const theme = domain.id === 'highway' ? 'red' : domain.id === 'infrastructure' ? 'teal' : 'dark';
            const accentClass = theme === 'red' ? 'bg-brand-red' : theme === 'teal' ? 'bg-brand-teal' : 'bg-brand-dark';
            const iconBgClass = theme === 'red' ? 'bg-brand-red/5 text-brand-red' : theme === 'teal' ? 'bg-brand-teal/5 text-brand-teal' : 'bg-brand-dark/5 text-brand-dark';

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
                  <div className="relative aspect-[4/3] rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-gray-100">
                    <img
                      src={domain.image}
                      alt={domain.title}
                      className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 border border-black/5 rounded-3xl md:rounded-[2.5rem] z-10 pointer-events-none" />
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
                    <span className={`text-xs font-bold uppercase tracking-widest ${theme === 'red' ? 'text-brand-red' : theme === 'teal' ? 'text-brand-teal' : 'text-brand-dark'}`}>
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