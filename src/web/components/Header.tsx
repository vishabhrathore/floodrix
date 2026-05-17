"use client";

import React, { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ArrowRight, ChevronDown, Droplets, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { useHeaderStore } from "@/web/store/useHeaderStore";

// ─────────────────────────────────────────────────────────────────────────────
// Theme helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true when the header should show WHITE text/icons.
 * This happens when:
 *   - We are on a dark section (hero, dark feature block, footer, etc.)
 *   - OR the page hasn't scrolled yet and the first section is dark (isHome covers this
 *     via isDarkSection being true by default on those routes)
 */
function useWhiteText() {
  const isScrolled = useHeaderStore((s) => s.isScrolled);
  const isDarkSection = useHeaderStore((s) => s.isDarkSection);
  const isInFooter = useHeaderStore((s) => s.isInFooter);

  // White text when: currently in a dark section OR in footer OR not yet scrolled on a dark-start page
  return isDarkSection || isInFooter || (!isScrolled && isDarkSection);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface NavLink {
  name: string;
  href: string;
  dropdown?: {
    name: string;
    href: string;
    icon: React.ReactNode;
  }[];
}

const navLinks: NavLink[] = [
  { name: "Services", href: "/capabilities" },
  { name: "Projects", href: "/works" },
  { name: "Leadership", href: "/team" },
  { name: "Digital Tools", href: "/platform" },
  { name: "Insights", href: "/blog" },
  { name: "Contact", href: "/contact" },
];

const Header: React.FC = () => {
  const isScrolled = useHeaderStore((s) => s.isScrolled);
  const isDarkSection = useHeaderStore((s) => s.isDarkSection);
  const isInFooter = useHeaderStore((s) => s.isInFooter);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const whiteText = useWhiteText();

  // Close menu on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  // ── Nav background ────────────────────────────────────────────────────────
  const navBg = (() => {
    if (!isScrolled) return "bg-transparent";
    if (isInFooter) return "bg-black";
    if (isDarkSection) return "bg-transparent backdrop-blur-xl";
    return "bg-white/80 backdrop-blur-xl";
  })();

  const navBorder = (() => {
    if (!isScrolled) return "border-transparent";
    if (isDarkSection || isInFooter) return "border-white/5";
    return "border-brand-dark/5";
  })();

  const navShadow =
    isScrolled && !isDarkSection && !isInFooter ? "shadow-xl" : "";
  const navPy = isScrolled ? "py-3" : "py-6";

  // ── Text / icon color ─────────────────────────────────────────────────────
  const textColor = whiteText ? "text-white" : "text-brand-dark";
  const hoverText = "hover:text-brand-red";

  // ── Dropdown background ───────────────────────────────────────────────────
  const dropdownBg =
    !isDarkSection && !isInFooter && isScrolled
      ? "bg-white/80 backdrop-blur-2xl"
      : "bg-brand-dark/90 backdrop-blur-3xl";
  const dropdownItemColor =
    !isDarkSection && !isInFooter && isScrolled
      ? "text-gray-600 hover:bg-gray-50 hover:text-brand-red"
      : "text-white/60 hover:bg-white/5 hover:text-white";
  const dropdownIconBg =
    !isDarkSection && !isInFooter && isScrolled
      ? "bg-gray-100"
      : "bg-white/5 group-hover/item:bg-brand-teal";

  return (
    <>
      <nav
        className={`
          fixed top-0 inset-x-0 z-50 transition-all duration-700
          border-b ${navBorder} ${navBg} ${navShadow} ${navPy}
        `}
      >
        <div className="w-full px-4 md:px-12 lg:px-20 flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-4 group">
            <span
              className={`text-h3 font-serif font-bold transition-colors duration-300 ${textColor}`}
            >
              FLOOD<span className="text-brand-red">RIX</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center space-x-12">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group">
                <NavItem
                  link={link}
                  textColor={textColor}
                  hoverText={hoverText}
                />

                {link.dropdown && (
                  <div className="absolute top-full left-0 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <div
                      className={`w-72 rounded-xl shadow-2xl overflow-hidden border border-white/10 ${dropdownBg}`}
                    >
                      <div className="p-3 grid grid-cols-1 gap-1">
                        {link.dropdown.map((sub) => (
                          <a
                            key={sub.name}
                            href={sub.href}
                            className={`flex items-center gap-4 px-5 py-4 rounded-lg transition-all group/item ${dropdownItemColor}`}
                          >
                            <div
                              className={`p-2 rounded-lg transition-colors ${dropdownIconBg}`}
                            >
                              {React.cloneElement(
                                sub.icon as React.ReactElement<{
                                  className?: string;
                                }>,
                                {
                                  className: "w-4 h-4",
                                },
                              )}
                            </div>
                            <span className="text-[11px] font-bold capitalize tracking-wider">
                              {sub.name}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div
              className={`h-8 w-[1px] mx-2 ${whiteText ? "bg-white/10" : "bg-gray-200"}`}
            />
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-3"
            onClick={() => setIsMenuOpen((v) => !v)}
          >
            {isMenuOpen ? (
              <X className={textColor} />
            ) : (
              <Menu className={textColor} />
            )}
          </button>
        </div>

        {/* Scan line */}
        <div className="absolute bottom-0 inset-x-0 overflow-hidden h-[1px]">
          <div
            className={`h-full bg-gradient-to-r from-transparent via-brand-red to-transparent transition-all duration-1000 ${isScrolled ? "w-full opacity-40" : "w-0 opacity-0"}`}
          />
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-[400px] bg-brand-dark z-[70] md:hidden border-l border-white/5 flex flex-col"
            >
              <div className="p-8 flex items-center justify-between border-b border-white/5">
                <div className="flex items-center space-x-3">
                  <div className="bg-brand-red p-2 rounded-lg">
                    <Droplets className="text-white w-5 h-5" />
                  </div>
                  <span className="text-xl font-serif font-bold tracking-tighter text-white">
                    FLOOD<span className="text-brand-red">RIX</span>
                  </span>
                </div>
                <button
                  className="p-2 text-white/50 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-3">
                {navLinks.map((link, idx) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    {link.href.startsWith("/#") ? (
                      <a
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="group flex items-center justify-between py-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red scale-0 group-hover:scale-100 transition-transform duration-300" />
                          <span className="text-[17px] font-serif tracking-wide text-white/75 group-hover:text-brand-red transition-colors">
                            {link.name}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all duration-300" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="group flex items-center justify-between py-2 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-red scale-0 group-hover:scale-100 transition-transform duration-300" />
                          <span className="text-[17px] font-serif tracking-wide text-white/75 group-hover:text-brand-red transition-colors">
                            {link.name}
                          </span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-brand-red opacity-0 group-hover:opacity-100 -translate-x-3 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helper so the link rendering isn't repeated
// ─────────────────────────────────────────────────────────────────────────────
function NavItem({
  link,
  textColor,
  hoverText,
}: {
  link: NavLink;
  textColor: string;
  hoverText: string;
}) {
  const cls = `flex items-center gap-2.5 text-nav font-medium capitalize transition-all py-2 ${textColor} ${hoverText}`;

  if (link.href.startsWith("/#")) {
    return (
      <a href={link.href} className={cls}>
        {link.name}
        {link.dropdown && (
          <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300 opacity-50" />
        )}
      </a>
    );
  }

  return (
    <Link href={link.href} className={cls}>
      {link.name}
      {link.dropdown && (
        <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300 opacity-50" />
      )}
    </Link>
  );
}

export default Header;
