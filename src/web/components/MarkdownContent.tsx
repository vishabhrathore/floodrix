"use client";

import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose-custom ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          h2: ({ node, children, ...props }) => {
            const text = String(children);
            const hid = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return (
              <h2
                id={hid}
                className="font-serif font-bold text-brand-dark mt-20 mb-8 scroll-mt-32"
                style={{ fontSize: 'clamp(1.35rem, 2vw, 1.75rem)', lineHeight: 1.25 }}
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ node, children, ...props }) => {
            const text = String(children);
            const hid = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return (
              <h3
                id={hid}
                className="font-sans font-bold text-brand-dark mt-14 mb-5 pl-4 border-l-2 border-brand-red scroll-mt-32"
                style={{ fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)', lineHeight: 1.3 }}
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4: ({ node, ...props }) => (
            <h4
              className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-brand-red mb-4 mt-10"
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
              className="my-14 border-l-2 border-brand-red pl-8 font-serif italic text-gray-500 bg-gray-50/50 py-4 pr-6"
              style={{ fontSize: '1.125rem', lineHeight: 1.7 }}
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="space-y-3 mb-10 list-none" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside ml-5 mb-10 space-y-3 font-sans" {...props} />
          ),
          li: ({ node, children, ...props }) => {
            // Check if parent is ol
            const isOrdered = node?.parent?.tagName === 'ol';
            if (isOrdered) {
              return (
                <li
                  className="text-gray-700 leading-relaxed pl-1"
                  style={{ fontSize: '1.0625rem' }}
                  {...props}
                >
                  {children}
                </li>
              );
            }
            return (
              <li className="flex gap-4 items-start text-gray-700" style={{ fontSize: '1.0625rem', lineHeight: 1.75 }}>
                <div className="w-1 h-1 rounded-full bg-brand-red mt-3 flex-shrink-0" />
                <span>{children}</span>
              </li>
            );
          },
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-brand-dark" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-14 border border-gray-100 shadow-sm bg-white">
              <table className="w-full text-left border-collapse font-sans" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gray-50 border-b border-gray-100" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-6 py-4 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-400" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-6 py-5 text-sm text-gray-600 border-b border-gray-50 leading-relaxed align-top" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-gray-50/50 transition-colors" {...props} />
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};

export default MarkdownContent;
