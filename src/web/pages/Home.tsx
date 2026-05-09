"use client";

import React, { useEffect, useRef } from 'react';
import Hero from '../components/Hero';
import RunoffCalculator from '../components/RunoffCalculator';
import WorkStorytelling from '../components/WorkStorytelling';
import TechnicalAssurance from '../components/TechnicalAssurance';
import Services from '../components/Services';
import ImpactMetrics from '../components/ImpactMetrics';
import WorksGist from '../components/WorksGist';
import TeamGist from '../components/TeamGist';
import Contact from '../components/Contact';
import SmoothReveal from '../components/SmoothReveal';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const Home: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Curtain Reveal Effect: Pin the Hero and let next sections slide over
    const heroSection = document.querySelector('#hero-section');
    const heroContent = document.querySelector('#hero-content');

    if (heroSection && heroContent) {
      ScrollTrigger.create({
        trigger: heroSection,
        start: "top top",
        end: "bottom top",
        pin: true,
        pinSpacing: false
      });

      gsap.to(heroContent, {
        scrollTrigger: {
          trigger: heroSection,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
        scale: 0.85,
        opacity: 0,
        ease: "none"
      });
    }

    // 2. Reveal animations handled by SmoothReveal component

    // 3. Custom Cursor Logic
    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0 });
      gsap.to(cursorFollowerRef.current, { x: e.clientX, y: e.clientY, duration: 0.15 });
    };

    window.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#fcfcfc] cursor-none selection:bg-brand-red selection:text-white">
      {/* Cinematic Grain Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] bg-repeat"
        style={{ backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')` }} />

      {/* Futuristic Cursor System */}
      <div ref={cursorRef} className="fixed w-2 h-2 bg-brand-red rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 mix-blend-difference hidden md:block" />
      <div ref={cursorFollowerRef} className="fixed w-10 h-10 border border-brand-teal/50 rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hidden md:block scale-animation" />

      <main className="relative">
        <Hero />

        <div className="relative z-10 bg-[#fcfcfc] shadow-[0_-50px_100px_rgba(0,0,0,0.1)]">
          <SmoothReveal delay={0.1}>
            <div id="calculator">
              <RunoffCalculator />
            </div>
          </SmoothReveal>

          <section id="about" className="py-32 w-full px-6 md:px-20 lg:px-32">
            {/* ... */}
            <SmoothReveal direction="up" distance={60}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                <div className="relative group">
                  <div className="absolute -inset-6 bg-brand-red/5 rounded-[3rem] blur-3xl group-hover:bg-brand-red/10 transition-all duration-700" />
                  <img
                    src="/about.png"
                    alt="Water Engineering"
                    className="relative w-full h-[650px] object-cover rounded-[2.5rem] shadow-2xl transition-all duration-1000"
                  />
                  <div className="absolute -bottom-6 -left-6 bg-brand-dark p-10 rounded-[2rem] shadow-2xl hidden md:block border border-white/5">
                    <div className="text-h1 font-bold text-brand-red mb-1">15+</div>
                    <div className="text-white/40 uppercase tracking-[0.3em] text-caption font-bold">Engineering Excellence</div>
                  </div>
                </div>

                <div className="space-y-10">
                  <h3 className="ml-[-4px] text-h1 text-brand-dark font-serif lowercase first-letter:uppercase leading-[1.1]">
                    Building climate <span className="italic text-brand-red">resilience</span> <br />into critical infrastructure.
                  </h3>

                  <div className="space-y-6 text-gray-600 font-sans text-body-large leading-relaxed max-w-xl">
                    <p>
                      FloodRix is a specialized engineering consultancy operating across three core water domains: Highway Drainage, Urban Stormwater Management, and Geohydrology.
                    </p>
                    <p>
                      Our multidisciplinary team of hydrologists, hydraulic engineers, and GIS specialists operates at the intersection of environmental science and civil engineering. We deliver robust, data-driven solutions designed to withstand intense regulatory scrutiny and extreme climate events.
                    </p>
                    <p>
                      From initial catchment analysis to construction-ready documentation, FloodRix provides absolute technical assurance for complex infrastructure projects across 38 countries.
                    </p>
                  </div>

                </div>
              </div>
            </SmoothReveal>
          </section>

          <div id="expertise">
            <SmoothReveal direction="up" distance={40}>
              <WorkStorytelling />
            </SmoothReveal>
          </div>

          <div id="assurance">
            <SmoothReveal direction="up" distance={40}>
              <TechnicalAssurance />
            </SmoothReveal>
          </div>

          <div id="impact">
            <SmoothReveal direction="up" distance={40}>
              <ImpactMetrics />
            </SmoothReveal>
          </div>

          <div id="portfolio">
            <SmoothReveal direction="up" distance={40}>
              <WorksGist />
            </SmoothReveal>
          </div>

          <div id="team">
            <SmoothReveal direction="up" distance={40}>
              <TeamGist />
            </SmoothReveal>
          </div>

          <div id="contact">
            <SmoothReveal direction="up" distance={40}>
              <Contact />
            </SmoothReveal>
          </div>
        </div>
      </main>

      <style jsx global>{`
        .reveal-on-scroll {
          /* Optimized for performance */
          transform: translate3d(0, 0, 0);
          backface-visibility: hidden;
        }
        .cursor-active {
          width: 80px !important;
          height: 80px !important;
          background-color: rgba(251, 54, 64, 0.1);
          border-color: rgba(251, 54, 64, 0.5);
          border-width: 2px;
        }
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

export default Home;
