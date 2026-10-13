"use client"

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { formatMoney } from '@/lib/finance/calculations';
import type { OptimalCardResult, CardSpendRecommendation } from '@/lib/finance/calculations';
import { Sparkles, Plus, ChevronDown, Info, Calendar } from 'lucide-react';

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
    <Card className="shadow-card overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Main Recommendation Row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-3.5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Best Card to Use Today ({todayFormatted})
              </span>
            </div>

            <div className="flex items-baseline gap-2.5">
              <h3 className="text-xl font-bold text-foreground sm:text-2xl">
                {bestCard.card.bank_name} {bestCard.card.name}
              </h3>
              <span className="text-sm font-mono text-muted-foreground">
                •••• {bestCard.card.last_4}
              </span>
            </div>

            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Anything you buy today goes on your{' '}
              <strong className="text-foreground">{bestCard.nextCutoffDateFormatted}</strong> bill,
              which you pay by{' '}
              <strong className="text-foreground">{bestCard.paymentDueDateFormatted}</strong>.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="flex flex-col items-center justify-center rounded-2xl bg-muted px-4 py-2 text-center">
              <span className="text-2xl font-extrabold text-foreground sm:text-3xl">
                {bestCard.floatDays}
              </span>
              <span className="text-2xs font-medium text-muted-foreground uppercase tracking-tight">
                days to pay
              </span>
            </div>

            <Button
              variant="primary"
              size="default"
              onClick={() => onAddPurchaseClick?.(bestCard.card.id)}
              className="min-h-12 h-12 cursor-pointer shadow-none"
            >
              <Plus className="mr-1.5 size-4" />
              Add a purchase
            </Button>
          </div>
        </div>

        {/* Tip Line for Caution Cards */}
        {cautionCards && cautionCards.length > 0 && (
          <div className="flex items-start gap-2.5 rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
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
          <Collapsible open={isOpen} onOpenChange={setIsOpen} className="pt-1">
            <CollapsibleTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer select-none"
                />
              }
            >
              <span>See all {rankedCards.length} cards ranked</span>
              <ChevronDown
                className={`size-3.5 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {rankedCards.map((item, index) => (
                  <div
                    key={item.card.id}
                    className="flex items-center justify-between rounded-xl bg-muted/50 p-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-muted-foreground">#{index + 1}</span>
                        <span className="font-semibold text-foreground">
                          {item.card.bank_name} {item.card.name}
                        </span>
                      </div>
                      <p className="text-2xs text-muted-foreground mt-0.5">
                        Cutoff: {item.nextCutoffDateFormatted}
                      </p>
                    </div>
                    <Badge variant={index === 0 ? 'success' : 'neutral'} className="text-2xs py-0.5 px-2">
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
