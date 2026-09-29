import React from 'react';
import { Skeleton, SkeletonTableRow } from '@/components/UI/Skeleton';

export default function TransactionsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-2xl" />
          <Skeleton className="h-4 w-44 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-44 rounded-2xl shrink-0" />
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-11 flex-1 rounded-2xl" />
        <Skeleton className="h-11 w-32 rounded-2xl" />
        <Skeleton className="h-11 w-36 rounded-2xl" />
      </div>

      {/* Transactions List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-3">
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
