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

          <section id="about" className="py-32 lg:py-48 w-full px-6 md:px-12 lg:px-24 bg-white">
            <SmoothReveal direction="up" distance={40}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">

                {/* Left Column: Narrative & Video */}
                <div className="lg:col-span-7 space-y-12">
                  <div className="relative group">
                    <div className="relative aspect-[16/9] rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-2xl shadow-black/5">
                      <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105 [will-change:transform]"
                        // onMouseEnter={(e) => e.currentTarget.playbackRate = 0.3}
                        // onMouseLeave={(e) => e.currentTarget.playbackRate = 0.4}
                        ref={(el) => {
                          if (el) el.playbackRate = 0.6;
                        }}
                      >
                        <source src="https://res.cloudinary.com/dpdkzg4ld/video/upload/v1778512343/floodrix/about_video.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute inset-0 border border-black/5 rounded-3xl md:rounded-[2.5rem] pointer-events-none" />
                    </div>
                    {/* Floating Metadata Card */}
                    <div className="absolute -bottom-6 -right-6 bg-brand-dark p-8 rounded-2xl shadow-2xl hidden md:block border border-white/5 max-w-[240px]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-2 h-2 rounded-full bg-brand-red animate-pulse" />
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Global Operations</span>
                      </div>
                      <p className="text-white text-xs font-light leading-relaxed">
                        Delivering technical assurance for mission-critical infrastructure projects across <span className="text-white font-bold">38 countries</span>.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-2xl pt-8">
                    <h3 className="text-h1 text-brand-dark font-serif leading-tight tracking-tight mb-8">
                      Building climate <span className="italic text-brand-red">resilience</span> <br className="hidden md:block" /> into critical infrastructure.
                    </h3>
                    <div className="space-y-6 text-brand-dark/70 font-light leading-relaxed text-body-large">
                      <p>
                        FloodRix is a specialized engineering consultancy operating across three core water domains: Highway Drainage, Urban Stormwater Management, and Geohydrology.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Key Metrics & Extended Detail */}
                <div className="lg:col-span-5 flex flex-col justify-end pb-4">
                  <div className="space-y-12">
                    {/* Years Block */}
                    <div className="border-l-2 border-brand-red pl-8 py-2">
                      <div className="text-7xl lg:text-8xl font-serif text-brand-dark leading-none tracking-tighter mb-4">
                        15<span className="text-brand-red">.</span>
                      </div>
                      <div className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 leading-relaxed max-w-[200px]">
                        Years of Engineering Excellence & Technical Assurance
                      </div>
                    </div>

                    <div className="space-y-8 text-brand-dark/70 font-light leading-relaxed text-body pt-8 border-t border-gray-100">
                      <p>
                        Our multidisciplinary team of hydrologists, hydraulic engineers, and GIS specialists operates at the intersection of environmental science and civil engineering.
                      </p>
                      <p>
                        From initial catchment analysis to construction-ready documentation, we deliver robust, data-driven solutions designed to withstand intense regulatory scrutiny and extreme climate events.
                      </p>
                      <div className="pt-4">
                        <a href="#contact" className="group inline-flex items-center gap-3 text-brand-red text-xs font-bold uppercase tracking-widest">
                          Request Capability Statement
                          <span className="group-hover:translate-x-1 transition-transform">→</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </SmoothReveal>
          </section>

          <div id="expertise">
            {/* <SmoothReveal direction="up" distance={40}>
              <Services />
            </SmoothReveal> */}
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
