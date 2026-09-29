import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'neutral' | 'positive' | 'negative' | 'warning';
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  variant = 'neutral',
  className = '',
}: StatCardProps) {
  const variantStyles = {
    neutral: {
      iconBg: 'bg-slate-100',
      iconText: 'text-slate-700',
      badgeBg: 'bg-slate-100 text-slate-700',
    },
    positive: {
      iconBg: 'bg-emerald-50',
      iconText: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-800',
    },
    negative: {
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-700',
      badgeBg: 'bg-rose-50 text-rose-800',
    },
    warning: {
      iconBg: 'bg-amber-50',
      iconText: 'text-amber-800',
      badgeBg: 'bg-amber-50 text-amber-900',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className={`bg-white rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wide leading-snug">
          {label}
        </span>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl ${style.iconBg} ${style.iconText} flex items-center justify-center shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div
        className="text-xl sm:text-2xl lg:text-[1.75rem] font-extrabold tracking-tight text-slate-900 mb-1 truncate leading-tight"
        title={value}
      >
        {value}
      </div>

      {subtext && (
        <p className="text-xs text-slate-500 font-medium truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}
