"use client";

import React from "react";

import Link from "next/link";
import "next/navigation";

import { ArrowRight } from "lucide-react";

import { SERVICES } from "../constants";
import { ServiceCardProps } from "../types";

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
  category,
}) => {
  return (
    <div className="group py-12 border-t border-gray-100 hover:bg-gray-50/50 transition-all duration-500 px-6 -mx-6">
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-[10px] font-mono font-bold text-brand-red tracking-widest uppercase">
            {category}
          </span>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <h4 className="text-2xl font-serif text-brand-dark mb-6 group-hover:text-brand-red transition-colors">
          {title}
        </h4>

        <p className="text-gray-500 leading-relaxed font-light text-base mb-10 flex-1">
          {description}
        </p>

        <Link
          href="/capabilities"
          className="inline-flex items-center text-[10px] font-bold text-brand-dark uppercase tracking-[0.2em] group-hover:text-brand-red transition-colors"
        >
          View Domain Strategy{" "}
          <ArrowRight className="ml-3 w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};

const Services: React.FC = () => {
  return (
    <section id="services" className="py-32 lg:py-48 bg-white relative">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 mb-24 items-end">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-brand-red" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">
                Technical Specialization
              </span>
            </div>
            <h2 className="text-h1 font-serif text-brand-dark leading-tight tracking-tight">
              Engineering{" "}
              <span className="italic text-brand-red">Verticals</span> & <br />
              Expert Domain Services.
            </h2>
          </div>
          <div className="lg:col-span-5">
            <p className="text-gray-500 text-lg font-light leading-relaxed mb-4">
              We provide end-to-end technical consultancy across the water
              lifecycle, from initial catchment modeling to construction-ready
              documentation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-0">
          {SERVICES.map((service, idx) => (
            <ServiceCard key={idx} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
