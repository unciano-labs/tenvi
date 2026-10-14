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
    <CardBox className="h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-lightprimary text-primary flex items-center justify-center font-bold">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="card-title text-sm sm:text-base">Best Card to Swipe Today</h4>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
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
              <p className="text-2xs text-muted-foreground">Smart interest-free cash float</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] leading-none font-bold px-2 py-1 rounded-full bg-lightsuccess text-success flex items-center gap-1 whitespace-nowrap shrink-0">
              <CheckCircle2 className="size-3" /> Best Choice
            </span>

            {bestCardObj && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center cursor-pointer transition-colors"
                      aria-label="Card details options"
                    />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl shadow-lift border border-border/60">
                  <DropdownMenuLabel className="px-2 py-1 text-2xs text-muted-foreground font-normal">
                    Cycle Details
                  </DropdownMenuLabel>
                  <div className="px-2 py-1 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Cutoff:</span>
                      <span className="font-semibold text-foreground">
                        {bestCardRec?.nextCutoffDateFormatted || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pay By:</span>
                      <span className="font-semibold text-foreground">
                        {bestCardRec?.paymentDueDateFormatted || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    render={<Link href={`/dashboard/cards/${bestCardObj.id}`} />}
                    className="px-2 py-1.5 text-xs font-semibold text-foreground hover:bg-muted rounded-lg cursor-pointer flex items-center justify-between"
                  >
                    <span>View Card Hub</span>
                    <ChevronRight className="size-3.5 text-muted-foreground" />
                  </DropdownMenuItem>
                  {onAddPurchaseClick && (
                    <DropdownMenuItem
                      onClick={() => onAddPurchaseClick(bestCardObj.id)}
                      className="px-2 py-1.5 text-xs font-semibold text-primary hover:bg-lightprimary rounded-lg cursor-pointer flex items-center justify-between"
                    >
                      <span>Swipe with this Card</span>
                      <Plus className="size-3.5" />
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {bestCardObj && bestCardRec ? (
          <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-background to-secondary/10 border border-primary/20 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {bestCardObj.bank_name || 'Bank Card'}
                </p>
                <h5 className="text-base font-semibold leading-snug text-foreground whitespace-normal break-words mt-0.5">
                  {bestCardObj.name} {bestCardObj.last_4 ? `(•••• ${bestCardObj.last_4})` : ''}
                </h5>
                <p className="text-2xs text-muted-foreground mt-0.5">
                  Pay by <strong className="text-foreground">{bestCardRec.paymentDueDateFormatted}</strong>
                </p>
              </div>
              <div className="size-9 rounded-xl bg-card border border-border/50 text-foreground flex items-center justify-center shadow-xs">
                <CreditCard className="size-5 text-primary" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Available Credit</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
                          aria-label="Available limit info"
                        />
                      }
                    >
                      <Info className="size-2.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Remaining credit line you can charge right now.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-base font-bold text-foreground block mt-0.5">
                  {formatMoney(
                    bestCardRec.availablePower !== undefined
                      ? bestCardRec.availablePower
                      : Number(bestCardObj.credit_limit || 0) - (bestCardRec.totalUtilized || 0)
                  )}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">Cash Float Days</span>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <button
                          type="button"
                          className="text-muted-foreground/70 hover:text-foreground cursor-pointer"
                          aria-label="Float days info"
                        />
                      }
                    >
                      <Info className="size-2.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Number of interest-free days before this bill needs to be settled.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="text-base font-bold text-success block mt-0.5">
                  {bestCardRec.floatDays} Days Free Float
                </span>
              </div>
            </div>

            {onAddPurchaseClick && (
              <div className="pt-1">
                <Button
                  onClick={() => onAddPurchaseClick(bestCardObj.id)}
                  className="w-full h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="size-3.5" />
                  <span>Swipe with this Card</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center rounded-xl bg-muted/40 border border-border/40 text-xs text-muted-foreground space-y-2">
            <p>No active credit cards added yet.</p>
            <Link
              href="/dashboard/cards"
              className="inline-flex items-center text-xs font-semibold text-primary hover:underline gap-1"
            >
              <span>Add a credit card to enable smart swipe</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-border/40 mt-3 flex items-center justify-between text-xs">
        <span className="text-2xs text-muted-foreground">
          {activeCardsCount > 0 ? `${activeCardsCount} cards connected` : 'Zero card debt'}
        </span>
        <Link
          href="/dashboard/cards"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
        >
          <span>All Cards</span>
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </CardBox>
  );
}
