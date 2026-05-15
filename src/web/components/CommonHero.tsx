"use client";

import React, { useEffect } from "react";

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

const CommonHero: React.FC<CommonHeroProps> = ({
  id = "hero-section",
  category,
  headline,
  description,
  backgroundText,
  stats,
}) => {
  const sectionRef = useSectionTheme(id, "dark");

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Entrance Animation
      gsap.fromTo(
        ".hero-bg-wrapper",
        { y: 100, opacity: 0 },
        { y: 0, opacity: 0.03, duration: 2.5, ease: "power4.out" },
      );

      // Scroll Animation
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
  }, [id]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 1, ease: [0.16, 1, 0.3, 1] },
    },
  };

  return (
    <section
      ref={sectionRef}
      id={id}
      className="hero-section relative min-h-[90vh] bg-brand-dark flex flex-col justify-end px-6 md:px-20 lg:px-32 pb-24 overflow-hidden pt-32"
    >
      {/* Background Typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <div className="hero-bg-wrapper opacity-0">
          <span className="hero-bg-text text-[60vh] font-serif font-black text-white tracking-tighter leading-none block transform-gpu uppercase whitespace-nowrap">
            {backgroundText}
          </span>
        </div>
      </div>

      {/* Lighting */}
      <div className="absolute top-0 right-0 w-[1200px] h-[1200px] bg-white/[0.03] rounded-full blur-[200px] pointer-events-none translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-white/[0.01] rounded-full blur-[150px] pointer-events-none -translate-x-1/4 translate-y-1/4" />

      {/* Grid Texture */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:6rem_6rem] pointer-events-none opacity-50" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-24 items-end max-w-[1440px] mx-auto w-full">
        {/* Left — Headline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-4 mb-10"
          >
            <div className="w-12 h-[1px] bg-brand-red shadow-[0_0_10px_rgba(251,54,64,0.5)]" />
            <span className="text-[11px] font-mono font-bold tracking-[0.5em] text-brand-red uppercase">
              {category}
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-display font-serif text-white/90 tracking-tight leading-[1.05] mb-10"
          >
            {headline}
          </motion.h1>
        </motion.div>

        {/* Right — Context + Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-16"
        >
          <motion.p
            variants={itemVariants}
            className="text-body-large text-white/40 font-light leading-relaxed max-w-md"
          >
            {description}
          </motion.p>

          {/* Stats Grid — Floating Card Style */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 sm:grid-cols-4 border border-gray-100 rounded-[2.5rem] overflow-hidden bg-white shadow-[0_40px_100px_-30px_rgba(0,0,0,0.5)]"
          >
            {stats.map((s, i) => (
              <div
                key={i}
                className={`p-8 ${i < 3 ? "sm:border-r" : ""} border-gray-100 hover:bg-gray-50 transition-colors duration-500`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                  <div className="text-3xl font-serif text-brand-dark tracking-tight">
                    {s.value}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-brand-red font-bold uppercase tracking-widest mb-1.5 leading-tight">
                  {s.label}
                </div>
                <div className="text-[8px] font-mono text-gray-400 uppercase tracking-[0.1em] leading-tight">
                  {s.detail}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 right-6 md:right-32 flex items-center gap-6 text-white/20 group cursor-default">
        <div className="relative w-16 h-[1px] bg-white/5 overflow-hidden">
          <div className="absolute inset-0 bg-white/40 -translate-x-full animate-[shimmer_3s_infinite]" />
        </div>
        <span className="text-[9px] font-mono font-bold tracking-[0.4em] uppercase group-hover:text-white/40 transition-colors">
          Scroll to explore
        </span>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`,
        }}
      />
    </section>
  );
};

export default CommonHero;
