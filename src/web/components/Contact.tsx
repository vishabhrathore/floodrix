"use client";

import React from "react";

import { Clock, MailCheck, PhoneCall, Send } from "lucide-react";

import ContactForm from "./ContactForm";
import SmoothReveal from "./SmoothReveal";

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-32 bg-white">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left Column: Info */}
          <SmoothReveal direction="right" distance={40}>
            <div className="space-y-12">
              <div className="space-y-6">
                <h3 className="text-h1 font-serif text-brand-dark leading-[1.1]">
                  Engage Our{" "}
                  <span className="italic text-brand-red">Team.</span>
                </h3>
                <p className="text-body text-gray-500 leading-relaxed max-w-md font-sans">
                  Partner with FloodRix to unlock sustainable growth through
                  engineering precision. Detail your water infrastructure
                  requirements below, and we will connect you with the
                  appropriate technical director.
                </p>
              </div>

              <div className="space-y-0 pt-8 border-t border-gray-100">
                <div className="py-8 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">
                    Global Inquiries
                  </span>
                  <span className="text-h3 font-bold text-brand-dark font-sans">
                    +91 (800) 456-7890
                  </span>
                </div>

                <div className="py-8 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">
                    Client Services
                  </span>
                  <span className="text-h3 font-bold text-brand-dark font-sans">
                    solutions@floodrix.eco
                  </span>
                </div>

                <div className="py-8 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">
                    Operating Hours
                  </span>
                  <span className="text-h3 font-bold text-brand-dark font-sans">
                    Mon – Fri: 9AM – 6PM IST
                  </span>
                </div>

                <div className="py-8 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">
                    Head Office
                  </span>
                  <span className="text-h3 font-bold text-brand-dark font-sans">
                    Corporate Greens, Sector 56, Gurgaon, India
                  </span>
                </div>
              </div>
            </div>
          </SmoothReveal>

          {/* Right Column: Form */}
          <SmoothReveal direction="left" distance={40} delay={0.3}>
            <div className="bg-transparent">
              <ContactForm />
            </div>
          </SmoothReveal>
        </div>
      </div>
    </section>
  );
};

export default Contact;
