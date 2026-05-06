"use client";

import React, { useEffect, useRef } from 'react';
import Hero from '../components/Hero';
import RunoffCalculator from '../components/RunoffCalculator';
import WorkStorytelling from '../components/WorkStorytelling';
import Services from '../components/Services';
import ImpactMetrics from '../components/ImpactMetrics';
import WorksGist from '../components/WorksGist';
import TeamGist from '../components/TeamGist';
import Contact from '../components/Contact';
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
        filter: "blur(10px)",
        ease: "none"
      });
    }

    // 2. Reveal animations for other sections
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    reveals.forEach((el) => {
      gsap.fromTo(el,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            toggleActions: "play none none none"
          }
        }
      );
    });

    // 3. Custom Cursor Logic
    const onMouseMove = (e: MouseEvent) => {
      gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0 });
      gsap.to(cursorFollowerRef.current, { x: e.clientX, y: e.clientY, duration: 0.15 });
    };

    window.addEventListener('mousemove', onMouseMove);

    // 4. Magnetic Button Effect
    const magneticElements = document.querySelectorAll('.magnetic-target');
    magneticElements.forEach((el) => {
      el.addEventListener('mousemove', (e: any) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(el, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: "power2.out" });
        if (cursorFollowerRef.current) {
          cursorFollowerRef.current.classList.add('cursor-active');
        }
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.3)" });
        if (cursorFollowerRef.current) {
          cursorFollowerRef.current.classList.remove('cursor-active');
        }
      });
    });

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
          <RunoffCalculator />

          <section id="about" className="py-32 w-full px-6 md:px-20 lg:px-32 reveal-on-scroll">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <div className="relative group">
                <div className="absolute -inset-6 bg-brand-red/5 rounded-[3rem] blur-3xl group-hover:bg-brand-red/10 transition-all duration-700" />
                <img
                  src="https://picsum.photos/seed/eng1/1200/800"
                  alt="Water Engineering"
                  className="relative w-full h-[650px] object-cover rounded-[2.5rem] shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000"
                />
                <div className="absolute -bottom-6 -left-6 bg-brand-dark p-10 rounded-[2rem] shadow-2xl hidden md:block border border-white/5">
                  <div className="text-6xl font-bold text-brand-red mb-1">15+</div>
                  <div className="text-white/40 uppercase tracking-[0.3em] text-[9px] font-bold">Years of Excellence</div>
                </div>
              </div>

              <div className="space-y-10">
                <h2 className="text-gray-400 text-label-caps font-sans tracking-[0.2em] text-[10px]">A LEGACY OF CONSULTANCY</h2>
                <h3 className="text-section-title text-brand-dark font-serif lowercase first-letter:uppercase leading-[1.1]">
                  Engineering <span className="italic text-brand-red">resilience</span> <br />in every drop.
                </h3>

                <div className="space-y-6 text-gray-600 font-sans text-lg leading-relaxed max-w-xl">
                  <p>
                    FloodRix specialises in three critical water engineering domains: Highway Drainage, Urban Infrastructure Modelling, and Subsurface Groundwater Services.
                  </p>
                  <p>
                    Our multidisciplinary team of hydrologists, hydraulic engineers, and GIS specialists work at the intersection of environmental science and infrastructure engineering — delivering outcomes that withstand regulatory scrutiny and extreme climate events.
                  </p>
                  <p>
                    From initial catchment analysis through to construction-ready documentation, FloodRix provides end-to-end technical assurance for complex water infrastructure projects across 38 countries.
                  </p>
                </div>

                <div className="pt-8">
                  <a href="#contact" className="group inline-flex items-center gap-2 text-brand-dark font-medium border-b border-brand-dark/20 pb-1 hover:border-brand-red transition-all">
                    Request an Engineering Audit <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          <WorkStorytelling />
          <Services />
          <ImpactMetrics />
          <WorksGist />
          <TeamGist />
          <Contact />
        </div>
      </main>

      <style jsx global>{`
        .reveal-on-scroll {
          will-change: transform, opacity;
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
