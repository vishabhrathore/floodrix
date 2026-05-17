"use client";

import React, { useEffect, useRef } from "react";

import { gsap } from "gsap";

import { useSectionTheme } from "../hooks/useSectionTheme";

const Hero: React.FC = () => {
  const heroRef = useSectionTheme("main-hero", "dark");
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLDivElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);

  // 1. Text animates immediately
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      metaRef.current,
      { opacity: 0 },
      { opacity: 1, duration: 1, delay: 0.2 },
    )
      .fromTo(
        titleRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.5 },
        "-=0.5",
      )
      .fromTo(
        subtitleRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.5 },
        "-=1",
      );
  }, []);

  // 2. Video fades in smoothly exactly when the first frame is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onReady = () => {
      // Fade the video in over the static background image
      gsap.to(video, { opacity: 0.8, duration: 1.2, ease: "power2.inOut" });
      // Fade the poster image out to prevent collision/ghosting
      if (posterRef.current) {
        gsap.to(posterRef.current, {
          opacity: 0,
          duration: 1.2,
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
      console.warn("Hero background video playback prevented:", err);
    });

    return () => video.removeEventListener("loadeddata", onReady);
  }, []);

  return (
    <section
      id="hero-section"
      ref={heroRef}
      className="relative h-screen w-full overflow-hidden bg-[#080d0c] select-none"
    >
      {/* Cinematic Video Background Container */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* NEW: Standalone Poster Image. This loads instantly and stays visible */}
        <img
          ref={posterRef}
          src="https://res.cloudinary.com/dpdkzg4ld/video/upload/f_auto,q_auto/v1778512402/floodrix/hero.jpg"
          alt="Water Infrastructure"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* The Video. Starts with Tailwind `opacity-0` so it hides until GSAP fades it in */}
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover opacity-0 z-10"
        >
          <source
            src="https://res.cloudinary.com/dpdkzg4ld/video/upload/f_auto,q_auto/v1778512402/floodrix/hero.mp4"
            type="video/mp4"
          />
        </video>

        {/* Deep Bottom Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[60vh] bg-gradient-to-t from-[#080d0c] via-[#080d0c]/70 to-transparent z-20 pointer-events-none" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-30 h-full w-full px-6 md:px-12 lg:px-24 flex flex-col justify-end pb-12 lg:pb-16">
        {/* Headline */}
        <div ref={metaRef} className="w-full max-w-6xl mb-12 lg:mb-16">
          <h1
            ref={titleRef}
            className="text-white font-serif leading-[1.05] tracking-tight text-h1"
          >
            Safeguarding critical <br className="hidden md:block" />
            <span className="text-brand-red">water infrastructure.</span>
          </h1>
        </div>

        {/* Footer Grid */}
        <div
          ref={subtitleRef}
          className="w-full border-t border-white/20 pt-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-8"
        >
          <div className="max-w-xl">
            <p className="text-white/80 text-body font-light leading-relaxed">
              FloodRix pairs{" "}
              <span className="text-white font-medium border-b border-brand-red/50 pb-0.5">
                deep engineering expertise
              </span>{" "}
              with proprietary digital tools to solve complex hydrological
              challenges on a global scale.
            </p>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            <div className="flex flex-col gap-1">
              <span className="text-white/40 text-[10px] uppercase tracking-widest font-mono">
                Active Projects
              </span>
              <span className="text-white text-xs uppercase tracking-widest font-bold">
                4 Countries
              </span>
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
