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
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3">
      {/* 1. You can still spend */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            You can still spend
          </CardTitle>
          <div className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
            <ShieldCheck className="size-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {formatMoney(availableToSpend)}
          </div>
          <div className="space-y-1.5">
            <Progress
              value={usagePct}
              variant={usageInfo.variant}
              className="h-2"
              aria-label={`Credit limit utilization: ${usagePct}%`}
            />
            <p className="text-xs text-muted-foreground">
              Total credit limit: <span className="font-semibold text-foreground">{formatMoney(totalLimit)}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Used so far */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Used so far
          </CardTitle>
          <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-foreground">
            <Wallet className="size-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {formatMoney(totalUsed)}
          </div>
          {boughtForOthers > 0 ? (
            <Link
              href="/dashboard/receivables"
              className="inline-flex items-center text-xs font-medium text-warning-soft-foreground hover:underline"
            >
              Includes {formatMoney(boughtForOthers)} you bought for others →
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">
              Direct purchases on your cards
            </p>
          )}
        </CardContent>
      </Card>

      {/* 3. Next payment */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Next payment
          </CardTitle>
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="size-5" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {nextPayment && nextPayment.amountDue > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {formatMoney(nextPayment.amountDue)}
                </span>
                <Badge
                  variant={nextPayment.daysRemaining <= 3 ? 'danger' : 'warning'}
                  className="font-medium"
                >
                  {nextPayment.daysRemaining === 0
                    ? 'Due today'
                    : nextPayment.daysRemaining === 1
                      ? 'Due tomorrow'
                      : `Due in ${nextPayment.daysRemaining} days`}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{nextPayment.bankName}</span> • Pay by {nextPayment.dueDateFormatted}
              </p>
            </>
          ) : (
            <div className="space-y-1 py-1">
              <div className="flex items-center gap-1.5 text-base font-semibold text-success-soft-foreground">
                <CheckCircle2 className="size-4" />
                <span>Nothing to pay right now</span>
              </div>
              <p className="text-xs text-muted-foreground">
                All card balances are caught up or have zero balance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
