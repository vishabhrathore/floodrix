import { create } from 'zustand';

/**
 * ARCHITECTURE:
 * - Each section registers itself with a theme ('dark' | 'light') and a ref to its DOM element.
 * - On every scroll event (and on route change), we do a single getBoundingClientRect pass
 *   over all registered sections and pick whichever one currently covers the header (y=0..80).
 * - Route config declares the default theme for the first paint before any scroll happens.
 * - Footer is just another section with theme='dark'.
 *
 * Why this is reliable:
 * - No IntersectionObserver thresholds to tune or misfire.
 * - No "activate/deactivate" race conditions.
 * - Route change triggers a full reset + re-compute once the new page's sections register.
 * - Single source of truth: the DOM position at read time, not cached observer callbacks.
 */

export type SectionTheme = 'dark' | 'light';

interface RegisteredSection {
    el: HTMLElement;
    theme: SectionTheme;
}

interface HeaderStore {
    // ── Public state the Header reads ──────────────────────────────────────────
    isScrolled: boolean;
    isDarkSection: boolean; // true = text should be white; false = text should be dark
    isInFooter: boolean;

    // ── Internal registry (not reactive — just a plain object ref) ─────────────
    // We intentionally do NOT put the Map in Zustand state because mutating it
    // every scroll would cause unnecessary re-renders. The Header only re-renders
    // when isScrolled / isDarkSection / isInFooter change.
    _sections: Map<string, RegisteredSection>;
    _footerEl: HTMLElement | null;
    _scrollY: number;

    // ── Actions ────────────────────────────────────────────────────────────────
    registerSection: (id: string, el: HTMLElement, theme: SectionTheme) => void;
    unregisterSection: (id: string) => void;
    registerFooter: (el: HTMLElement | null) => void;

    /** Call this from a single scroll listener (e.g. in WebLayout). */
    onScroll: () => void;

    /**
     * Call on every route change BEFORE the new page renders.
     * `defaultDark`: true if the new page's first section has a dark/hero bg.
     */
    resetForRoute: (defaultDark: boolean) => void;
}

// How far down from the top of the viewport we consider "the header zone".
// Pick a value slightly below your header height.
const HEADER_ZONE_Y = 80;
const SCROLL_THRESHOLD = 10;

function computeTheme(
    sections: Map<string, RegisteredSection>,
    footerEl: HTMLElement | null
): { isDark: boolean; inFooter: boolean } | null {
    // ── Footer check ────────────────────────────────────────────────────────────
    if (footerEl) {
        const rect = footerEl.getBoundingClientRect();
        if (rect.top <= HEADER_ZONE_Y) {
            return { isDark: true, inFooter: true };
        }
    }

    // ── Find which section covers the header zone ────────────────────────────────
    let best: { el: HTMLElement; top: number; theme: SectionTheme } | null = null;

    for (const { el, theme } of sections.values()) {
        const rect = el.getBoundingClientRect();
        // A section "covers" the header if its top is above the zone and its bottom is below the top of the zone.
        const covers = rect.top <= HEADER_ZONE_Y && rect.bottom > 0;
        
        if (covers) {
            if (best === null) {
                best = { el, top: rect.top, theme };
            } else {
                // If both cover, pick the one that is LATER in the DOM (higher z-order usually)
                const position = el.compareDocumentPosition(best.el);
                if (position & Node.DOCUMENT_POSITION_PRECEDING) {
                    // el is AFTER best.el
                    best = { el, top: rect.top, theme };
                }
            }
        }
    }

    if (best) {
        return { isDark: best.theme === 'dark', inFooter: false };
    }

    return null;
}

export const useHeaderStore = create<HeaderStore>((set, get) => ({
    isScrolled: false,
    isDarkSection: true, // safe default — white text on dark hero
    isInFooter: false,

    _sections: new Map(),
    _footerEl: null,
    _scrollY: 0,

    registerSection: (id, el, theme) => {
        const store = get();
        store._sections.set(id, { el, theme });
        const result = computeTheme(store._sections, store._footerEl);
        if (result) {
            set({ isDarkSection: result.isDark, isInFooter: result.inFooter });
        }
    },

    unregisterSection: (id) => {
        const store = get();
        store._sections.delete(id);
        const result = computeTheme(store._sections, store._footerEl);
        if (result) {
            set({ isDarkSection: result.isDark, isInFooter: result.inFooter });
        }
    },

    registerFooter: (el) => {
        const store = get();
        // @ts-ignore
        store._footerEl = el;
        const result = computeTheme(store._sections, el);
        if (result) {
            set({ isDarkSection: result.isDark, isInFooter: result.inFooter });
        }
    },

    onScroll: () => {
        const store = get();
        const scrollY = window.scrollY;
        const isScrolled = scrollY > SCROLL_THRESHOLD;
        const result = computeTheme(store._sections, store._footerEl);

        let isDark = store.isDarkSection;
        if (result) {
            isDark = result.isDark;
        } else if (isScrolled) {
            // If we've scrolled and no section matches, it's likely a gap in the white background.
            // Default to dark text (isDark = false) for safety.
            isDark = false;
        }

        const inFooter = result ? result.inFooter : false;

        if (
            isScrolled !== store.isScrolled ||
            isDark !== store.isDarkSection ||
            inFooter !== store.isInFooter
        ) {
            set({ isScrolled, isDarkSection: isDark, isInFooter: inFooter });
        }
    },

    resetForRoute: (defaultDark) => {
        set({
            isDarkSection: defaultDark,
            isInFooter: false,
            isScrolled: false,
        });
    },
}));
