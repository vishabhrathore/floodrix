"use client";

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import ScrollToTop from './ScrollToTop';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from '@studio-freight/lenis';
import ConsentDefaults from '@/components/ConsentDefaults';
import GTMScript from '@/components/GTMScript';
import CookieBanner from '@/components/CookieBanner';
import ConsentRestore from '@/components/ConsentRestore';
import { useHeaderStore } from '@/web/store/useHeaderStore';

gsap.registerPlugin(ScrollTrigger);

const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const setIsScrolled = useHeaderStore(state => state.setIsScrolled);
  const setSectionState = useHeaderStore(state => state.setSectionState);
  const setIsInFooter = useHeaderStore(state => state.setIsInFooter);
  const reset = useHeaderStore(state => state.reset);
  const pathname = usePathname();

  useEffect(() => {
    // 1. Reset the store - wipe all section registrations from the old page
    // We assume pages start with a dark hero by default unless specified otherwise
    reset(true);
    
    // 2. Scroll to top immediately and synchronously
    window.scrollTo(0, 0);

    // 3. Global Scroll Position Tracking
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // 4. Delayed Refresh - wait for paint, then for content to settle
    const raf = requestAnimationFrame(() => {
      const timeout = setTimeout(() => {
        ScrollTrigger.refresh();
      }, 300); // Increased slightly for image/video hydration
      return () => clearTimeout(timeout);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      cancelAnimationFrame(raf);
    };
  }, [setIsScrolled, reset, setIsInFooter, pathname]);

  // Essential ScrollTrigger refresh for dynamic height changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      ScrollTrigger.refresh();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [pathname]);

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
      <ConsentDefaults />
      <GTMScript />
      <ConsentRestore />
      <ScrollToTop />
      <Header />
      {children}
      <Footer />
      <CookieBanner />
    </>
  );
};

export default WebLayout;
