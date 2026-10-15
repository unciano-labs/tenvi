'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createLiabilityAction, updateLiabilityAction } from '@/app/actions/liabilities';
import { toast } from 'sonner';
import {
  Building2,
  Car,
  Landmark,
  ShieldAlert,
  Loader2,
  Calendar,
  Percent,
  CreditCard as CreditCardIcon,
  PiggyBank,
  Sparkles,
  RotateCcw,
  Link2,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  Liability,
  LiabilityType,
  Property,
  CreditCard,
  SavingsAccount,
  InterestRateType,
  LinkedAccountType,
} from '@/types';
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
import { calculateLiabilityAmortization, formatMoney } from '@/lib/finance/calculations';
import { useInstallmentForm } from '@/hooks/useInstallmentForm';
import { cn } from '@/lib/utils';

interface LiabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  liability?: Liability | null;
  defaultPropertyId?: string | null;
  properties?: Property[];
  creditCards?: CreditCard[];
  savingsAccounts?: SavingsAccount[];
}

const LIABILITY_TYPES: { value: LiabilityType; label: string; icon: string }[] = [
  { value: 'mortgage', label: 'Mortgage / Housing Loan', icon: 'Building2' },
  { value: 'auto_loan', label: 'Auto Loan / Vehicle Financing', icon: 'Car' },
  { value: 'personal_loan', label: 'Bank Personal Loan', icon: 'Landmark' },
  { value: 'business_loan', label: 'Business / Commercial Loan', icon: 'Landmark' },
  { value: 'student_loan', label: 'Student / Education Loan', icon: 'Landmark' },
  { value: 'other', label: 'Other Long-Term Liability', icon: 'Landmark' },
];

export function LiabilityModal({
  isOpen,
  onClose,
  liability,
  defaultPropertyId,
  properties = [],
  creditCards = [],
  savingsAccounts = [],
}: LiabilityModalProps) {
  const isEditing = !!liability;

  const [name, setName] = useState('');
  const [lenderName, setLenderName] = useState('');
  const [liabilityType, setLiabilityType] = useState<LiabilityType>('mortgage');
  const [originalPrincipal, setOriginalPrincipal] = useState('');
  const [currentPrincipalBalance, setCurrentPrincipalBalance] = useState('');
  const [propertyId, setPropertyId] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'paid_off' | 'refinanced' | 'defaulted'>('active');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    setPrincipal,
    termMonths,
    setTermMonths,
    interestRateType: rateType,
    setInterestRateType,
    interestRate,
    setInterestRate,
    monthlyAmortization: monthlyPayment,
    setMonthlyAmortization: setMonthlyPayment,
    isAmortizationOverridden,
    setIsAmortizationOverridden,
    transactionDate: startDate,
    setTransactionDate: setStartDate,
    firstPaymentDate,
    setFirstPaymentDate,
    dueDay,
    setDueDay,
    linkedAccountType,
    setLinkedAccountType,
    creditCardId,
    setCreditCardId,
    savingsId,
    setSavingsId,
    targetCard: selectedCard,
    selectedSavings,
    recalculateAmortization: hookRecalculateAmortization,
  } = useInstallmentForm({
    creditCards,
    savingsAccounts,
  });

  // Recalculates amortization based on the latest inputs
  const recalculateAmortization = (
    origPrincipalVal: string,
    curBalanceVal: string,
    termVal: string,
    rateVal: string,
    currentRateType: InterestRateType
  ) => {
    const principal = Number(origPrincipalVal) > 0 ? origPrincipalVal : curBalanceVal;
    setPrincipal(principal);
    hookRecalculateAmortization(principal, termVal, rateVal, currentRateType);
  };

  // Switch between Annual Rate and Monthly Add-on Rate
  const handleRateTypeChange = (newType: InterestRateType) => {
    setInterestRateType(newType);
    recalculateAmortization(originalPrincipal, currentPrincipalBalance, termMonths, interestRate, newType);
  };

  // Handle switching account link type
  const handleLinkedAccountTypeChange = (type: LinkedAccountType | '') => {
    setLinkedAccountType(type);
    if (type === 'credit_card') {
      setSavingsId('');
      if (creditCards.length === 1 && !creditCardId) {
        const card = creditCards[0];
        setCreditCardId(card.id);
        if (card.due_day) {
          setDueDay(String(card.due_day));
        }
      }
    } else if (type === 'savings') {
      setCreditCardId('');
      if (savingsAccounts.length === 1 && !savingsId) {
        setSavingsId(savingsAccounts[0].id);
      }
    } else {
      setCreditCardId('');
      setSavingsId('');
    }
  };

  // Handle credit card selection with automatic due date inheritance
  const handleCreditCardSelect = (cardId: string) => {
    setCreditCardId(cardId);
    const selCard = creditCards.find((c) => c.id === cardId);
    if (selCard && selCard.due_day) {
      setDueDay(String(selCard.due_day));
      setFirstPaymentDate((prev) => {
        if (!prev) return '';
        const parts = prev.split('-');
        const dayStr = String(selCard.due_day).padStart(2, '0');
        return `${parts[0]}-${parts[1]}-${dayStr}`;
      });
      toast.info(`Payment due day synced to Day ${selCard.due_day} (${selCard.bank_name} ${selCard.name})`);
    }
  };

  // Track open state transition to prevent resetting on typing
  const prevOpenRef = useRef(false);
  const prevLiabilityIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const isNewOpen = isOpen && !prevOpenRef.current;
    const liabilityChanged = liability?.id !== prevLiabilityIdRef.current;

    if (isOpen && (isNewOpen || liabilityChanged)) {
      if (liability) {
        setName(liability.name);
        setLenderName(liability.lender_name);
        setLiabilityType(liability.liability_type);
        setOriginalPrincipal(
          liability.original_principal ? String(liability.original_principal) : ''
        );
        setCurrentPrincipalBalance(
          liability.current_principal_balance ? String(liability.current_principal_balance) : ''
        );
        const savedRateType = liability.interest_rate_type || 'annual';
        setInterestRateType(savedRateType);
        const savedRate = liability.interest_rate ?? liability.annual_interest_rate;
        setInterestRate(savedRate !== undefined && savedRate !== null ? String(savedRate) : '');
        setTermMonths(liability.term_months ? String(liability.term_months) : '');
        setMonthlyPayment(liability.monthly_payment ? String(liability.monthly_payment) : '');
        setDueDay(liability.due_day ? String(liability.due_day) : '');
        setStartDate(liability.start_date || '');
        setFirstPaymentDate(liability.first_payment_date || '');
        setPropertyId(liability.property_id || defaultPropertyId || '');
        const initialLinkedType =
          liability.linked_account_type ||
          (liability.credit_card_id ? 'credit_card' : liability.savings_id ? 'savings' : '');
        setLinkedAccountType(initialLinkedType);
        setCreditCardId(liability.credit_card_id || '');
        setSavingsId(liability.savings_id || '');
        setStatus(liability.status || 'active');
        setNotes(liability.notes || '');
      } else {
        setName('');
        setLenderName('');
        setLiabilityType('mortgage');
        setOriginalPrincipal('');
        setCurrentPrincipalBalance('');
        setInterestRateType('annual');
        setInterestRate('');
        setTermMonths('');
        setMonthlyPayment('');
        setDueDay('');
        setStartDate('');
        setFirstPaymentDate('');
        setPropertyId(defaultPropertyId || '');
        setLinkedAccountType('');
        setCreditCardId('');
        setSavingsId('');
        setStatus('active');
        setNotes('');
      }
      prevLiabilityIdRef.current = liability?.id;
    }
    prevOpenRef.current = isOpen;
  }, [liability, defaultPropertyId, isOpen, setDueDay, setFirstPaymentDate, setInterestRate, setInterestRateType, setLinkedAccountType, setMonthlyPayment, setStartDate, setTermMonths]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Please enter a nickname for this liability.');
      return;
    }
    if (!lenderName.trim()) {
      toast.error('Please enter the bank or lender name.');
      return;
    }
    if (!currentPrincipalBalance || Number(currentPrincipalBalance) < 0) {
      toast.error('Please enter the current outstanding balance.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        lenderName: lenderName.trim(),
        liabilityType,
        originalPrincipal: originalPrincipal ? Number(originalPrincipal) : Number(currentPrincipalBalance),
        currentPrincipalBalance: Number(currentPrincipalBalance),
        interestRateType: rateType,
        interestRate: interestRate ? Number(interestRate) : 0,
        annualInterestRate:
          rateType === 'monthly_addon'
            ? Number(interestRate || 0) * 12
            : Number(interestRate || 0),
        termMonths: termMonths ? Number(termMonths) : null,
        monthlyPayment: monthlyPayment ? Number(monthlyPayment) : 0,
        isAmortizationOverridden,
        dueDay: dueDay ? Number(dueDay) : null,
        startDate: startDate || null,
        firstPaymentDate: firstPaymentDate || null,
        propertyId: propertyId ? propertyId : null,
        linkedAccountType: linkedAccountType || null,
        creditCardId: linkedAccountType === 'credit_card' && creditCardId ? creditCardId : null,
        savingsId: linkedAccountType === 'savings' && savingsId ? savingsId : null,
        status,
        notes: notes.trim() || null,
      };

      if (isEditing) {
        const res = await updateLiabilityAction({
          ...payload,
          liabilityId: liability.id,
        });
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Liability updated successfully.');
          onClose();
        }
      } else {
        const res = await createLiabilityAction(payload as any);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Liability added to balance sheet.');
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong saving liability.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <ResponsiveDialogHeader className="p-6 pb-2">
          <ResponsiveDialogTitle>
            {isEditing ? 'Edit Debt / Liability' : 'Add Mortgage or Loan Liability'}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Accurately model long-term debt, amortizations, and calculate net owner equity against your assets.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody className="overflow-y-auto px-6 py-2 space-y-4">
          <form id="liability-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Nickname & Lender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Liability Nickname *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BPI Housing Loan"
                  className="rounded-2xl"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Bank / Lender Name *
                </label>
                <Input
                  value={lenderName}
                  onChange={(e) => setLenderName(e.target.value)}
                  placeholder="e.g. BPI Family, Metrobank, EastWest"
                  className="rounded-2xl"
                  required
                />
              </div>
            </div>

            {/* Liability Type & Linked Property */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Liability Type
                </label>
                <select
                  value={liabilityType}
                  onChange={(e) => setLiabilityType(e.target.value as LiabilityType)}
                  className="w-full h-11 px-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  {LIABILITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Link to Property / Asset (Optional)
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full h-11 px-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                >
                  <option value="">No linked asset (Standalone debt)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.property_type.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Account Linking Section (Credit Card or Savings) */}
            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Link2 className="w-3.5 h-3.5 text-primary" />
                  <span>Linked Account (Credit Card or Savings)</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">Optional</span>
              </div>

              {/* Segmented Selector for Account Type */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleLinkedAccountTypeChange('')}
                  className={cn(
                    'py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center',
                    linkedAccountType === ''
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkedAccountTypeChange('credit_card')}
                  className={cn(
                    'py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                    linkedAccountType === 'credit_card'
                      ? 'bg-background text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <CreditCardIcon className="w-3 h-3" />
                  <span>Credit Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLinkedAccountTypeChange('savings')}
                  className={cn(
                    'py-1.5 px-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                    linkedAccountType === 'savings'
                      ? 'bg-background text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <PiggyBank className="w-3 h-3" />
                  <span>Savings</span>
                </button>
              </div>

              {/* Credit Card Selector */}
              {linkedAccountType === 'credit_card' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Select Credit Card</span>
                    {selectedCard?.due_day && (
                      <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Due Day: {selectedCard.due_day}th
                      </span>
                    )}
                  </label>
                  <select
                    value={creditCardId}
                    onChange={(e) => handleCreditCardSelect(e.target.value)}
                    className="w-full h-11 px-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="">-- Choose Credit Card --</option>
                    {creditCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.bank_name} {c.name} (•••• {c.last_4}) — Due Day {c.due_day}th
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Info className="w-3 h-3 text-primary shrink-0" />
                    <span>
                      Payment due date will automatically sync with this credit card&apos;s statement due day.
                    </span>
                  </div>
                </div>
              )}

              {/* Savings Account Selector */}
              {linkedAccountType === 'savings' && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                    <span>Select Savings Account</span>
                    {selectedSavings && (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        Balance: ₱{formatMoney(selectedSavings.current_balance)}
                      </span>
                    )}
                  </label>
                  <select
                    value={savingsId}
                    onChange={(e) => setSavingsId(e.target.value)}
                    className="w-full h-11 px-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                  >
                    <option value="">-- Choose Savings / Settlement Account --</option>
                    {savingsAccounts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.institution_name} — {s.name} (₱{formatMoney(s.current_balance)})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Info className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Auto-debit source for amortization payments and balance sheet matching.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Current Principal Balance *
                </label>
                <MoneyInput
                  value={currentPrincipalBalance}
                  onChange={(val) => {
                    setCurrentPrincipalBalance(val);
                    if (!originalPrincipal) {
                      recalculateAmortization(originalPrincipal, val, termMonths, interestRate, rateType);
                    }
                  }}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Amount remaining to fully pay off.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Original Loan Principal
                </label>
                <MoneyInput
                  value={originalPrincipal}
                  onChange={(val) => {
                    setOriginalPrincipal(val);
                    recalculateAmortization(val, currentPrincipalBalance, termMonths, interestRate, rateType);
                  }}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Original borrowed amount (basis for monthly amortization).
                </span>
              </div>
            </div>

            {/* Interest Rate Mode & Input */}
            <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Percent className="w-3.5 h-3.5 text-primary" />
                  <span>Interest Rate & Computation Mode</span>
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {rateType === 'monthly_addon' ? 'Flat Add-on' : 'Compounded Annual'}
                </span>
              </div>

              {/* Rate Type Selector */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-muted/60 dark:bg-muted/40 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleRateTypeChange('annual')}
                  className={cn(
                    'py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center',
                    rateType === 'annual'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Annual Rate (% p.a.)
                </button>
                <button
                  type="button"
                  onClick={() => handleRateTypeChange('monthly_addon')}
                  className={cn(
                    'py-1.5 px-2 text-xs font-semibold rounded-lg transition-all text-center',
                    rateType === 'monthly_addon'
                      ? 'bg-background text-primary shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Monthly Add-on (% / mo)
                </button>
              </div>

              {/* Rate Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                  <span>
                    {rateType === 'monthly_addon'
                      ? 'Monthly Add-on Rate (%)'
                      : 'Annual Interest Rate (%)'}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    {rateType === 'monthly_addon' ? '% per month' : '% per annum'}
                  </span>
                </label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={interestRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInterestRate(val);
                    recalculateAmortization(originalPrincipal, currentPrincipalBalance, termMonths, val, rateType);
                  }}
                  placeholder={rateType === 'monthly_addon' ? 'e.g. 0.55' : 'e.g. 6.5'}
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground block">
                  {rateType === 'monthly_addon'
                    ? 'Formula: (Principal / Term) + (Principal * Monthly Rate). Common for credit cards & vehicle financing.'
                    : 'Standard reducing-balance monthly amortization formula (Annual Rate / 12). Common for housing mortgages.'}
                </span>
              </div>
            </div>

            {/* Term & Start Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Loan Term (Months)
                </label>
                <Input
                  type="number"
                  min="1"
                  value={termMonths}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTermMonths(val);
                    recalculateAmortization(originalPrincipal, currentPrincipalBalance, val, interestRate, rateType);
                  }}
                  placeholder="e.g. 180 (15 yrs) or 60 (5 yrs)"
                  className="rounded-2xl"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Loan Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-2xl"
                />
              </div>
            </div>

            {/* Monthly Amortization & Monthly Due Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Monthly Amortization
                  </label>
                  {isAmortizationOverridden ? (
                    <button
                      type="button"
                      onClick={() =>
                        recalculateAmortization(
                          originalPrincipal,
                          currentPrincipalBalance,
                          termMonths,
                          interestRate,
                          rateType
                        )
                      }
                      className="text-[10px] text-primary hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      title="Reset to calculated formula amount"
                    >
                      <RotateCcw className="w-2.5 h-2.5" /> Auto-compute
                    </button>
                  ) : monthlyPayment ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Auto-computed
                    </span>
                  ) : null}
                </div>
                <MoneyInput
                  value={monthlyPayment}
                  onChange={(val) => {
                    setMonthlyPayment(val);
                    setIsAmortizationOverridden(true);
                  }}
                  placeholder="0.00"
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {isAmortizationOverridden
                    ? 'Manually overridden amount. Click Auto-compute to recalculate.'
                    : 'Auto-calculated amount. Fully editable to manually override.'}
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                  Monthly Due Day (Day of Month)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  placeholder="e.g. 15"
                  className="rounded-2xl"
                />
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  {linkedAccountType === 'credit_card' && selectedCard
                    ? `Synced to ${selectedCard.bank_name} ${selectedCard.name} due day (${selectedCard.due_day}th).`
                    : 'Day between 1 and 31 when payment is due each month.'}
                </span>
              </div>
            </div>

            {/* Start Payment Month (Buy Now, Pay Later Support) */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  First Payment Month / BNPL (Optional)
                </label>
                <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-md bg-muted">
                  Buy Now, Pay Later
                </span>
              </div>
              <Input
                type="month"
                value={firstPaymentDate ? firstPaymentDate.substring(0, 7) : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setFirstPaymentDate('');
                    return;
                  }
                  const safeDay = dueDay ? String(dueDay).padStart(2, '0') : '15';
                  setFirstPaymentDate(`${val}-${safeDay}`);
                }}
                className="rounded-2xl bg-background"
                placeholder="YYYY-MM"
              />
              <span className="text-[11px] text-muted-foreground block">
                {firstPaymentDate
                  ? `Installment schedule begins in ${new Date(firstPaymentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} on Day ${dueDay || 15}.`
                  : `Leave blank to default to upcoming Day ${dueDay || 15} following approval date (${startDate || 'today'}).`}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Account or Loan Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Account number, branch, contact person, or special terms..."
                className="w-full h-16 p-3 text-sm bg-background border border-input rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </form>
        </ResponsiveDialogBody>

        <div className="p-4 border-t flex items-center justify-end gap-2 bg-muted/20">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-2xl font-bold"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="liability-form"
            disabled={isSubmitting}
            className="rounded-2xl font-bold shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Saving...
              </>
            ) : isEditing ? (
              'Save Changes'
            ) : (
              'Add Liability'
            )}
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
