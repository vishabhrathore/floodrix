import React from 'react';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  Waves,
  Activity,
  Map,
  ShieldCheck,
  Cpu,
  Layers,
  Binary,
  Target,
  Maximize2,
  Database,
  FileSignature
} from 'lucide-react';

const WorkStorytelling: React.FC = () => {
  const domains = [
    {
      id: "highway",
      title: "Highway Drainage",
      subtitle: "Strategic Infrastructure Advisory",
      icon: <Waves className="w-6 h-6" />,
      color: "bg-brand-red",
      description: "Hydraulic engineering consultancy for high-speed transport corridors. We provide comprehensive runoff management systems and bridge scour protection strategies for national infrastructure assets.",
      metrics: ["DPR Preparation", "Hydraulic Peer Review", "Scour Vulnerability Study"],
      image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=1200",
      stats: { accuracy: "ISO Certified", delivery: "On-Schedule", focus: "Public Safety" }
    },
    {
      id: "infrastructure",
      title: "Urban Resiliance",
      subtitle: "Municipal & Smart City Consultancy",
      icon: <Activity className="w-6 h-6" />,
      color: "bg-brand-teal",
      description: "Expert advisory for citywide stormwater frameworks. We assist municipal bodies in developing flood mitigation masterplans and resilient urban drainage networks aligned with sustainability goals.",
      metrics: ["Flood Risk Analysis", "Stormwater Masterplans", "Policy Implementation"],
      image: "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&q=80&w=1200",
      stats: { accuracy: "Policy-Aligned", delivery: "Expert Led", focus: "Urban Health" }
    },
    {
      id: "groundwater",
      title: "Subsurface Matrix",
      subtitle: "Geohydrological Expert Services",
      icon: <Map className="w-6 h-6" />,
      color: "bg-brand-dark",
      description: "Numerical groundwater modeling for complex geological challenges. Our consultancy resolves subsurface water issues, from dewatering designs to environmental impact feasibility studies.",
      metrics: ["Geological Surveys", "Aquifer Stewardship", "Impact Assessment"],
      image: "https://images.unsplash.com/photo-1542385151-efd9000785a0?auto=format&fit=crop&q=80&w=1200",
      stats: { accuracy: "Data-Driven", delivery: "Precision Focus", focus: "Environment" }
    }
  ];

  return (
    <section className="bg-white py-32 border-t border-gray-100 overflow-hidden relative">
      {/* Subtle Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.02] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="w-full px-6 md:px-20 lg:px-32 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-32 gap-12">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-[1px] bg-brand-red" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-brand-red">Engineering Intelligence</span>
            </div>
            <h2 className="text-6xl md:text-8xl font-serif text-brand-dark leading-[0.85] tracking-tighter mb-8">
              Core <br />
              <span className="italic relative">
                Consultancies.
                <svg className="absolute -bottom-2 left-0 w-full h-2 text-brand-red/20" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 25 0, 50 5 T 100 5" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
            </h2>
          </div>
          <div className="lg:max-w-md border-l border-gray-100 pl-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-4 h-4 text-brand-teal" />
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Global Advisory Protocol: Active</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed font-sans font-medium">
              Floodrix operates as a strategic partner to governmental and private entities, providing high-fidelity engineering consultancy for mission-critical hydrological challenges.
            </p>
          </div>
        </div>

        {/* Consultancy Portfolio Items */}
        <div className="space-y-48">
          {domains.map((domain, idx) => (
            <motion.div
              key={domain.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-16 lg:gap-24`}
            >
              {/* Engineering Dossier Visual */}
              <div className="relative w-full lg:w-3/5 group">
                <div className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-1000">
                  <img
                    src={domain.image}
                    alt={domain.title}
                    className="w-full h-full object-cover transition-transform duration-[3s] scale-100 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-brand-dark/10 group-hover:bg-brand-dark/5 transition-colors duration-700" />

                  {/* Subtle Professional Overlay */}
                  <div className="absolute inset-8 border border-white/10 rounded-[1.5rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-700 p-6 flex flex-col justify-end">
                    <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-white/20 max-w-xs shadow-2xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-3 h-3 text-brand-red" />
                        <span className="text-[9px] font-bold text-brand-dark uppercase tracking-widest">Consultancy Focus</span>
                      </div>
                      <p className="text-[11px] text-gray-600 font-medium">
                        Our team ensures that hydrological outcomes are integrated seamlessly into the broader infrastructure lifecycle.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vertical Credential List */}
                <motion.div
                  className={`absolute -bottom-12 ${idx % 2 === 0 ? '-right-12' : '-left-12'} hidden lg:flex flex-col gap-4 z-20`}
                >
                  <div className="bg-white p-8 rounded-[2rem] shadow-2xl border border-gray-100 min-w-[220px]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`${domain.color} p-3 rounded-2xl text-white shadow-lg`}>
                        {domain.icon}
                      </div>
                      <div>
                        <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Division</div>
                        <div className="text-xs font-bold text-brand-dark uppercase tracking-wider">Expert Advisory</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {Object.entries(domain.stats).map(([label, value], sIdx) => (
                        <div key={sIdx} className="flex justify-between items-center group/stat">
                          <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">{label}</span>
                          <span className="text-[10px] font-bold text-brand-dark uppercase group-hover/stat:text-brand-teal transition-colors">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Consultancy Content */}
              <div className="w-full lg:w-2/5 space-y-10">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-[10px] font-mono font-bold text-white bg-brand-dark px-2.5 py-1 rounded-lg shadow-lg shadow-brand-dark/10">Case {idx + 1}</span>
                    <div className="h-[1px] w-12 bg-gray-200" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">Phase: Schematic Design</span>
                  </div>
                  <h3 className="text-4xl lg:text-5xl font-serif text-brand-dark mb-6 tracking-tight leading-[1.1]">
                    {domain.title}
                  </h3>
                  <p className="text-gray-500 text-lg leading-relaxed font-sans max-w-md opacity-80">
                    {domain.description}
                  </p>
                </div>

                {/* Service Deliverables */}
                <div className="space-y-5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-400 border-b border-gray-100 pb-2 block">Key Consultancy Deliverables</span>
                  <div className="grid grid-cols-1 gap-4">
                    {domain.metrics.map((metric, mIdx) => (
                      <div key={mIdx} className="flex items-center justify-between group/del">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-teal group-hover/del:scale-150 transition-transform" />
                          <span className="text-[11px] font-bold text-brand-dark uppercase tracking-wider">{metric}</span>
                        </div>
                        <ArrowUpRight className="w-3 h-3 text-gray-200 group-hover/del:text-brand-red transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <motion.button
                    whileHover={{ x: 10 }}
                    className="flex items-center gap-5 group/btn"
                  >
                    <div className="bg-gray-50 border border-gray-100 text-brand-dark p-5 rounded-3xl group-hover/btn:bg-brand-dark group-hover/btn:text-white transition-all duration-500 shadow-sm">
                      <FileSignature className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">Request Proposal</div>
                      <div className="text-sm font-bold text-brand-dark border-b border-transparent group-hover/btn:border-brand-red transition-all">Detailed Technical Dossier</div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Professional Standards Header */}
        <div className="mt-64 text-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full border border-gray-100 bg-gray-50/50 mb-6">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.3em] font-mono">Consolidated Global Standards</span>
          </div>
          <h4 className="text-3xl font-serif text-brand-dark">Engineering Quality <span className="italic">Frameworks.</span></h4>
        </div>

        {/* Global Verification Strip */}
        <div className="relative">
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gray-100 z-0" />
          <div className="relative z-10 flex flex-wrap justify-between items-center gap-12 bg-white/60 backdrop-blur-xl py-12 px-10 border border-gray-100 rounded-[3rem] shadow-xl shadow-gray-50">
            <div className="flex items-center gap-5">
              <div className="bg-brand-dark p-3 rounded-2xl text-white">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[8px] font-bold uppercase tracking-widest text-brand-dark opacity-40">Accreditation</div>
                <div className="text-xl font-serif text-brand-dark">CWC Framework</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-10 items-center justify-center">
              {['ISO 9001:2015', 'USACE Compliant', 'Expert Witness Ready', 'FIDIC Standards'].map((cert, cIdx) => (
                <div key={cIdx} className="flex items-center gap-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-brand-teal" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-sans">{cert}</span>
                </div>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-brand-dark text-white px-10 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-2xl shadow-brand-dark/20 hover:bg-brand-red transition-all flex items-center gap-3"
            >
              Consult an Expert
            </motion.button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkStorytelling;
