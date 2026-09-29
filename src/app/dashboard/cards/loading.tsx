import React from 'react';
import { Skeleton, SkeletonCreditCard, SkeletonStatCard } from '@/components/UI/Skeleton';

export default function CardsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header Placeholder */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-40 rounded-2xl shrink-0" />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Credit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonCreditCard />
        <SkeletonCreditCard />
        <SkeletonCreditCard />
      </div>
    </div>
  );
}
