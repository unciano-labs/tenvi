import React from 'react';
import { Skeleton, SkeletonStatCard } from '@/components/UI/Skeleton';

export default function PropertiesLoading() {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}
