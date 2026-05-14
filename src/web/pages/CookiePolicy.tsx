"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useHeaderTheme } from '../hooks/useHeaderTheme';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { gsap } from 'gsap';

const CookiePolicy: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  useHeaderTheme('light', containerRef);

  useEffect(() => {
    window.scrollTo(0, 0);

    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0 });
      gsap.to(cursorFollowerRef.current, { x: e.clientX, y: e.clientY, duration: 0.15 });
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#fcfcfc] cursor-none selection:bg-brand-red selection:text-white">
      {/* Cinematic Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] bg-repeat"
        style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />

      {/* Futuristic Cursor System */}
      <div ref={cursorRef} className="fixed w-2 h-2 bg-brand-red rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 mix-blend-difference hidden md:block" />
      <div ref={cursorFollowerRef} className="fixed w-10 h-10 border border-brand-teal/50 rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hidden md:block scale-animation" />

      <div className="h-px w-full bg-gray-200 relative z-10" />

      <div className="w-full px-6 md:px-12 lg:px-24 xl:px-32 relative z-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="pt-24 pb-12 border-b border-gray-200"
        >

          <h1 className="font-serif font-semibold text-brand-dark leading-[1.1] tracking-tight mb-5">
            Our use of cookies
          </h1>
          <p className="text-[11px] font-mono text-gray-400 uppercase tracking-widest">
            Last updated: May 2026
          </p>
        </motion.header>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 py-16">

          {/* Prose */}
          <main className="lg:col-span-8 lg:pr-16 space-y-5 text-gray-600 leading-[1.9]">

            <p>
              We use cookies on our website to help us improve your experience and to ensure that it performs as you expect it to.
            </p>
            <p>
              Cookies are files containing small amounts of information which are downloaded to your computer or mobile device when you visit a website. They can be used to improve your experience — for example, by remembering your preferences — and to provide information to the owners of the site.
            </p>
            <p>
              Cookies can be first party (set by us) or third party (set by another company when you visit our website, such as Google Analytics). Some cookies are deleted when you close your browser; these are session cookies. Persistent cookies remain on your device until they expire or you delete them.
            </p>
            <p>
              Websites must get consent to send cookies to your device unless they are strictly necessary. When you first visit our site, you will be presented with a consent banner allowing you to accept or decline analytics cookies. You can change your preferences at any time — see "Managing your cookie settings" below.
            </p>

            <div className="pt-4">
              <h2 className="font-serif font-semibold text-brand-dark mb-5 tracking-tight">
                Information about our use of cookies
              </h2>
              <p className="mb-5">We use the following categories of cookies:</p>
              <div className="space-y-5">
                <p>
                  <strong className="font-semibold text-brand-dark">Strictly necessary cookies</strong> — these are required for the operation of our site. They include the entry that stores your cookie consent choice so the banner does not reappear on every visit. These are always enabled because the site cannot function without them.
                </p>
                <p>
                  <strong className="font-semibold text-brand-dark">Analytical and performance cookies</strong> — these allow us to recognise and count visitors and to understand how visitors move around our site. This helps us improve the way our site works. These cookies do not collect information that directly identifies a visitor and are only activated if you explicitly accept analytics cookies via the consent banner.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <h2 className="text-2xl md:text-[1.75rem] font-serif font-semibold text-brand-dark mb-5 tracking-tight">
                Google Analytics
              </h2>
              <p className="mb-4">
                Google Analytics is a widely used analytics platform. We use it to measure traffic volumes and identify areas for improvement. These cookies collect information in aggregate to give us insight into how our site is being used.
              </p>
              <p className="mb-4">
                Google Analytics anonymises internet protocol addresses. The anonymised data is transmitted to and stored by Google on servers in the United States. Google will not associate your IP address with any other data held by Google. We do not enable Google Signals or advertising features.
              </p>
              <p>
                As Google Analytics cookies are persistent, you will need to manually remove them from your browser if you wish to do so — either by deleting cookies through your browser settings or by using the{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark underline underline-offset-2 hover:text-brand-red transition-colors"
                >
                  Google Analytics opt-out browser add-on
                </a>.
              </p>
            </div>

            <div className="pt-4">
              <h2 className="text-2xl md:text-[1.75rem] font-serif font-semibold text-brand-dark mb-5 tracking-tight">
                Managing your cookie settings
              </h2>
              <p className="mb-4">
                You can update your cookie preferences at any time by clicking "Update preferences" on this page. This will reopen the consent banner and allow you to change your choices.
              </p>
              <p className="mb-4">
                Most web browsers also allow some control of cookies through browser settings. To find out more, including how to see what cookies have been set, visit{' '}
                <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-brand-dark underline underline-offset-2 hover:text-brand-red transition-colors">
                  www.aboutcookies.org
                </a>{' '}
                or{' '}
                <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer" className="text-brand-dark underline underline-offset-2 hover:text-brand-red transition-colors">
                  www.allaboutcookies.org
                </a>.
              </p>
              <p>
                Please note that we have no control over cookies set by third parties, including providers of external services such as web traffic analysis tools.
              </p>
            </div>

            <div className="pt-4">
              <h2 className="text-2xl md:text-[1.75rem] font-serif font-semibold text-brand-dark mb-5 tracking-tight">
                Contact us
              </h2>
              <p className="mb-5">If you have any queries about our use of cookies, please contact us at:</p>
              <div className="space-y-1 text-[14px]">
                <p>
                  <a href="mailto:privacy@floodrix.com" className="text-brand-dark underline underline-offset-2 hover:text-brand-red transition-colors">
                    privacy@floodrix.com
                  </a>
                </p>
                <p className="text-gray-500">Data Privacy Manager</p>
                <p className="text-gray-500">Floodrix Engineering Portal</p>
                <p className="text-gray-500">[Registered address]</p>
              </div>
            </div>

          </main>

          {/* Sticky panel */}
          <aside className="hidden lg:block lg:col-span-4 pl-10">
            <div className="sticky top-28 space-y-4">
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                <h3 className="text-[13px] font-sans font-semibold text-brand-dark mb-2">
                  Manage cookies
                </h3>
                <p className="text-[13px] text-gray-500 leading-relaxed mb-5">
                  You can update your cookie preferences at any time via our cookie management tool.
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem('cookie_consent');
                    window.location.reload();
                  }}
                  className="w-full px-5 py-3 bg-brand-dark text-white text-[12px] font-semibold rounded hover:bg-brand-red transition-colors"
                >
                  Update preferences
                </button>
              </div>
              <div className="border border-gray-100 rounded-lg p-5">
                <p className="text-[14px] font-mono text-gray-400 uppercase tracking-widest mb-3">Related</p>
                <div className="space-y-2.5">
                  <Link href="/privacy" className="block text-[14px] text-gray-600 hover:text-brand-dark transition-colors hover:underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  <Link href="/terms" className="block text-[14px] text-gray-600 hover:text-brand-dark transition-colors hover:underline underline-offset-2">
                    Terms and Conditions
                  </Link>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
      <style jsx global>{`
        @keyframes scale-animation {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.1); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .scale-animation {
          animation: scale-animation 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default CookiePolicy;