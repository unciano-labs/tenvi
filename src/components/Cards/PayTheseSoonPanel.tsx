"use client";

import React, { useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney } from '@/lib/finance/calculations';
import { markCardDuePaidAction } from '@/app/actions/cards';
import { toast } from 'sonner';
import { Clock, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DueSoonCardItem } from '@/types';
export type { DueSoonCardItem };

interface HoldToPayButtonProps {
  item: DueSoonCardItem;
  onPay: (item: DueSoonCardItem) => Promise<boolean>;
  isPending: boolean;
}

function HoldToPayButton({ item, onPay, isPending }: HoldToPayButtonProps) {
  const [isHolding, setIsHolding] = React.useState(false);
  const [isPaid, setIsPaid] = React.useState(false);
  const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const handleHoldStart = (e?: React.SyntheticEvent) => {
    if (isPaid || isPending) return;
    if (e && 'button' in e && (e as React.MouseEvent).button !== 0) return; // Primary mouse click only

    setIsHolding(true);
    clearHoldTimer();

    holdTimerRef.current = setTimeout(async () => {
      // 1-second hold reached! Mark as paid
      setIsHolding(false);
      setIsPaid(true);

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(50);
        } catch {
          // ignore if vibration is restricted
        }
      }

      const success = await onPay(item);
      if (!success) {
        setIsPaid(false);
      }
    }, 1000);
  };

  const handleHoldEnd = () => {
    if (isPaid) return;
    setIsHolding(false);
    clearHoldTimer();
  };

  React.useEffect(() => {
    return () => {
      clearHoldTimer();
    };
  }, []);

  return (
    <button
      type="button"
      disabled={isPending || isPaid}
      onPointerDown={handleHoldStart}
      onPointerUp={handleHoldEnd}
      onPointerLeave={handleHoldEnd}
      onPointerCancel={handleHoldEnd}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          if (!isHolding && !isPaid) {
            e.preventDefault();
            handleHoldStart();
          }
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleHoldEnd();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative min-h-10 min-w-[130px] sm:min-w-[140px] px-4 py-2 rounded-xl overflow-hidden cursor-pointer select-none touch-none transition-all duration-200 text-xs font-semibold flex items-center justify-center shadow-xs shrink-0",
        isPaid
          ? "bg-emerald-600 dark:bg-emerald-500 text-white cursor-default"
          : "bg-emerald-500/15 hover:bg-emerald-500/20 active:scale-[0.98] text-emerald-800 dark:text-emerald-200"
      )}
      aria-label={
        isPaid
          ? "Paid"
          : isHolding
            ? `Holding to pay ${item.bankName} balance...`
            : `Press and hold to mark ${item.bankName} balance as paid`
      }
    >
      {/* Smooth fill overlay that sweeps gradually from left to right */}
      <div
        className="absolute inset-0 bg-emerald-600 dark:bg-emerald-500 pointer-events-none origin-left"
        style={{
          transform: isHolding || isPaid ? 'scaleX(1)' : 'scaleX(0)',
          transitionProperty: 'transform',
          transitionDuration: isHolding ? '1000ms' : isPaid ? '150ms' : '200ms',
          transitionTimingFunction: isHolding ? 'cubic-bezier(0.2, 0.8, 0.2, 1)' : 'ease-out',
        }}
      />

      {/* Button content & label */}
      <span
        className={cn(
          "relative z-10 flex items-center justify-center gap-1.5 transition-colors duration-200",
          isHolding || isPaid ? "text-white" : "text-emerald-800 dark:text-emerald-200"
        )}
      >
        {isPaid ? (
          <>
            <Check className="size-3.5 stroke-[2.5] animate-in zoom-in-75 duration-200" />
            <span className="font-bold">Paid</span>
          </>
        ) : isPending ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>Saving...</span>
          </>
        ) : isHolding ? (
          <>
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            <span>Hold to pay...</span>
          </>
        ) : (
          <>
            <Check className="size-3.5 opacity-70" />
            <span>Hold to mark paid</span>
          </>
        )}
      </span>
    </button>
  );
}

interface PayTheseSoonPanelProps {
  dueSoonCards: DueSoonCardItem[];
  onPaidSuccess?: (statementId: string) => void;
}

export function PayTheseSoonPanel({
  dueSoonCards,
  onPaidSuccess,
}: PayTheseSoonPanelProps) {
  const [pendingCardId, setPendingCardId] = React.useState<string | null>(null);
  const [hiddenCardIds, setHiddenCardIds] = React.useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = async (item: DueSoonCardItem): Promise<boolean> => {
    setPendingCardId(item.cardId);

    try {
      const res = await markCardDuePaidAction({
        cardId: item.cardId,
        statementId: item.statementId,
        amountPaid: item.amountDue,
        dueDate: item.dueDate,
        cycleEnd: item.cycleEnd,
      });

      if (res?.error) {
        toast.error(res.error);
        return false;
      }

      toast.success(`Marked ${item.bankName} balance as paid.`);
      setHiddenCardIds((prev) => [...prev, item.cardId]);

      setTimeout(() => {
        onPaidSuccess?.(item.statementId || item.cardId);
      }, 500);

      return true;
    } catch (err) {
      toast.error('Could not record payment. Please try again.');
      return false;
    } finally {
      setPendingCardId(null);
    }
  };

  const visibleCards = React.useMemo(() => {
    return (dueSoonCards || []).filter((c) => !hiddenCardIds.includes(c.cardId));
  }, [dueSoonCards, hiddenCardIds]);

  if (!visibleCards || visibleCards.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-card" aria-live="polite">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-warning-soft text-warning-soft-foreground">
              <Clock className="size-4" />
            </div>
            <CardTitle className="text-base font-semibold">Pay These Soon</CardTitle>
          </div>
          <Badge variant="warning">
            {visibleCards.length} {visibleCards.length === 1 ? 'bill' : 'bills'} due within 3 days
          </Badge>
        </div>
        <CardDescription>
          Upcoming statement balances that need attention to avoid interest and late fees. Press and hold to confirm payment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleCards.map((item) => {
            const isItemPending = isPending && pendingCardId === item.cardId;
            const isUrgentOrOverdue = item.urgency === 'urgent' || item.urgency === 'overdue';

            return (
              <div
                key={item.cardId}
                className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4 transition-colors hover:bg-muted sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
                      isUrgentOrOverdue
                        ? 'bg-danger-soft text-danger-soft-foreground'
                        : 'bg-warning-soft text-warning-soft-foreground'
                    }`}
                  >
                    {isUrgentOrOverdue ? (
                      <AlertTriangle className="size-4" />
                    ) : (
                      <Clock className="size-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-base leading-snug whitespace-normal break-words">
                        {item.bankName} {item.cardName}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">
                        •••• {item.last4}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due: {item.dueDateFormatted}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <div className="font-bold text-base text-foreground">
                      {formatMoney(item.amountDue)}
                    </div>
                    <Badge
                      variant={isUrgentOrOverdue ? 'danger' : 'warning'}
                      className="mt-0.5 text-xs font-medium"
                    >
                      {item.daysRemaining < 0
                        ? `Overdue by ${Math.abs(item.daysRemaining)}d`
                        : item.daysRemaining === 0
                          ? 'Due today'
                          : item.daysRemaining === 1
                            ? 'Due tomorrow'
                            : `${item.daysRemaining} days left`}
                    </Badge>
                  </div>

                  <HoldToPayButton
                    item={item}
                    onPay={handleMarkPaid}
                    isPending={isItemPending}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
