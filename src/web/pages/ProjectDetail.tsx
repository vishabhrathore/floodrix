"use client";

import React, { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ArrowLeft, ChevronRight, FileText, Share2 } from "lucide-react";
import { motion, useScroll, useSpring } from "motion/react";

import MarkdownContent from "../components/MarkdownContent";
import { PROJECTS } from "../constants";

/* ─────────────────────────────────────────────
   Tiny hook: track which heading is in-view
   for the sticky TOC
───────────────────────────────────────────── */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");

  useEffect(() => {
    if (!ids.length) return;
    const observers: IntersectionObserver[] = [];

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(id);
        },
        { rootMargin: "-20% 0px -70% 0px" },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids]);

  return active;
}

/* ─────────────────────────────────────────────
   Helper: extract headings from markdown
───────────────────────────────────────────── */
function extractHeadings(md: string) {
  const lines = md.split("\n");
  const headings: { id: string; label: string; level: number }[] = [];

  lines.forEach((line) => {
    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (m) {
      const label = m[2].replace(/\*\*/g, "").trim();
      const id = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      headings.push({ id, label, level: m[1].length });
    }
  });

  return headings;
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const project = PROJECTS.find((p) => p.id === id);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">
            404 — Not found
          </p>
          <h1 className="text-3xl font-sans font-semibold text-brand-dark mb-6">
            Project not found
          </h1>
          <Link
            href="/works"
            className="inline-flex items-center gap-2 text-sm text-brand-red hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Engineering Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const headings = project.fullContent
    ? extractHeadings(project.fullContent)
    : [];
  const tocIds = headings.map((h) => h.id);
  const activeSection = useActiveSection(tocIds);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32 selection:bg-brand-red/10 selection:text-brand-dark">
      {/* ── Reading Progress Bar ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-brand-red origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* ── Page Header ── */}
      <header className="pt-40 pb-20 px-6 md:px-20 lg:px-32 bg-white border-b border-gray-100">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >
          {/* Back nav */}
          <Link
            href="/works"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-red transition-colors mb-10 uppercase text-[10px] font-mono font-bold tracking-[0.3em]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Engineering Portfolio
          </Link>

          {/* Category + Location pills */}
          <div className="flex flex-wrap items-center gap-3 mb-7">
            <span className="px-3 py-1 bg-brand-red/5 text-brand-red text-[10px] font-mono font-bold uppercase tracking-widest border border-brand-red/10 rounded-sm">
              {project.category}
            </span>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
              {project.location}
            </span>
          </div>

          {/* Title */}
          <h1
            className="font-sans font-bold text-brand-dark tracking-tight leading-[1.06] mb-7"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)" }}
          >
            {project.title}
          </h1>

          {/* Description — serif italic */}
          <p
            className="font-serif italic text-gray-500 leading-[1.7] max-w-3xl"
            style={{ fontSize: "clamp(1rem, 1.4vw, 1.2rem)" }}
          >
            {project.description}
          </p>
        </motion.div>
      </header>

      {/* ── Hero Image ── */}
      <section className="px-6 md:px-20 lg:px-32 py-14 bg-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="relative aspect-[21/8] w-full overflow-hidden rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100"
        >
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover grayscale-[15%] hover:grayscale-0 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
        </motion.div>
      </section>

      {/* ── Main Content Grid ── */}
      <section className="px-6 md:px-20 lg:px-32 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
          {/* ── Left: Narrative ── */}
          <div className="lg:col-span-8 space-y-20">
            {/* Challenge & Solution — card treatment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 overflow-hidden bg-white shadow-sm">
              {/* Challenge */}
              <div className="p-9 border-b md:border-b-0 md:border-r border-gray-100">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-brand-red mb-5">
                  The Challenge
                </p>
                <p
                  className="font-serif text-brand-dark leading-snug"
                  style={{ fontSize: "clamp(1.1rem, 1.5vw, 1.35rem)" }}
                >
                  {project.challenge}
                </p>
              </div>
              {/* Solution */}
              <div className="p-9 bg-gray-50/40">
                <p className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-gray-400 mb-5">
                  The Solution
                </p>
                <p className="text-base text-gray-600 leading-relaxed">
                  {project.solution}
                </p>
              </div>
            </div>

            {/* Engineered Outcomes — refined dark card */}
            <div className="bg-brand-dark p-10 md:p-12 text-white relative overflow-hidden">
              {/* subtle red glow */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-brand-red/8 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none" />

              <h3
                className="font-serif italic mb-10"
                style={{ fontSize: "clamp(1.35rem, 2vw, 1.75rem)" }}
              >
                Engineered <span className="text-brand-red">Outcomes</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/10">
                {project.impact?.map((item, idx) => (
                  <div
                    key={idx}
                    className="py-6 md:py-0 md:px-8 first:pl-0 last:pr-0 space-y-3"
                  >
                    {/* No "Metric 0X" label — removed as per audit */}
                    <p className="text-sm font-medium text-white/85 leading-snug">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Case Study Body ── */}
            {project.fullContent && (
              <div className="border-t border-gray-100 pt-16">
                {/* Constrained readable column */}
                <div className="max-w-[72ch]">
                  <MarkdownContent content={project.fullContent} />
                </div>
              </div>
            )}

            {/* ── Related Blog Cross-Reference ── */}
            {project.relatedBlogId && (
              <div className="border border-gray-100 bg-white p-9 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-brand-red mb-3">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                      Related Analysis
                    </span>
                  </div>
                  <h4
                    className="font-serif text-brand-dark leading-snug"
                    style={{ fontSize: "clamp(1rem, 1.4vw, 1.25rem)" }}
                  >
                    Read the technical domain analysis for this project
                  </h4>
                </div>
                <Link
                  href={`/blog/${project.relatedBlogId}`}
                  className="flex-shrink-0 flex items-center gap-3 px-7 py-4 bg-brand-dark text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-brand-red transition-all shadow-lg shadow-brand-dark/10 group"
                >
                  View Analysis
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[120px] space-y-8">
            {headings.length > 0 && (
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-7 py-5 border-b border-gray-100 bg-gray-50/60">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
                    In This Report
                  </h4>
                </div>
                <nav className="px-7 py-6 space-y-1">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      className={[
                        "block py-2 text-[11px] font-mono transition-colors leading-snug",
                        h.level === 2
                          ? "font-bold"
                          : "pl-3 font-medium text-gray-400",
                        activeSection === h.id
                          ? "text-brand-red"
                          : "text-gray-400 hover:text-brand-dark",
                      ].join(" ")}
                    >
                      {/* Active indicator */}
                      {activeSection === h.id && (
                        <span className="inline-block w-1 h-1 rounded-full bg-brand-red mr-2 mb-0.5 align-middle" />
                      )}
                      {h.label}
                    </a>
                  ))}
                </nav>
              </div>
            )}

            {/* Technical Specifications */}
            <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-7 py-5 border-b border-gray-100 bg-gray-50/60">
                <h4 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
                  Technical Specifications
                </h4>
              </div>
              <div className="px-7 py-7 space-y-7">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold mb-2">
                    Client
                  </span>
                  <p className="text-sm font-bold text-brand-dark">
                    {project.client}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold mb-2">
                    Year
                  </span>
                  <p className="text-sm font-bold text-brand-dark">
                    {project.year}
                  </p>
                </div>

                {project.technicalData && project.technicalData.length > 0 && (
                  <div className="pt-6 border-t border-gray-100 space-y-7">
                    {project.technicalData.map((data, idx) => (
                      <div key={idx}>
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold mb-2">
                          {data.label}
                        </span>
                        <p className="text-sm font-medium text-gray-700 leading-snug">
                          {data.value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Table of Contents (only when there are headings) ── */}

            {/* ── Share ── */}
            <button
              onClick={() =>
                navigator.share?.({
                  title: project.title,
                  url: window.location.href,
                })
              }
              className="flex items-center justify-center gap-3 w-full py-4 border border-gray-200 bg-white text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 hover:text-brand-dark hover:border-brand-dark transition-all group shadow-sm rounded-2xl"
            >
              <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Share Project
            </button>
          </aside>
        </div>
      </section>
    </div>
  );
};

export default ProjectDetail;
