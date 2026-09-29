'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
  isUser?: boolean;
}

export function MarkdownMessage({ content, isUser = false }: MarkdownMessageProps) {
  if (isUser) {
    return (
      <div className="font-medium text-[13px] leading-relaxed whitespace-pre-wrap">
        {content}
      </div>
    );
  }

  return (
    <div className="text-[13px] leading-relaxed text-slate-800 space-y-1.5 markdown-chat-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed font-medium text-[13px] text-slate-800">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-[13px] marker:text-slate-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-[13px] font-medium marker:text-slate-500">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-sm font-extrabold text-slate-950 mt-2.5 mb-1">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-2 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-slate-900 mt-1.5 mb-0.5">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-400 pl-3 py-1 my-2 bg-indigo-50/50 text-indigo-900 rounded-r-xl italic text-xs">
              {children}
            </blockquote>
          ),
          pre: ({ children }: any) => (
            <pre className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-xs my-2 overflow-x-auto">
              {children}
            </pre>
          ),
          code: ({ className, children }: any) => {
            const isBlock = /language-/.test(className || '') || String(children).includes('\n');
            if (!isBlock) {
              return (
                <code className="bg-slate-100 text-indigo-700 px-1.5 py-0.5 rounded-md font-mono text-[12px] font-semibold">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-xl bg-slate-50 shadow-xs">
              <table className="min-w-full text-xs text-left border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-200/60 text-slate-900 font-bold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-200/60">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-100/50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="p-2 font-bold text-slate-900 text-xs">{children}</th>
          ),
          td: ({ children }) => <td className="p-2 text-slate-700">{children}</td>,
          hr: () => <hr className="my-2.5 border-t border-slate-200/70" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
