"use client";

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Gavel, ScrollText, AlertTriangle, CheckCircle2 } from 'lucide-react';

const TermsAndConditions: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-white pt-32 pb-20 px-6 md:px-20 lg:px-32">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-teal/10 rounded-2xl">
            <Gavel className="w-8 h-8 text-brand-teal" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-brand-dark">Terms of Engineering</h1>
        </div>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-12">
          <p className="lead text-xl text-brand-dark font-medium font-sans">
            Welcome to Floodrix. These terms and conditions outline the rules and regulations for the use of Floodrix Global Resources' Website.
          </p>

          <section>
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3 mb-4">
              <ScrollText className="w-6 h-6 text-brand-teal" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing this website we assume you accept these terms and conditions. Do not continue to use Floodrix if you do not agree to take all of the terms and conditions stated on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-brand-teal" />
              2. Intellectual Property
            </h2>
            <p>
              Unless otherwise stated, Floodrix and/or its licensors own the intellectual property rights for all material on Floodrix. All intellectual property rights are reserved. You may access this from Floodrix for your own personal use subjected to restrictions set in these terms and conditions.
            </p>
            <p className="mt-4">You must not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Republish material from Floodrix</li>
              <li>Sell, rent or sub-license material from Floodrix</li>
              <li>Reproduce, duplicate or copy material from Floodrix</li>
              <li>Redistribute content from Floodrix</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-brand-teal" />
              3. Disclaimer
            </h2>
            <p>
              To the maximum extent permitted by applicable law, we exclude all representations, warranties and conditions relating to our website and the use of this website. Nothing in this disclaimer will:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>limit or exclude our or your liability for death or personal injury;</li>
              <li>limit or exclude our or your liability for fraud or fraudulent misrepresentation;</li>
              <li>limit any of our or your liabilities in any way that is not permitted under applicable law.</li>
            </ul>
          </section>

          <section className="bg-brand-dark p-8 rounded-3xl border border-white/5 mt-12 text-white/80">
            <h2 className="text-xl font-bold text-white mb-4">Governing Law</h2>
            <p className="text-sm leading-relaxed">
              These terms and conditions are governed by and construed in accordance with the laws of India and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.
            </p>
          </section>
        </div>

        <div className="mt-20 pt-10 border-t border-gray-100 text-sm text-gray-400">
          Last updated: April 28, 2024
        </div>
      </motion.div>
    </div>
  );
};

export default TermsAndConditions;
