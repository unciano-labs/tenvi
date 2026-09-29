import React from 'react';
import { Skeleton, SkeletonStatCard, SkeletonTableRow } from '@/components/UI/Skeleton';

export default function LoansLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-40 rounded-2xl shrink-0" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-3">
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
      </div>
    </div>
  );
}
