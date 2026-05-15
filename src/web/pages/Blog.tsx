"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, ArrowUpRight, Search, FileText, ChevronRight, Hash } from 'lucide-react';
import Link from 'next/link';
import { BLOGS } from '../constants';
import { useSectionTheme } from '../hooks/useSectionTheme';

const Blog: React.FC = () => {
  const containerRef = useSectionTheme<HTMLDivElement>('blog-container', 'light');
  const [activeFilter, setActiveFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(BLOGS.map(b => b.category)))];

  const filtered = activeFilter === 'All'
    ? BLOGS
    : BLOGS.filter(b => b.category === activeFilter);

  const featuredPost = filtered[0];
  const remainingPosts = filtered.slice(1);

  return (
    <div ref={containerRef} className="pt-32 md:pt-40 pb-48 bg-[#ffffff] min-h-screen selection:bg-brand-red/10 selection:text-brand-dark">
      <div className="w-full px-6 md:px-20 lg:px-32">

        {/* ── Formal Header (ARUP Style) ── */}
        <header className="mb-24">
          <div className="max-w-4xl mb-16">
            <h1 className="text-5xl md:text-7xl font-serif text-brand-dark tracking-tight mb-8">
              Insights
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 font-sans font-light leading-relaxed">
              Our experts share their insights, gained from shaping the built environment.
              Explore our ideas for creating a low carbon, resilient, and more equitable future.
            </p>
          </div>

          {/* ── Filter Bar ── */}
          <div className="flex flex-wrap gap-3 items-center">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`
                  px-6 py-2 text-[13px] font-sans transition-all rounded-full border
                  ${activeFilter === cat
                    ? 'bg-brand-dark text-white border-brand-dark'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-brand-dark hover:text-brand-dark'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* ── Featured Analysis (Rounded [2.5rem]) ── */}
            {featuredPost && (
              <section className="mb-32 group">
                <Link href={`/blog/${featuredPost.id}`} className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
                  <div className="lg:col-span-7 overflow-hidden rounded-[2.5rem] relative aspect-[16/9] shadow-xl shadow-black/5">
                    <img
                      src={featuredPost.image}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-brand-dark/5 group-hover:bg-transparent transition-all duration-700" />
                  </div>
                  <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="text-[11px] font-mono font-bold text-brand-red uppercase tracking-widest">
                        {featuredPost.category}
                      </span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full" />
                      <span className="text-[11px] font-mono text-gray-400 uppercase tracking-widest">
                        {featuredPost.readTime}
                      </span>
                    </div>
                    <h2 className="text-h2 font-serif text-brand-dark tracking-tight leading-tight group-hover:text-brand-red transition-colors duration-500">
                      {featuredPost.title}
                    </h2>
                    <p className="text-body text-gray-500 font-sans font-light leading-relaxed line-clamp-3">
                      {featuredPost.excerpt}
                    </p>
                    <div className="pt-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-brand-dark uppercase tracking-tight group-hover:text-brand-red transition-colors">
                        Read Story <ArrowUpRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* ── Technical Grid (Rounded [2.5rem]) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-24">
              {remainingPosts.map((post, idx) => (
                <motion.article
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  viewport={{ once: true }}
                  className="group"
                >
                  <Link href={`/blog/${post.id}`} className="block space-y-8">
                    <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 rounded-[2.5rem] shadow-lg shadow-black/[0.03]">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover grayscale transition-all duration-1000 group-hover:grayscale-0 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-brand-dark/5" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                        <span className="text-brand-red">{post.category}</span>
                        <span className="w-1 h-1 bg-gray-200 rounded-full" />
                        <span>{post.readTime}</span>
                      </div>

                      <h2 className="text-h3 font-serif text-brand-dark tracking-tight leading-tight group-hover:text-brand-red transition-colors duration-500">
                        {post.title}
                      </h2>

                      <p className="text-body text-gray-500 font-sans font-light leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>

                      <div className="pt-4 flex items-center gap-2 text-[11px] font-bold text-brand-dark uppercase tracking-widest group-hover:text-brand-red transition-colors">
                        View Insight <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                </motion.article>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* ── Professional Technical Access ── */}
        <section className="mt-64 pt-32 border-t border-gray-100">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <h2 className="text-4xl font-serif text-brand-dark tracking-tight leading-tight mb-8">
                Stay updated with the <br />
                <span className="italic text-brand-red">Technical Dispatch.</span>
              </h2>
              <p className="text-lg text-gray-500 font-sans font-light leading-relaxed max-w-md">
                Formal notification of regulatory updates, peer-reviewed analysis, and case documentation.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center w-full">
              <input
                type="email"
                placeholder="professional@email.com"
                className="flex-1 w-full bg-[#f9f9f9] border border-gray-100 px-8 py-5 text-sm font-sans focus:outline-none focus:border-brand-dark transition-all rounded-full"
              />
              <button className="w-full md:w-auto bg-brand-dark text-white px-10 py-5 text-[11px] font-mono font-bold uppercase tracking-[0.3em] hover:bg-brand-red transition-all whitespace-nowrap rounded-full">
                Subscribe
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Blog;