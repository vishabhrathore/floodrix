"use client";

import React, { useEffect, useRef } from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Contact from "../components/Contact";
import Hero from "../components/Hero";
import ImpactMetrics from "../components/ImpactMetrics";
import RunoffCalculator from "../components/RunoffCalculator";
import Services from "../components/Services";
import SmoothReveal from "../components/SmoothReveal";
import TeamGist from "../components/TeamGist";
import TechnicalAssurance from "../components/TechnicalAssurance";
import WorkStorytelling from "../components/WorkStorytelling";
import WorksGist from "../components/WorksGist";
import { useSectionTheme } from "../hooks/useSectionTheme";

gsap.registerPlugin(ScrollTrigger);

const Home: React.FC = () => {
  const aboutRef = useSectionTheme("home-about", "light");
  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorFollowerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Curtain Reveal Effect: Pin the Hero and let next sections slide over
    const heroSection = document.querySelector("#hero-section");
    const heroContent = document.querySelector("#hero-content");

    if (heroSection && heroContent) {
      ScrollTrigger.create({
        trigger: heroSection,
        start: "top top",
        end: "bottom top",
        pin: true,
        pinSpacing: false,
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
        ease: "none",
      });
    }

    // 2. Reveal animations handled by SmoothReveal component

    // 3. Custom Cursor Logic
    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0 });
      gsap.to(cursorFollowerRef.current, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.15,
      });
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#fcfcfc] cursor-none selection:bg-brand-red selection:text-white">
      {/* Cinematic Grain Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.03] bg-repeat"
        style={{
          backgroundImage: `url('https://grainy-gradients.vercel.app/noise.svg')`,
        }}
      />

      {/* Futuristic Cursor System */}
      <div
        ref={cursorRef}
        className="fixed w-2 h-2 bg-brand-red rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 mix-blend-difference hidden md:block"
      />
      <div
        ref={cursorFollowerRef}
        className="fixed w-10 h-10 border border-brand-teal/50 rounded-full pointer-events-none z-[10000] -translate-x-1/2 -translate-y-1/2 transition-all duration-300 hidden md:block scale-animation"
      />

      <main className="relative">
        <Hero />

        <div className="relative z-10 bg-[#fcfcfc] shadow-[0_-50px_100px_rgba(0,0,0,0.1)]">
          <SmoothReveal id="calculator" delay={0.1}>
            <RunoffCalculator />
          </SmoothReveal>

          <section
            id="about"
            ref={aboutRef}
            className="py-32 lg:py-48 w-full px-6 md:px-12 lg:px-24 bg-white"
          >
            <SmoothReveal direction="up" distance={40}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
                {/* Left Column: Narrative & Media */}
                <div className="lg:col-span-7 space-y-12">
                  <div className="relative group">
                    <div className="relative aspect-[16/9] rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-2xl shadow-black/5">
                      <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        poster="https://res.cloudinary.com/dpdkzg4ld/video/upload/v1778512343/floodrix/about_video.jpg"
                        className="w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105 [will-change:transform]"
                        ref={(el) => {
                          if (el) el.playbackRate = 0.6;
                        }}
                      >
                        <source
                          src="https://res.cloudinary.com/dpdkzg4ld/video/upload/f_auto,q_auto/v1778512343/floodrix/about_video.mp4"
                          type="video/mp4"
                        />
                        Your browser does not support the video tag.
                      </video>
                      <div className="absolute inset-0 border border-black/5 rounded-3xl md:rounded-[2.5rem] pointer-events-none" />
                    </div>
                    {/* Floating Metadata Card - Anchored & Professional */}
                    <div className="absolute bottom-[-40] right-[-40] bg-brand-dark/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] hidden md:block border border-white/10 max-w-[320px] z-30">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-1.5 h-4 bg-brand-red" />
                        <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.25em]">
                          Project Footprint
                        </span>
                      </div>
                      <p className="text-white/80 text-md font-light leading-relaxed">
                        Pan-India delivery of hydraulic design, flood modelling,
                        and drainage engineering for highways and urban
                        corridors.
                      </p>
                    </div>
                  </div>

                  <div className="max-w-2xl pt-8">
                    <h3 className="text-h1 text-brand-dark font-serif leading-tight tracking-tight mb-8">
                      Building climate{" "}
                      <span className="italic text-brand-red font-serif text-[1em]">
                        resilience
                      </span>{" "}
                      <br className="hidden md:block" /> into critical
                      infrastructure.
                    </h3>
                    <div className="space-y-6 text-brand-dark/70 font-light leading-relaxed text-body-large">
                      <p>
                        FloodRix is a specialized engineering consultancy
                        operating across three core water domains: Highway
                        Drainage, Urban Stormwater Management, and Geohydrology.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Key Metrics & Extended Detail */}
                <div className="lg:col-span-5 flex flex-col justify-end pb-4">
                  <div className="space-y-12">
                    {/* Years Block - Corrected Alignment */}
                    <div className="flex items-start gap-8 border-l-[3px] border-brand-red pl-10 py-6">
                      <div className="text-7xl lg:text-8xl font-serif text-brand-dark leading-none tracking-tighter">
                        15<span className="text-brand-red">.</span>
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-500 leading-relaxed max-w-[240px] pt-2">
                        Years of Engineering Excellence & Technical Assurance
                      </div>
                    </div>

                    <div className="space-y-10 text-brand-dark/70 font-light leading-relaxed text-body pt-10 border-t border-gray-100 max-w-[60ch]">
                      <p>
                        Our multidisciplinary team of hydrologists, hydraulic
                        engineers, and GIS specialists operates at the
                        intersection of environmental science and civil
                        engineering.
                      </p>

                      <div className="flex items-center gap-4 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-red/20" />
                        <div className="flex-1 h-[1px] bg-gray-50" />
                      </div>

                      <p>
                        From initial catchment analysis to construction-ready
                        documentation, we deliver robust, data-driven solutions
                        designed to withstand intense regulatory scrutiny and
                        extreme climate events.
                      </p>

                      <div className="pt-8 border-t border-gray-50">
                        <a
                          href="#contact"
                          className="group inline-flex items-center gap-3 text-brand-red text-xs font-bold uppercase tracking-widest"
                        >
                          Request Capability Statement
                          <span className="group-hover:translate-x-1 transition-transform">
                            →
                          </span>
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

          <SmoothReveal id="impact" direction="up" distance={40}>
            <ImpactMetrics />
          </SmoothReveal>

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
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .scale-animation {
          animation: scale-animation 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Home;
