"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  getCardUrgency,
  getUsageLevel,
  calculateNextDueDate,
  formatDate,
} from '@/lib/finance/calculations';
import { toggleCardReminderAction } from '@/app/actions/cards';
import { CreditCard } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Bell,
  CreditCard as CardChipIcon,
} from 'lucide-react';

export interface CardSpendingSummary {
  directSpend: number;
  loansSpend: number;
  totalUsed: number;
  lastSwipeDate?: string | null;
}

interface CreditCardTileProps {
  card: CreditCard;
  spending: CardSpendingSummary;
  onEdit: (card: CreditCard) => void;
  onDelete: (cardId: string) => void;
}

function formatWholePesos(amount: number): string {
  const rounded = Math.round(amount);
  return `₱${rounded.toLocaleString('en-PH')}`;
}

function getOrdinalSuffix(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

export function CreditCardTile({
  card,
  spending,
  onEdit,
  onDelete,
}: CreditCardTileProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isReminderOn, setIsReminderOn] = useState(card.reminders_enabled !== false);

  const handleToggleReminder = async (checked: boolean) => {
    setIsReminderOn(checked);
    const res = await toggleCardReminderAction(card.id, checked);
    if (res?.error) {
      setIsReminderOn(!checked);
      toast.error(res.error);
    } else {
      toast.success(
        checked
          ? `Reminders enabled for ${card.bank_name} ${card.name}`
          : `Reminders disabled for ${card.bank_name} ${card.name}`
      );
    }
  };

  const creditLimit = Number(card.credit_limit || 0);
  const totalUsed = spending.totalUsed || 0;
  const loansBoughtForOthers = spending.loansSpend || 0;
  const availableToSpend = Math.max(0, creditLimit - totalUsed);

  const usagePct = creditLimit > 0 ? Math.min(100, Math.round((totalUsed / creditLimit) * 100)) : 0;
  const usageInfo = getUsageLevel(usagePct);

  // Compute due date & urgency
  const dueDateInfo = calculateNextDueDate(card.due_day);
  const billedBalance = card.latest_statement
    ? Number(card.latest_statement.billed_amount || 0) - Number(card.latest_statement.paid_amount || 0)
    : totalUsed;

  const urgencyInfo = getCardUrgency(dueDateInfo.nextDueDate, billedBalance);

  return (
    <>
      <Card className="group relative shadow-card hover:shadow-lift transition-all duration-200 overflow-hidden flex flex-col justify-between">
        <CardContent className="p-5 sm:p-6 space-y-5 flex-1 flex flex-col justify-between">
          {/* Top Bar: Chip, Bank, Name, and Menu */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
                <CardChipIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  {card.bank_name}
                </p>
                <h3 className="font-bold text-base text-foreground truncate">
                  {card.name}{' '}
                  <span className="font-mono text-xs font-normal text-muted-foreground">
                    •••• {card.last_4}
                  </span>
                </h3>
              </div>
            </div>

            {/* Menu trigger - positioned relative to avoid being covered by stretched link */}
            <div className="relative z-20 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                      aria-label={`Options for ${card.bank_name} ${card.name}`}
                    />
                  }
                >
                  <MoreVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(card)} className="cursor-pointer">
                    <Pencil className="mr-2 size-4 text-muted-foreground" />
                    Edit card
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs text-foreground select-none">
                    <span className="flex items-center gap-2">
                      <Bell className="size-3.5 text-muted-foreground" />
                      Reminders
                    </span>
                    <Switch
                      size="sm"
                      checked={isReminderOn}
                      onCheckedChange={(checked) => handleToggleReminder(checked)}
                      aria-label={`Toggle payment reminders for ${card.name}`}
                    />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setIsAlertOpen(true)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove card
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Status Badge & Reminder Tag */}
          <div className="flex items-center justify-between gap-2">
            <Badge
              variant={urgencyInfo.variant}
              className="font-medium text-xs py-1 px-2.5 inline-flex items-center gap-1.5"
            >
              {urgencyInfo.urgency === 'none' && <CheckCircle2 className="size-3.5" />}
              {urgencyInfo.urgency === 'ok' && <Clock className="size-3.5" />}
              {urgencyInfo.urgency === 'soon' && <Clock className="size-3.5" />}
              {(urgencyInfo.urgency === 'urgent' || urgencyInfo.urgency === 'overdue') && (
                <AlertTriangle className="size-3.5" />
              )}
              <span>{urgencyInfo.label}</span>
            </Badge>

            <span
              className={cn(
                "inline-flex items-center gap-1 text-2xs font-medium",
                isReminderOn ? "text-muted-foreground" : "text-muted-foreground/60"
              )}
            >
              <Bell className={cn("size-3", isReminderOn ? "text-primary" : "text-muted-foreground/40")} />
              {isReminderOn ? "Reminder on" : "Reminder off"}
            </span>
          </div>

          {/* Money & Spending Block */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">Available spending</span>
              <span className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
                {formatWholePesos(availableToSpend)}
              </span>
            </div>

            <Progress
              value={usagePct}
              variant={usageInfo.variant}
              className="h-2"
              aria-label={`Card usage: ${usagePct}%`}
            />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Used {formatWholePesos(totalUsed)} of {formatWholePesos(creditLimit)}
              </span>
              <span className="font-semibold text-foreground">
                {usagePct}% • {usageInfo.label}
              </span>
            </div>

            {/* Bought for others line */}
            {loansBoughtForOthers > 0 && (
              <div className="pt-0.5">
                <Link
                  href="/dashboard/receivables"
                  onClick={(e) => e.stopPropagation()}
                  className="relative z-20 text-xs font-medium text-warning-soft-foreground hover:underline inline-flex items-center gap-1"
                >
                  Includes {formatWholePesos(loansBoughtForOthers)} you bought for others →
                </Link>
              </div>
            )}
          </div>

          {/* Dates Well */}
          <div className="rounded-xl bg-muted/60 p-3 space-y-1 text-xs text-muted-foreground">
            <p>
              Bill is made:{' '}
              <strong className="text-foreground">
                {card.statement_day}
                {getOrdinalSuffix(card.statement_day)} of each month
              </strong>
            </p>
            <p>
              Pay by:{' '}
              <strong className="text-foreground">
                {card.due_day}
                {getOrdinalSuffix(card.due_day)} of each month
              </strong>
            </p>
          </div>

          {/* Stretched Action Link */}
          <div className="pt-1 flex items-center justify-between text-xs font-semibold text-primary">
            <span>View statements & transactions</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>

          {/* Stretched Link Target */}
          <Link
            href={`/dashboard/cards/${card.id}`}
            className="absolute inset-0 z-10"
            aria-label={`View details for ${card.bank_name} ${card.name}`}
          >
            <span className="sr-only">View card details</span>
          </Link>
        </CardContent>
      </Card>

      {/* Confirmation Dialog for Remove Card (TNV-022) */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this credit card?</AlertDialogTitle>
            <AlertDialogDescription>
              Removing {card.bank_name} {card.name} won't delete your transaction history. All past purchases will remain safely saved in your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsAlertOpen(false);
                onDelete(card.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
