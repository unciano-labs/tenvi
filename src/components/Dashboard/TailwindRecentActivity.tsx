'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CardBox } from '@/components/shared/CardBox';
import { Transaction } from '@/types';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  ChevronRight,
  Info 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TailwindRecentActivityProps {
  transactions: Transaction[];
}

export function TailwindRecentActivity({ transactions }: TailwindRecentActivityProps) {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');

  const filtered = transactions.filter(t => {
    if (filter === 'all') return true;
    return t.kind === filter;
  }).slice(0, 6);

  return (
    <CardBox className="h-full rounded-2xl shadow-card hover:shadow-card flex flex-col gap-5">
      <div className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="min-w-0 flex-[1_1_12rem]">
            <div className="flex items-center gap-1.5">
              <h2 className="text-title text-foreground">Recent activity</h2>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground/80 hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Explain Recent Activity"
                    />
                  }
                >
                  <Info className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  A live timeline of your most recent payments, deposits, and account transfers.
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm text-muted-foreground">
              Latest transactions timeline
            </p>
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  aria-label="Filter recent activity"
                  className="no-spring inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-sm font-medium bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-(--motion-fast) ease-(--ease-in-out)"
                />
              }
            >
              <Filter className="size-3.5" aria-hidden="true" />
              <span className="capitalize">{filter}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lift">
              <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as any)}>
                <DropdownMenuRadioItem value="all">All activity</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="income">Income only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expense">Expenses only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="transfer">Transfers only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vertical Timeline */}
        {filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-muted/50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-foreground">No recent activity found for this filter.</p>
            <p className="max-w-xs text-xs text-muted-foreground">Transactions you record will show up here as a timeline.</p>
          </div>
        ) : (
          <div key={filter} className="motion-pop-in flex flex-col">
            {filtered.map((t, idx) => {
              const isLast = idx === filtered.length - 1;
              const isIncome = t.kind === 'income';
              const isTransfer = t.kind === 'transfer';
              const nodeColor = isIncome 
                ? 'border-success text-success bg-lightsuccess' 
                : isTransfer 
                  ? 'border-secondary text-secondary bg-lightsecondary' 
                  : 'border-danger text-danger bg-lighterror';

              return (
                <div key={t.id} className="flex gap-x-3 group">
                  {/* Time label */}
                  <div className="w-16 sm:w-20 text-end shrink-0 pt-0.5">
                    <span className="num text-xs font-medium text-muted-foreground">
                      {formatDate(t.occurred_on)}
                    </span>
                  </div>

                  {/* Vertical Node & Connecting Line */}
                  <div className={`relative ${isLast ? 'after:hidden' : ''} after:absolute after:top-5 after:bottom-0 after:start-2.5 after:w-px after:-translate-x-[0.5px] after:bg-border/70`}>
                    <div className="relative z-1 size-5 flex items-center justify-center">
                      <div className={`size-2.5 rounded-full border-2 ${nodeColor}`} />
                    </div>
                  </div>

                  {/* Description & Amount */}
                  <div className="flex-1 min-w-0 pb-4 pt-0.5 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {t.note || t.category?.name || (isTransfer ? 'Transfer' : 'General Transaction')}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.category?.name || (t.payment_method === 'credit_card' ? 'Credit Card' : 'Cash')}
                      </p>
                    </div>

                    <div className="shrink-0 text-end">
                      <span className={`num text-sm font-semibold whitespace-nowrap ${
                        isIncome ? 'text-success' : 'text-foreground'
                      }`}>
                        {isIncome ? `+${formatMoney(t.amount)}` : isTransfer ? `⇆ ${formatMoney(t.amount)}` : `-${formatMoney(t.amount)}`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-xs text-muted-foreground">
          Showing latest {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </span>
        <Link
          href="/dashboard/transactions"
          className="-mr-2 inline-flex min-h-10 items-center rounded-lg px-2 font-semibold text-primary hover:underline underline-offset-4 gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>View all transactions</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </CardBox>
  );
}
