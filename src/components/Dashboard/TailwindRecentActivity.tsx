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
    <CardBox className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="card-title">Recent Activity</h4>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
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
            <p className="text-xs text-muted-foreground mt-0.5">
              Latest transactions timeline
            </p>
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border/50 cursor-pointer transition-colors"
                />
              }
            >
              <Filter className="size-3" />
              <span className="capitalize">{filter}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-xs rounded-xl shadow-lift">
              <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as any)}>
                <DropdownMenuRadioItem value="all">All Activity</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="income">Income Only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="expense">Expenses Only</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="transfer">Transfers Only</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vertical Timeline */}
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-xs">
            <p>No recent activity found for this filter.</p>
          </div>
        ) : (
          <div className="space-y-0.5 pt-2">
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
                    <span className="text-2xs font-semibold text-muted-foreground">
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
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {t.note || t.category?.name || (isTransfer ? 'Transfer' : 'General Transaction')}
                      </p>
                      <p className="text-3xs text-muted-foreground truncate">
                        {t.category?.name || (t.payment_method === 'credit_card' ? 'Credit Card' : 'Cash')}
                      </p>
                    </div>

                    <div className="shrink-0 text-end">
                      <span className={`text-xs font-bold ${
                        isIncome ? 'text-success' : isTransfer ? 'text-secondary' : 'text-foreground'
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
      <div className="pt-3 border-t border-border/40 mt-1 flex items-center justify-between text-xs">
        <span className="text-2xs text-muted-foreground">
          Showing latest {filtered.length} entries
        </span>
        <Link
          href="/dashboard/transactions"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          <span>View All Transactions</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </CardBox>
  );
}
