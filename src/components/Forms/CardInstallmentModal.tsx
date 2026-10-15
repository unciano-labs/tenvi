'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Layers,
  CreditCard as CardIcon,
  Calendar,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Receipt,
  Store,
} from 'lucide-react';
import { CreditCard } from '@/types';
import {
  calculateLiabilityAmortization,
  calculateAmortizationSchedule,
  formatMoney,
  formatDate,
} from '@/lib/finance/calculations';
import { createCardInstallmentAction } from '@/app/actions/cards';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Badge } from '@/components/ui/badge';

interface CardInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditCards: CreditCard[];
  defaultCreditCardId?: string;
  onSuccess?: () => void;
}

const TERM_PRESETS = [3, 6, 12, 18, 24, 36];

export function CardInstallmentModal({
  isOpen,
  onClose,
  creditCards,
  defaultCreditCardId,
  onSuccess,
}: CardInstallmentModalProps) {
  const router = useRouter();

  // Selected Card
  const [selectedCardId, setSelectedCardId] = useState<string>(
    defaultCreditCardId || (creditCards.length > 0 ? creditCards[0].id : '')
  );

  // Form Fields
  const [merchantName, setMerchantName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [termMonths, setTermMonths] = useState<string>('12');
  const [monthlyAddonRate, setMonthlyAddonRate] = useState<string>('0');
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [firstBillingMonth, setFirstBillingMonth] = useState('');
  const [monthlyAmortization, setMonthlyAmortization] = useState('');
  const [isAmortizationOverridden, setIsAmortizationOverridden] = useState(false);
  const [notes, setNotes] = useState('');

  // UI state
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target Credit Card
  const targetCard = useMemo(() => {
    return creditCards.find((c) => c.id === selectedCardId) || creditCards[0] || null;
  }, [creditCards, selectedCardId]);

  const dueDay = targetCard?.due_day || 15;

  // Reset or initialize state on open
  useEffect(() => {
    if (isOpen) {
      if (defaultCreditCardId) {
        setSelectedCardId(defaultCreditCardId);
      } else if (creditCards.length > 0 && !selectedCardId) {
        setSelectedCardId(creditCards[0].id);
      }
      setMerchantName('');
      setPrincipal('');
      setTermMonths('12');
      setMonthlyAddonRate('0');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setFirstBillingMonth('');
      setMonthlyAmortization('');
      setIsAmortizationOverridden(false);
      setNotes('');
      setShowSchedulePreview(false);
    }
  }, [isOpen, defaultCreditCardId, creditCards]);

  // Recalculates amortization based on inputs
  const recalculateAmortization = (
    principalVal: string,
    termVal: string,
    rateVal: string
  ) => {
    const p = Number(principalVal) || 0;
    const n = Number(termVal) || 0;
    const rate = Number(rateVal) || 0;

    if (p > 0 && n > 0) {
      const computed = calculateLiabilityAmortization({
        principal: p,
        termMonths: n,
        interestRate: rate,
        rateType: 'monthly_addon',
      });
      setMonthlyAmortization(computed > 0 ? String(computed) : '');
      setIsAmortizationOverridden(false);
    } else {
      setMonthlyAmortization('');
      setIsAmortizationOverridden(false);
    }
  };

  const handlePrincipalChange = (val: string) => {
    setPrincipal(val);
    recalculateAmortization(val, termMonths, monthlyAddonRate);
  };

  const handleTermChange = (term: number | string) => {
    const val = String(term);
    setTermMonths(val);
    recalculateAmortization(principal, val, monthlyAddonRate);
  };

  const handleRateChange = (rateVal: string) => {
    setMonthlyAddonRate(rateVal);
    recalculateAmortization(principal, termMonths, rateVal);
  };

  const handleResetAmortization = () => {
    recalculateAmortization(principal, termMonths, monthlyAddonRate);
  };

  // Preview Amortization Schedule
  const scheduleData = useMemo(() => {
    const p = Number(principal) || 0;
    const n = Number(termMonths) || 0;
    const r = Number(monthlyAddonRate) || 0;
    const mPmt = Number(monthlyAmortization) || 0;

    if (p <= 0 || n <= 0) return null;

    let computedFirstDue: string | undefined = undefined;
    if (firstBillingMonth) {
      const parts = firstBillingMonth.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const daysInMonth = new Date(y, m, 0).getDate();
      const clampedDay = Math.min(dueDay, daysInMonth);
      computedFirstDue = `${y}-${String(m).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
    }

    return calculateAmortizationSchedule({
      principal: p,
      annualInterestRate: r * 12,
      rateType: 'monthly_addon',
      interestRate: r,
      termMonths: n,
      startDate: transactionDate || undefined,
      firstPaymentDate: computedFirstDue,
      monthlyDueDay: dueDay,
      monthlyPayment: mPmt > 0 ? mPmt : undefined,
      isAmortizationOverridden,
    });
  }, [
    principal,
    termMonths,
    monthlyAddonRate,
    monthlyAmortization,
    isAmortizationOverridden,
    transactionDate,
    firstBillingMonth,
    dueDay,
  ]);

  const pNum = Number(principal) || 0;
  const nNum = Number(termMonths) || 0;
  const rNum = Number(monthlyAddonRate) || 0;
  const fixedMonthlyInterest = pNum > 0 ? pNum * (rNum / 100) : 0;
  const fixedMonthlyPrincipal = pNum > 0 && nNum > 0 ? pNum / nNum : 0;
  const isZeroPercentPromo = rNum === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCardId) {
      toast.error('Please select a credit card.');
      return;
    }
    if (!merchantName.trim()) {
      toast.error('Please enter the merchant / transaction name.');
      return;
    }
    if (pNum <= 0) {
      toast.error('Please enter a valid purchase principal amount.');
      return;
    }
    if (nNum < 1) {
      toast.error('Installment term must be at least 1 month.');
      return;
    }

    const finalAmortization = Number(monthlyAmortization) || (pNum / nNum + fixedMonthlyInterest);

    setIsSubmitting(true);
    try {
      const res = await createCardInstallmentAction({
        creditCardId: selectedCardId,
        merchantName: merchantName.trim(),
        principal: pNum,
        termMonths: nNum,
        monthlyAddonRate: rNum,
        transactionDate,
        firstBillingMonth: firstBillingMonth.trim() || null,
        monthlyAmortization: Number(finalAmortization.toFixed(2)),
        isAmortizationOverridden,
        notes: notes.trim() || null,
      });

      if (res?.error) {
        toast.error(res.error);
        return;
      }

      toast.success('Installment transaction recorded successfully!');
      onClose();
      if (onSuccess) onSuccess();
      router.refresh();
    } catch (err) {
      console.error('Error creating installment:', err);
      toast.error('Failed to create installment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent className="max-w-2xl">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Layers className="size-4" />
            </div>
            <div>
              <ResponsiveDialogTitle className="text-lg font-bold">
                Record Card Installment
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription className="text-xs text-muted-foreground">
                Set up an installment plan linked directly to your credit card limit and billing cycle.
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="space-y-4 sm:space-y-5 pt-1">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card Selector / Card Info */}
            <div className="p-3 rounded-2xl bg-muted/60 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-card shadow-xs text-primary shrink-0">
                  <CardIcon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-foreground truncate">
                    {targetCard ? `${targetCard.bank_name} ${targetCard.name}` : 'Select Card'}
                  </p>
                  <p className="text-muted-foreground text-2xs truncate">
                    {targetCard?.last_4 ? `Card ending in •••• ${targetCard.last_4}` : ''} • Bill Day {targetCard?.statement_day || 1} • Due Day {targetCard?.due_day || 15}
                  </p>
                </div>
              </div>

              {creditCards.length > 1 && (
                <div className="shrink-0">
                  <select
                    value={selectedCardId}
                    onChange={(e) => setSelectedCardId(e.target.value)}
                    className="h-8 px-2.5 rounded-lg border border-border bg-card text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.bank_name} - {c.name} (Due {c.due_day || 15}th)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Merchant / Name & Principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Store className="size-3.5 text-muted-foreground" />
                  Transaction Name / Merchant
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Apple Store (iPhone 16 Pro), Abenson"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Total Purchase Amount</span>
                  <span className="text-2xs text-muted-foreground font-normal">Principal</span>
                </label>
                <MoneyInput
                  placeholder="0.00"
                  value={principal}
                  onChange={handlePrincipalChange}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Term & Monthly Add-on Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
              {/* Term */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Installment Term (Months)</span>
                  <span className="text-2xs font-bold text-primary">{termMonths} mos</span>
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TERM_PRESETS.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      variant={termMonths === String(t) ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleTermChange(t)}
                      className={`h-7 px-2.5 text-2xs font-bold rounded-lg cursor-pointer ${
                        termMonths === String(t) ? 'shadow-none' : ''
                      }`}
                    >
                      {t}m
                    </Button>
                  ))}
                  <div className="w-16">
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      value={termMonths}
                      onChange={(e) => handleTermChange(e.target.value)}
                      className="h-7 text-2xs rounded-lg px-2 text-center font-bold"
                      placeholder="Custom"
                    />
                  </div>
                </div>
              </div>

              {/* Monthly Add-on Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground">
                    Monthly Add-on Rate (%)
                  </label>
                  <Button
                    type="button"
                    variant={isZeroPercentPromo ? 'soft' : 'ghost'}
                    size="sm"
                    onClick={() => handleRateChange('0')}
                    className="h-5 px-1.5 text-3xs font-extrabold uppercase rounded cursor-pointer"
                  >
                    <Sparkles className="size-2.5 mr-0.5 text-amber-500" />
                    0% Promo
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={monthlyAddonRate}
                    onChange={(e) => handleRateChange(e.target.value)}
                    className="h-10 text-xs rounded-xl pr-12 font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-2xs text-muted-foreground font-bold pointer-events-none">
                    % / mo
                  </span>
                </div>
                <p className="text-2xs text-muted-foreground">
                  {isZeroPercentPromo
                    ? '0% installment promo: No interest or financing charges added.'
                    : `Annual Equivalent: ${(rNum * 12).toFixed(2)}% p.a.`}
                </p>
              </div>
            </div>

            {/* Dates: Transaction Date & BNPL First Billing Month */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  Transaction Date
                </label>
                <Input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="size-3.5 text-muted-foreground" />
                    First Billing Month
                  </label>
                  <Badge variant="outline" className="text-3xs py-0 px-1 font-normal text-muted-foreground border-border">
                    Optional (BNPL)
                  </Badge>
                </div>
                <Input
                  type="month"
                  value={firstBillingMonth}
                  onChange={(e) => setFirstBillingMonth(e.target.value)}
                  className="h-10 text-xs rounded-xl font-medium"
                />
                <p className="text-2xs text-muted-foreground">
                  {firstBillingMonth ? (
                    <span className="text-primary font-medium">
                      First payment scheduled for Day {dueDay} of this month.
                    </span>
                  ) : (
                    `Defaults to upcoming due date (Day ${dueDay}) after purchase.`
                  )}
                </p>
              </div>
            </div>

            {/* Monthly Amortization (Auto-Computed & Editable) */}
            <div className="p-3.5 rounded-2xl bg-card border border-primary/25 shadow-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">
                      Monthly Amortization
                    </span>
                    {isAmortizationOverridden ? (
                      <Badge variant="warning" className="text-3xs py-0 px-1 font-bold">
                        Adjusted
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-3xs py-0 px-1 font-medium bg-primary/10 text-primary border-primary/25">
                        Auto-Computed
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xs text-muted-foreground">
                    Editable to align with exact centavos on your bank statement.
                  </p>
                </div>

                {isAmortizationOverridden && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetAmortization}
                    className="h-6 px-2 text-2xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <RotateCcw className="size-3 mr-1" />
                    Reset to computed
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <MoneyInput
                    placeholder="0.00"
                    value={monthlyPaymentFormatted(monthlyAmortization)}
                    onChange={(val) => {
                      setMonthlyAmortization(val);
                      setIsAmortizationOverridden(true);
                    }}
                    className="h-11 text-sm font-extrabold rounded-xl text-primary"
                  />
                </div>
                <div className="text-right text-xs shrink-0 pr-1">
                  <span className="text-muted-foreground block text-2xs">Breakdown</span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(fixedMonthlyPrincipal)} <span className="text-2xs text-muted-foreground font-normal">prin</span> + {formatMoney(fixedMonthlyInterest)} <span className="text-2xs text-muted-foreground font-normal">int</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Commitment Summary Banner */}
            {scheduleData && (
              <div className="p-3 rounded-2xl bg-muted/50 border border-border/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <span className="text-2xs text-muted-foreground block font-medium">Monthly Due</span>
                  <span className="font-extrabold text-foreground block">
                    {formatMoney(scheduleData.monthlyPayment)}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-muted-foreground block font-medium">Total Interest</span>
                  <span className={`font-extrabold block ${scheduleData.totalInterest === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {scheduleData.totalInterest === 0 ? '₱0.00 (0%)' : formatMoney(scheduleData.totalInterest)}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-muted-foreground block font-medium">Total Repayment</span>
                  <span className="font-extrabold text-foreground block">
                    {formatMoney(scheduleData.totalPayment)}
                  </span>
                </div>
                <div>
                  <span className="text-2xs text-muted-foreground block font-medium">First Due Date</span>
                  <span className="font-bold text-foreground block">
                    {scheduleData.schedule[0] ? formatDate(scheduleData.schedule[0].dueDate) : '—'}
                  </span>
                </div>
              </div>
            )}

            {/* Collapsible Full Schedule Preview */}
            {scheduleData && scheduleData.schedule.length > 0 && (
              <div className="border border-border/60 rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSchedulePreview((prev) => !prev)}
                  className="w-full p-3 bg-muted/40 hover:bg-muted/70 transition-colors flex items-center justify-between text-xs font-bold text-foreground cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary" />
                    Preview Payment Schedule ({scheduleData.schedule.length} installments)
                  </span>
                  {showSchedulePreview ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </button>

                {showSchedulePreview && (
                  <div className="p-3 bg-card border-t border-border/40 max-h-48 overflow-y-auto space-y-1">
                    <div className="grid grid-cols-4 text-3xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40 px-2">
                      <span>Term</span>
                      <span>Due Date</span>
                      <span className="text-right">Payment</span>
                      <span className="text-right">Remaining</span>
                    </div>
                    {scheduleData.schedule.map((row) => (
                      <div
                        key={row.installmentNumber}
                        className="grid grid-cols-4 text-xs py-1.5 px-2 hover:bg-muted/40 rounded-lg transition-colors"
                      >
                        <span className="font-semibold text-foreground">
                          {row.installmentNumber} of {scheduleData.schedule.length}
                        </span>
                        <span className="text-muted-foreground">{formatDate(row.dueDate)}</span>
                        <span className="text-right font-bold text-foreground">
                          {formatMoney(row.paymentAmount)}
                        </span>
                        <span className="text-right text-muted-foreground font-mono">
                          {formatMoney(row.remainingBalance)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Optional Notes
              </label>
              <Input
                type="text"
                placeholder="e.g. 0% 12-month promo with free case, Citi paylite"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                size="default"
                onClick={onClose}
                disabled={isSubmitting}
                className="text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="default"
                disabled={isSubmitting || pNum <= 0 || !merchantName.trim()}
                className="text-xs font-bold rounded-xl cursor-pointer shadow-none"
              >
                {isSubmitting ? 'Recording...' : 'Record Installment'}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function monthlyPaymentFormatted(val: string): string {
  return val;
}
