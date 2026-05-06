"use client";

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
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
          <div className="p-3 bg-brand-red/10 rounded-2xl">
            <Shield className="w-8 h-8 text-brand-red" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-brand-dark">Privacy Policy</h1>
        </div>

        <div className="prose prose-lg max-w-none text-gray-600 space-y-12">
          <section>
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3 mb-4">
              <Eye className="w-6 h-6 text-brand-dark" />
              1. Information We Collect
            </h2>
            <p>
              Floodrix collects information to provide better services to all our users. We collect information in the following ways:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li><strong>Information you give us:</strong> For example, our services require you to sign up for an account. When you do, we’ll ask for personal information, like your name, email address, or telephone number.</li>
              <li><strong>Information we get from your use of our services:</strong> We collect information about the services that you use and how you use them, like when you visit a website that uses our advertising services or you view and interact with our ads and content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-brand-dark" />
              2. How We Use Information
            </h2>
            <p>
              We use the information we collect from all of our services to provide, maintain, protect and improve them, to develop new ones, and to protect Floodrix and our users.
            </p>
            <p className="mt-4">
              We also use this information to offer you tailored content – like giving you more relevant search results and ads.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-3 mb-4">
              <FileText className="w-6 h-6 text-brand-dark" />
              3. Information Security
            </h2>
            <p>
              We work hard to protect Floodrix and our users from unauthorized access to or unauthorized alteration, disclosure or destruction of information we hold. In particular:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>We encrypt many of our services using SSL.</li>
              <li>We review our information collection, storage and processing practices, including physical security measures, to guard against unauthorized access to systems.</li>
              <li>We restrict access to personal information to Floodrix employees, contractors and agents who need to know that information in order to process it for us.</li>
            </ul>
          </section>

          <section className="bg-gray-50 p-8 rounded-3xl border border-gray-100 mt-12">
            <h2 className="text-xl font-bold text-brand-dark mb-4">Contact Us</h2>
            <p className="text-sm">
              If you have any questions about this Privacy Policy, please contact us at: <br />
              <span className="text-brand-red font-medium">privacy@floodrix.eco</span>
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

export default PrivacyPolicy;
