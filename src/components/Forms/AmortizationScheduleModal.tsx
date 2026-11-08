'use client';

import React, { useMemo, useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Liability } from '@/types';
import {
  calculateAmortizationSchedule,
  formatMoney,
  formatDate,
} from '@/lib/finance/calculations';
import { toggleLiabilityInstallmentPaidAction } from '@/app/actions/liabilities';
import { toast } from 'sonner';
import {
  Calendar,
  DollarSign,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Loader2,
} from 'lucide-react';

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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localPaidNumbers, setLocalPaidNumbers] = useState<number[] | null>(null);
  const [togglingNum, setTogglingNum] = useState<number | null>(null);

  // Sync local paid status when liability changes or dialog opens
  useEffect(() => {
    if (liability) {
      setLocalPaidNumbers(
        Array.isArray(liability.paid_installment_numbers)
          ? liability.paid_installment_numbers
          : null
      );
    } else {
      setLocalPaidNumbers(null);
    }
  }, [liability, isOpen]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const scheduleData = useMemo(() => {
    if (!liability) return null;

    const principal = Number(liability.original_principal || liability.current_principal_balance || 0);
    const annualRate = Number(liability.annual_interest_rate || 0);
    const rateType = liability.interest_rate_type || 'annual';
    const interestRate =
      liability.interest_rate !== undefined && liability.interest_rate !== null
        ? Number(liability.interest_rate)
        : annualRate;
    const termMonths = Number(liability.term_months || 0);
    const startDate = liability.start_date || undefined;
    const dueDay = liability.due_day || 15;
    const monthlyPayment = Number(liability.monthly_payment || 0);
    const isAmortizationOverridden = Boolean(liability.is_amortization_overridden);
    const firstPaymentDate = liability.first_payment_date || undefined;

    if (principal <= 0 || termMonths <= 0) return null;

    return calculateAmortizationSchedule({
      principal,
      annualInterestRate: annualRate,
      termMonths,
      startDate,
      monthlyDueDay: dueDay,
      rateType,
      interestRate,
      monthlyPayment,
      isAmortizationOverridden,
      firstPaymentDate,
      paidInstallmentNumbers: localPaidNumbers,
      asOfDate: todayStr,
    });
  }, [liability, localPaidNumbers, todayStr]);

  const handleTogglePaid = async (installmentNumber: number, nextIsPaid: boolean) => {
    if (!liability) return;
    setTogglingNum(installmentNumber);

    // Compute optimistic new list of paid installment numbers
    const currentPaidSet = new Set(
      scheduleData?.schedule.filter((r) => r.isPaid).map((r) => r.installmentNumber) || []
    );
    if (nextIsPaid) {
      currentPaidSet.add(installmentNumber);
    } else {
      currentPaidSet.delete(installmentNumber);
    }
    const nextPaidList = Array.from(currentPaidSet).sort((a, b) => a - b);
    setLocalPaidNumbers(nextPaidList);

    try {
      const res = await toggleLiabilityInstallmentPaidAction(
        liability.id,
        installmentNumber,
        nextIsPaid
      );
      if (res?.error) {
        toast.error(res.error);
        // Rollback
        setLocalPaidNumbers(
          Array.isArray(liability.paid_installment_numbers)
            ? liability.paid_installment_numbers
            : null
        );
      } else {
        toast.success(
          nextIsPaid
            ? `Month #${installmentNumber} marked as paid!`
            : `Month #${installmentNumber} marked as unpaid.`
        );
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update installment status.');
    } finally {
      setTogglingNum(null);
    }
  };

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
            {liability.interest_rate_type === 'monthly_addon'
              ? 'Fixed add-on rate payment schedule with steady monthly amortization. Click any status to toggle Paid/Unpaid.'
              : 'Reducing-balance payment schedule. Click any status to toggle Paid/Unpaid and immediately sync balance.'}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Financial Highlights */}
        {scheduleData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3 shrink-0">
            <div className="p-3 rounded-xl bg-muted/50 text-xs flex flex-col gap-1 min-w-0">
              <span className="text-label text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3 h-3 text-primary" />
                Remaining balance
              </span>
              <span className="num text-sm sm:text-base font-bold text-foreground block break-words">
                {formatMoney(scheduleData.remainingUnpaidBalance)}
              </span>
              <span className="text-2xs text-muted-foreground block font-medium">
                {scheduleData.unpaidCount} terms remaining
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-xs flex flex-col gap-1 min-w-0">
              <span className="text-label text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-primary" />
                Terms paid
              </span>
              <span className="num text-sm sm:text-base font-bold text-foreground block break-words">
                {scheduleData.paidCount} of {liability.term_months || scheduleData.schedule.length} paid
              </span>
              <span className="text-2xs text-success block font-semibold">
                {formatMoney(scheduleData.paidPrincipal)} paid prin
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-xs flex flex-col gap-1 min-w-0">
              <span className="text-label text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-warning-soft-foreground" />
                Monthly payment
              </span>
              <span className="num text-sm sm:text-base font-bold text-foreground block break-words">
                {formatMoney(scheduleData.monthlyPayment)}
              </span>
              <span className="text-2xs text-muted-foreground block font-medium">
                Due day {liability.due_day || 15}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 text-xs flex flex-col gap-1 min-w-0">
              <span className="text-label text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3 text-success" />
                Total repayment
              </span>
              <span className="num text-sm sm:text-base font-bold text-foreground block break-words">
                {formatMoney(scheduleData.totalPayment)}
              </span>
              <span className="text-2xs text-warning-soft-foreground block font-medium">
                {formatMoney(scheduleData.totalInterest)} int
              </span>
            </div>
          </div>
        )}

        {/* Schedule Table */}
        {!scheduleData || scheduleData.schedule.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Term or principal information is incomplete</p>
            <p className="max-w-xs mx-auto">
              Please ensure this liability has both an original principal amount and term length (in months) to generate the amortization schedule.
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto rounded-2xl min-h-0">
            <table className="num w-full min-w-[36rem] text-left text-xs border-collapse">
              <thead className="bg-muted sticky top-0 z-10">
                <tr className="font-semibold text-muted-foreground text-2xs">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Due date</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Payment</th>
                  <th className="py-2.5 px-3 text-right">Principal</th>
                  <th className="py-2.5 px-3 text-right">Interest</th>
                  <th className="py-2.5 px-3 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="font-medium [&>tr:nth-child(even)]:bg-muted/30">
                {scheduleData.schedule.map((row) => {
                  const isPast = row.dueDate < todayStr;
                  const isBusy = togglingNum === row.installmentNumber;

                  return (
                    <tr
                      key={row.installmentNumber}
                      className={`hover:bg-muted/40 transition-colors ${
                        row.isPaid ? 'opacity-80 bg-muted/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-muted-foreground font-semibold">
                        {row.installmentNumber}
                      </td>
                      <td className="py-2 px-3 text-foreground whitespace-nowrap">
                        {formatDate(row.dueDate)}
                      </td>
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleTogglePaid(row.installmentNumber, !row.isPaid)}
                          className="inline-flex items-center gap-1 rounded-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          title="Click to toggle Paid / Unpaid"
                        >
                          {isBusy ? (
                            <Badge variant="outline" className="text-3xs py-0.5 px-2 bg-muted">
                              <Loader2 className="size-3 animate-spin mr-1" />
                              Saving...
                            </Badge>
                          ) : row.isPaid ? (
                            <Badge
                              variant="outline"
                              className="bg-success-soft text-success hover:bg-success-soft text-3xs font-bold py-0.5 px-2"
                            >
                              <CheckCircle2 className="size-3 mr-1" />
                              Paid
                            </Badge>
                          ) : isPast ? (
                            <Badge
                              variant="outline"
                              className="bg-warning-soft text-warning-soft-foreground hover:bg-warning-soft text-3xs font-bold py-0.5 px-2"
                            >
                              <AlertCircle className="size-3 mr-1" />
                              Unpaid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-muted text-muted-foreground hover:bg-muted/80 text-3xs font-medium py-0.5 px-2"
                            >
                              <Clock className="size-3 mr-1" />
                              Upcoming
                            </Badge>
                          )}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap font-bold text-foreground">
                        {formatMoney(row.paymentAmount)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap text-success font-semibold">
                        {formatMoney(row.principalAmount)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap text-warning-soft-foreground font-semibold">
                        {formatMoney(row.interestAmount)}
                      </td>
                      <td className="py-2 px-3 text-right whitespace-nowrap text-foreground font-bold">
                        {formatMoney(row.remainingBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-end pt-3 mt-2 shrink-0">
          <Button variant="default" onClick={onClose} className="px-6">
            Close schedule
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
