'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { CardBox } from '@/components/shared/CardBox';
import { formatMoney } from '@/lib/finance/calculations';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CashFlowItem {
  date: string;
  inflow: number;
  outflow: number;
}

interface TailwindCashFlowChartProps {
  data: CashFlowItem[];
  timeframe: 'month' | '30days' | '6months';
  onTimeframeChange: (val: 'month' | '30days' | '6months') => void;
  totalInflow: number;
  totalOutflow: number;
}

const TIMEFRAME_LABELS: Record<string, string> = {
  month: 'This month',
  '30days': 'Last 30 days',
  '6months': 'Last 6 months',
};

export function TailwindCashFlowChart({
  data,
  timeframe,
  onTimeframeChange,
  totalInflow,
  totalOutflow,
}: TailwindCashFlowChartProps) {
  const hasActivity = data.some((d) => Number(d.inflow) > 0 || Number(d.outflow) > 0);

  return (
    <CardBox className="h-full rounded-2xl shadow-card hover:shadow-card flex flex-col gap-5">
      {/* Header: title block wraps above the controls whenever space is tight */}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 flex-[1_1_12rem]">
          <div className="flex items-center gap-1.5">
            <h2 className="text-title text-foreground">Cash flow updates</h2>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/80 hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Explain Cash Flow"
                  />
                }
              >
                <Info className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">
                Compares how much money came in versus how much was spent over time.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">
            Inflow vs. outflow summary
          </p>
        </div>

        {/* Timeframe Dropdown */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 text-xs" aria-hidden="true">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground font-medium">Money in</span>
            </div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="size-2.5 rounded-full bg-secondary" />
              <span className="text-muted-foreground font-medium">Money out</span>
            </div>
          </div>

          <Select
            value={timeframe}
            onValueChange={(val) => onTimeframeChange(val as 'month' | '30days' | '6months')}
          >
            <SelectTrigger aria-label="Timeframe" className="w-auto min-w-36 h-10 text-sm font-medium rounded-xl bg-muted/60">
              <SelectValue>
                {(value: string) => TIMEFRAME_LABELS[value] ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end" className="text-xs rounded-xl shadow-lift">
              <SelectItem value="month">This month</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full h-[240px] sm:h-[270px]">
        {!hasActivity && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 px-6 text-center pointer-events-none">
            <p className="text-sm font-medium text-foreground">No transaction history for this period yet.</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              Record an income or expense to see your cash flow graph.
            </p>
          </div>
        )}
        {data.length === 0 ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={hasActivity ? 0.5 : 0.25} />
              <XAxis
                dataKey="date"
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
                  if (val >= 1000) return `₱${(val / 1000).toFixed(0)}k`;
                  return `₱${val}`;
                }}
              />
              <RechartsTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const inVal = Number(payload[0]?.value || 0);
                  const outVal = Number(payload[1]?.value || 0);
                  return (
                    <div className="rounded-xl bg-popover p-3 shadow-lift text-xs space-y-1.5">
                      <p className="font-semibold text-foreground">{label}</p>
                      <div className="flex items-center justify-between gap-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Money in</span>
                        <span className="num font-semibold text-foreground">{formatMoney(inVal)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-secondary" />Money out</span>
                        <span className="num font-semibold text-foreground">{formatMoney(outVal)}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="inflow"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="outflow"
                fill="var(--secondary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
        <span>
          Net savings: <strong className="num font-semibold text-foreground">{formatMoney(totalInflow - totalOutflow)}</strong>
        </span>
        <span className="text-muted-foreground">
          Updated in real-time
        </span>
      </div>
    </CardBox>
  );
}
