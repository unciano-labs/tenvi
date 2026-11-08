import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/* Mirrors the overview layout (banner → net worth hero + 3 stats → chart/donut → card/activity)
   using the same container-query grid so content doesn't jump when data arrives. */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy="true" aria-label="Loading dashboard">
      {/* 1. Welcome banner */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-32 rounded-md" />
        <Skeleton className="h-9 w-64 sm:w-80 rounded-xl" />
        <Skeleton className="h-4 w-full max-w-md rounded-md" />
        <div className="pt-2 flex flex-wrap gap-2">
          <Skeleton className="h-12 w-48 rounded-xl" />
          <Skeleton className="h-12 w-44 rounded-xl" />
        </div>
      </div>

      {/* 2. Net worth hero + three stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 @2xl/main:grid-cols-3 @5xl/main:grid-cols-[minmax(0,1.45fr)_repeat(3,minmax(0,1fr))]">
        <div className="col-span-2 @2xl/main:col-span-3 @5xl/main:col-span-1 flex flex-col gap-5 rounded-3xl bg-card p-5 sm:p-6 shadow-card">
          <Skeleton className="h-4 w-24 rounded-md" />
          <Skeleton className="h-10 w-48 rounded-xl" />
          <Skeleton className="h-4 w-40 rounded-md" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`flex flex-col gap-3 rounded-2xl bg-card p-4 sm:p-5 shadow-card ${i === 2 ? 'col-span-2 @2xl/main:col-span-1' : ''}`}
          >
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-3.5 w-24 rounded-md" />
          </div>
        ))}
      </div>

      {/* 3. Cash flow chart + asset donut */}
      <div className="grid grid-cols-1 @4xl/main:grid-cols-12 gap-4 sm:gap-6">
        <div className="@4xl/main:col-span-8 flex flex-col gap-5 rounded-2xl bg-card p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <Skeleton className="h-[240px] sm:h-[270px] w-full rounded-xl" />
        </div>
        <div className="@4xl/main:col-span-4 flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6 shadow-card">
          <Skeleton className="h-5 w-36 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>

      {/* 4. Best card + recent activity */}
      <div className="grid grid-cols-1 @4xl/main:grid-cols-2 gap-4 sm:gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6 shadow-card">
            <Skeleton className="h-5 w-44 rounded-lg" />
            <Skeleton className="h-3.5 w-32 rounded-md" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
