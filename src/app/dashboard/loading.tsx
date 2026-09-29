import React from 'react';
import { Skeleton, SkeletonStatCard, SkeletonTableRow } from '@/components/UI/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* 1. Header Placeholder */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 sm:w-72 rounded-2xl" />
          <Skeleton className="h-4 w-44 sm:w-60 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-28 rounded-2xl" />
          <Skeleton className="h-10 w-36 rounded-2xl" />
        </div>
      </div>

      {/* 2. Stat Cards Grid (4 Cards: Money In, Money Out, Net Savings, Cash Float) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* 3. Middle Section: Cash Flow & Quick Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 border border-slate-100 space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          {/* Chart placeholder */}
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 border border-slate-100 space-y-4">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-3.5 w-48 rounded-md mb-4" />
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </div>
        </div>
      </div>

      {/* 4. Recent Transactions List Placeholder */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 border border-slate-100 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-32 rounded-md" />
          </div>
          <Skeleton className="h-7 w-20 rounded-xl" />
        </div>

        <div className="space-y-3">
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
          <SkeletonTableRow />
        </div>
      </div>
    </div>
  );
}
