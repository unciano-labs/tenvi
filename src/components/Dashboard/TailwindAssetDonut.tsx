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
    <CardBox className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h4 className="card-title truncate">Where Your Money Is</h4>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground cursor-pointer shrink-0"
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
          <span className="text-[10px] leading-none font-semibold px-2 py-1 rounded-full bg-lightprimary text-primary whitespace-nowrap shrink-0">
            Asset Allocation
          </span>
        </div>

        <div className="mb-2">
          <span className="text-2xs font-medium text-muted-foreground">Total Assets Value</span>
          <div
            className="text-lg sm:text-xl font-bold text-foreground truncate"
            title={formatMoney(totalAssets)}
          >
            {formatMoney(totalAssets)}
          </div>
        </div>
      </div>

      {/* Donut Chart Canvas */}
      <div className="relative w-full h-[170px] flex items-center justify-center my-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <RechartsTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const data = payload[0];
                const pct = totalAssets > 0 ? ((Number(data.value) / totalAssets) * 100).toFixed(1) : 0;
                return (
                  <div className="rounded-xl border border-border/80 bg-popover p-2 shadow-lift text-xs">
                    <p className="font-bold text-foreground">{data.name}</p>
                    <p className="text-muted-foreground">{formatMoney(Number(data.value))} ({pct}%)</p>
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

      {/* Legend Dots with Shares */}
      <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">Cash & Bank Accounts</span>
          </div>
          <span className="font-semibold text-foreground">
            {totalAssets > 0 ? Math.round((cashAmount / totalAssets) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-secondary" />
            <span className="text-muted-foreground">Properties & Real Estate</span>
          </div>
          <span className="font-semibold text-foreground">
            {totalAssets > 0 ? Math.round((propertyAmount / totalAssets) * 100) : 0}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-success" />
            <span className="text-muted-foreground">Money Owed to You</span>
          </div>
          <span className="font-semibold text-foreground">
            {totalAssets > 0 ? Math.round((receivablesAmount / totalAssets) * 100) : 0}%
          </span>
        </div>
      </div>
    </CardBox>
  );
}
