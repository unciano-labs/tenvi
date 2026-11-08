'use client';

import React from 'react';
import Link from 'next/link';
import { CardBox } from '@/components/shared/CardBox';
import { CreditCard as CardType } from '@/types';
import {
  formatMoney,
  calculateOptimalCardToSwipe,
  OptimalCardResult,
} from '@/lib/finance/calculations';
import {
  CreditCard,
  Sparkles,
  ChevronRight,
  Info,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TailwindBestCardProps {
  optimalData?: OptimalCardResult | null;
  creditCards?: CardType[];
  onAddPurchaseClick?: (cardId: string) => void;
}

export function TailwindBestCard({
  optimalData,
  creditCards = [],
  onAddPurchaseClick,
}: TailwindBestCardProps) {
  // If optimalData is passed directly, use it; otherwise compute from creditCards
  const resolvedOptimalData = React.useMemo(() => {
    if (optimalData) return optimalData;
    if (creditCards.length > 0) {
      return calculateOptimalCardToSwipe(creditCards);
    }
    return null;
  }, [optimalData, creditCards]);

  const bestCardRec = resolvedOptimalData?.bestCard;
  const bestCardObj = bestCardRec?.card;
  const activeCardsCount = creditCards.filter((c) => c.is_active).length;

  return (
    <CardBox className="h-full rounded-2xl shadow-card hover:shadow-card flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-[1_1_13rem] items-start gap-3">
            <div className="size-9 shrink-0 rounded-xl bg-lightprimary text-primary flex items-center justify-center" aria-hidden="true">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-title text-foreground">Best card to swipe today</h2>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground/80 hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label="Explain Best Card recommendation"
                      />
                    }
                  >
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    Tenvi calculates which card gives you the longest interest-free grace period today so you keep your cash longer.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">Smart interest-free cash float</p>
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success-soft text-success-soft-foreground flex items-center gap-1 whitespace-nowrap">
              <CheckCircle2 className="size-3.5" aria-hidden="true" /> Best choice
            </span>

            {bestCardObj && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="size-9 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-(--motion-fast) ease-(--ease-in-out)"
                      aria-label="Card details options"
                    />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-xl shadow-lift">
                  <DropdownMenuLabel className="px-2 py-1 text-xs text-muted-foreground font-normal">
                    Cycle details
                  </DropdownMenuLabel>
                  <div className="px-2 py-1 text-sm space-y-1">
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Next cutoff</span>
                      <span className="font-semibold text-foreground">
                        {bestCardRec?.nextCutoffDateFormatted || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Pay by</span>
                      <span className="font-semibold text-foreground">
                        {bestCardRec?.paymentDueDateFormatted || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    render={<Link href={`/dashboard/cards/${bestCardObj.id}`} />}
                    className="px-2 py-2 text-sm font-medium text-foreground rounded-lg cursor-pointer flex items-center justify-between"
                  >
                    <span>View card hub</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </DropdownMenuItem>
                  {onAddPurchaseClick && (
                    <DropdownMenuItem
                      onClick={() => onAddPurchaseClick(bestCardObj.id)}
                      className="px-2 py-2 text-sm font-semibold text-primary rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <span>Swipe with this card</span>
                      <Plus className="size-3.5" />
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {bestCardObj && bestCardRec ? (
          <div className="@container flex flex-col gap-4 rounded-xl bg-muted/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-0.5">
                <p className="text-label text-muted-foreground">
                  {bestCardObj.bank_name || 'Bank Card'}
                </p>
                <h3 className="text-base font-semibold leading-snug text-foreground">
                  {bestCardObj.name} {bestCardObj.last_4 ? <span className="num whitespace-nowrap">(•••• {bestCardObj.last_4})</span> : ''}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pay by <strong className="font-semibold text-foreground">{bestCardRec.paymentDueDateFormatted}</strong>
                </p>
              </div>
              <div className="size-9 shrink-0 rounded-xl bg-card text-primary flex items-center justify-center shadow-xs" aria-hidden="true">
                <CreditCard className="size-5" />
              </div>
            </div>

            <div className="grid grid-cols-1 @xs:grid-cols-2 gap-x-4 gap-y-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Available Credit</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground/80 hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Available limit info"
                        />
                      }
                    >
                      <Info className="size-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Remaining credit line you can charge right now.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="num text-lg font-bold text-foreground block mt-0.5 break-words">
                  {formatMoney(
                    bestCardRec.availablePower !== undefined
                      ? bestCardRec.availablePower
                      : Number(bestCardObj.credit_limit || 0) - (bestCardRec.totalUtilized || 0)
                  )}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Cash float days</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="inline-flex size-5 items-center justify-center rounded text-muted-foreground/80 hover:text-foreground cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Float days info"
                        />
                      }
                    >
                      <Info className="size-3" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Number of interest-free days before this bill needs to be settled.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="block mt-0.5 text-success">
                  <span className="num text-lg font-bold">{bestCardRec.floatDays}</span>{' '}
                  <span className="text-sm font-semibold">days free float</span>
                </span>
              </div>
            </div>

            {onAddPurchaseClick && (
              <Button
                onClick={() => onAddPurchaseClick(bestCardObj.id)}
                className="w-full gap-2"
              >
                <Plus className="size-4" />
                <span>Swipe with this card</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center rounded-xl bg-muted/50">
            <p className="text-sm font-medium text-foreground">No active credit cards added yet.</p>
            <Link
              href="/dashboard/cards"
              className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-primary hover:underline underline-offset-4 gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>Add a credit card to enable smart swipe</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-xs text-muted-foreground">
          {activeCardsCount > 0
            ? `${activeCardsCount} ${activeCardsCount === 1 ? 'card' : 'cards'} connected`
            : 'Zero card debt'}
        </span>
        <Link
          href="/dashboard/cards"
          className="-mr-2 inline-flex min-h-10 items-center rounded-lg px-2 font-semibold text-primary hover:underline underline-offset-4 gap-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>All cards</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </CardBox>
  );
}
