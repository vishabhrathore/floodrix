"use client";

import React, { useEffect } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { motion, useScroll, useSpring } from "framer-motion";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Share2,
} from "lucide-react";

import MarkdownContent from "../components/MarkdownContent";
import { BLOGS, TEAM } from "../constants";

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const blog = BLOGS.find((b) => b.id === id);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    const timer = setTimeout(() => {
      ScrollTrigger.refresh();
      if ((window as any).lenis) {
        (window as any).lenis.resize();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [id]);

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-xs font-mono text-gray-400 uppercase tracking-widest mb-4">
            404 — Not found
          </p>
          <h1 className="text-3xl font-sans font-semibold text-brand-dark mb-6">
            Article not found
          </h1>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-brand-red hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Engineering Library
          </Link>
        </div>
      </div>
    );
  }

  const teamMember = TEAM.find((t) => t.name === blog.author);
  const references = blog.references ?? [];

  return (
    <div className="min-h-screen bg-white pb-32 selection:bg-brand-red/10 selection:text-brand-dark">
      {/* ── Reading Progress Bar ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-brand-red origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* ── ARUP Style Hero ── */}
      <header className="pt-32 pb-16">
        <div className="w-full px-6 md:px-20 lg:px-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                <span className="text-[10px] font-sans font-bold text-gray-500 uppercase tracking-widest px-2.5 py-1 bg-gray-50 rounded-full border border-gray-100">
                  {blog.category}
                </span>
              </div>
              <h1 className="text-h2 font-serif text-brand-dark leading-[1.2] tracking-tight mb-8">
                {blog.title}
              </h1>
              <p className="text-h4 font-sans font-light leading-relaxed max-w-xl">
                {blog.excerpt}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gray-100 bg-gray-50 shadow-sm"
            >
              <img
                src={blog.image}
                alt={blog.title}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── Author & Meta Row ── */}
      <div className="w-full px-6 md:px-20 lg:px-32 border-y border-gray-100 py-8 mb-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 border border-gray-100">
              <img
                src={teamMember?.image}
                alt={blog.author}
                className="w-full h-full object-cover grayscale"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-dark leading-tight">
                {blog.author}
              </p>
              <p className="text-[10px] text-gray-400 font-sans uppercase tracking-wider">
                {teamMember?.expertise?.[0]} Leader
              </p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-mono text-gray-400 uppercase tracking-widest mb-0.5">
                Last updated
              </p>
              <p className="text-[11px] font-bold text-brand-dark">
                {blog.date}
              </p>
            </div>
            <button
              onClick={() =>
                navigator.share?.({
                  title: blog.title,
                  url: window.location.href,
                })
              }
              className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-gray-200 text-[11px] font-bold text-brand-dark hover:border-brand-red hover:text-brand-red transition-all group"
            >
              Share{" "}
              <Share2 className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content Section ── */}
      <main className="w-full px-6 md:px-20 lg:px-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 items-start">
          {/* Main Article Body */}
          <article className="lg:col-span-8 lg:pr-12">
            <div className="prose prose-lg prose-serif max-w-none text-brand-dark leading-[1.8]">
              <MarkdownContent content={blog.content} />
            </div>
          </article>

          {/* Sidebar Tools */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[120px] space-y-12">
            {/* Citations/References (Scrollable) */}
            {references.length > 0 && (
              <div className="px-2 space-y-8">
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-[0.3em] font-bold">
                  Citations
                </p>
                <div className="max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                  <div className="space-y-6">
                    {references.map((ref, i) => (
                      <div
                        key={i}
                        className="group border-b border-gray-50 pb-4 last:border-0"
                      >
                        <p className="text-[9px] font-mono text-gray-300 font-bold uppercase mb-2">
                          Source {String(i + 1).padStart(2, "0")}
                        </p>
                        {ref.url ? (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-sans font-medium text-gray-600 hover:text-brand-red transition-colors block leading-snug"
                          >
                            {ref.label}
                          </a>
                        ) : (
                          <p className="text-[13px] font-sans font-medium text-gray-600 leading-snug">
                            {ref.label}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Technical Context */}
            <div className="px-2 pt-8 border-t border-gray-50 space-y-8">
              {blog.regulatoryScope && (
                <div>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-2">
                    Standard
                  </p>
                  <p className="text-xs font-bold text-brand-dark uppercase tracking-tight">
                    {blog.regulatoryScope}
                  </p>
                </div>
              )}
              {blog.geographicScope && (
                <div>
                  <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-2">
                    Region
                  </p>
                  <p className="text-xs font-medium text-gray-600">
                    {blog.geographicScope}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default BlogDetail;
