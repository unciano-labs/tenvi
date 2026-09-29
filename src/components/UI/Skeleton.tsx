import React from 'react';

/**
 * Base accessible Skeleton primitive.
 * Zero-gradient, solid neutral pulse for maximum contrast and low visual fatigue.
 */
export function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-slate-200/80 animate-pulse rounded-xl ${className}`}
      {...props}
    />
  );
}

/**
 * Skeleton for Dashboard Stat Cards.
 * Matches StatCard.tsx dimensions pixel-for-pixel to eliminate Cumulative Layout Shift (CLS).
 */
export function SkeletonStatCard() {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <Skeleton className="h-4 w-24 rounded-lg" />
        <Skeleton className="w-10 h-10 rounded-2xl shrink-0" />
      </div>

      <div>
        <Skeleton className="h-8 w-32 rounded-xl mb-2" />
        <Skeleton className="h-4 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Transaction / Ledger rows.
 */
export function SkeletonTableRow() {
  return (
    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32 sm:w-44 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
        <Skeleton className="h-5 w-20 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Credit Card visual cards.
 */
export function SkeletonCreditCard() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-slate-200 flex flex-col justify-between min-h-[220px]">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <Skeleton className="h-3.5 w-16 rounded-md" />
        </div>
        <Skeleton className="w-10 h-10 rounded-2xl" />
      </div>

      <div className="space-y-3 my-4">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20 rounded-md" />
          <Skeleton className="h-3 w-16 rounded-md" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-4 w-20 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Account / Pocket cards (GCash, Maya, Bank).
 */
export function SkeletonAccountCard() {
  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border-2 border-slate-200 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0">
        <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>
      <div className="text-right space-y-1 shrink-0">
        <Skeleton className="h-5 w-24 rounded-lg ml-auto" />
        <Skeleton className="h-3 w-14 rounded-md ml-auto" />
      </div>
    </div>
  );
}
