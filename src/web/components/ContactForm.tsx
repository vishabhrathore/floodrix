"use client";

import React from 'react';
import { Send } from 'lucide-react';

const ContactForm: React.FC = () => {
  return (
    <form className="space-y-12 bg-transparent">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] font-mono">Full Name</label>
          <input 
            type="text" 
            placeholder="John Doe" 
            className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red transition-all font-sans text-body placeholder:text-gray-400" 
          />
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] font-mono">Corporate Email</label>
          <input 
            type="email" 
            placeholder="john@enterprise.com" 
            className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red transition-all font-sans text-body placeholder:text-gray-400" 
          />
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] font-mono">Service Required</label>
        <input 
          type="text" 
          placeholder="e.g. Highway Drainage Assessment" 
          className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red transition-all font-sans text-body placeholder:text-gray-400" 
        />
      </div>

      <div className="space-y-4">
        <label className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] font-mono">Project Description</label>
        <textarea 
          placeholder="Brief description of your project scope and location..." 
          rows={4}
          className="w-full bg-transparent border-b border-gray-200 py-3 focus:outline-none focus:border-brand-red resize-none transition-all font-sans text-lg placeholder:text-gray-400" 
        />
      </div>

      <div className="pt-8">
        <button className="bg-brand-red hover:bg-brand-red/90 text-white px-10 py-5 rounded-full font-bold text-body flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(251,54,64,0.3)] active:scale-95 transition-all">
          Send Inquiry <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </button>
      </div>
    </form>
  );
};

export default ContactForm;
