"use client";

import React, { useEffect, useState } from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "motion/react";

import { useSectionTheme } from "../hooks/useSectionTheme";

gsap.registerPlugin(ScrollTrigger);

export interface HeroStat {
  value: string;
  label: string;
  detail: string;
}

export interface CommonHeroProps {
  id?: string;
  category: string;
  headline: React.ReactNode;
  description: string;
  backgroundText: string;
  stats: HeroStat[];
}

/*
  MOBILE PERFORMANCE FIXES:
  1. GSAP bg-text scroll parallax → disabled on mobile (IntersectionObserver + isDesktop gate)
  2. blur-[200px] / blur-[150px] lighting divs → removed on mobile (GPU-killer on Mali/Adreno)
  3. Background text size → clamped to safe vw value on mobile instead of 60vh
  4. Grid texture → opacity lowered on mobile to reduce overdraw
  5. Headline text → responsive scale via clamp-based Tailwind classes
  6. Stats grid → 2-col on mobile with tighter padding, no broken overflow
  7. GSAP context revert kept — no memory leaks
*/

const CommonHero: React.FC<CommonHeroProps> = ({
  id = "hero-section",
  category,
  headline,
  description,
  backgroundText,
  stats,
}) => {
  const sectionRef = useSectionTheme(id, "dark");

  /* ── Desktop detection ───────────────────────────────────────────────────── */
  const [isDesktop, setIsDesktop] = useState(false); // false for SSR safety (no hydration mismatch)
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  /* ── GSAP — only runs on desktop ─────────────────────────────────────────── */
  useEffect(() => {
    if (!isDesktop) return;

    const ctx = gsap.context(() => {
      // Entrance
      gsap.fromTo(
        ".hero-bg-wrapper",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 0.03, duration: 2.5, ease: "power4.out" },
      );

      // Scroll parallax — only wired up on desktop
      gsap.to(".hero-bg-text", {
        y: -150,
        scrollTrigger: {
          trigger: `#${id}`,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    });

    return () => ctx.revert();
  }, [id, isDesktop]);

  /* ── Mobile: simple fade-in for bg text via CSS ──────────────────────────── */
  // On mobile we skip GSAP entirely and just show the text at low opacity
  // (no entrance animation to save CPU during initial paint)

  /* ── Motion variants ─────────────────────────────────────────────────────── */
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 }, // tightened from 0.1/0.3
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 }, // reduced from y:20
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }, // reduced from 1s
    },
  };

  return (
    <section
      ref={sectionRef}
      id={id}
      className="hero-section relative min-h-[100svh] lg:min-h-[90vh] bg-brand-dark flex flex-col justify-end
                 px-5 sm:px-8 md:px-20 lg:px-32
                 pb-20 lg:pb-24
                 overflow-hidden pt-28 lg:pt-32"
    >
      {/* ── Background Typography ─────────────────────────────────────────── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        {/* 
          Unified background typography:
          - On mobile: opacity is statically 0.03.
          - On desktop: starts at opacity 0 (lg:opacity-0) so GSAP can fade it to 0.03 smoothly.
        */}
        <div className="hero-bg-wrapper w-full flex justify-center opacity-[0.03] lg:opacity-0">
          <span
            className="hero-bg-text font-serif font-black text-white tracking-tighter leading-none block transform-gpu uppercase whitespace-nowrap text-center"
            style={{
              fontSize: `clamp(4rem, ${175 / backgroundText.length}vw, 80vh)`,
            }}
          >
            {backgroundText}
          </span>
        </div>
      </div>

      {/* ── Lighting — desktop only (hidden lg:block prevents overdraw on mobile) ── */}
      <div className="hidden lg:block absolute top-0 right-0 w-[1200px] h-[1200px] bg-white/[0.03] rounded-full blur-[200px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="hidden lg:block absolute bottom-0 left-0 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-[150px] pointer-events-none -translate-x-1/4 translate-y-1/4" />

      {/* ── Grid Texture — responsive opacity via Tailwind classes ─────────── */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:6rem_6rem] opacity-25 lg:opacity-50" />

      {/* ── Main Content — CSS animated instantly on load (zero hydration lag) ─── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-end max-w-[1440px] mx-auto w-full">
        {/* Left — Headline */}
        <div className="space-y-0">
          <div className="animate-fade-in-up flex items-center gap-3 mb-7 lg:mb-10">
            <div className="w-8 lg:w-12 h-[1px] bg-brand-red shadow-[0_0_10px_rgba(251,54,64,0.5)]" />
            <span className="text-[10px] lg:text-[11px] font-mono font-bold tracking-[0.4em] lg:tracking-[0.5em] text-brand-red uppercase">
              {category}
            </span>
          </div>

          <h1 className="text-display animate-fade-in-up delay-100 font-serif text-white/90 tracking-tight leading-[1.05] mb-8 lg:mb-10">
            {headline}
          </h1>
        </div>

        {/* Right — Description + Stats */}
        <div className="space-y-10 lg:space-y-16">
          <p className="animate-fade-in-up delay-200 text-sm sm:text-base lg:text-body-large text-white/40 font-light leading-relaxed max-w-md">
            {description}
          </p>

          {/* Stats Grid */}
          <div className="animate-fade-in-up delay-300 grid grid-cols-2 border border-white/10 rounded-2xl lg:rounded-[2.5rem] overflow-hidden bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] lg:shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]">
            {stats.map((s, i) => (
              <div
                key={i}
                className={`
                  p-5 sm:p-6 lg:p-8
                  ${i % 2 === 0 ? "border-r border-white/10" : ""}
                  ${i < stats.length - 2 ? "border-b border-gray-100" : ""}
                  hover:bg-gray-50 transition-colors duration-500
                `}
              >
                <div className="flex items-center gap-2 mb-1.5 lg:mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-red flex-shrink-0" />
                  <div className="text-xl sm:text-2xl lg:text-3xl font-serif text-brand-dark tracking-tight leading-none">
                    {s.value}
                  </div>
                </div>
                <div className="text-[9px] lg:text-[10px] font-mono text-brand-red font-bold uppercase tracking-widest mb-1 leading-tight">
                  {s.label}
                </div>
                <div className="text-[8px] font-mono text-gray-400 uppercase tracking-[0.1em] leading-tight hidden sm:block">
                  {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scroll Indicator — hidden on small mobile to save vertical space ─── */}
      <div className="hidden sm:flex absolute bottom-10 lg:bottom-12 right-6 md:right-32 items-center gap-6 text-white/20 group cursor-default">
        <div className="relative w-12 lg:w-16 h-[1px] bg-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-white/40 -translate-x-full animate-[shimmer_3s_infinite]" />
        </div>
        <span className="text-[9px] font-mono font-bold tracking-[0.4em] uppercase group-hover:text-white/40 transition-colors">
          Scroll to explore
        </span>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes shimmer { 
              0% { transform: translateX(-100%); } 
              100% { transform: translateX(100%); } 
            }
            @keyframes fadeInUp {
              from {
                opacity: 0;
                transform: translateY(15px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .animate-fade-in-up {
              opacity: 0;
              animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            .delay-100 {
              animation-delay: 100ms;
            }
            .delay-200 {
              animation-delay: 200ms;
            }
            .delay-300 {
              animation-delay: 300ms;
            }
          `,
        }}
      />
    </section>
  );
};

export default CommonHero;
