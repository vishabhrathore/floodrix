"use client";

import React from 'react';
import { Mail, Phone, MapPin, Linkedin } from 'lucide-react';
import SmoothReveal from '@/web/components/SmoothReveal';
import ContactForm from '@/web/components/ContactForm';
import { useSectionTheme } from '@/web/hooks/useSectionTheme';

export default function ContactPage() {
  const containerRef = useSectionTheme<HTMLDivElement>('contact-container', 'light');

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#ffffff] selection:bg-brand-red/10 selection:text-brand-dark pt-32 md:pt-40">

      <main className="w-full px-6 md:px-20 lg:px-32">

        {/* ── Formal Header (ARUP Style) ── */}
        <header className="mb-24">
          <div className="max-w-4xl mb-20">
            <h1 className="text-5xl md:text-7xl font-serif text-brand-dark tracking-tight mb-8">
              Contact us
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 font-sans font-light leading-relaxed">
              Our services are delivered by a global network of experts with a depth of expertise and a 
              commitment to technical excellence. Get in touch using the options below and we&apos;ll connect you to 
              the right person.
            </p>
          </div>
        </header>

        {/* ── Main Interactive Grid ── */}
        <section className="pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">

            {/* Left: Engagement & Details */}
            <div className="lg:col-span-5 space-y-16">
              <SmoothReveal direction="up" distance={20}>
                <div className="space-y-12">
                  
                  {/* Global Presence Note */}
                  <div className="space-y-4">
                    <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest font-bold">Expert Connection</p>
                    <p className="text-lg text-brand-dark font-sans font-medium leading-relaxed">
                      We operate a specialized technical dispatch system to ensure your enquiry reaches 
                      the most qualified specialist in your region.
                    </p>
                  </div>

                  {/* Contact Methods */}
                  <div className="pt-12 border-t border-gray-100 space-y-2">
                    <ContactInfoRow
                      icon={<Mail size={16} />}
                      label="Technical Enquiries"
                      value="engineering@floodrix.com"
                    />
                    <ContactInfoRow
                      icon={<Phone size={16} />}
                      label="Global Headquarters"
                      value="+91 124 000 0000"
                    />
                    <ContactInfoRow
                      icon={<MapPin size={16} />}
                      label="Corporate Address"
                      value="Corporate Greens, Sector 56, Gurugram – 122011, Haryana"
                    />
                  </div>

                  {/* LinkedIn */}
                  <div className="pt-4">
                    <a
                      href="https://linkedin.com/company/floodrix"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-3 text-[11px] font-mono text-gray-400 uppercase tracking-[0.3em] font-bold hover:text-brand-red transition-colors"
                    >
                      <Linkedin size={14} className="text-brand-red" />
                      Institutional LinkedIn
                    </a>
                  </div>
                </div>
              </SmoothReveal>
            </div>

            {/* Right: Premium Form Container */}
            <div className="lg:col-span-7">
              <SmoothReveal direction="up" distance={30} delay={0.2}>
                <div className="bg-[#fcfcfc] rounded-[2.5rem] p-10 md:p-16 border border-gray-100 shadow-2xl shadow-black/[0.02]">
                  <div className="mb-12">
                    <h2 className="text-3xl font-serif text-brand-dark tracking-tight mb-4">
                      Submit an enquiry
                    </h2>
                    <p className="text-sm text-gray-400 font-sans font-light">
                      Describe your project requirements and technical standards. 
                      A specialist lead will review and respond within 48 hours.
                    </p>
                  </div>
                  <ContactForm />
                </div>
              </SmoothReveal>
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}

function ContactInfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-4 py-5 border-b border-gray-100">
      <span className="text-gray-300 mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-semibold text-brand-dark font-sans">{value}</p>
      </div>
    </div>
  );
}