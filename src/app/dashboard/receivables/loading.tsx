import React from 'react';
import { Skeleton, SkeletonStatCard, SkeletonTableRow } from '@/components/ui/skeleton';

export default function ReceivablesLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-44 rounded-2xl shrink-0" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      <div className="bg-card rounded-3xl p-6 sm:p-8 shadow-card overflow-hidden min-w-0 space-y-3">
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
        <SkeletonTableRow />
      </div>
    </div>
  );
}
