"use client";

import React, { cloneElement } from 'react';
import { motion } from 'motion/react';
import { Linkedin, Mail, ArrowRight, GraduationCap, Globe, Award, Droplets, Shield, Briefcase } from 'lucide-react';
import { TEAM } from '../constants';
import CommonHero from '../components/CommonHero';
import Link from 'next/link';

const MeetOurTeam: React.FC = () => {
  const heroData = {
    category: "Our People",
    headline: (
      <>
        The engineers <span className="italic text-brand-red">behind the work.</span>
      </>
    ),
    description:
      "FloodRix is built on domain-specific engineering expertise. Our team combines advanced academic training with hands-on delivery experience across highway drainage, groundwater, irrigation, and hydraulic structures — the four disciplines that define our practice.",
    backgroundText: "TEAM",
    stats: [
      { value: "15+", label: "Engineers", detail: "Water resources specialists" },
      { value: "10+", label: "Years", detail: "Average domain experience" },
      { value: "60+", label: "Projects", detail: "Delivered across India" },
      { value: "100%", label: "IRC / CWC", detail: "Code-compliant deliverables" },
    ]
  };

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32 selection:bg-brand-red/10 selection:text-brand-dark">
      <CommonHero {...heroData} />

      {/* Team Grid — unchanged */}
      <section id="team" className="px-6 md:px-20 lg:px-32 py-32 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
          {TEAM.map((member, idx) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.8 }}
              className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:border-brand-red/20 transition-all duration-700 flex flex-col h-full"
            >
              <div className="p-10 lg:p-12 flex-1 flex flex-col">
                <div className="flex flex-col lg:flex-row gap-12 flex-1">
                  {/* Image Column */}
                  <div className="w-full lg:w-[240px] shrink-0">
                    <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-gray-100 relative shadow-lg">
                      <img
                        src={member.image}
                        alt={member.name}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-8 flex gap-5">
                      <Link
                        href={`mailto:contact@floodrix.com?subject=Inquiry: ${member.name}`}
                        className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-red hover:border-brand-red hover:bg-brand-red/5 transition-all duration-300"
                      >
                        <Mail size={16} />
                      </Link>
                      <Link
                        href="https://linkedin.com"
                        target="_blank"
                        className="w-10 h-10 rounded-full border border-gray-100 flex items-center justify-center text-gray-400 hover:text-brand-red hover:border-brand-red hover:bg-brand-red/5 transition-all duration-300"
                      >
                        <Linkedin size={16} />
                      </Link>
                    </div>
                  </div>

                  {/* Content Column */}
                  <div className="flex-1 flex flex-col">
                    <div className="mb-6">
                      <span className="text-brand-red text-[10px] font-mono font-bold uppercase tracking-[0.3em] block mb-2">
                        {member.role}
                      </span>
                      <h3 className="text-3xl lg:text-4xl font-serif text-brand-dark tracking-tight mb-2">
                        {member.name}
                      </h3>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                        {member.yearsOfExp} Technical Experience
                      </p>
                    </div>
                    <p className="text-gray-600 text-sm lg:text-base leading-relaxed mb-8 font-light flex-1">
                      {member.bio}
                    </p>
                    <div className="grid grid-cols-1 gap-6 mb-8 border-t border-gray-100 pt-8">
                      <div className="flex items-start gap-4">
                        <GraduationCap className="w-5 h-5 text-gray-300 shrink-0 mt-1" />
                        <div>
                          <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Education</p>
                          <p className="text-sm font-medium text-brand-dark">{member.edu}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <Globe className="w-5 h-5 text-gray-300 shrink-0 mt-1" />
                        <div>
                          <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1">Expertise Region</p>
                          <p className="text-sm font-medium text-brand-dark">{member.region}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50/80 rounded-xl p-5 border border-gray-100 mb-8">
                      <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-1.5">Primary Reference Project</p>
                      <p className="text-sm font-bold text-brand-dark leading-snug">{member.notableProject}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.expertise.map(exp => (
                        <span
                          key={exp}
                          className="px-3 py-1 border border-gray-200 text-gray-500 rounded-full text-[9px] font-mono font-medium uppercase tracking-widest hover:border-brand-dark hover:text-brand-dark transition-colors cursor-default"
                        >
                          {exp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Advisory / CTA Section ── */}
      <section className="px-6 md:px-20 lg:px-32 py-40 border-t border-gray-100 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-24 items-start">

            {/* ── Left: Narrative ── */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-10 h-[1px] bg-brand-red" />
                <span className="text-[10px] font-mono font-black tracking-[0.2em] text-brand-red uppercase">
                  Technical Advisory
                </span>
              </div>

              <h2 className="text-5xl lg:text-6xl font-serif text-brand-dark tracking-tighter leading-[1.05] mb-10">
                Commission a <br />
                <span className="italic text-brand-red">Technical Review.</span>
              </h2>

              <p className="text-gray-500 text-lg font-light leading-relaxed mb-12 max-w-md">
                Engage our senior engineers for high-level project diagnostics. We provide the technical certainty required for complex infrastructure through rigorous analysis and peer review.
              </p>

              <div className="space-y-6 mb-16">
                {[
                  "IRC/CWC Code Compliance Audits",
                  "Environmental Feasibility Studies",
                  "Regulatory Submission Strategy",
                  "Hydraulic Structural Diagnostics",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 border-b border-gray-50 pb-4 last:border-0">
                    <span className="text-brand-red font-serif italic text-lg leading-none">0{idx + 1}</span>
                    <span className="text-[11px] font-mono font-bold text-brand-dark/80 uppercase tracking-widest">
                      {item}
                    </span>
                  </div>
                ))}
              </div>

              <button className="group flex items-center gap-6 px-12 py-6 bg-brand-dark text-white rounded-2xl text-[10px] font-bold uppercase tracking-[0.3em] hover:bg-brand-red transition-all duration-500 shadow-2xl">
                Submit Project Enquiry
                <ArrowRight size={14} className="group-hover:translate-x-2 transition-transform duration-500" />
              </button>
            </div>

            {/* ── Right: Spec cards ── */}
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 gap-4">
                {[
                  {
                    icon: <Award />,
                    label: "Design Philosophy",
                    value: "First-Principles Logic",
                    sub: "Climate-adjusted, site-specific hydraulic modelling applied within IRC and CWC regulatory frameworks.",
                  },
                  {
                    icon: <Briefcase />,
                    label: "Engineering Depth",
                    value: "Basin to Structure",
                    sub: "Holistic delivery spanning catchment-level hydrology to component-level structural design.",
                  },
                  {
                    icon: <Droplets />,
                    label: "Analytical Stack",
                    value: "Advanced Modelling Suite",
                    sub: "Validated technical outputs using HEC-RAS, SWMM, MODFLOW, and FEFLOW standards.",
                  },
                  {
                    icon: <Shield />,
                    label: "Institutional Trust",
                    value: "Government Submissions",
                    sub: "Established record with MoRTH, NMCG, CGWB and major State PWD departments.",
                  },
                ].map((box, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-8 p-10 bg-white border border-gray-100 rounded-[2.5rem] hover:border-brand-red/20 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.05)] transition-all duration-700 group"
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center text-brand-red bg-brand-red/5 rounded-2xl group-hover:bg-brand-red group-hover:text-white transition-all duration-500">
                      {cloneElement(box.icon as React.ReactElement<any>, { size: 20 })}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] font-mono font-black text-gray-400 uppercase tracking-widest">
                          {box.label}
                        </span>
                      </div>
                      <h4 className="text-2xl font-serif text-brand-dark mb-3 tracking-tight">
                        {box.value}
                      </h4>
                      <p className="text-gray-500 text-sm leading-relaxed font-light">
                        {box.sub}
                      </p>
                    </div>
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

export default MeetOurTeam;