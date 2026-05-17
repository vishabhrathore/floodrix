"use client";

import React, { useEffect, useRef } from "react";

import { gsap } from "gsap";

import { useSectionTheme } from "../hooks/useSectionTheme";
import SmoothReveal from "./SmoothReveal";

const About: React.FC = () => {
  const aboutRef = useSectionTheme("home-about", "light");
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // 1. Maintain your slow-motion effect
    video.playbackRate = 0.6;

    // 2. Set initial GSAP state (matches Tailwind opacity-0)
    gsap.set(video, { opacity: 0 });

    const onReady = () => {
      // 3. Fade in over the static image once the first frame is ready
      gsap.to(video, { opacity: 1, duration: 1.5, ease: "power2.inOut" });
      // Fade out poster image to prevent double-image overlap
      if (posterRef.current) {
        gsap.to(posterRef.current, {
          opacity: 0,
          duration: 1.5,
          ease: "power2.inOut",
        });
      }
    };

    if (video.readyState >= 2) {
      onReady();
    } else {
      video.addEventListener("loadeddata", onReady, { once: true });
    }

    // Explicitly call play to force browser to download and play the video
    video.play().catch((err) => {
      console.warn("About video playback prevented:", err);
    });

    return () => video.removeEventListener("loadeddata", onReady);
  }, []);

  return (
    <section
      id="about"
      ref={aboutRef}
      className="py-32 lg:py-48 w-full px-6 md:px-12 lg:px-24 bg-white"
    >
      <SmoothReveal direction="up" distance={40}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
          <div className="lg:col-span-7 space-y-12">
            <div className="relative group">
              <div className="relative aspect-[16/9] rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-gray-100 shadow-2xl shadow-black/5">
                {/* Instant Static Poster Image */}
                <img
                  ref={posterRef}
                  src="https://res.cloudinary.com/dpdkzg4ld/video/upload/f_auto,q_auto/v1778512343/floodrix/about_video.jpg"
                  alt="FloodRix Infrastructure"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105 z-0"
                />

                {/* Video Element - Handled by GSAP */}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] ease-out group-hover:scale-105 opacity-0 z-10"
                >
                  <source
                    src="https://res.cloudinary.com/dpdkzg4ld/video/upload/f_auto,q_auto/v1778512343/floodrix/about_video.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>

                <div className="absolute inset-0 border border-black/5 rounded-3xl md:rounded-[2.5rem] pointer-events-none z-20" />
              </div>

              {/* Floating Metadata Card */}
              <div className="absolute bottom-[-40] right-[-40] bg-brand-dark/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_30px_60px_rgba(0,0,0,0.4)] hidden md:block border border-white/10 max-w-[320px] z-30">
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-1.5 h-4 bg-brand-red" />
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-[0.25em]">
                    Project Footprint
                  </span>
                </div>
                <p className="text-white/80 text-md font-light leading-relaxed">
                  Pan-India delivery of hydraulic design, flood modelling, and
                  drainage engineering for highways and urban corridors.
                </p>
              </div>
            </div>

            <div className="max-w-2xl pt-8">
              <h3 className="text-h1 text-brand-dark font-serif leading-tight tracking-tight mb-8">
                Building climate{" "}
                <span className="italic text-brand-red font-serif text-[1em]">
                  resilience
                </span>{" "}
                <br className="hidden md:block" /> into critical infrastructure.
              </h3>
              <div className="space-y-6 text-brand-dark/70 font-light leading-relaxed text-body-large">
                <p>
                  FloodRix is a specialized engineering consultancy operating
                  across three core water domains: Highway Drainage, Urban
                  Stormwater Management, and Geohydrology.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Key Metrics & Extended Detail */}
          <div className="lg:col-span-5 flex flex-col justify-end pb-4">
            <div className="space-y-12">
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
                  engineers, and GIS specialists operates at the intersection of
                  environmental science and civil engineering.
                </p>

                <div className="flex items-center gap-4 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-red/20" />
                  <div className="flex-1 h-[1px] bg-gray-50" />
                </div>

                <p>
                  From initial catchment analysis to construction-ready
                  documentation, we deliver robust, data-driven solutions
                  designed to withstand intense regulatory scrutiny and extreme
                  climate events.
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
  );
};

export default About;
