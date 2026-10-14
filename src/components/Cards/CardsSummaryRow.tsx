"use client"

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatMoney, getUsageLevel, formatDate } from '@/lib/finance/calculations';
import { ShieldCheck, Wallet, CalendarClock, CheckCircle2 } from 'lucide-react';

interface NextPaymentCard {
  cardName: string;
  bankName: string;
  dueDateFormatted: string;
  daysRemaining: number;
  amountDue: number;
}

interface CardsSummaryRowProps {
  totalLimit: number;
  totalUsed: number;
  boughtForOthers: number;
  nextPayment: NextPaymentCard | null;
}

export function CardsSummaryRow({
  totalLimit,
  totalUsed,
  boughtForOthers,
  nextPayment,
}: CardsSummaryRowProps) {
  const availableToSpend = Math.max(0, totalLimit - totalUsed);
  const usagePct = totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0;
  const usageInfo = getUsageLevel(usagePct);

  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 gap-3 sm:gap-6 pb-1 sm:pb-0">
      {/* 1. You can still spend */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-[270px] sm:min-w-0 snap-start shrink-0 sm:shrink">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
              You can still spend
            </span>
            <div className="size-8 sm:size-9 rounded-xl bg-success-soft text-success-soft-foreground flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4 sm:size-4.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1 leading-tight">
            {formatMoney(availableToSpend)}
          </div>
        </div>
        <div className="space-y-1.5 mt-2">
          <Progress
            value={usagePct}
            variant={usageInfo.variant}
            className="h-2"
            aria-label={`Credit limit utilization: ${usagePct}%`}
          />
          <p className="text-2xs sm:text-[11px] text-muted-foreground/80 font-normal">
            Total credit limit: <span className="font-semibold text-foreground">{formatMoney(totalLimit)}</span>
          </p>
        </div>
      </div>

      {/* 2. Used so far */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-[270px] sm:min-w-0 snap-start shrink-0 sm:shrink">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
              Used so far
            </span>
            <div className="size-8 sm:size-9 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
              <Wallet className="size-4 sm:size-4.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mb-1 leading-tight">
            {formatMoney(totalUsed)}
          </div>
        </div>
        <div className="mt-2">
          {boughtForOthers > 0 ? (
            <Link
              href="/dashboard/receivables"
              className="inline-flex items-center text-2xs sm:text-[11px] font-medium text-warning-soft-foreground hover:underline"
            >
              Includes {formatMoney(boughtForOthers)} you bought for others →
            </Link>
          ) : (
            <p className="text-2xs sm:text-[11px] text-muted-foreground/80 font-normal">
              Direct purchases on your cards
            </p>
          )}
        </div>
      </div>

      {/* 3. Next payment */}
      <div className="bg-card text-card-foreground rounded-3xl p-5 sm:p-6 shadow-card hover:shadow-lift transition-all flex flex-col justify-between min-w-[270px] sm:min-w-0 snap-start shrink-0 sm:shrink">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground leading-snug">
              Next payment
            </span>
            <div className="size-8 sm:size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CalendarClock className="size-4 sm:size-4.5" />
            </div>
          </div>
          {nextPayment && nextPayment.amountDue > 0 ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold text-foreground leading-tight">
                  {formatMoney(nextPayment.amountDue)}
                </span>
                <Badge
                  variant={nextPayment.daysRemaining <= 3 ? 'danger' : 'warning'}
                  className="font-medium text-2xs shrink-0"
                >
                  {nextPayment.daysRemaining === 0
                    ? 'Due today'
                    : nextPayment.daysRemaining === 1
                      ? 'Due tomorrow'
                      : `Due in ${nextPayment.daysRemaining} days`}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="py-0.5">
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-semibold text-success-soft-foreground">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Nothing to pay right now</span>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2">
          {nextPayment && nextPayment.amountDue > 0 ? (
            <p className="text-2xs sm:text-[11px] text-muted-foreground/80 font-normal">
              <span className="font-semibold text-foreground">{nextPayment.bankName}</span> • Pay by {nextPayment.dueDateFormatted}
            </p>
          ) : (
            <p className="text-2xs sm:text-[11px] text-muted-foreground/80 font-normal">
              All card balances are caught up or have zero balance.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
