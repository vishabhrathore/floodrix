"use client";

import React, { useEffect, useRef } from "react";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import About from "../components/About";
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

gsap.registerPlugin(ScrollTrigger);

const Home: React.FC = () => {
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

        <div className="relative z-10 bg-[#fcfcfc] shadow-[0_-50px_100px_rgba(0,0,0,0.1)] overflow-x-clip">
          <SmoothReveal id="calculator" delay={0.1}>
            <RunoffCalculator />
          </SmoothReveal>

          <About />

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
