import React from 'react';
import { Skeleton, SkeletonTableRow } from '@/components/ui/skeleton';

export default function TransactionsLoading() {
  return (
    <div className="flex flex-col gap-6 sm:gap-8" aria-busy="true" aria-label="Loading transactions">
      {/* Header placeholder (mirrors .page-header) */}
      <div className="page-header">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-4 w-full max-w-sm rounded-lg" />
        </div>
        <div className="page-header-actions w-full sm:w-auto">
          <Skeleton className="h-12 sm:h-11 flex-1 sm:w-36 rounded-xl" />
          <Skeleton className="h-12 sm:h-11 flex-1 sm:w-44 rounded-xl" />
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4 sm:p-5 shadow-card">
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-12 sm:h-10 w-full max-w-md rounded-2xl" />
          <Skeleton className="h-12 sm:h-10 min-w-[min(100%,16rem)] flex-1 rounded-xl" />
          <Skeleton className="h-12 sm:h-10 min-w-[min(100%,12rem)] flex-1 rounded-xl" />
        </div>
        <Skeleton className="h-4 w-40 rounded-lg" />
      </div>

      {/* Transactions list */}
      <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-card p-3 sm:p-5 shadow-card">
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
      </div>
    </div>
  );
}
