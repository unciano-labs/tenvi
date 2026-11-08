import React from 'react';
import { Skeleton, SkeletonAccountCard, SkeletonStatCard } from '@/components/ui/skeleton';

export default function SavingsLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy="true" aria-label="Loading savings">
      {/* Header placeholder (mirrors .page-header) */}
      <div className="page-header">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-4 w-full max-w-sm rounded-lg" />
        </div>
        <div className="page-header-actions w-full sm:w-auto">
          <Skeleton className="h-12 sm:h-11 w-full sm:w-48 rounded-xl" />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:14rem]">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Filter toolbar */}
      <Skeleton className="h-16 w-full rounded-2xl" />

      {/* Accounts grid */}
      <div className="grid-fluid-fill gap-x-6 gap-y-8 [--grid-min:17.5rem]">
        <SkeletonAccountCard />
        <SkeletonAccountCard />
        <SkeletonAccountCard />
      </div>
    </div>
  );
}
