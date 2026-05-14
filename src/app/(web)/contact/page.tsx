"use client";

import React from 'react';
import { Mail, Phone, MapPin, Linkedin } from 'lucide-react';
import SmoothReveal from '@/web/components/SmoothReveal';
import ContactForm from '@/web/components/ContactForm';
import { useSectionTheme } from '@/web/hooks/useSectionTheme';

export default function ContactPage() {
  const containerRef = useSectionTheme<HTMLDivElement>('contact-container', 'light');

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#fcfcfc] selection:bg-brand-red/10 selection:text-brand-dark pt-24 md:pt-32">

      <main>

        {/* Page Header */}
        <section className="px-6 md:px-12 lg:px-24 mb-20 lg:mb-28">
          <SmoothReveal direction="up" distance={30}>
            <div className="max-w-3xl">
              <p className="text-[11px] font-mono text-brand-red uppercase tracking-widest mb-6">
                Project Enquiries
              </p>
              {/* font-serif for brand identity — consistent with the landing page */}
              <h1 className="text-display font-serif text-brand-dark leading-[1.05] tracking-tight mb-8">
                Work with our<br />
                <span className="italic text-brand-red">engineering</span> team.
              </h1>
              <p className="text-lg text-gray-500 font-sans font-light leading-[1.8] max-w-xl">
                We provide hydraulic modelling, drainage design, and regulatory submissions for infrastructure projects across India. Describe your requirements and we will direct your enquiry to the relevant technical lead.
              </p>
            </div>
          </SmoothReveal>
        </section>

        {/* Main Grid */}
        <section className="px-6 md:px-12 lg:px-24 pb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">

            {/* Left: Contact information */}
            <div className="lg:col-span-5 space-y-0">
              <SmoothReveal direction="right" distance={40} delay={0.2}>
                <div className="space-y-10">

                  {/* Engagement process */}
                  <div className="space-y-6">
                    <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest">
                      Engagement process
                    </p>
                    <div className="space-y-6">
                      {[
                        {
                          step: "01",
                          title: "Submit your brief",
                          body: "Complete the form with your project scope, location, and applicable standards. The more detail you provide, the faster we can direct your enquiry."
                        },
                        {
                          step: "02",
                          title: "Technical acknowledgement",
                          body: "We respond within 2 working days to confirm the relevant technical lead and schedule a scope discussion if required."
                        },
                        {
                          step: "03",
                          title: "Written proposal",
                          body: "We issue a written fee proposal covering scope of work, deliverables, timeline, and regulatory standards applicable to your project."
                        }
                      ].map((item) => (
                        <div key={item.step} className="flex items-start gap-5">
                          <span className="text-[11px] font-mono text-brand-red mt-0.5 flex-shrink-0">{item.step}</span>
                          <div>
                            <p className="text-base font-semibold text-brand-dark font-sans mb-1">{item.title}</p>
                            <p className="text-sm text-gray-500 font-sans font-light leading-relaxed">{item.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div className="pt-10 border-t border-gray-100 space-y-0">
                    <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest mb-6">
                      Contact details
                    </p>

                    <ContactInfoRow
                      icon={<Mail size={15} />}
                      label="Technical enquiries"
                      value="engineering@floodrix.com"
                    />
                    <ContactInfoRow
                      icon={<Phone size={15} />}
                      label="Office — Mon to Fri, 9:00–18:00 IST"
                      value="+91 124 000 0000"
                    />
                    <ContactInfoRow
                      icon={<MapPin size={15} />}
                      label="Registered office"
                      value="Corporate Greens, Sector 56, Gurugram – 122011, Haryana"
                    />
                  </div>

                  {/* Confidentiality note — plain text, no decorative card */}
                  <div className="pt-8 border-t border-gray-100">
                    <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest mb-3">
                      Confidentiality
                    </p>
                    <p className="text-sm text-gray-500 font-sans leading-relaxed">
                      All project enquiries are handled in strict confidence. Non-disclosure arrangements are standard practice for commissions involving proprietary site data or unreleased regulatory submissions.
                    </p>
                  </div>

                  {/* LinkedIn only — Twitter/Instagram are wrong for this audience */}
                  <div className="pt-8 border-t border-gray-100 flex items-center gap-3">
                    <a
                      href="https://linkedin.com/company/floodrix"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2.5 text-[11px] font-mono text-gray-400 uppercase tracking-widest hover:text-brand-dark transition-colors"
                    >
                      <Linkedin size={15} />
                      Follow on LinkedIn
                    </a>
                  </div>

                </div>
              </SmoothReveal>
            </div>

            {/* Right: Form */}
            <div className="lg:col-span-7">
              <SmoothReveal direction="left" distance={40} delay={0.4}>
                <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-10">
                  {/* Form header */}
                  <div className="mb-10 pb-8 border-b border-gray-100">
                    <h2 className="text-h4 font-serif text-brand-dark mb-2 tracking-tight">
                      Project enquiry <span className="italic text-brand-red">form</span>
                    </h2>
                    <p className="text-xs text-gray-400 font-sans font-light">
                      All fields marked with an asterisk are required. We do not use this information for marketing purposes.
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