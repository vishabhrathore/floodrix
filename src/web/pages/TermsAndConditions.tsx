"use client";

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'motion/react';
import { useHeaderTheme } from '../hooks/useHeaderTheme';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { gsap } from 'gsap';

const navSections = [
  { id: "about", label: "01 — About these terms" },
  { id: "nature", label: "02 — Nature of content" },
  { id: "tools", label: "03 — Calculation tools" },
  { id: "advisory", label: "04 — Advisory services" },
  { id: "ip", label: "05 — Intellectual property" },
  { id: "liability", label: "06 — Liability" },
  { id: "conduct", label: "07 — User conduct" },
  { id: "third-party", label: "08 — Third-party links" },
  { id: "governing-law", label: "09 — Governing law" },
  { id: "changes", label: "10 — Changes" },
  { id: "contact", label: "11 — Contact" },
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

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-brand-red/20 bg-brand-red/[0.025] rounded p-5 my-5 flex gap-4">
      <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-widest pt-0.5 flex-shrink-0">Note</span>
      <p className="text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2.5 ml-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-gray-600 leading-relaxed">
          <span className="mt-2.5 w-1 h-1 rounded-full bg-gray-400 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const TermsAndConditions: React.FC = () => {
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

      <div className="h-[3px] w-full bg-brand-dark relative z-10" />

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
              <p className="text-[11px] font-mono text-gray-400 uppercase tracking-[0.25em] mb-4">Legal</p>
              <h1 className="font-serif font-semibold text-brand-dark leading-[1.1] tracking-tight mb-5">
                Terms and Conditions
              </h1>
              <p className="text-[15px] text-gray-500 leading-relaxed max-w-xl">
                These terms govern use of the Floodrix Engineering Portal, including its engineering library, calculation tools, and advisory services. Please read this document in full before using the platform.
              </p>
            </div>
            <div className="lg:col-span-5">
              <div className="space-y-0 border border-gray-200 rounded-lg overflow-hidden">
                {[
                  { label: "Last revised", value: "May 2026" },
                  { label: "Governing law", value: "India — Arbitration Act 1996" },
                  { label: "Contact", value: "legal@floodrix.com" },
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

          {/* Sidebar */}
          <aside className="hidden lg:block lg:col-span-3 pr-12">
            <div className="sticky top-28">
              <p className="text-[14px] font-mono text-gray-400 uppercase tracking-[0.25em] mb-5">Contents</p>
              <nav className="space-y-0">
                {navSections.map(s => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={`flex items-center py-2.5 text-[14px] font-mono transition-colors border-l-2 pl-4 ${active === s.id
                      ? 'border-brand-dark text-brand-dark font-semibold'
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
            <H2 id="about">1. About these terms</H2>
            <p>
              These terms govern your use of the Floodrix website, engineering library, and technical tools (collectively, "the Platform"). By accessing or using the Platform, you agree to these terms in full. If you are using the Platform on behalf of an organisation, you confirm you have authority to bind that organisation to these terms.
            </p>

            {/* 02 */}
            <H2 id="nature">2. Nature of content — important limitation</H2>

            <Warning>
              The articles, technical analyses, calculation tools, and reference materials on this Platform are provided for informational and educational purposes only. They are not a substitute for site-specific engineering judgement by a qualified professional.
            </Warning>

            <H3>No professional engineering relationship</H3>
            <p>
              Access to this Platform, use of its tools, or reading of its content does not constitute or create a professional engineer–client relationship, a contract for engineering services, or a duty of care in relation to any specific project or decision. A formal professional relationship is only established through a separately executed written engagement agreement with Floodrix.
            </p>

            <H3>Geographic and applicability limits</H3>
            <p>
              Several methods published on this Platform — including empirical discharge formulae such as Dicken's Formula (validated for North Indian catchments) and Ryve's Formula (validated for South Indian catchments) — have defined geographic and catchment-area applicability limits. It is the user's sole responsibility to verify that any method is appropriate for their specific project location, catchment characteristics, and regulatory jurisdiction before applying it.
            </p>
            <Warning>
              Floodrix accepts no liability for the misapplication of any method to a context outside its validated scope.
            </Warning>

            <H3>Regulatory standard currency</H3>
            <p>
              Content on this Platform references standards including IRC, CWC, BIS, IS Codes, ASCE, and FAO guidelines. Standards are updated periodically. Users are responsible for verifying they are working to the current version of any referenced standard.
            </p>

            {/* 03 */}
            <H2 id="tools">3. Calculation tools</H2>
            <p>
              Results produced by calculation tools on this Platform — including peak discharge values, design widths, and drainage dimensions — are <strong className="font-semibold text-brand-dark">indicative only</strong> and intended to support preliminary assessment.
            </p>
            <Warning>
              Outputs from this Platform must not be used as the basis for final design, construction, or regulatory submission without independent verification by a qualified engineer. Outputs are not certified engineering calculations and are not endorsed by any regulatory body including MoRTH, CGWB, CWC, or State PWDs.
            </Warning>
            <p>
              You are solely responsible for the accuracy of inputs you provide. Floodrix does not validate or retain your inputs. Erroneous inputs will produce erroneous outputs; no warranty is given that results are free from computational error.
            </p>

            {/* 04 */}
            <H2 id="advisory">4. Advisory and consultancy services</H2>
            <p>
              Where Floodrix provides formal consultancy services — including IRC/CWC compliance audits, environmental feasibility studies, regulatory submission strategy, or hydraulic structural diagnostics — the scope, deliverables, fees, and liability terms are governed exclusively by the written engagement agreement signed between the parties. These Terms do not limit or override the terms of that agreement.
            </p>
            <p className="mt-3">
              Response time indicators displayed on this Platform are operational targets, not contractual guarantees. Floodrix reserves the right to decline enquiries or adjust availability without notice.
            </p>

            {/* 05 */}
            <H2 id="ip">5. Intellectual property</H2>
            <p>
              All content on this Platform — including articles, diagrams, tool interfaces, methodology descriptions, and code — is the intellectual property of Floodrix or its licensors unless explicitly attributed to a third party. No content may be reproduced, republished, or redistributed for commercial purposes without prior written consent.
            </p>
            <H3>Permitted use</H3>
            <BulletList items={[
              "Read, print, and save articles for your own professional reference",
              "Share links to articles on this Platform",
              "Quote brief excerpts with clear attribution to Floodrix",
            ]} />
            <H3>Prohibited use</H3>
            <BulletList items={[
              "Reproduce full articles or tool outputs as your own work",
              "Incorporate Platform content into commercially distributed publications without permission",
              "Scrape or systematically extract Platform content by automated means",
            ]} />

            {/* 06 */}
            <H2 id="liability">6. Limitation of liability</H2>
            <p>To the maximum extent permitted by applicable law:</p>
            <BulletList items={[
              "Floodrix provides this Platform \"as is\" without warranty of any kind, express or implied",
              "Floodrix does not warrant that the Platform will be uninterrupted, error-free, or free from inaccuracies",
              "Floodrix shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from use of or reliance on Platform content or tools, including loss of profit, project delays, regulatory penalties, or structural failures",
              "Floodrix's total aggregate liability shall not exceed INR 10,000 or the fees paid by you in the preceding 12 months, whichever is lower",
            ]} />
            <p className="mt-4 text-[13px] text-gray-500">
              Nothing in these terms excludes liability for death or personal injury caused by Floodrix's negligence, or for fraud or fraudulent misrepresentation.
            </p>

            {/* 07 */}
            <H2 id="conduct">7. User conduct</H2>
            <p>You agree not to:</p>
            <BulletList items={[
              "Use the Platform in violation of any applicable law or regulation",
              "Attempt to gain unauthorised access to any part of the Platform or its underlying systems",
              "Upload or transmit malicious code, spam, or harmful content",
              "Use the Platform to provide false or fraudulent information to any government authority",
              "Misrepresent Floodrix's tools or outputs as certified engineering deliverables",
            ]} />

            {/* 08 */}
            <H2 id="third-party">8. Third-party links and references</H2>
            <p>
              Articles and technical content on this Platform link to external sources including government databases, academic journals, and standards repositories. These links are provided for reference only. Floodrix does not control, endorse, or accept responsibility for the content, accuracy, or availability of any third-party website.
            </p>

            {/* 09 */}
            <H2 id="governing-law">9. Governing law and dispute resolution</H2>
            <p>
              These terms are governed by the laws of India. Any dispute arising in connection with these terms shall first be subject to good-faith negotiation. If unresolved within 30 days, disputes shall be referred to arbitration under the Arbitration and Conciliation Act 1996, with the seat of arbitration in Bengaluru. The language of arbitration shall be English.
            </p>

            {/* 10 */}
            <H2 id="changes">10. Changes to these terms</H2>
            <p>
              Floodrix reserves the right to update these terms at any time. The revision date at the top of this page will reflect any changes. Continued use of the Platform after any revision constitutes acceptance of the updated terms. For material changes, we will post a notice on the homepage.
            </p>

            {/* 11 */}
            <H2 id="contact">11. Contact</H2>
            <div className="space-y-1 text-[14px]">
              <p className="font-semibold text-brand-dark">Floodrix Engineering Portal</p>
              <p>
                <a href="mailto:legal@floodrix.com" className="font-mono text-brand-dark hover:text-brand-red transition-colors underline underline-offset-2">
                  legal@floodrix.com
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

export default TermsAndConditions;