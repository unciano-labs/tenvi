import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function CardsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150 px-4 sm:px-6 lg:px-8 pb-24 md:pb-12">
      {/* 1. Page Header Placeholder */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-xl" />
          <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-28 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </div>

      {/* 2. Summary Row (3 Cards) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl shadow-card" />
        <Skeleton className="h-36 rounded-2xl shadow-card" />
        <Skeleton className="h-36 rounded-2xl shadow-card" />
      </div>

      {/* 3. Pay These Soon Panel Placeholder */}
      <Skeleton className="h-32 rounded-2xl shadow-card" />

      {/* 4. Best Card Today Placeholder */}
      <Skeleton className="h-28 rounded-2xl shadow-card" />

      {/* 5. Toolbar Placeholder */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-12 flex-1 rounded-xl" />
        <Skeleton className="h-12 w-64 rounded-xl" />
      </div>

      {/* 6. Credit Cards Grid Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-2xl shadow-card" />
        ))}
      </div>
    </div>
  );
}
