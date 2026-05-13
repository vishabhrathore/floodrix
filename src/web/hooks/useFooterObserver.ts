"use client";

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useHeaderStore } from '../store/useHeaderStore';

gsap.registerPlugin(ScrollTrigger);

/**
 * A custom hook specifically for the Footer to report when it is active.
 * Ensures the header turns solid black at the bottom of the page.
 */
export const useFooterObserver = (ref: React.RefObject<HTMLElement | null>) => {
  const setIsInFooter = useHeaderStore(state => state.setIsInFooter);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const trigger = ScrollTrigger.create({
      trigger: element,
      start: "top 80",
      end: "bottom bottom",
      onEnter: () => setIsInFooter(true),
      onEnterBack: () => setIsInFooter(true),
      onLeaveBack: () => setIsInFooter(false),
    });

    return () => {
      trigger.kill();
      // Important: Reset state when the component unmounts (route change)
      setIsInFooter(false);
    };
  }, [setIsInFooter, ref]);
};
