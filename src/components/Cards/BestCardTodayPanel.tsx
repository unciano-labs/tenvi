"use client"

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { formatMoney } from '@/lib/finance/calculations';
import type { OptimalCardResult, CardSpendRecommendation } from '@/lib/finance/calculations';
import { Sparkles, Plus, ChevronDown, Info, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BestCardTodayPanelProps {
  optimalData: OptimalCardResult;
  onAddPurchaseClick?: (cardId: string) => void;
}

export function BestCardTodayPanel({
  optimalData,
  onAddPurchaseClick,
}: BestCardTodayPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { bestCard, rankedCards, cautionCards, todayFormatted } = optimalData;

  if (!bestCard) {
    return null;
  }

  return (
    <Card className="gap-0 p-0 sm:p-0">
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
        {/* Main Recommendation Row — wraps intrinsically: text first, the float/action group drops below when narrow */}
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
          <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-2">
            <div className="flex items-center gap-2 text-label text-muted-foreground">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-3.5" />
              </span>
              <span className="min-w-0">Best card to use today · {todayFormatted}</span>
            </div>

            <h3 className="text-title text-foreground">
              {bestCard.card.bank_name} {bestCard.card.name}{' '}
              <span className="num whitespace-nowrap text-sm font-normal text-muted-foreground">
                •••• {bestCard.card.last_4}
              </span>
            </h3>

            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              Anything you buy today goes on your{' '}
              <strong className="font-semibold text-foreground whitespace-nowrap">{bestCard.nextCutoffDateFormatted}</strong> bill,
              which you pay by{' '}
              <strong className="font-semibold text-foreground whitespace-nowrap">{bestCard.paymentDueDateFormatted}</strong>.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="flex shrink-0 items-baseline gap-1.5 rounded-xl bg-muted/60 px-4 py-2.5">
              <span className="num text-2xl font-bold leading-none tracking-tight text-foreground">
                {bestCard.floatDays}
              </span>
              <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                days to pay
              </span>
            </div>

            <Button
              variant="primary"
              size="default"
              onClick={() => onAddPurchaseClick?.(bestCard.card.id)}
              className="flex-1 sm:flex-initial shadow-none"
            >
              <Plus className="size-4" />
              Add a purchase
            </Button>
          </div>
        </div>

        {/* Tip Line for Caution Cards */}
        {cautionCards && cautionCards.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/50 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="size-4 shrink-0 text-warning-soft-foreground mt-0.5" />
            <p>
              <strong className="text-foreground">Pro-tip:</strong>{' '}
              {cautionCards.map((c) => `${c.card.bank_name} (${c.card.name})`).join(', ')}{' '}
              has its bill made within 2 days. Wait until after your bill is made to swipe for maximum days to pay!
            </p>
          </div>
        )}

        {/* Collapsible Ranked List */}
        {rankedCards && rankedCards.length > 1 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="no-spring -mx-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              }
            >
              <span>See all {rankedCards.length} cards ranked</span>
              <ChevronDown
                className={cn(
                  "size-4 transition-[rotate] duration-(--motion-base) ease-(--ease-spring-pop)",
                  isOpen && "rotate-180"
                )}
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-3">
              <div className="grid-fluid gap-2 [--grid-min:15rem]">
                {rankedCards.map((item, index) => (
                  <div
                    key={item.card.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="num font-semibold text-muted-foreground">{index + 1}.</span>
                        <span className="min-w-0 truncate font-semibold text-foreground" title={`${item.card.bank_name} ${item.card.name}`}>
                          {item.card.bank_name} {item.card.name}
                        </span>
                      </div>
                      <p className="text-2xs text-muted-foreground mt-0.5">
                        Cutoff: {item.nextCutoffDateFormatted}
                      </p>
                    </div>
                    <Badge variant={index === 0 ? 'success' : 'neutral'} className="num shrink-0 text-2xs py-0.5 px-2">
                      {item.floatDays} days
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
