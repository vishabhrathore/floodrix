"use client";


import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ArrowRight, Activity, Globe, Shield, Terminal, Zap } from 'lucide-react';

const Hero: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const revolvingTextRef = useRef<HTMLSpanElement>(null);

  const bgLayer1Ref = useRef<HTMLImageElement>(null);
  const bgLayer2Ref = useRef<HTMLImageElement>(null);

  const slides = [
    { text: "Highway", color: "text-brand-red", image: "https://picsum.photos/seed/hwy1/1920/1080" },
    { text: "Infrastructure", color: "text-brand-teal", image: "https://picsum.photos/seed/infra1/1920/1080" },
    { text: "Groundwater", color: "text-brand-red", image: "https://picsum.photos/seed/gw1/1920/1080" }
  ];

  const [index, setIndex] = useState(0);
  const [isEntryComplete, setIsEntryComplete] = useState(false);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: () => setIsEntryComplete(true) });
    gsap.set([bgLayer1Ref.current, bgLayer2Ref.current], { scale: 1.15 });

    tl.fromTo(titleRef.current, { x: -50, opacity: 0 }, { x: 0, opacity: 1, duration: 1 })
      .fromTo(subtitleRef.current, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, "-=0.9");
  }, []);

  useEffect(() => {
    if (!isEntryComplete) return;
    const interval = setInterval(() => {
      const nextIndex = (index + 1) % slides.length;
      const tl = gsap.timeline();
      const currentLayer = index % 2 === 0 ? bgLayer1Ref.current : bgLayer2Ref.current;
      const nextLayer = index % 2 === 0 ? bgLayer2Ref.current : bgLayer1Ref.current;

      if (nextLayer instanceof HTMLImageElement) nextLayer.src = slides[nextIndex].image;
      if (nextLayer) gsap.set(nextLayer, { opacity: 0, scale: 1.25, zIndex: 2 });
      if (currentLayer) gsap.set(currentLayer, { zIndex: 1 });

      if (revolvingTextRef.current) {
        tl.to(revolvingTextRef.current, {
          y: -40, opacity: 0, filter: "blur(8px)", duration: 0.6, ease: "power2.in", onComplete: () => {
            setIndex(nextIndex);
            if (revolvingTextRef.current) {
              gsap.fromTo(revolvingTextRef.current, { y: 40, opacity: 0, filter: "blur(8px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.8, ease: "back.out(1.4)" });
            }
          }
        }, 0.2);
      }

      tl.to(nextLayer, { opacity: 1, scale: 1.1, duration: 2.5, ease: "power2.inOut" }, 0);
      tl.to(currentLayer, { opacity: 0, scale: 1.05, duration: 2.5, ease: "power2.inOut" }, 0);
    }, 6000);
    return () => clearInterval(interval);
  }, [isEntryComplete, index]);

  return (
    <section id="hero-section" ref={heroRef} className="relative h-screen w-full overflow-hidden bg-brand-dark select-none">
      {/* Container for content that will "go back" */}
      <div id="hero-content" className="relative h-full w-full flex items-center">
        {/* Background System */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
            <span className="text-[60vh] font-serif font-bold text-white tracking-tighter uppercase whitespace-nowrap">
              FLOODRIX
            </span>
          </div>
          <img ref={bgLayer1Ref} src={slides[0].image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 1, zIndex: 5 }} />
          <img ref={bgLayer2Ref} src={slides[1].image} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0, zIndex: 4 }} />
          <div className="absolute inset-0 bg-black/30 z-[6] pointer-events-none" />
        </div>



        <div className="relative z-30 w-full px-10 md:px-20 lg:px-32">
          <div className="max-w-6xl text-left">
            <h1 ref={titleRef} className="text-hero text-white mb-8 tracking-tighter drop-shadow-2xl">
              Engineering <br />
              <span className="relative inline-block overflow-hidden align-bottom h-[1.25em] min-w-[220px] md:min-w-[420px]">
                <span ref={revolvingTextRef} className={`absolute left-0 inline-block transition-colors duration-1000 ${slides[index].color}`}>
                  {slides[index].text}
                </span>
              </span>
              <br /> Infrastructure.
            </h1>


          </div>
        </div>

        {/* Global Stats Red Footer Block */}
        <div className="absolute bottom-0 left-0 z-40 bg-brand-red w-full lg:w-auto min-w-[35%] px-10 py-12 md:px-20 lg:px-32 flex flex-col gap-10 shadow-[0_-20px_100px_rgba(251,54,64,0.2)]">
          <p ref={subtitleRef} className="text-white text-h3 font-light leading-relaxed max-w-xl opacity-95 drop-shadow-lg">
            FloodRix pairs <span className="text-white font-medium bg-black/10 px-2 py-0.5 rounded text-sm md:text-base">deep engineering expertise</span> with proprietary digital tools to solve complex water infrastructure challenges.
          </p>


        </div>
      </div>
    </section >
  );
};

export default Hero;
