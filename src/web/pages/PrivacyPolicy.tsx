"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useHeaderTheme } from '../hooks/useHeaderTheme';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { gsap } from 'gsap';

const navSections = [
  { id: "who-we-are", label: "01 — Who we are" },
  { id: "data-collection", label: "02 — Data we collect" },
  { id: "legal-basis", label: "03 — Legal basis" },
  { id: "google", label: "04 — Google Analytics" },
  { id: "retention", label: "05 — Retention" },
  { id: "sharing", label: "06 — Data sharing" },
  { id: "rights", label: "07 — Your rights" },
  { id: "security", label: "08 — Security" },
  { id: "changes", label: "09 — Changes" },
  { id: "contact", label: "10 — Contact" },
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id); },
        { rootMargin: '-20% 0px -70% 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, [ids]);
  return active;
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="font-serif font-semibold text-brand-dark tracking-tight scroll-mt-32 mb-5 pt-10 border-t border-gray-100 first:border-none first:pt-0"
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-mono font-semibold text-brand-dark uppercase tracking-widest mt-7 mb-3">
      {children}
    </h3>
  );
}

function DataTable({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-5">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-900">
            {cols.map((c, i) => (
              <th key={i} className="text-left py-4 pr-8 font-mono font-semibold uppercase tracking-widest text-brand-dark">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
              {row.map((cell, j) => (
                <td key={j} className="py-4 pr-8 text-gray-600 leading-relaxed align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-brand-red/40 pl-5 py-0.5 my-5">
      <p className="text-gray-500 leading-relaxed">{children}</p>
    </div>
  );
}

const PrivacyPolicy: React.FC = () => {
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

  const active = useActiveSection(navSections.map(s => s.id));

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#fcfcfc] cursor-none selection:bg-brand-red selection:text-white">
      {/* Cinematic Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] bg-repeat"
        style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />

      {/* Futuristic Cursor System */}
      <div ref={cursorRef} className="fixed w-2 h-2 bg-brand-red rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 mix-blend-difference hidden md:block" />
      <div ref={cursorFollowerRef} className="fixed w-10 h-10 border border-brand-teal/50 rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hidden md:block scale-animation" />

      <div className="h-[3px] w-full bg-brand-red relative z-10" />

      <div className="w-full px-6 md:px-12 lg:px-24 xl:px-32 relative z-10">

        {/* Header */}
        <motion.header
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="pt-24 pb-14 border-b border-gray-200"
        >

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <p className="text-[11px] font-mono text-brand-red uppercase tracking-[0.25em] mb-4">Legal</p>
              <h1 className="font-serif font-semibold text-brand-dark leading-[1.1] tracking-tight mb-5">
                Privacy Policy
              </h1>
              <p className="text-[15px] text-gray-500 leading-relaxed max-w-xl">
                This document describes how Floodrix collects, processes, and protects personal data in connection with the use of the Engineering Portal.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                {[
                  { label: "Last revised", value: "May 2026" },
                  { label: "Governing law", value: "India — DPDP Act 2023" },
                  { label: "Contact", value: "privacy@floodrix.com" },
                ].map((m, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4 px-5 py-3 border-b border-gray-100 last:border-none odd:bg-gray-50/50">
                    <span className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">{m.label}</span>
                    <span className="text-[12px] font-mono font-semibold text-brand-dark">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.header>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 py-16">

          {/* Sidebar nav */}
          <aside className="hidden lg:block lg:col-span-3 pr-12">
            <div className="sticky top-28">
              <p className="text-[14px] font-mono text-gray-400 uppercase tracking-[0.25em] mb-5">Contents</p>
              <nav className="space-y-0">
                {navSections.map(s => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`flex items-center py-2.5 text-[14px] font-mono transition-colors border-l-2 pl-4 ${active === s.id
                      ? 'border-brand-red text-brand-dark font-semibold'
                      : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-200'
                      }`}
                  >
                    {s.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main */}
          <main className="lg:col-span-9 lg:border-l lg:border-gray-100 lg:pl-14 text-gray-600 leading-[1.9] space-y-1">

            {/* 01 */}
            <H2 id="who-we-are">1. Who we are</H2>
            <p>
              Floodrix is an engineering consultancy providing hydraulic modelling, hydrological assessment, and drainage design services. This website is intended for civil engineers, infrastructure developers, and government bodies seeking technical resources and advisory services.
            </p>
            <p className="mt-3">
              For privacy-related enquiries, contact:{' '}
              <a href="mailto:privacy@floodrix.com" className="font-mono text-brand-red hover:underline">
                privacy@floodrix.com
              </a>
            </p>

            {/* 02 */}
            <H2 id="data-collection">2. What data we collect</H2>

            <H3>2a — Analytics data (consent-gated)</H3>
            <p>
              If you accept analytics cookies, we collect the following via Google Analytics 4 through Google Tag Manager. No data of this type is collected if you decline or have not yet made a choice:
            </p>
            <ul className="mt-3 space-y-2 ml-1">
              {[
                "Pages visited and time spent on each page",
                "How you arrived at the site — search engine, direct, or referral",
                "Browser type, operating system, and screen resolution",
                "Approximate geographic location (country and city) derived from IP address — the full IP address is not stored",
                "Interaction events such as button clicks, file downloads, and form completions",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2.5 w-1 h-1 rounded-full bg-brand-red flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Note>This data is aggregated and anonymised. We do not build individual user profiles.</Note>

            <H3>2b — Contact and enquiry data</H3>
            <p>
              When you submit a project enquiry, we collect your name, email address, organisation name (if provided), and message content. This is used solely to respond to your enquiry and is not used for marketing without separate consent.
            </p>

            <H3>2c — Cookie preference</H3>
            <p>
              We store your consent choice in your browser's local storage. This is a functional necessity to remember your preference across visits. It does not constitute tracking.
            </p>

            <H3>2d — Data we do not collect</H3>
            <p>
              We do not collect payment card information, sensitive personal data (health, religion, ethnicity), data from children under 18, or precise geolocation coordinates.
            </p>

            {/* 03 */}
            <H2 id="legal-basis">3. Legal basis for processing</H2>
            <DataTable
              cols={["Data type", "Legal basis"]}
              rows={[
                ["Analytics (GA4)", "Your consent — Consent Mode v2"],
                ["Contact enquiries", "Legitimate interest / contractual necessity"],
                ["Cookie preference storage", "Legitimate interest (functional necessity)"],
              ]}
            />
            <p className="mt-2 text-[13px] text-gray-500">
              Under India's Digital Personal Data Protection Act 2023 (DPDP Act), we process personal data only for the purposes stated above and do not repurpose it without notifying you.
            </p>

            {/* 04 */}
            <H2 id="google">4. Google Analytics and Tag Manager</H2>
            <p>
              We use Google Tag Manager to manage analytics tags. GTM itself does not collect personal data. Google Analytics 4 is loaded <strong className="font-semibold text-brand-dark">only after you explicitly accept analytics cookies</strong>. If you reject or have not yet made a choice, no GA4 data collection occurs.
            </p>
            <p className="mt-3">
              Google processes analytics data on servers that may be located outside India, including in the United States. Google anonymises IP addresses before storage and will not associate your IP with any other data held by Google. We do not enable Google Signals or advertising features. For details, refer to{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-brand-dark font-mono hover:text-brand-red transition-colors underline underline-offset-2"
              >
                Google's Privacy Policy <ExternalLink className="w-3 h-3" />
              </a>.
            </p>

            {/* 05 */}
            <H2 id="retention">5. Data retention</H2>
            <DataTable
              cols={["Data type", "Retention period", "Notes"]}
              rows={[
                ["GA4 analytics data", "14 months", "GA4 default; configurable in property settings"],
                ["Contact enquiry emails", "3 years", "From last correspondence"],
                ["Cookie preference", "Until browser storage cleared", "Local storage entry"],
              ]}
            />

            {/* 06 */}
            <H2 id="sharing">6. Data sharing</H2>
            <p>
              We do not sell, rent, or trade your personal data. We share data only with the following processors under contractual data processing agreements:
            </p>
            <DataTable
              cols={["Third party", "Purpose"]}
              rows={[
                ["Google LLC", "Analytics processing via GA4 / GTM"],
                ["Email / CRM provider", "Routing and storing contact enquiries"],
              ]}
            />
            <p className="mt-2 text-[13px] text-gray-500">
              We may disclose data where required by law, regulatory authority, or court order, including under the DPDP Act 2023.
            </p>

            {/* 07 */}
            <H2 id="rights">7. Your rights</H2>
            <p>Under the DPDP Act 2023 and applicable law, you have the right to access, correct, or erase your personal data, and to withdraw consent at any time.</p>
            <DataTable
              cols={["Right", "How to exercise"]}
              rows={[
                ["Access data we hold about you", "Email privacy@floodrix.com"],
                ["Correct inaccurate data", "Email privacy@floodrix.com"],
                ["Erase your data", "Email privacy@floodrix.com (subject to legal retention obligations)"],
                ["Withdraw analytics consent", "Clear browser local storage — banner reappears on next visit"],
                ["Nominate a representative", "Email privacy@floodrix.com with written authorisation"],
              ]}
            />
            <p className="text-[13px] text-gray-500">We will respond to all rights requests within 30 days.</p>

            {/* 08 */}
            <H2 id="security">8. Security</H2>
            <p>
              We implement industry-standard security measures including HTTPS encryption, access controls on contact form data, and periodic security reviews. No transmission over the internet is completely secure; we take all reasonable precautions but cannot guarantee absolute security.
            </p>

            {/* 09 */}
            <H2 id="changes">9. Changes to this policy</H2>
            <p>
              We will update this policy when our data practices change. The revision date at the top of this page will reflect any update. For material changes, we will post a notice on the homepage for 30 days.
            </p>

            {/* 10 */}
            <H2 id="contact">10. Contact</H2>
            <div className="space-y-1 text-[14px]">
              <p className="font-semibold text-brand-dark">Floodrix Engineering Portal</p>
              <p>
                <a href="mailto:privacy@floodrix.com" className="font-mono text-brand-red hover:underline">
                  privacy@floodrix.com
                </a>
              </p>
              <p className="text-gray-500">[Registered address]</p>
            </div>



          </main>
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

export default PrivacyPolicy;