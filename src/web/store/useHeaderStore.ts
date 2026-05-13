import { create } from 'zustand';

interface SectionEntry {
  id: string;
  theme: 'dark' | 'light';
  isActive: boolean;
  // Track DOM position so we can pick the right one
  // when multiple sections overlap the header zone
  top: number;
}

interface HeaderStore {
  isScrolled: boolean;
  isInFooter: boolean;
  // The computed value the Header actually reads
  isDarkSection: boolean;
  activeSectionId: string | null;
  
  // Internal stack
  sections: Map<string, SectionEntry>;
  
  setIsScrolled: (v: boolean) => void;
  setIsInFooter: (v: boolean) => void;
  setSectionState: (isDark: boolean, id: string | null) => void; // Keeping for compatibility, but moving to register
  
  registerSection: (id: string, theme: 'dark' | 'light') => void;
  unregisterSection: (id: string) => void;
  setActiveSectionTheme: (id: string, theme: 'dark' | 'light', isActive: boolean, top?: number) => void;
  
  // Call this on route change to wipe state
  reset: (defaultDark: boolean) => void;
}

function computeIsDark(sections: Map<string, SectionEntry>): boolean {
  // Among all currently active sections, pick the one
  // whose top is closest to (but above) the header.
  const active = [...sections.values()].filter(s => s.isActive);
  if (active.length === 0) return false;
  
  // The section whose top is highest on screen (smallest positive top value, or largest negative if partially off)
  // But since we trigger at top 80, the one with the largest 'top' value among active ones is the one that started latest.
  // Actually, the one that is currently "under" the header.
  active.sort((a, b) => b.top - a.top); 
  return active[0].theme === 'dark';
}

export const useHeaderStore = create<HeaderStore>((set, get) => ({
  isScrolled: false,
  isInFooter: false,
  isDarkSection: true, // Default to dark for hero
  activeSectionId: null,
  sections: new Map(),

  setIsScrolled: (v) => set({ isScrolled: v }),
  setIsInFooter: (v) => set({ isInFooter: v }),

  // Deprecated but kept for small components
  setSectionState: (isDark, id) => set({ isDarkSection: isDark, activeSectionId: id }),

  registerSection: (id, theme) => {
    const sections = new Map(get().sections);
    sections.set(id, { id, theme, isActive: false, top: 0 });
    set({ sections });
  },

  unregisterSection: (id) => {
    const sections = new Map(get().sections);
    sections.delete(id);
    const isDark = computeIsDark(sections);
    set({ sections, isDarkSection: isDark });
  },

  setActiveSectionTheme: (id, theme, isActive, top = 0) => {
    const sections = new Map(get().sections);
    const existing = sections.get(id);
    if (!existing && !isActive) return;
    
    sections.set(id, { 
      id, 
      theme, 
      isActive, 
      top: isActive ? top : (existing?.top || 0) 
    });
    
    const isDark = computeIsDark(sections);
    set({ sections, isDarkSection: isDark, activeSectionId: isActive ? id : get().activeSectionId });
  },

  reset: (defaultDark) => {
    set({
      sections: new Map(),
      isDarkSection: defaultDark,
      isInFooter: false,
      isScrolled: false,
      activeSectionId: null
    });
  },
}));
