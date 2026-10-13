import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'neutral' | 'positive' | 'negative' | 'warning';
  className?: string;
  dataTour?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'neutral',
  className = '',
  dataTour,
}: StatCardProps) {
  const variantStyles = {
    neutral: {
      iconBg: 'bg-muted text-muted-foreground',
      iconText: 'text-muted-foreground',
      badgeBg: 'bg-muted text-muted-foreground',
    },
    positive: {
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      iconText: 'text-emerald-600 dark:text-emerald-400',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    negative: {
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      iconText: 'text-rose-600 dark:text-rose-400',
      badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      iconText: 'text-amber-600 dark:text-amber-400',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
  };

  const style = variantStyles[variant];

  return (
    <div
      data-tour={dataTour}
      className={`bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-shadow min-w-0 overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-xs sm:text-xs font-bold text-muted-foreground uppercase tracking-wide leading-snug">
          {label}
        </span>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${style.iconBg} ${style.iconText} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div
        className="text-xl sm:text-2xl lg:text-[1.75rem] font-extrabold tracking-tight text-foreground mb-1 truncate leading-tight"
        title={value}
      >
        {value}
      </div>

      {subtext && (
        <p className="text-xs text-muted-foreground font-medium truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}
