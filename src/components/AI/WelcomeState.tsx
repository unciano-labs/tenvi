'use client';

import React from 'react';
import {
  Calendar,
  CreditCard,
  Banknote,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { ContextualSuggestion, getSuggestions } from './getSuggestions';

interface WelcomeStateProps {
  userName?: string;
  onSelectSuggestion: (prompt: string) => void;
  disabled?: boolean;
}

export function WelcomeState({
  userName,
  onSelectSuggestion,
  disabled = false,
}: WelcomeStateProps) {
  const firstName = userName ? userName.trim().split(' ')[0] : undefined;
  const suggestions = getSuggestions({ userName });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'due':
        return <Calendar className="w-4 h-4" />;
      case 'cards':
        return <CreditCard className="w-4 h-4" />;
      case 'cash':
      default:
        return <Banknote className="w-4 h-4" />;
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'due':
        return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 group-hover:bg-amber-500/20';
      case 'cards':
        return 'text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15 group-hover:bg-blue-500/20';
      case 'cash':
      default:
        return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 group-hover:bg-emerald-500/20';
    }
  };

  return (
    <div className="py-6 px-4 flex flex-col items-center text-center space-y-6 max-w-md mx-auto animate-in fade-in duration-200">
      {/* Centered Logo with Ambient Soft Glow */}
      <div className="relative pt-2">
        {/* Soft radial ambient glow */}
        <div
          className="absolute inset-0 -m-3 rounded-full bg-primary/10 dark:bg-primary/20 blur-xl pointer-events-none"
          aria-hidden="true"
        />
        <div className="relative w-16 h-16 rounded-3xl bg-card border border-border/60 shadow-card flex items-center justify-center">
          <TenviIcon variant="solid" className="w-10 h-10 rounded-2xl shadow-xs" />
        </div>
      </div>

      {/* Personalized Greeting */}
      <div className="space-y-1.5 px-2">
        <h3 className="text-xl font-extrabold text-foreground tracking-tight">
          {firstName ? `Hi, ${firstName}` : 'Welcome to Tenvi AI'}
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          How can I help with your finances today?
        </p>
      </div>

      {/* Contextual Suggestions Grid */}
      <div className="w-full space-y-2 text-left pt-1">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-1">
          Suggested insights
        </div>

        <div className="grid grid-cols-1 gap-2">
          {suggestions.map((item, idx) => {
            const themeClass = getCategoryTheme(item.category);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSuggestion(item.query)}
                disabled={disabled}
                style={{
                  animationDelay: `${idx * 40}ms`,
                }}
                className="group relative w-full p-3.5 rounded-2xl bg-card border border-border/50 hover:border-border/80 shadow-2xs hover:shadow-card transition-all duration-200 cursor-pointer text-left flex items-center justify-between gap-3 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/40 outline-none animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`size-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${themeClass}`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.2 rounded bg-muted/70 shrink-0">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Subtle Arrow on Hover/Focus */}
                <div
                  className="size-7 rounded-lg flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-focus:opacity-100 group-focus:translate-x-0 transition-all duration-200"
                  aria-hidden="true"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

