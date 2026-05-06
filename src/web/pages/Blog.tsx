"use client";

import React from 'react';
import { motion } from 'motion/react';
import { Calendar, User, ArrowRight, Tag } from 'lucide-react';
import {} from 'next/navigation'
import Link from 'next/link';

import { BLOGS } from '../constants';

const Blog: React.FC = () => {
  return (
    <div className="pt-40 pb-24 bg-[#fcfcfc] min-h-screen">
      <div className="w-full px-6 md:px-20 lg:px-32">
        <div className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="max-w-2xl">
            <span className="text-[10px] font-bold text-brand-red uppercase tracking-[0.4em] mb-6 block font-sans">
              Engineering Journal — Updates & Expertise
            </span>
            <h1 className="text-4xl md:text-5xl font-serif text-brand-dark leading-tight">
              Thoughts from <br/><span className="italic">The Edge.</span>
            </h1>
          </div>
          <div className="flex gap-4">
            {["All", "Engineering", "Innovation", "Urbanism"].map((cat) => (
              <button 
                key={cat}
                className="px-6 py-2 rounded-full border border-gray-100 hover:border-brand-red transition-colors text-sm font-medium text-gray-500 hover:text-brand-dark"
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
          {BLOGS.map((post, idx) => (
            <motion.article 
              key={post.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <Link href={`/blog/${post.id}`}>
                <div className="aspect-[16/10] overflow-hidden rounded-3xl mb-8 relative">
                  <motion.img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                    whileHover={{ scale: 1.05 }}
                  />
                  <div className="absolute top-6 left-6 px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-dark">
                    {post.category}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-6 text-[11px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                    <span className="flex items-center gap-2 tracking-widest"><Calendar className="w-3 h-3" /> {post.date}</span>
                    <span className="flex items-center gap-2">{post.readTime}</span>
                  </div>
                  
                  <h2 className="text-3xl font-serif text-brand-dark leading-tight group-hover:text-brand-red transition-colors">
                    {post.title}
                  </h2>
                  
                  <p className="text-gray-500 leading-relaxed font-sans text-lg line-clamp-2">
                    {post.excerpt}
                  </p>
                  
                  <div className="pt-4 flex items-center gap-3 text-brand-red font-bold uppercase tracking-widest text-[10px]">
                    Read Analysis <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Subscribe Section */}
        <div className="mt-40 bg-gray-50 rounded-[3rem] p-12 md:p-24 text-center">
          <div className="max-w-2xl mx-auto space-y-10">
            <h3 className="text-4xl font-serif text-brand-dark">Join 2,500+ Engineering Leaders</h3>
            <p className="text-gray-500 text-lg">
              Get monthly technical deep dives, regulatory updates, and sector innovations delivered to your inbox.
            </p>
            <form className="flex flex-col md:flex-row gap-4 max-w-lg mx-auto">
              <input 
                type="email" 
                placeholder="professional@email.com"
                className="flex-1 px-8 py-4 rounded-full bg-white border border-gray-100 focus:outline-none focus:border-brand-red transition-colors"
                required
              />
              <button className="bg-brand-dark text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-brand-red transition-all">
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blog;
