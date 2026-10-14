'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Liability } from '@/types';
import {
  calculateAmortizationSchedule,
  formatMoney,
  formatDate,
} from '@/lib/finance/calculations';
import { Calendar, DollarSign, Percent, TrendingDown } from 'lucide-react';

interface AmortizationScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  liability: Liability | null;
}

export function AmortizationScheduleModal({
  isOpen,
  onClose,
  liability,
}: AmortizationScheduleModalProps) {
  const scheduleData = useMemo(() => {
    if (!liability) return null;

    const principal = Number(liability.original_principal || liability.current_principal_balance || 0);
    const annualRate = Number(liability.annual_interest_rate || 0);
    const termMonths = Number(liability.term_months || 0);
    const startDate = liability.start_date || undefined;
    const dueDay = liability.due_day || 15;

    if (principal <= 0 || termMonths <= 0) return null;

    return calculateAmortizationSchedule({
      principal,
      annualInterestRate: annualRate,
      termMonths,
      startDate,
      monthlyDueDay: dueDay,
    });
  }, [liability]);

  if (!liability) return null;

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <ResponsiveDialogHeader className="shrink-0 pb-2">
          <ResponsiveDialogTitle className="flex items-center gap-2 text-lg">
            <TrendingDown className="w-5 h-5 text-primary" />
            Amortization Schedule: {liability.name}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Reducing-balance payment schedule separating principal reduction from financing interest charges.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Financial Highlights */}
        {scheduleData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 shrink-0">
            <div className="p-3 rounded-2xl bg-muted/60 text-xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-primary" />
                Monthly PMT
              </span>
              <span className="text-sm font-black text-foreground block">
                {formatMoney(scheduleData.monthlyPayment)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/60 text-xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <Percent className="w-3 h-3 text-amber-500" />
                Annual Rate
              </span>
              <span className="text-sm font-black text-foreground block">
                {liability.annual_interest_rate}% p.a.
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/60 text-xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-500" />
                Total Interest
              </span>
              <span className="text-sm font-black text-amber-600 dark:text-amber-400 block">
                {formatMoney(scheduleData.totalInterest)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-muted/60 text-xs space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-emerald-500" />
                Total Repayment
              </span>
              <span className="text-sm font-black text-foreground block">
                {formatMoney(scheduleData.totalPayment)}
              </span>
            </div>
          </div>
        )}

        {/* Schedule Table */}
        {!scheduleData || scheduleData.schedule.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Term or Principal Information Incomplete</p>
            <p className="max-w-xs mx-auto">
              Please ensure this liability has both an original principal amount and term length (in months) to generate the amortization schedule.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-2xl border border-border/60 min-h-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted sticky top-0 z-10 border-b border-border/60">
                <tr className="font-bold text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Payment</th>
                  <th className="py-2.5 px-3 text-right">Principal</th>
                  <th className="py-2.5 px-3 text-right">Interest</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-medium">
                {scheduleData.schedule.map((row) => (
                  <tr
                    key={row.installmentNumber}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-2 px-3 text-muted-foreground font-semibold">
                      {row.installmentNumber}
                    </td>
                    <td className="py-2 px-3 text-foreground whitespace-nowrap">
                      {formatDate(row.dueDate)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-foreground">
                      {formatMoney(row.paymentAmount)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatMoney(row.principalAmount)}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-600 dark:text-amber-400 font-semibold">
                      {formatMoney(row.interestAmount)}
                    </td>
                    <td className="py-2 px-3 text-right text-foreground font-bold">
                      {formatMoney(row.remainingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end pt-3 mt-2 shrink-0 border-t border-border/40">
          <Button variant="default" onClick={onClose} className="rounded-2xl font-bold px-6">
            Close Schedule
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
