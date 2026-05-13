"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Droplets, ChevronDown, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeaderStore } from '@/web/store/useHeaderStore';

const Header: React.FC = () => {
  const isScrolled = useHeaderStore(state => state.isScrolled);
  const isDarkSection = useHeaderStore(state => state.isDarkSection);
  const isInFooter = useHeaderStore(state => state.isInFooter);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // State management is now handled globally in WebLayout via useHeaderStore

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = ''; 
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

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
    { name: 'Services', href: '/capabilities' },
    { name: 'Projects', href: '/works' },
    { name: 'Leadership', href: '/team' },
    { name: 'Digital Tools', href: '/platform' },
    { name: 'Insights', href: '/blog' },
    { name: 'Contact', href: '/#contact' },
  ];

  const isHome = pathname === '/';

  // Reset states on route change
  useEffect(() => {
    setIsMenuOpen(false); 
  }, [pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-700 translate-y-0 ${isScrolled || !isHome
          ? isInFooter
            ? 'bg-black py-3 border-b border-transparent'
            : isDarkSection
              ? 'bg-transparent backdrop-blur-xl border-b border-white/5 py-3 shadow-2xl'
              : 'bg-transparent backdrop-blur-xl border-b border-brand-dark/5 py-3 shadow-xl'
          : 'bg-transparent border-b border-transparent py-6'
          }`}>
        <div className="w-full px-4 md:px-12 lg:px-20 flex justify-between items-center">
          {/* Logo Section */}
          <Link href="/" className="flex items-center space-x-4 group">

            <span className={`text-h3 font-serif font-bold transition-colors duration-500 ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'text-brand-dark' : 'text-white'
              }`}>
              FLOOD<span className="text-brand-red">RIX</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-12">
            {navLinks.map((link) => (
              <div key={link.name} className="relative group">
                {link.href.startsWith('/#') ? (
                  <a
                    href={link.href}
                    className={`flex items-center gap-2.5 text-nav font-medium hover:text-brand-red transition-all py-2 ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'text-brand-dark' : 'text-white'
                      }`}
                  >
                    {link.name}
                    {link.dropdown && <ChevronDown className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-300 opacity-50" />}
                  </a>
                ) : (
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2.5 text-nav font-medium capitalize hover:text-brand-red transition-all py-2 ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'text-brand-dark' : 'text-white'
                      }`}
                  >
                    {link.name}
                  </Link>
                )}

                {link.dropdown && (
                  <div className="absolute top-full left-0 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-500 transform group-hover:translate-y-0 translate-y-4">
                    <div className={`w-72 rounded-xl shadow-2xl overflow-hidden border border-white/10 ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'bg-white/80 backdrop-blur-2xl' : 'bg-brand-dark/90 backdrop-blur-3xl'
                      }`}>
                      <div className="p-3 grid grid-cols-1 gap-1">
                        {link.dropdown.map((subItem) => (
                          <a
                            key={subItem.name}
                            href={subItem.href}
                            className={`flex items-center gap-4 px-5 py-4 rounded-lg transition-all group/item ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter)
                              ? 'text-gray-600 hover:bg-gray-50 hover:text-brand-red'
                              : 'text-white/60 hover:bg-white/5 hover:text-white'
                              }`}
                          >
                            <div className={`p-2 rounded-lg transition-colors ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'bg-gray-100' : 'bg-white/5 group-hover/item:bg-brand-teal'
                              }`}>
                              {React.cloneElement(subItem.icon as React.ReactElement<any>, {
                                className: "w-4 h-4"
                              })}
                            </div>
                            <span className="text-[11px] font-bold capitalize tracking-wider">{subItem.name}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className={`h-8 w-[1px] mx-2 ${(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'bg-gray-200' : 'bg-white/10'}`} />

          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-3"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className={(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'text-brand-dark' : 'text-white'} />
            ) : (
              <Menu className={(isScrolled || !isHome) && (!isDarkSection && !isInFooter) ? 'text-brand-dark' : 'text-white'} />
            )}
          </button>
        </div>

        {/* Futuristic Bottom Scan Line - Overflow constrained here */}
        <div className="absolute bottom-0 inset-x-0 overflow-hidden h-[1px]">
          <div className={`h-full bg-gradient-to-r from-transparent via-brand-red to-transparent transition-all duration-1000 ${isScrolled || !isHome ? 'w-full opacity-40' : 'w-0 opacity-0'}`} />
        </div>
      </nav>

      {/* Mobile Menu Overlay - Outside nav to avoid clipping */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }} // FIX: Replaced spring with tween
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

              <div className="flex-1 overflow-y-auto px-8 py-10 space-y-8">
                {navLinks.map((link, idx) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    {link.href.startsWith('/#') ? (
                      <a
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="group flex items-center justify-between text-white/70 hover:text-brand-red text-2xl font-serif transition-colors"
                      >
                        {link.name}
                        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="group flex items-center justify-between text-white/70 hover:text-brand-red text-2xl font-serif transition-colors"
                      >
                        {link.name}
                        <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
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

export default Header;