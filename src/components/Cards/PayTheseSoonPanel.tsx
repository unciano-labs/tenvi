"use client"

import React, { useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/finance/calculations';
import { markStatementPaidAction } from '@/app/actions/cards';
import { toast } from 'sonner';
import { CheckCircle2, Clock, AlertTriangle, Loader2 } from 'lucide-react';

export interface DueSoonCardItem {
  statementId?: string;
  cardId: string;
  cardName: string;
  bankName: string;
  last4: string;
  dueDateFormatted: string;
  daysRemaining: number;
  amountDue: number;
  urgency: 'urgent' | 'soon' | 'overdue';
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
  const [isPending, startTransition] = useTransition();

  const handleMarkPaid = (item: DueSoonCardItem) => {
    if (!item.statementId) {
      toast.info('Statement details are saved in your card transactions.');
      return;
    }

    setPendingCardId(item.cardId);
    startTransition(async () => {
      try {
        const res = await markStatementPaidAction({
          statementId: item.statementId!,
          amountPaid: item.amountDue,
          isFullPayment: true,
        });

        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(`Marked ${item.bankName} statement as paid.`);
          onPaidSuccess?.(item.statementId!);
        }
      } catch (err) {
        toast.error('Could not record payment. Please try again.');
      } finally {
        setPendingCardId(null);
      }
    });
  };

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
          {dueSoonCards.length > 0 && (
            <Badge variant="warning">
              {dueSoonCards.length} {dueSoonCards.length === 1 ? 'bill' : 'bills'} due within 7 days
            </Badge>
          )}
        </div>
        <CardDescription>
          Upcoming statement balances that need attention to avoid interest and late fees.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dueSoonCards.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-success-soft-foreground">
            <CheckCircle2 className="size-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">You're all caught up!</p>
              <p className="text-xs opacity-90">
                No credit card bills are due within the next 7 days.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {dueSoonCards.map((item) => {
              const isItemPending = isPending && pendingCardId === item.cardId;
              const isUrgentOrOverdue = item.urgency === 'urgent' || item.urgency === 'overdue';

              return (
                <div
                  key={item.cardId}
                  className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4 transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">
                          {item.bankName} {item.cardName}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
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
                        className="mt-0.5 text-2xs py-0.5 px-2"
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

                    <Button
                      variant="soft"
                      size="sm"
                      disabled={isItemPending}
                      onClick={() => handleMarkPaid(item)}
                      className="shrink-0 cursor-pointer min-h-10"
                    >
                      {isItemPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                      {isItemPending ? 'Saving...' : 'Mark as paid'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
