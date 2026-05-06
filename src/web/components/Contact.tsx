"use client";

import React from 'react';
import { Send, PhoneCall, MailCheck, Clock } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-32 bg-white">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          {/* Left Column: Info */}
          <div className="space-y-12">
            <div className="space-y-6">
              <h3 className="text-6xl md:text-7xl font-serif text-brand-dark leading-[1.1]">
                Let's solve your <br/>water <span className="italic text-brand-red">challenges.</span>
              </h3>
              <p className="text-lg text-gray-500 leading-relaxed max-w-md font-sans">
                Unlock sustainable growth through engineering precision. Tell us about your water infrastructure project and we'll connect you with the right specialist.
              </p>
            </div>

            <div className="space-y-0 pt-8 border-t border-gray-100">
              <div className="py-8 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">Expert Hotline</span>
                <span className="text-xl md:text-2xl font-bold text-brand-dark font-sans">+91 (800) 456-7890</span>
              </div>
              
              <div className="py-8 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">Technical Support</span>
                <span className="text-xl md:text-2xl font-bold text-brand-dark font-sans">solutions@floodrix.eco</span>
              </div>

              <div className="py-8 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">Standard Hours</span>
                <span className="text-xl md:text-2xl font-bold text-brand-dark font-sans">Mon – Fri: 9AM – 6PM IST</span>
              </div>

              <div className="py-8 border-b border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em] block mb-2 font-sans">Head Office</span>
                <span className="text-xl md:text-2xl font-bold text-brand-dark font-sans">1200 Innovation Way, Tech Hub 560001, India</span>
              </div>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="bg-white">
            <form className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] font-sans">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="John Doe" 
                    className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red transition-all font-sans text-lg" 
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] font-sans">Corporate Email</label>
                  <input 
                    type="email" 
                    placeholder="john@enterprise.com" 
                    className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red transition-all font-sans text-lg" 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] font-sans">Service Required</label>
                <input 
                  type="text" 
                  placeholder="e.g. Highway Drainage Assessment" 
                  className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red transition-all font-sans text-lg" 
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] font-sans">Project Description</label>
                <textarea 
                  placeholder="Brief description of your project scope and location..." 
                  rows={4}
                  className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red resize-none transition-all font-sans text-lg" 
                />
              </div>

              <div className="pt-8">
                <button className="bg-brand-red hover:bg-brand-red/90 text-white px-10 py-5 rounded-full font-bold text-lg flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(251,54,64,0.3)] active:scale-95 transition-all">
                  Send Inquiry <span>→</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Contact;