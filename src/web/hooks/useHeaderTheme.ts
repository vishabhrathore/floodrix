"use client";

import { useEffect, useId } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useHeaderStore } from '../store/useHeaderStore';

gsap.registerPlugin(ScrollTrigger);

/**
 * A robust hook for managing header theme transitions.
 * Uses a registration system and 4-point trigger callbacks to avoid race conditions.
 */
export const useHeaderTheme = (theme: 'dark' | 'light', ref: React.RefObject<HTMLElement | null>) => {
  const id = useId();
  const registerSection = useHeaderStore(state => state.registerSection);
  const unregisterSection = useHeaderStore(state => state.unregisterSection);
  const setActiveSectionTheme = useHeaderStore(state => state.setActiveSectionTheme);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // 1. Register section immediately
    registerSection(id, theme);

    // 2. Create the ScrollTrigger
    const trigger = ScrollTrigger.create({
      trigger: element,
      start: "top 80px",
      end: "bottom 80px",
      onEnter: (self) => {
        setActiveSectionTheme(id, theme, true, self.trigger?.getBoundingClientRect().top);
      },
      onLeave: () => {
        setActiveSectionTheme(id, theme, false);
      },
      onEnterBack: (self) => {
        setActiveSectionTheme(id, theme, true, self.trigger?.getBoundingClientRect().top);
      },
      onLeaveBack: () => {
        setActiveSectionTheme(id, theme, false);
      },
    });

    return () => {
      trigger.kill();
      unregisterSection(id);
    };
  }, [id, theme, ref, registerSection, unregisterSection, setActiveSectionTheme]);
};
