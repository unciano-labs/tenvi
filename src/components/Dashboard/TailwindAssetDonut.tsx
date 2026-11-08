'use client';

import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { CardBox } from '@/components/shared/CardBox';
import { formatMoney } from '@/lib/finance/calculations';
import { Info, PieChart as PieIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AssetDonutProps {
  totalAssets: number;
  cashAmount: number;
  propertyAmount: number;
  receivablesAmount: number;
}

export function TailwindAssetDonut({
  totalAssets,
  cashAmount,
  propertyAmount,
  receivablesAmount,
}: AssetDonutProps) {
  const chartData = [
    { name: 'Cash & Savings', value: Math.max(0, cashAmount), color: 'var(--primary)' },
    { name: 'Properties & Assets', value: Math.max(0, propertyAmount), color: 'var(--secondary)' },
    { name: 'Money Owed to Me', value: Math.max(0, receivablesAmount), color: 'var(--success)' },
  ].filter(item => item.value > 0);

  const displayData = chartData.length > 0 
    ? chartData 
    : [{ name: 'No Assets Yet', value: 1, color: 'var(--muted)' }];

  return (
    <CardBox className="h-full rounded-2xl shadow-card hover:shadow-card flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-title text-foreground">Where your money is</h2>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/80 hover:text-foreground cursor-pointer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Explain Asset Allocation"
                  />
                }
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">
                Breakdown of everything you own between liquid cash, real estate, and loans owed to you.
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap shrink-0">
            Asset allocation
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-muted-foreground">Total assets value</span>
          <div className="num text-figure text-foreground break-words">
            {formatMoney(totalAssets)}
          </div>
        </div>
      </div>

      {/* Donut Chart Canvas — replaced by a compact note while there is nothing to chart */}
      {chartData.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-muted/50 px-5 py-8 text-center">
          <PieIcon className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">No assets recorded yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Add a bank account, cash, property, or money owed to you to see how your wealth is split.
          </p>
        </div>
      ) : (
      <div className="relative w-full h-[170px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0];
                const pct = totalAssets > 0 ? ((Number(data.value) / totalAssets) * 100).toFixed(1) : 0;
                return (
                  <div className="rounded-xl bg-popover p-2.5 shadow-lift text-xs">
                    <p className="font-semibold text-foreground">{data.name}</p>
                    <p className="num text-muted-foreground">{formatMoney(Number(data.value))} ({pct}%)</p>
                  </div>
                );
              }}
            />
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <PieIcon className="size-5 text-muted-foreground/60" />
        </div>
      </div>
      )}

      {/* Legend Dots with Shares */}
      <div className="mt-auto flex flex-col gap-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-primary" />
            <span className="text-muted-foreground">Cash & Bank Accounts</span>
          </div>
          <span className="num shrink-0 font-semibold text-foreground">
            {totalAssets > 0 ? Math.round((cashAmount / totalAssets) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-secondary" />
            <span className="text-muted-foreground">Properties & Real Estate</span>
          </div>
          <span className="num shrink-0 font-semibold text-foreground">
            {totalAssets > 0 ? Math.round((propertyAmount / totalAssets) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-success" />
            <span className="text-muted-foreground">Money Owed to You</span>
          </div>
          <span className="num shrink-0 font-semibold text-foreground">
            {totalAssets > 0 ? Math.round((receivablesAmount / totalAssets) * 100) : 0}%
          </span>
        </div>
      </div>
    </CardBox>
  );
}
