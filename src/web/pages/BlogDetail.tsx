"use client";

import React, { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { BLOGS, TEAM } from '../constants';
import {
  ArrowLeft, Clock, Calendar, ExternalLink,
  Share2, FileText, ChevronRight
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, useScroll, useSpring } from 'framer-motion';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const blog = BLOGS.find(b => b.id === id);

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

  const domains = blog.domains ?? [];
  const references = blog.references ?? [];
  const teamMember = TEAM.find(t => t.name === blog.author);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-32 selection:bg-brand-red/10 selection:text-brand-dark">

      {/* ── Reading Progress Bar ── */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-brand-red origin-left z-[100]"
        style={{ scaleX }}
      />

      {/* ── Page Header ── */}
      <header className="pt-32 pb-20 bg-white border-b border-gray-100">
        <div className="w-full mx-auto px-6 md:px-20 lg:px-32">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >

            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 mb-10 text-[11px] font-mono text-gray-400 uppercase tracking-widest font-bold">
              <Link
                href="/blog"
                className="hover:text-brand-red transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Engineering Library
              </Link>
              <ChevronRight className="w-3 h-3 opacity-40" />
              <span className="text-brand-red">{blog.category}</span>
            </nav>

            {/* Meta row — date · read time · category only */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mb-10 text-[11px] font-mono text-gray-400 uppercase tracking-[0.14em]">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{blog.date}</span>
              </div>
              <div className="w-px h-3 bg-gray-200" />
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{blog.readTime}</span>
              </div>
              <div className="w-px h-3 bg-gray-200" />
              <span>{blog.category}</span>
            </div>

            {/* Title — sans-serif, tight tracking */}
            <h1
              className="font-sans font-bold text-brand-dark tracking-tight mb-8 max-w-4xl"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.25rem)', lineHeight: 1.08 }}
            >
              {blog.title}
            </h1>

            {/* Excerpt — Lora serif italic for contrast */}
            <p
              className="font-serif italic text-gray-500 max-w-3xl leading-[1.75] mb-16"
              style={{ fontSize: 'clamp(1rem, 1.5vw, 1.2rem)' }}
            >
              {blog.excerpt}
            </p>

            {/* ── Author / Credibility Block ── */}
            <div className="flex flex-wrap items-center gap-10 border-t border-gray-100 pt-10">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
                  {teamMember?.image ? (
                    <img
                      src={teamMember.image}
                      alt={blog.author}
                      className="w-full h-full object-cover grayscale"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 font-bold mb-0.5">
                    Lead Analyst
                  </p>
                  <p className="text-sm font-bold text-brand-dark leading-snug">
                    {blog.author}
                  </p>
                  {teamMember?.edu && (
                    <p className="text-[11px] text-gray-400 mt-0.5">{teamMember.edu}</p>
                  )}
                </div>
              </div>

              <div className="hidden sm:block w-px h-10 bg-gray-100" />

              {/* Verified badge */}
              <div>
                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-0.5">
                  Peer Reviewed
                </p>
                <p className="text-sm font-medium text-gray-500">
                  Verified Technical Analysis
                </p>
              </div>

              {/* Governing Standard inline badge */}
              {blog.regulatoryScope && (
                <>
                  <div className="hidden sm:block w-px h-10 bg-gray-100" />
                  <div>
                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-0.5">
                      Governing Standard
                    </p>
                    <p className="text-sm font-bold text-brand-dark">
                      {blog.regulatoryScope}
                    </p>
                  </div>
                </>
              )}
            </div>

          </motion.div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="w-full mx-auto px-6 md:px-20 lg:px-32 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-20 items-start">

          {/* ── Article Body ── */}
          <article className="lg:col-span-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >

              {/* Featured image — tighter aspect ratio */}
              <div className="aspect-[16/8] w-full overflow-hidden rounded-2xl mb-20 shadow-xl shadow-gray-200/60 bg-gray-100 border border-gray-100">
                <img
                  src={blog.image}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Readable column — max ~72ch */}
              <div className="max-w-[72ch] prose-custom">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h2: ({ node, ...props }) => (
                      <h2
                        className="font-serif font-bold text-brand-dark mt-20 mb-8 tracking-tight"
                        style={{ fontSize: 'clamp(1.35rem, 2vw, 1.75rem)', lineHeight: 1.25 }}
                        {...props}
                      />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3
                        className="font-sans font-bold text-brand-dark mt-14 mb-6 tracking-tight"
                        style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)', lineHeight: 1.3 }}
                        {...props}
                      />
                    ),
                    p: ({ node, ...props }) => (
                      <p
                        className="font-sans text-gray-700 leading-[1.82] mb-10"
                        style={{ fontSize: '1.0625rem' }}
                        {...props}
                      />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote
                        className="my-14 border-l-2 border-brand-red pl-8 font-serif italic text-gray-500"
                        style={{ fontSize: '1.125rem', lineHeight: 1.7 }}
                        {...props}
                      />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-outside ml-5 mb-10 space-y-3 font-sans" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-outside ml-5 mb-10 space-y-3 font-sans" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li
                        className="text-gray-700 leading-relaxed pl-1"
                        style={{ fontSize: '1.0625rem' }}
                        {...props}
                      />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-bold text-brand-dark" {...props} />
                    ),
                    table: ({ node, ...props }) => (
                      <div className="my-16 overflow-x-auto rounded-xl border border-gray-100 shadow-sm bg-white">
                        <table
                          className="w-full text-left border-collapse font-sans text-sm"
                          {...props}
                        />
                      </div>
                    ),
                    thead: ({ node, ...props }) => (
                      <thead className="bg-gray-50 border-b border-gray-100" {...props} />
                    ),
                    th: ({ node, ...props }) => (
                      <th
                        className="px-6 py-4 text-[11px] font-mono uppercase tracking-widest text-gray-400 font-bold"
                        {...props}
                      />
                    ),
                    td: ({ node, ...props }) => (
                      <td
                        className="px-6 py-5 text-gray-600 border-b border-gray-50 align-top leading-relaxed"
                        {...props}
                      />
                    ),
                    tr: ({ node, ...props }) => (
                      <tr className="hover:bg-gray-50/50 transition-colors" {...props} />
                    ),
                  }}
                >
                  {blog.content}
                </Markdown>
              </div>

            </motion.div>
          </article>

          {/* ── Sidebar ── */}
          <aside className="lg:col-span-4 lg:sticky lg:top-[100px] z-10 lg:self-start lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto lg:no-scrollbar pb-10" data-lenis-prevent>
            <div className="space-y-8 w-full">

              {/* ── Technical Reference Card ── */}
              <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">

                {/* Card header */}
                <div className="px-7 py-5 border-b border-gray-100 bg-gray-50/60">
                  <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
                    Technical Reference
                  </p>
                </div>

                <div className="px-7 py-7 space-y-7">

                  {/* Governing Standard */}
                  {blog.regulatoryScope && (
                    <div>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-2">
                        Governing Standard
                      </p>
                      <p className="text-sm font-bold text-brand-dark leading-snug">
                        {blog.regulatoryScope}
                      </p>
                    </div>
                  )}

                  {/* Applicable Region */}
                  {blog.geographicScope && (
                    <div>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-2">
                        Applicable Region
                      </p>
                      <p className="text-sm font-medium text-gray-700 leading-snug">
                        {blog.geographicScope}
                      </p>
                    </div>
                  )}

                  {/* Tools Referenced */}
                  {blog.methodologies && blog.methodologies.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-3">
                        Tools Referenced
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {blog.methodologies.map((m, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-gray-50 text-gray-500 text-[10px] font-mono font-bold border border-gray-150 rounded-sm"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Analysis Type — derived from methodologies if IDF present */}
                  {blog.methodologies?.some(m =>
                    m.toLowerCase().includes('idf')
                  ) && (
                      <div>
                        <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold mb-2">
                          Analysis Type
                        </p>
                        <p className="text-sm font-medium text-gray-700">
                          IDF Curve Analysis
                        </p>
                      </div>
                    )}

                </div>
              </div>

              {/* ── Scientific Sources ── */}
              {references.length > 0 && (
                <div className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-7 py-5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest font-mono">
                      References
                    </p>
                    <span className="text-[9px] font-mono text-gray-300 font-bold">
                      {references.length} sources
                    </span>
                  </div>
                  <div className="px-7 py-6 space-y-7">
                    {references.map((ref, i) => (
                      <div key={i} className="flex gap-5 group">
                        <span className="text-[10px] font-mono text-gray-300 pt-0.5 flex-shrink-0 font-bold w-5">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="space-y-1">
                          {ref.url ? (
                            <a
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[12px] font-sans font-semibold text-gray-600 hover:text-brand-red leading-snug flex items-start gap-1.5 transition-colors"
                            >
                              <span className="flex-1">{ref.label}</span>
                              <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60 transition-all" />
                            </a>
                          ) : (
                            <p className="text-[12px] font-sans font-semibold text-gray-600 leading-snug">
                              {ref.label}
                            </p>
                          )}
                          {ref.source && (
                            <p className="text-[9px] font-mono text-gray-300 font-bold uppercase tracking-widest">
                              {ref.source}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Actions ── */}
              <div className="space-y-3">
                {blog.reportUrl && (
                  <a
                    href={blog.reportUrl}
                    className="flex items-center justify-between w-full px-5 py-4 bg-brand-dark text-white rounded-2xl hover:bg-brand-red transition-all group shadow-lg shadow-brand-dark/10"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-white/50" />
                      <span className="text-[10px] font-mono font-black uppercase tracking-widest">
                        Source Document
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
                <button
                  onClick={() =>
                    navigator.share?.({ title: blog.title, url: window.location.href })
                  }
                  className="flex items-center gap-3 w-full px-5 py-4 border border-gray-200 rounded-2xl text-gray-500 hover:text-brand-dark hover:border-brand-dark transition-all group"
                >
                  <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest">
                    Share Article
                  </span>
                </button>
              </div>

            </div>
          </aside>

        </div>
      </main>

    </div>
  );
};

export default BlogDetail;