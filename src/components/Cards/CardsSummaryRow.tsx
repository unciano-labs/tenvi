"use client"

import React from 'react';
import Link from 'next/link';
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

  // Shared resting-card treatment; nothing here is clickable, so no hover lift.
  const tile = 'flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-5 text-card-foreground shadow-card';
  const label = 'min-w-0 text-label text-muted-foreground';
  const icon = 'flex size-9 shrink-0 items-center justify-center rounded-xl';
  const meta = 'mt-auto text-xs leading-snug text-muted-foreground';

  return (
    <div className="grid-fluid gap-4 [--grid-min:14rem]">
      {/* 1. You can still spend */}
      <div className={tile}>
        <div className="flex items-start justify-between gap-3">
          <span className={label}>You can still spend</span>
          <div className={`${icon} bg-success-soft text-success-soft-foreground`}>
            <ShieldCheck className="size-4.5" />
          </div>
        </div>
        <div className="num text-figure text-foreground break-words">
          {formatMoney(availableToSpend)}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Progress
            value={usagePct}
            variant={usageInfo.variant}
            className="h-2"
            aria-label={`Credit limit utilization: ${usagePct}%`}
          />
          <p className="text-xs leading-snug text-muted-foreground">
            Total credit limit: <span className="num font-semibold text-foreground">{formatMoney(totalLimit)}</span>
          </p>
        </div>
      </div>

      {/* 2. Used so far */}
      <div className={tile}>
        <div className="flex items-start justify-between gap-3">
          <span className={label}>Used so far</span>
          <div className={`${icon} bg-muted text-foreground`}>
            <Wallet className="size-4.5" />
          </div>
        </div>
        <div className="num text-figure text-foreground break-words">
          {formatMoney(totalUsed)}
        </div>
        {boughtForOthers > 0 ? (
          <Link
            href="/dashboard/receivables"
            className="mt-auto inline-flex items-center rounded-md text-xs font-medium leading-snug text-warning-soft-foreground hover:underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Includes <span className="num mx-1">{formatMoney(boughtForOthers)}</span> you bought for others →
          </Link>
        ) : (
          <p className={meta}>Direct purchases on your cards</p>
        )}
      </div>

      {/* 3. Next payment */}
      <div className={tile}>
        <div className="flex items-start justify-between gap-3">
          <span className={label}>Next payment</span>
          <div className={`${icon} bg-primary/10 text-primary`}>
            <CalendarClock className="size-4.5" />
          </div>
        </div>
        {nextPayment && nextPayment.amountDue > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="num text-figure text-foreground break-words">
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
        ) : (
          <div className="flex items-center gap-2 text-base font-semibold leading-snug text-success-soft-foreground">
            <CheckCircle2 className="size-4.5 shrink-0" />
            <span>Nothing to pay right now</span>
          </div>
        )}
        {nextPayment && nextPayment.amountDue > 0 ? (
          <p className={meta}>
            <span className="font-semibold text-foreground">{nextPayment.bankName}</span> · Pay by {nextPayment.dueDateFormatted}
          </p>
        ) : (
          <p className={meta}>All card balances are caught up or have zero balance.</p>
        )}
      </div>
    </div>
  );
}
