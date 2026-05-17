"use client";

import React, { useEffect, useRef, useState } from "react";

import { ArrowRight } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";

import { DomainSection } from "../types";

/*
  MOBILE PERFORMANCE FIXES APPLIED:
  1. Infinite image scale → pure CSS @keyframes (off JS thread entirely)
  2. Pulsing ring → pure CSS animation (same)
  3. Parallax useScroll → only mounted on desktop AND only after section enters viewport
  4. Parallax disabled entirely on mobile (motion values return 0)
  5. Per-character stagger kept but duration tightened to reduce total animation window
*/

/* ─── CSS injected once at module level ─────────────────────────────────────── */
const STYLE_ID = "domain-section-css";

function injectStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = `
    @keyframes slowZoom {
      from { transform: scale(1) translateZ(0); }
      to   { transform: scale(1.4) translateZ(0); }
    }
    @keyframes pulseRing {
      0%, 100% { transform: scale(1);   opacity: 0.3; }
      50%       { transform: scale(1.4); opacity: 0;   }
    }
    @keyframes travelDot {
      from { transform: translateY(-100%); }
      to   { transform: translateY(200%);  }
    }
    .slow-zoom {
      animation: slowZoom 40s linear infinite alternate;
      will-change: transform;
    }
    .pulse-ring {
      animation: pulseRing 2s ease-in-out infinite;
    }
    .travel-dot {
      animation: travelDot 1.5s linear infinite;
    }
  `;
  document.head.appendChild(el);
}

/* ─── Scroll-parallax wrapper — only active on desktop after in-view ─────────── */
interface ParallaxBoxProps {
  enabled: boolean;
  range: [number, number];
  containerRef: React.RefObject<Element | null>;
  className?: string;
  children: React.ReactNode;
}

function ParallaxBox({
  enabled,
  range,
  containerRef,
  className,
  children,
}: ParallaxBoxProps) {
  const { scrollYProgress } = useScroll({
    target: containerRef as React.RefObject<Element>,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], enabled ? range : [0, 0]);

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
interface DomainSectionItemProps {
  domain: DomainSection;
}

const DomainSectionItem: React.FC<DomainSectionItemProps> = ({ domain }) => {
  const containerRef = useRef<HTMLElement>(null);

  /* Desktop detection */
  const [isDesktop, setIsDesktop] = useState(true);
  useEffect(() => {
    injectStyles();
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* Parallax only activates after section is in viewport (IntersectionObserver)
     This prevents useScroll from burning CPU on off-screen sections */
  const [parallaxReady, setParallaxReady] = useState(false);
  useEffect(() => {
    if (!isDesktop) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setParallaxReady(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [isDesktop]);

  const parallaxEnabled = isDesktop && parallaxReady;

  /* ── Animation variants ──────────────────────────────────────────────────── */
  const titleContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.025, delayChildren: 0.15 }, // tightened from 0.03
    },
  };

  const charAnim = {
    hidden: { opacity: 0, y: 12, rotateX: 90 },
    show: {
      opacity: 1,
      y: 0,
      rotateX: 0,
      transition: { type: "tween", ease: "easeOut", duration: 0.35 }, // tightened from 0.4
    },
  };

  const introContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.008, delayChildren: 0.3 }, // tightened from 0.01
    },
  };

  const wordAnim = {
    hidden: { opacity: 0, y: 4 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  };

  /* ── Shared image markup (CSS animated — no JS per-frame cost) ───────────── */
  const ProblemImage = ({ rounded = true }: { rounded?: boolean }) => (
    <div
      className={`relative overflow-hidden bg-brand-dark shadow-2xl aspect-square ${
        rounded ? "rounded-[2.5rem]" : ""
      }`}
    >
      {/* CSS animation replaces motion.img whileInView scale */}
      <img
        src={domain.problem.image}
        alt={`${domain.title} — the problem`}
        className="slow-zoom w-full h-full object-cover opacity-100"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-dark/90 via-brand-dark/40 to-transparent pointer-events-none" />
      <div
        className={`absolute z-10 pointer-events-none ${
          isDesktop ? "bottom-10 left-10 right-10" : "bottom-6 left-6 right-6"
        }`}
      >
        <div
          className={`font-mono text-white/60 uppercase tracking-[0.4em] mb-${isDesktop ? "4" : "2"} ${
            isDesktop ? "text-[10px]" : "text-[9px]"
          }`}
        >
          Field Reality
        </div>
        <p
          className={`text-white font-serif italic leading-snug ${
            isDesktop ? "text-h3" : "text-xs"
          }`}
        >
          "{domain.problem.title}"
        </p>
      </div>
    </div>
  );

  const SolutionImage = ({ rounded = true }: { rounded?: boolean }) => (
    <div
      className={`relative overflow-hidden bg-gray-100 shadow-2xl aspect-square ${
        rounded ? "rounded-[2.5rem]" : ""
      }`}
    >
      <img
        src={domain.solution.image}
        alt={`${domain.title} — our solution`}
        className="slow-zoom w-full h-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-brand-dark/40 to-transparent pointer-events-none" />
      <div
        className={`absolute z-20 pointer-events-none ${
          isDesktop ? "bottom-10 left-10" : "bottom-6 left-6 right-6"
        }`}
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-white/[0.03] backdrop-blur-xl px-6 py-5 rounded-[1.5rem] shadow-2xl border border-white/10 flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            {/* CSS pulse replaces motion animate */}
            <div className="w-2 h-2 rounded-full bg-brand-red pulse-ring" />
            <span className="text-[9px] font-mono font-bold text-brand-red uppercase tracking-[0.4em]">
              {domain.solution.outcomeLabel}
            </span>
          </div>
          <div>
            <div
              className={`font-serif text-white tracking-tight leading-none mb-1 ${
                isDesktop ? "text-h2" : "text-2xl"
              }`}
            >
              {domain.solution.outcomeValue}
            </div>
            <p className="text-[9px] font-mono text-white/40 uppercase tracking-[0.1em] leading-relaxed max-w-[160px]">
              {domain.solution.outcomeDesc}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );

  return (
    <section
      ref={containerRef}
      className="pt-20 pb-24 lg:pt-32 lg:pb-40 relative"
    >
      {/* Section Divider */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gray-100">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.25, 1, 0.5, 1] }}
          style={{ transformOrigin: "left center" }}
          className="w-full h-full bg-gradient-to-r from-brand-red/40 via-brand-red/10 to-transparent"
        />
      </div>

      {/* Background Watermark — parallax only on desktop after in-view */}
      {isDesktop ? (
        <ParallaxBox
          enabled={parallaxEnabled}
          range={[150, -150]}
          containerRef={containerRef}
          className="absolute top-0 right-4 md:right-20 text-[150px] md:text-[250px] lg:text-[350px] font-serif font-bold text-gray-50 select-none pointer-events-none tracking-tighter leading-none z-0"
        >
          {domain.tag.split(" ")[1]}
        </ParallaxBox>
      ) : (
        /* On mobile: static, no parallax node */
        <div className="absolute top-0 right-4 text-[120px] font-serif font-bold text-gray-50 select-none pointer-events-none tracking-tighter leading-none z-0">
          {domain.tag.split(" ")[1]}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-20 lg:px-32 mb-8 lg:mb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-end">
          <div className="lg:col-span-1">
            <div className="mb-8">
              <span className="text-[11px] font-mono font-bold tracking-[0.5em] text-gray-500 uppercase block mb-4">
                {domain.tag}
              </span>
              <div className="w-16 h-[1px] bg-brand-red" />
            </div>

            <motion.h2
              variants={titleContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="text-h2 md:text-h1 font-serif text-brand-dark tracking-tighter leading-[1.1] perspective-[1000px]"
            >
              <span className="italic text-brand-red block mb-1">
                {domain.titleEmphasis.split("").map((char, i) => (
                  <motion.span
                    key={i}
                    variants={charAnim}
                    className="inline-block whitespace-pre"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </span>
              <span className="block">
                {domain.title.split("").map((char, i) => (
                  <motion.span
                    key={i}
                    variants={charAnim}
                    className="inline-block whitespace-pre"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </span>
            </motion.h2>
          </div>

          <div className="lg:col-span-1">
            <motion.p
              variants={introContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              className="text-body-large text-gray-400 font-light leading-relaxed max-w-full"
            >
              {domain.intro.split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  variants={wordAnim}
                  className="inline-block mr-[0.3em] mb-1"
                >
                  {word}
                </motion.span>
              ))}
            </motion.p>
          </div>
        </div>
      </div>

      {/* ── Problem / Solution grid ────────────────────────────────────────── */}
      <div className="px-6 md:px-20 lg:px-32 space-y-0">
        {/* Problem row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
        >
          {isDesktop ? (
            /* Desktop: parallax wrapper around image */
            <ParallaxBox
              enabled={parallaxEnabled}
              range={[150, -150]}
              containerRef={containerRef}
              className="relative group rounded-[2.5rem] overflow-hidden"
            >
              <ProblemImage />
            </ParallaxBox>
          ) : (
            /* Mobile: plain image, no parallax node */
            <ProblemImage />
          )}

          <div className="py-8 flex flex-col justify-center">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-3 h-3 rounded-full bg-brand-red" />
              <span className="text-[11px] font-mono font-bold tracking-[0.4em] text-brand-red uppercase">
                The Vulnerability
              </span>
            </div>
            <h3 className="text-h3 md:text-h2 font-serif text-brand-dark mb-6 leading-tight">
              {domain.problem.vulnerabilityHeading}
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-10 font-sans">
              {domain.problem.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
              {domain.problem.points.map((point, pIdx) => (
                <div key={pIdx} className="space-y-2">
                  <span className="text-brand-red font-mono text-[10px] font-bold uppercase tracking-widest">
                    Risk 0{pIdx + 1}
                  </span>
                  <p className="text-base text-gray-600 leading-relaxed">
                    {point}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2.5 mt-12 pt-10 border-t border-gray-100">
              {domain.problem.tags.map((tag, tIdx) => (
                <span
                  key={tIdx}
                  className="group relative px-4 py-1.5 border border-gray-100 rounded-full text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-white hover:text-brand-red hover:border-brand-red transition-all pl-7"
                >
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-gray-200 group-hover:bg-brand-red transition-colors" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Bridge ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center py-8 px-6 relative z-10">
          <div className="relative w-[1px] h-24 overflow-hidden">
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 1.2, ease: [0.25, 1, 0.5, 1] }}
              style={{ transformOrigin: "top center" }}
              className="absolute inset-0 bg-gradient-to-b from-brand-red/0 via-brand-red/50 to-brand-red"
            />
            {/* CSS animation replaces motion infinite y animation */}
            <div className="travel-dot absolute top-0 left-0 w-full h-10 bg-brand-red shadow-[0_0_12px_var(--brand-red)]" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.4, y: -10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{
              duration: 0.6,
              delay: 0.4,
              type: "spring",
              stiffness: 250,
              damping: 20,
            }}
            className="w-12 h-12 -my-2 rounded-full border-2 border-brand-red/30 flex items-center justify-center bg-white relative z-20 shadow-[0_0_20px_rgba(251,54,64,0.15)]"
          >
            {/* CSS pulse ring replaces motion.div animate infinite */}
            <div className="pulse-ring absolute inset-0 bg-brand-red/20 rounded-full" />
            <motion.div
              initial={{ rotate: -90, scale: 0 }}
              whileInView={{ rotate: 90, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.6, ease: "backOut" }}
              className="relative z-10 w-8 h-8 bg-brand-red rounded-full flex items-center justify-center shadow-sm"
            >
              <ArrowRight className="w-4 h-4 text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
            className="mt-6 flex flex-col items-center gap-2"
          >
            <span className="text-[9px] font-mono font-bold tracking-[0.2em] text-brand-red uppercase">
              Engineering Intervention
            </span>
          </motion.div>

          <div className="relative w-[1px] h-16 mt-4 overflow-hidden">
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              whileInView={{ scaleY: 1, opacity: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 1.2,
                delay: 0.6,
                ease: [0.25, 1, 0.5, 1],
              }}
              style={{ transformOrigin: "top center" }}
              className="absolute inset-0 bg-gradient-to-b from-brand-red via-brand-teal/20 to-transparent"
            />
          </div>
        </div>

        {/* Solution row */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center"
        >
          <div className="py-8 flex flex-col justify-center order-2 lg:order-1">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-3 h-3 rounded-full bg-brand-teal" />
              <span className="text-[11px] font-mono font-bold tracking-[0.4em] text-brand-teal uppercase">
                The Engineered Result
              </span>
            </div>
            <h3 className="text-h3 md:text-h2 font-serif text-brand-dark mb-6 leading-tight">
              {domain.solution.title}
            </h3>
            <p className="text-gray-500 text-lg leading-relaxed mb-12 font-sans">
              {domain.solution.description}
            </p>
            <div className="space-y-0">
              {domain.solution.services.map((service, sIdx) => (
                <div
                  key={sIdx}
                  className="group py-7 border-t border-gray-100 last:border-b hover:bg-gray-50/50 px-4 -mx-4 rounded-xl transition-all"
                >
                  <div className="grid grid-cols-12 gap-6 items-start">
                    <span className="col-span-1 text-xs font-mono text-brand-red font-bold pt-0.5">
                      0{sIdx + 1}
                    </span>
                    <div className="col-span-11 space-y-2">
                      <h4 className="text-h5 font-bold text-brand-dark font-sans group-hover:text-brand-red transition-colors">
                        {service.title}
                      </h4>
                      <p className="text-base text-gray-500 leading-relaxed">
                        {service.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isDesktop ? (
            /* Desktop: parallax wrapper */
            <ParallaxBox
              enabled={parallaxEnabled}
              range={[-200, 200]}
              containerRef={containerRef}
              className="relative group order-2 rounded-[2.5rem] overflow-hidden"
            >
              <SolutionImage />
            </ParallaxBox>
          ) : (
            /* Mobile: plain, no parallax */
            <div className="order-1">
              <SolutionImage />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default DomainSectionItem;
