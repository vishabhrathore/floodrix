"use client";

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { BLOGS } from '../constants';

const Blog: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('All');

  const categories = ['All', ...Array.from(new Set(BLOGS.map(b => b.category)))];

  const filtered = activeFilter === 'All'
    ? BLOGS
    : BLOGS.filter(b => b.category === activeFilter);

  return (
    <div className="pt-40 pb-24 bg-[#fafafa] min-h-screen">
      <div className="w-full px-6 md:px-20 lg:px-32">

        {/* ── Page Header ── */}
        <div className="mb-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="max-w-2xl">
            <span className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-[0.4em] mb-5 block">
              Engineering Library — Technical Insights
            </span>
            <h1
              className="font-sans font-bold text-brand-dark leading-[1.08] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              Domain Analysis &<br />
              <span className="font-serif italic font-normal text-gray-500">Field Intelligence</span>
            </h1>
          </div>

          {/* ── Category Filters ── */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={[
                  'px-5 py-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-all',
                  activeFilter === cat
                    ? 'bg-brand-dark text-white'
                    : 'border border-gray-200 text-gray-400 hover:border-brand-dark hover:text-brand-dark bg-white',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Blog Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-16">
          {filtered.map((post, idx) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07, duration: 0.5 }}
              viewport={{ once: true }}
            >
              <Link href={`/blog/${post.id}`} className="group block">

                {/* ── Image ── */}
                <div className="relative aspect-[3/2] overflow-hidden mb-6">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-[1.03]"
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Arrow — top right */}
                  <div className="absolute top-4 right-4 w-9 h-9 bg-white flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
                    <ArrowUpRight className="w-4 h-4 text-brand-dark" />
                  </div>

                  {/* Category pill — top left */}
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/95 backdrop-blur-sm px-3 py-1.5 text-[9px] font-mono font-bold uppercase tracking-widest text-brand-dark">
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* ── Card Body ── */}
                <div className="space-y-3">

                  {/* Date + Read time */}
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                    <Calendar className="w-3 h-3" />
                    <span>{post.date}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 inline-block" />
                    <Clock className="w-3 h-3" />
                    <span>{post.readTime}</span>
                  </div>

                  {/* Title — sans-serif, consistent with project cards */}
                  <h2
                    className="font-sans font-bold text-brand-dark tracking-tight leading-snug group-hover:text-brand-red transition-colors duration-300"
                    style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.4rem)' }}
                  >
                    {post.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm font-sans text-gray-500 leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>

                  {/* Read CTA */}
                  <div className="pt-3 flex items-center gap-2 text-[10px] font-mono font-bold text-brand-red uppercase tracking-widest">
                    Read Analysis
                    <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>

                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* ── Newsletter ── */}
        <div className="mt-36 border border-gray-100 bg-white p-12 md:p-20 text-center shadow-sm">
          <div className="max-w-xl mx-auto space-y-8">
            <div>
              <p className="text-[10px] font-mono font-bold text-brand-red uppercase tracking-[0.3em] mb-4">
                Engineering Dispatch
              </p>
              <h3
                className="font-sans font-bold text-brand-dark tracking-tight"
                style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)' }}
              >
                Join 2,500+ Engineering Leaders
              </h3>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Monthly technical deep dives, regulatory updates, and sector innovations — directly to your inbox.
            </p>
            <div className="flex flex-col md:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="professional@email.com"
                className="flex-1 px-6 py-3.5 bg-gray-50 border border-gray-100 focus:outline-none focus:border-brand-red transition-colors text-sm font-sans"
              />
              <button className="bg-brand-dark text-white px-8 py-3.5 text-[10px] font-mono font-bold uppercase tracking-widest hover:bg-brand-red transition-all rounded-xl">
                Subscribe
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Blog;