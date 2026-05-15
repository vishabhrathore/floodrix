"use client";

import React, { useEffect } from "react";

import { gsap } from "gsap";
import { Facebook, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";

import { useFooterTheme } from "../hooks/useSectionTheme";

const Footer: React.FC = () => {
  const footerRef = useFooterTheme();

  useEffect(() => {
    const ctx = gsap.context(() => {
      const footerBrand = document.querySelector("#footer-brand-reveal");
      const footerSection = document.querySelector("#main-footer");

      if (footerBrand && footerSection) {
        gsap.fromTo(
          footerBrand,
          {
            y: 300,
            scale: 0.9,
            opacity: 0,
          },
          {
            y: 50,
            scale: 1,
            opacity: 0.08,
            ease: "none",
            scrollTrigger: {
              trigger: footerSection,
              start: "top bottom",
              end: "bottom bottom",
              scrub: 1,
            },
          },
        );

        // Content reveal
        gsap.from(".footer-stagger", {
          y: 40,
          opacity: 0,
          duration: 1,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: footerSection,
            start: "top 80%",
          },
        });
      }
    });

    return () => ctx.revert();
  }, []);

  return (
    <footer
      ref={footerRef}
      id="main-footer"
      className="bg-black text-white pt-32 pb-40 relative overflow-hidden min-h-[95vh] flex flex-col justify-start"
    >
      {/* Background Decorative Text - Parallax Target */}
      <div
        id="footer-brand-reveal"
        className="absolute bottom-0 left-0 w-full flex items-center justify-center select-none pointer-events-none opacity-0 overflow-hidden pb-10"
      >
        <span className="text-[35vh] md:text-[45vh] font-serif font-bold tracking-tighter leading-none text-white block transform-gpu whitespace-nowrap uppercase">
          FLOODRIX
        </span>
      </div>

      <div className="w-full px-6 md:px-20 lg:px-32 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 lg:gap-32 mb-32 items-start footer-stagger">
          {/* Brand & Mission */}
          <div className="lg:col-span-4 space-y-8 footer-stagger">
            <h3 className="text-2xl md:text-3xl font-serif leading-tight text-white/90">
              Transforming{" "}
              <span className="italic text-brand-red">water hazards</span> into
              infrastructure assets.
            </h3>
            <p className="text-white/40 leading-relaxed font-light text-lg">
              We leverage advanced computational hydraulics and decades of
              engineering expertise to build climate-resilient water systems for
              the modern world.
            </p>
            <div className="flex space-x-4 pt-4">
              <a
                href="#"
                className="bg-white/5 p-4 rounded-full hover:bg-brand-red transition-all group border border-white/5 hover:border-brand-red"
              >
                <Linkedin className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                className="bg-white/5 p-4 rounded-full hover:bg-brand-red transition-all group border border-white/5 hover:border-brand-red"
              >
                <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                className="bg-white/5 p-4 rounded-full hover:bg-brand-red transition-all group border border-white/5 hover:border-brand-red"
              >
                <Facebook className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 footer-stagger">
            {/* Quick Links */}
            <div className="footer-stagger">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] mb-10 text-brand-red">
                Solutions
              </h4>
              <ul className="space-y-6 text-white/50 font-light text-base">
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Hydraulics & Hydrology
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Flood Risk Assessment
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Highway Drainage
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Urban Modelling
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Groundwater Systems
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="footer-stagger">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] mb-10 text-brand-red">
                Practice Areas
              </h4>
              <ul className="space-y-6 text-white/50 font-light text-base">
                <li>
                  <a
                    href="/works"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Projects
                  </a>
                </li>
                <li>
                  <a
                    href="/team"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Leadership
                  </a>
                </li>
                <li>
                  <a
                    href="/capabilities"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Capabilities
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Insights
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-white hover:pl-2 transition-all"
                  >
                    Sustainability
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-10 footer-stagger">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] mb-10 text-brand-red">
                Headquarters
              </h4>
              <div className="space-y-8">
                <div className="flex gap-5 group">
                  <div className="bg-white/5 p-3 rounded-lg h-inner flex items-center justify-center group-hover:bg-brand-teal/20 transition-colors">
                    <MapPin className="w-5 h-5 text-brand-teal" />
                  </div>
                  <span className="text-white/50 font-light leading-relaxed">
                    1200 Innovation Way,
                    <br />
                    Tech Hub 560001, India
                  </span>
                </div>
                <div className="flex gap-5 group">
                  <div className="bg-white/5 p-3 rounded-lg h-inner flex items-center justify-center group-hover:bg-brand-teal/20 transition-colors">
                    <Mail className="w-5 h-5 text-brand-teal" />
                  </div>
                  <span className="text-white/50 font-light leading-relaxed">
                    solutions@floodrix.eco
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-16 flex flex-col md:flex-row justify-between items-center text-white/30 text-[10px] font-mono uppercase tracking-widest leading-none gap-8 footer-stagger">
          <p className="order-2 md:order-1 opacity-60">
            © 2026 FloodRix Global Engineering. All Rights Reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 order-1 md:order-2">
            <a href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="/terms" className="hover:text-white transition-colors">
              Terms of Service
            </a>
            <a
              href="/cookie-policy"
              className="hover:text-white transition-colors"
            >
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
