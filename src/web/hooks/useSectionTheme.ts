import { useEffect, useRef } from 'react';
import { useHeaderStore, SectionTheme } from '@/web/store/useHeaderStore';

/**
 * Drop this into any section component.
 *
 * @param id     - Stable unique ID for this section (e.g. 'hero', 'services', 'cta')
 * @param theme  - 'dark' if this section has a dark/colored background (white text needed)
 *                 'light' if this section has a white/light background (dark text needed)
 *
 * @example
 *   // Dark hero section
 *   const ref = useSectionTheme('hero', 'dark');
 *   return <section ref={ref} className="bg-brand-dark">…</section>
 *
 *   // Light content section
 *   const ref = useSectionTheme('about', 'light');
 *   return <section ref={ref} className="bg-white">…</section>
 */
export function useSectionTheme<T extends HTMLElement = HTMLElement>(id: string, theme: SectionTheme) {
    const ref = useRef<T>(null);
    const registerSection = useHeaderStore(s => s.registerSection);
    const unregisterSection = useHeaderStore(s => s.unregisterSection);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        registerSection(id, el, theme);
        return () => unregisterSection(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, theme]); // re-register if theme or id changes

    return ref;
}

/**
 * Use this on your Footer component.
 *
 * @example
 *   const ref = useFooterTheme();
 *   return <footer ref={ref} className="bg-black">…</footer>
 */
export function useFooterTheme<T extends HTMLElement = HTMLElement>() {
    const ref = useRef<T>(null);
    const registerFooter = useHeaderStore(s => s.registerFooter);

    useEffect(() => {
        registerFooter(ref.current);
        return () => registerFooter(null);
    }, [registerFooter]);

    return ref;
}
