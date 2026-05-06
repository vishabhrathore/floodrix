"use client";


import React from 'react';
import {} from 'next/navigation'
import Link from 'next/link';
import { SERVICES } from '../constants';
import { ServiceCardProps } from '../types';

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, icon, category }) => {
  return (
    <Link href="/capabilities" className="flex-shrink-0 w-[300px] md:w-[350px] snap-center group relative bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm hover:shadow-2xl hover:border-brand-red/30 transition-all duration-500 overflow-hidden h-full flex flex-col cursor-pointer">
      <div className="absolute -top-6 -right-6 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
        <span className="text-brand-red font-black text-8xl transform rotate-12 block uppercase tracking-tighter">{category}</span>
      </div>
      
      <div className="bg-brand-red/5 text-brand-red w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-red group-hover:text-white transition-all duration-300 shadow-inner">
        {icon}
      </div>
      
      <h4 className="text-2xl font-medium text-brand-dark mb-4 group-hover:text-brand-red transition-colors font-serif">
        {title}
      </h4>
      <p className="text-gray-500 leading-relaxed font-light text-base flex-1">
        {description}
      </p>
      
      <div className="mt-10 flex items-center text-brand-teal font-bold text-[11px] opacity-0 group-hover:opacity-100 transition-all duration-300 tracking-widest uppercase">
        Explore Capabilities <span className="ml-3 group-hover:ml-5 transition-all">→</span>
      </div>
    </Link>
  );
};

const Services: React.FC = () => {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <section id="services" className="py-32 bg-white relative overflow-hidden">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
          <div className="w-full">
            <h2 className="text-gray-400 text-label-caps tracking-[0.2em] text-[10px] mb-4">CORE EXPERTISE</h2>
            <h3 className="text-section-title text-brand-dark">
              Specialized engineering in <span className="italic text-brand-red">water resources.</span>
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service, idx) => (
            <ServiceCard key={idx} {...service} />
          ))}
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

export default Services;
