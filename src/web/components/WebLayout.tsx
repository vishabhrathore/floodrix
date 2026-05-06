"use client";

import React, { useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import AIChatbot from './AIChatbot';
import CookieConsent from './CookieConsent';
import ScrollToTop from './ScrollToTop';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';

gsap.registerPlugin(ScrollTrigger);

const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // 0. Initialize Lenis Smooth Scroll Globally
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const handleResize = () => {
      lenis.resize();
    };

    window.addEventListener('resize', handleResize);
    
    // Optional: Add class to html for CSS integration
    document.documentElement.classList.add('lenis');
    (window as any).lenis = lenis;

    // Refresh ScrollTrigger after a short delay to ensure everything is loaded
    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(raf);
      window.removeEventListener('resize', handleResize);
      document.documentElement.classList.remove('lenis');
      (window as any).lenis = undefined;
    };
  }, []);

  return (
    <>
      <ScrollToTop />
      <Header />
      {children}
      <Footer />
      <AIChatbot />
      <CookieConsent />
    </>
  );
};

export default WebLayout;
