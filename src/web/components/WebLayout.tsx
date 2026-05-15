"use client";

import React, { useEffect } from "react";

import { usePathname } from "next/navigation";

import Lenis from "@studio-freight/lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import ConsentDefaults from "@/components/ConsentDefaults";
import ConsentRestore from "@/components/ConsentRestore";
import CookieBanner from "@/components/CookieBanner";
import GTMScript from "@/components/GTMScript";
import { useHeaderStore } from "@/web/store/useHeaderStore";

import Footer from "./Footer";
import Header from "./Header";
import ScrollToTop from "./ScrollToTop";

gsap.registerPlugin(ScrollTrigger);

/**
 * Per-route default theme.
 *
 * 'dark'  → page starts with a dark/hero background  → header text = white
 * 'light' → page starts with a white/light background → header text = dark
 */
const ROUTE_DEFAULT_THEME: Array<{
  match: (p: string) => boolean;
  dark: boolean;
}> = [
  { match: (p) => p === "/", dark: true }, // homepage hero
  { match: (p) => p.startsWith("/capabilities"), dark: false },
  { match: (p) => p.startsWith("/works"), dark: true },
  { match: (p) => p.startsWith("/team"), dark: true },
  { match: (p) => p.startsWith("/platform"), dark: true },
  { match: (p) => p.startsWith("/blog"), dark: false },
  { match: (p) => p.startsWith("/contact"), dark: false },
  { match: (p) => p.startsWith("/privacy"), dark: false },
  { match: (p) => p.startsWith("/terms"), dark: false },
  { match: (p) => p.startsWith("/cookie-policy"), dark: false },
];

function getDefaultDark(pathname: string): boolean {
  const match = ROUTE_DEFAULT_THEME.find((r) => r.match(pathname));
  return match?.dark ?? true; // default to dark if unknown route
}

const WebLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const resetForRoute = useHeaderStore((s) => s.resetForRoute);
  const onScroll = useHeaderStore((s) => s.onScroll);

  // ── Route change: reset store BEFORE the new page's sections register ───────
  useEffect(() => {
    // Scroll to top immediately and synchronously
    window.scrollTo({ top: 0, behavior: "instant" });
    resetForRoute(getDefaultDark(pathname));

    // After reset, give the new page one frame to mount its sections,
    // then re-compute based on current scroll (which is 0 after the scroll above).
    const raf = requestAnimationFrame(() => {
      onScroll();
      ScrollTrigger.refresh();
    });
    return () => cancelAnimationFrame(raf);
  }, [pathname, resetForRoute, onScroll]);

  // ── Single passive scroll listener for the whole app ────────────────────────
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          onScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Compute once on mount in case the page loads mid-scroll
    onScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [onScroll]);

  // ── Lenis Smooth Scroll ──
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    });

    lenis.on("scroll", () => {
      ScrollTrigger.update();
      onScroll(); // Sync header theme with Lenis scroll
    });

    const raf = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    const handleResize = () => {
      lenis.resize();
    };

    window.addEventListener("resize", handleResize);
    document.documentElement.classList.add("lenis");
    (window as any).lenis = lenis;

    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 500);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(raf);
      window.removeEventListener("resize", handleResize);
      document.documentElement.classList.remove("lenis");
      (window as any).lenis = undefined;
    };
  }, [onScroll]);

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
