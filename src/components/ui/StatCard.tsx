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
      className={`@container flex min-w-0 flex-col bg-card text-card-foreground rounded-2xl p-5 shadow-card ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <span className="min-w-0 text-label text-muted-foreground">
          {label}
        </span>
        <div className={`size-9 rounded-xl ${style.iconBg} ${style.iconText} flex items-center justify-center shrink-0`}>
          <Icon className="size-4.5" />
        </div>
      </div>

      <div
        className="num text-figure text-foreground whitespace-nowrap"
        /* Figure scales with the card so 9-digit amounts never break mid-number */
        style={{ fontSize: 'min(var(--text-figure), 11cqi)' }}
        title={value}
      >
        {value}
      </div>

      {subtext && (
        <p className="mt-auto pt-2 text-xs leading-snug text-muted-foreground">
          {subtext}
        </p>
      )}
    </div>
  );
}
