"use client";

import React, { useEffect } from 'react';
import { useParams, } from 'next/navigation'
import Link from 'next/link';
import { BLOGS } from '../constants';
import { ArrowLeft, Clock, User, Calendar, Share2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion } from 'motion/react';

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const blog = BLOGS.find(b => b.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!blog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <h1 className="text-4xl font-serif text-brand-dark mb-4">Post not found</h1>
          <Link href="/blog" className="text-brand-red hover:underline flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" /> Back to Insights
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Article Header */}
      <header className="pt-40 pb-20 px-6 md:px-20 lg:px-32">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8 }}
        >
          <Link href="/blog" className="inline-flex items-center gap-2 text-gray-400 hover:text-brand-red transition-colors mb-12 uppercase text-[10px] font-bold tracking-[0.3em]">
             <ArrowLeft className="w-4 h-4" /> Back to Library
          </Link>
          
          <div className="flex items-center gap-6 mb-8 text-[10px] font-mono text-brand-red uppercase tracking-widest font-bold">
            <span className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> {blog.date}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> {blog.readTime}
            </span>
            <span className="px-3 py-1 bg-gray-50 rounded-full text-gray-500">
               {blog.category}
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-serif text-brand-dark tracking-tighter leading-[1.1] mb-12">
            {blog.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-8 pt-8 border-t border-gray-100">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center text-brand-red font-serif text-lg">
                   {blog.author.charAt(0)}
                </div>
                <div>
                   <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest leading-none mb-1">Written by</p>
                   <p className="text-sm font-bold text-brand-dark">{blog.author}</p>
                </div>
             </div>
             <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-brand-dark transition-colors">
                <Share2 className="w-4 h-4" /> Share Article
             </button>
          </div>
        </motion.div>
      </header>

      {/* Featured Image */}
      <section className="px-6 md:px-20 lg:px-32 mb-20">
         <div className="aspect-[21/9] w-full overflow-hidden rounded-[3rem]">
            <img src={blog.image} alt={blog.title} className="w-full h-full object-cover" />
         </div>
      </section>

      {/* Content */}
      <article className="px-6 md:px-20 lg:px-32">
        <div className="markdown-body prose prose-lg prose-brand max-w-none">
          <Markdown>{blog.content}</Markdown>
        </div>
      </article>

      {/* Footer CTA */}
      <section className="mt-32 px-6 md:px-20 lg:px-32">
         <div className="bg-brand-dark rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(251,54,64,0.1),transparent_50%)]" />
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-8 relative z-10">
               Engineering the future of <span className="italic text-white/40">water resilience?</span>
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
               <Link 
                 href="/contact" 
                 className="px-10 py-4 bg-brand-red text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-full hover:bg-white hover:text-brand-red transition-all"
               >
                  Work with us
               </Link>
               <Link 
                 href="/blog" 
                 className="px-10 py-4 bg-white/5 text-white border border-white/10 text-[10px] font-bold uppercase tracking-[0.3em] rounded-full hover:bg-white/10 transition-all"
               >
                  Browse more insights
               </Link>
            </div>
         </div>
      </section>
    </div>
  );
};

export default BlogDetail;
