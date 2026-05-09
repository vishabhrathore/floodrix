import React from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  FileSignature,
  Database,
  Waves,
  ArrowUpRight
} from 'lucide-react';

import SmoothReveal from './SmoothReveal';

const TechnicalAssurance: React.FC = () => {
  return (
    <section className="bg-white py-32 border-t border-gray-100 overflow-hidden relative">
      <SmoothReveal direction="up" distance={40}>
        <div className="w-full px-6 md:px-20 lg:px-32 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-end">
            <div className="lg:col-span-7">
              <h2 className="text-h1 font-serif text-brand-dark leading-tight mb-8">
                Technical Assurance & <br />
                <span className="italic">Global Compliance.</span>
              </h2>
              <p className="text-gray-600 text-body leading-relaxed font-light border-l-2 border-brand-red pl-6 max-w-2xl">
                Delivering complex water infrastructure requires uncompromising adherence to international standards. FloodRix operates under stringent quality management protocols and federal regulatory frameworks to guarantee engineering integrity and mitigate project risk.
              </p>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-12 lg:gap-8 pb-4">
              <div className="space-y-8">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-6 border-b border-gray-100 pb-2">Quality Management</h5>
                  <div className="flex items-center gap-4 group cursor-default">
                    <div className="bg-brand-teal/5 p-3 rounded-xl text-brand-teal group-hover:bg-brand-teal group-hover:text-white transition-all duration-500">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-dark uppercase tracking-wider">ISO 9001:2015</div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Certified Systems</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-6 border-b border-gray-100 pb-2">Project Delivery</h5>
                  <div className="flex items-center gap-4 group cursor-default">
                    <div className="bg-brand-red/5 p-3 rounded-xl text-brand-red group-hover:bg-brand-red group-hover:text-white transition-all duration-500">
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-brand-dark uppercase tracking-wider">FIDIC Standard</div>
                      <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Implementation Protocol</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.3em] text-gray-400 mb-6 border-b border-gray-100 pb-2">Regulatory Compliance</h5>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 group cursor-default">
                      <div className="bg-brand-dark/5 p-3 rounded-xl text-brand-dark group-hover:bg-brand-dark group-hover:text-white transition-all duration-500">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-brand-dark uppercase tracking-wider">USACE Standards</div>
                        <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">U.S. Army Corps Eng.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 group cursor-default">
                      <div className="bg-brand-dark/5 p-3 rounded-xl text-brand-dark group-hover:bg-brand-dark group-hover:text-white transition-all duration-500">
                        <Waves className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-brand-dark uppercase tracking-wider">CWC Framework</div>
                        <div className="text-[9px] font-mono text-gray-400 uppercase tracking-widest">Central Water Commission</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-32 pt-16 border-t border-gray-50 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex -space-x-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-gray-100 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Expert" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <div>
                <div className="text-xs font-bold text-brand-dark uppercase tracking-wider">Strategic Advisory</div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest">Connect with our Lead Hydrologists</div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-brand-dark text-white px-10 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-2xl shadow-brand-dark/20 hover:bg-brand-teal transition-all flex items-center gap-3"
            >
              Initialize Consultation
              <ArrowUpRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </SmoothReveal>
    </section>
  );
};

export default TechnicalAssurance;
