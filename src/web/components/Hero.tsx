"use client";

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useSectionTheme } from '../hooks/useSectionTheme';

const Hero: React.FC = () => {
  const heroRef = useSectionTheme('main-hero', 'dark');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A heavy, deliberate, and premium load animation
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(metaRef.current, { opacity: 0 }, { opacity: 1, duration: 1, delay: 0.2 })
      .fromTo(titleRef.current, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1.5 }, "-=0.5")
      .fromTo(subtitleRef.current, { opacity: 0 }, { opacity: 1, duration: 1.5 }, "-=1");
  }, []);

  return (
    <section id="hero-section" ref={heroRef} className="relative h-screen w-full overflow-hidden bg-[#080d0c] select-none">

      {/* Cinematic Video Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="https://res.cloudinary.com/dpdkzg4ld/video/upload/v1778512402/floodrix/hero.jpg"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        >
          <source src="https://res.cloudinary.com/dpdkzg4ld/video/upload/f_auto,q_auto/v1778512402/floodrix/hero.mp4" type="video/mp4" />
          <img src="/assets/images/dam-fallback.jpg" alt="Infrastructure" className="w-full h-full object-cover" />
        </video>

        {/* Deep Bottom Gradient Overlay - Ensures typography pops perfectly */}
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-gradient-to-t from-[#080d0c] via-[#080d0c]/70 to-transparent z-10 pointer-events-none" />
      </div>

      {/* Main Content Container - Pushed down for an architectural layout */}
      <div className="relative z-30 h-full w-full px-6 md:px-12 lg:px-24 flex flex-col justify-end pb-12 lg:pb-16">

        {/* Massive Stark Headline Area */}
        <div className="w-full max-w-6xl mb-12 lg:mb-16">

          {/* Factual, Unembellished Typography */}
          <h1 ref={titleRef} className="text-white font-serif leading-[1.05] tracking-tight text-h1" >
            Safeguarding critical <br className="hidden md:block" />
            <span className="text-brand-red">water infrastructure.</span>
          </h1>
        </div>

        {/* Technical Footer Grid - Structural and Grounded */}
        <div ref={subtitleRef} className="w-full border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">

          <div className="max-w-xl">
            <p className="text-white/80 text-body font-light leading-relaxed">
              FloodRix pairs <span className="text-white font-medium border-b border-brand-red/50 pb-0.5">deep engineering expertise</span> with proprietary digital tools to solve complex hydrological challenges on a global scale.
            </p>
          </div>

          {/* Functional Project Stat Display */}
          <div className="flex items-center gap-6 shrink-0">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-mono">Active Projects</span>
              <span className="text-white text-xs uppercase tracking-widest font-bold">4 Countries</span>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="flex gap-2">
              <div className="w-2 h-2 rounded-sm bg-brand-red opacity-80" />
              <div className="w-2 h-2 rounded-sm bg-brand-teal opacity-80" />
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

export default Hero;