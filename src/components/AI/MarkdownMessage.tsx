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
    <div className="text-[13px] leading-relaxed text-foreground space-y-1.5 markdown-chat-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed font-medium text-[13px] text-foreground">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-foreground/90">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-[13px] marker:text-muted-foreground">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-[13px] font-medium marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-sm font-extrabold text-foreground mt-2.5 mb-1">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-2 mb-1">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-foreground mt-1.5 mb-0.5">{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="px-3.5 py-2 my-2 bg-primary/10 text-foreground rounded-xl italic text-xs">
              {children}
            </blockquote>
          ),
          pre: ({ children }: any) => (
            <pre className="bg-muted text-foreground p-3 rounded-xl font-mono text-xs my-2 overflow-x-auto">
              {children}
            </pre>
          ),
          code: ({ className, children }: any) => {
            const isBlock = /language-/.test(className || '') || String(children).includes('\n');
            if (!isBlock) {
              return (
                <code className="bg-muted text-foreground px-1.5 py-0.5 rounded-md font-mono text-[12px] font-semibold">
                  {children}
                </code>
              );
            }
            return <code className={className}>{children}</code>;
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-2 rounded-xl bg-card shadow-xs">
              <table className="min-w-full text-xs text-left">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/80 text-foreground font-bold">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody>{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/50 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="p-2 font-bold text-foreground text-xs">{children}</th>
          ),
          td: ({ children }) => <td className="p-2 text-foreground/85">{children}</td>,
          hr: () => <div className="my-2.5 h-1 bg-muted/60 rounded-full" />,
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
