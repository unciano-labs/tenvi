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

export function TailwindCashFlowChart({
  data,
  timeframe,
  onTimeframeChange,
  totalInflow,
  totalOutflow,
}: TailwindCashFlowChartProps) {
  return (
    <CardBox className="h-full flex flex-col justify-between">
      {/* Header with Title and Timeframe Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="card-title">Cash Flow Updates</h4>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
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
          <p className="text-xs text-muted-foreground mt-0.5">
            Inflow vs. Outflow summary
          </p>
        </div>

        {/* Timeframe Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              <span className="text-muted-foreground font-medium">Money In</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-secondary" />
              <span className="text-muted-foreground font-medium">Money Out</span>
            </div>
          </div>

          <Select
            value={timeframe}
            onValueChange={(val) => onTimeframeChange(val as 'month' | '30days' | '6months')}
          >
            <SelectTrigger className="w-[125px] h-8 text-xs font-semibold rounded-lg bg-muted/60 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="text-xs rounded-xl shadow-lift">
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-[240px] sm:h-[270px]">
        {data.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground text-xs">
            <p>No transaction history for this period yet.</p>
            <p className="text-3xs text-muted-foreground/70 mt-1">
              Record an income or expense to see your cash flow graph.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
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
                    <div className="rounded-xl border border-border/80 bg-popover p-2.5 shadow-lift text-xs space-y-1">
                      <p className="font-bold text-foreground">{label}</p>
                      <div className="flex items-center justify-between gap-4 text-primary">
                        <span>Money In:</span>
                        <span className="font-semibold">{formatMoney(inVal)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-secondary">
                        <span>Money Out:</span>
                        <span className="font-semibold">{formatMoney(outVal)}</span>
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
      <div className="flex items-center justify-between text-2xs text-muted-foreground pt-3 border-t border-border/40 mt-3">
        <span>
          Net Savings: <strong className="text-foreground">{formatMoney(totalInflow - totalOutflow)}</strong>
        </span>
        <span className="text-muted-foreground">
          Updated in real-time
        </span>
      </div>
    </CardBox>
  );
}
