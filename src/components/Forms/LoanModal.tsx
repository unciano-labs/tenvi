'use client';

import React, { useState, useEffect } from 'react';
import { createLoanAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import {
  HandCoins,
  Loader2,
  Calendar,
  Clock,
  CreditCard as CreditCardIcon,
  Bell,
  Phone,
  Mail,
  Percent,
} from 'lucide-react';
import type { Contact, CreditCard, Property } from '@/types';
import { INSTALLMENT_MONTHS_OPTIONS, getPropertyIcon } from '@/lib/constants';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { MoneyInput } from '@/components/ui/money-input';
import { Input } from '@/components/ui/input';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
  properties?: Property[];
  creditCards?: CreditCard[];
  defaultContactId?: string;
}

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export function LoanModal({
  isOpen,
  onClose,
  contacts,
  properties = [],
  creditCards = [],
  defaultContactId,
}: LoanModalProps) {
  const [contactId, setContactId] = useState(defaultContactId || '');
  const [newContactName, setNewContactName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');

  useEffect(() => {
    if (defaultContactId) {
      setContactId(defaultContactId);
      setNewContactName('');
      const found = contacts.find((c) => c.id === defaultContactId);
      if (found) {
        if (found.phone) setBorrowerPhone(found.phone);
        if (found.email) setBorrowerEmail(found.email);
      }
    } else {
      setContactId('');
    }
  }, [defaultContactId, isOpen, contacts]);

  const [notifyBorrower, setNotifyBorrower] = useState(true);
  const [amount, setAmount] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [downpaymentAmount, setDownpaymentAmount] = useState('');
  const [downpaymentPaymentMethod, setDownpaymentPaymentMethod] = useState('cash');
  const [reason, setReason] = useState('');
  const [loanedOn, setLoanedOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [isInstallment, setIsInstallment] = useState(true);
  const [installmentMonths, setInstallmentMonths] = useState<number | null>(null);
  const [customMonthsInput, setCustomMonthsInput] = useState<string>('');
  const [monthlyDueDay, setMonthlyDueDay] = useState<number>(15);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedDownpayment = parseFloat(downpaymentAmount) || 0;
  const principalToFinance = Math.max(0, parsedAmount - parsedDownpayment);
  const hasDuration = Boolean(installmentMonths && installmentMonths > 0);

  const totalInterest =
    hasDuration && monthlyInterestRate > 0
      ? principalToFinance * (monthlyInterestRate / 100) * (installmentMonths as number)
      : 0;
  const totalRepayable = principalToFinance + totalInterest;

  const monthlyInterestOnly =
    monthlyInterestRate > 0 ? principalToFinance * (monthlyInterestRate / 100) : 0;

  const estimatedMonthly =
    hasDuration && installmentMonths
      ? (totalRepayable / installmentMonths).toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : monthlyInterestOnly > 0
      ? monthlyInterestOnly.toLocaleString('en-PH', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : null;

  const selectedCard = creditCards.find((c) => c.id === creditCardId);

  const handleCardChange = (cardId: string) => {
    setCreditCardId(cardId);
    if (cardId) {
      const card = creditCards.find((c) => c.id === cardId);
      if (card) {
        setMonthlyDueDay(card.due_day);
      }
    }
  };

  const handleContactChange = (val: string) => {
    if (!val) {
      setContactId('');
      setNewContactName('');
      setBorrowerPhone('');
      setBorrowerEmail('');
      return;
    }
    if (val.startsWith('prop:')) {
      const propId = val.replace('prop:', '');
      const prop = properties.find((p) => p.id === propId);
      if (prop) {
        const propFullName = `${prop.name}${prop.identifier ? ` (${prop.identifier})` : ''}`;
        const matched = contacts.find(
          (c) =>
            c.name.toLowerCase() === prop.name.toLowerCase() ||
            c.name.toLowerCase() === propFullName.toLowerCase()
        );
        if (matched) {
          setContactId(matched.id);
          setNewContactName('');
          setBorrowerPhone(matched.phone || '');
          setBorrowerEmail(matched.email || '');
        } else {
          setContactId('');
          setNewContactName(propFullName);
          setBorrowerPhone('');
          setBorrowerEmail('');
        }
      }
    } else {
      setContactId(val);
      setNewContactName('');
      const found = contacts.find((c) => c.id === val);
      if (found) {
        setBorrowerPhone(found.phone || '');
        setBorrowerEmail(found.email || '');
      } else {
        setBorrowerPhone('');
        setBorrowerEmail('');
      }
    }
  };

  const selectedPropForContact = contactId
    ? properties.find((p) => {
        const c = contacts.find((cnt) => cnt.id === contactId);
        if (!c) return false;
        const propFullName = `${p.name}${p.identifier ? ` (${p.identifier})` : ''}`;
        return (
          p.name.toLowerCase() === c.name.toLowerCase() ||
          propFullName.toLowerCase() === c.name.toLowerCase()
        );
      })
    : null;

  const selectedPropForName = newContactName
    ? properties.find((p) => {
        const propFullName = `${p.name}${p.identifier ? ` (${p.identifier})` : ''}`;
        return (
          p.name.toLowerCase() === newContactName.toLowerCase() ||
          propFullName.toLowerCase() === newContactName.toLowerCase()
        );
      })
    : null;

  const selectValue = selectedPropForContact
    ? `prop:${selectedPropForContact.id}`
    : selectedPropForName
    ? `prop:${selectedPropForName.id}`
    : contactId || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId && !newContactName.trim()) {
      toast.error('Please choose or enter who borrowed the money.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid loan amount.');
      return;
    }

    if (parsedDownpayment > parsedAmount) {
      toast.error('Downpayment cannot be greater than total loan amount.');
      return;
    }

    if (isInstallment || monthlyInterestRate > 0) {
      if (!monthlyDueDay || monthlyDueDay < 1 || monthlyDueDay > 31) {
        toast.error('Please enter a monthly due day between 1 and 31.');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await createLoanAction({
      contactId: contactId || null,
      newContactName: newContactName.trim() || null,
      borrowerPhone: borrowerPhone.trim() || null,
      borrowerEmail: borrowerEmail.trim() || null,
      notifyBorrower,
      amount: parseFloat(amount),
      reason: reason.trim() || null,
      loanedOn,
      dueDate: isInstallment && installmentMonths ? null : dueDate || null,
      isInstallment,
      installmentMonths: isInstallment && installmentMonths ? installmentMonths : null,
      monthlyDueDay: (isInstallment || monthlyInterestRate > 0) ? monthlyDueDay : null,
      monthlyInterestRate: monthlyInterestRate > 0 ? monthlyInterestRate : null,
      creditCardId: creditCardId || null,
      downpaymentAmount: parsedDownpayment > 0 ? parsedDownpayment : null,
      downpaymentPaymentMethod,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        isInstallment
          ? installmentMonths
            ? `Installment loan recorded! (${installmentMonths} months schedule created)`
            : `Monthly interest loan recorded! (Due every ${getOrdinalSuffix(monthlyDueDay || 15)})`
          : monthlyInterestRate > 0
          ? `Loan recorded with ${monthlyInterestRate}% monthly interest!`
          : 'Loan recorded successfully!'
      );
      setAmount('');
      setReason('');
      setNewContactName('');
      setBorrowerPhone('');
      setBorrowerEmail('');
      setDueDate('');
      setCreditCardId('');
      setDownpaymentAmount('');
      setMonthlyInterestRate(0);
      setInstallmentMonths(null);
      setCustomMonthsInput('');
      onClose();
    }
  };

  return (
    <ResponsiveDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <HandCoins className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <ResponsiveDialogTitle>Record a Receivable / Loan</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Track money lent, business advances, or receivables with one-time or installment plans
              </ResponsiveDialogDescription>
            </div>
          </div>
        </ResponsiveDialogHeader>

        <ResponsiveDialogBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Who owes you / Entity */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Who Owes You? (Person, Business, or Asset Entity)
              </label>
              {(contacts.length > 0 || properties.length > 0) && (
                <select
                  value={selectValue}
                  onChange={(e) => handleContactChange(e.target.value)}
                  className="h-10 w-full rounded-xl bg-muted/60 px-3 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring mb-2"
                >
                  <option value="">-- Choose from existing contacts / entities --</option>
                  {contacts.length > 0 && (
                    <optgroup label="People & Contacts">
                      {contacts.map((c) => (
                        <option key={c.id} value={c.id}>
                          👤 {c.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {properties.length > 0 && (
                    <optgroup label="Properties & Assets">
                      {properties.map((p) => {
                        const label = `${p.name}${p.identifier ? ` (${p.identifier})` : ''}`;
                        return (
                          <option key={`prop:${p.id}`} value={`prop:${p.id}`}>
                            {getPropertyIcon(p.property_type)} {label}
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
              )}

              <Input
                type="text"
                placeholder={
                  contacts.length > 0
                    ? 'Or type a new person or entity (e.g. Toyota Vios Fleet, Kuya Jun)...'
                    : 'Enter person or entity (e.g. Toyota Vios Operations, Grab Fleet)'
                }
                value={newContactName}
                onChange={(e) => {
                  setNewContactName(e.target.value);
                  if (e.target.value) {
                    setContactId('');
                    setBorrowerPhone('');
                    setBorrowerEmail('');
                  }
                }}
                className="w-full text-sm bg-muted/60"
              />
            </div>

            {/* Borrower Contact & Notification Settings */}
            <div className="p-4 rounded-2xl bg-muted/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-600" />
                  Automated Reminders (3 Days Before Due)
                </label>
                <Switch
                  checked={notifyBorrower}
                  onCheckedChange={setNotifyBorrower}
                  aria-label="Automated Reminders 3 Days Before Due"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Provide the borrower&apos;s mobile number or email so Tenvi can automatically dispatch a friendly payment reminder 3 days before their due date.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Mobile Number (SMS)
                  </label>
                  <Input
                    type="tel"
                    placeholder="0917 123 4567"
                    value={borrowerPhone}
                    onChange={(e) => setBorrowerPhone(e.target.value)}
                    className="w-full text-sm bg-card"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="borrower@email.com"
                    value={borrowerEmail}
                    onChange={(e) => setBorrowerEmail(e.target.value)}
                    className="w-full text-sm bg-card"
                  />
                </div>
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Total Purchase / Loan Amount (PHP)
              </label>
              <MoneyInput
                value={amount}
                onChange={(val) => setAmount(val)}
                placeholder="0.00"
                className="text-xl font-bold bg-muted/60"
                required
              />
            </div>

            {/* Credit Card Swiped (Optional) */}
            {creditCards.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCardIcon className="w-3.5 h-3.5" /> Charged to Credit Card? (Optional)
                </label>
                <select
                  value={creditCardId}
                  onChange={(e) => handleCardChange(e.target.value)}
                  className="h-10 w-full rounded-xl bg-muted/60 px-3 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">-- No (Paid with cash or direct transfer) --</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.bank_name} - {card.name} (•••• {card.last_4})
                    </option>
                  ))}
                </select>
                {selectedCard && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span>Card Billing Cycle Synced ⚡</span>
                      <span className="text-indigo-600">Cutoff: Every {getOrdinalSuffix(selectedCard.statement_day)}</span>
                    </div>
                    <p className="text-xs text-indigo-700">
                      Payment due day automatically synchronized with your card&apos;s payment due date (every {getOrdinalSuffix(selectedCard.due_day)}).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Downpayment Section */}
            <div className="p-4 rounded-2xl bg-muted/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Downpayment Received Upfront (Optional)
                </label>
                {parsedDownpayment > 0 && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    ₱{parsedDownpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Paid Upfront
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MoneyInput
                  value={downpaymentAmount}
                  onChange={(val) => setDownpaymentAmount(val)}
                  placeholder="0.00 (optional)"
                  className="bg-card text-sm font-semibold"
                />

                <select
                  value={downpaymentPaymentMethod}
                  onChange={(e) => setDownpaymentPaymentMethod(e.target.value)}
                  className="h-10 w-full rounded-xl bg-card px-3 text-sm text-foreground outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="cash">Received in Cash</option>
                  <option value="gcash">Received via GCash</option>
                  <option value="maya">Received via Maya</option>
                  <option value="bank_transfer">Received via Bank Transfer</option>
                </select>
              </div>

              {parsedDownpayment > 0 && (
                <div className="text-xs text-muted-foreground flex justify-between items-center pt-1">
                  <span>Remaining Net Loan to Amortize:</span>
                  <span className="font-extrabold text-foreground">
                    ₱{principalToFinance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            {/* Repayment Type Toggle */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Repayment Plan
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted/60 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setIsInstallment(false)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    !isInstallment
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Flexible / One-Time
                </button>
                <button
                  type="button"
                  onClick={() => setIsInstallment(true)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isInstallment
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Monthly Installment
                </button>
              </div>
            </div>

            {/* Installment Options */}
            {isInstallment && (
              <div className="p-4 rounded-2xl bg-muted/60 space-y-4 animate-in fade-in duration-150">
                {/* Term in Months (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Duration / Term (Optional)
                    </label>
                    <span className="text-2xs font-semibold text-muted-foreground">
                      {installmentMonths ? `${installmentMonths} Months Fixed` : 'No fixed duration (Open-Ended)'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInstallmentMonths(null);
                        setCustomMonthsInput('');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        installmentMonths === null
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-card text-foreground hover:bg-muted border border-border/50'
                      }`}
                    >
                      No Fixed Term (Open-Ended)
                    </button>
                    {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setInstallmentMonths(m);
                          setCustomMonthsInput(String(m));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          installmentMonths === m
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'bg-card text-foreground hover:bg-muted border border-border/50'
                        }`}
                      >
                        {m} Mos
                      </button>
                    ))}
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Custom mos"
                        value={customMonthsInput}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomMonthsInput(val);
                          const parsed = parseInt(val, 10);
                          if (parsed && parsed > 0) {
                            setInstallmentMonths(parsed);
                          } else {
                            setInstallmentMonths(null);
                          }
                        }}
                        className="w-24 h-8 text-xs bg-card"
                      />
                    </div>
                  </div>
                  <p className="text-2xs text-muted-foreground mt-1.5">
                    {installmentMonths
                      ? `Amortized equally across ${installmentMonths} monthly payments.`
                      : 'Duration is optional. Select "No Fixed Term" if borrower only pays monthly interest without a fixed maturity.'}
                  </p>
                </div>

                {/* Monthly Due Day */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Monthly Due Day (Day of Month)
                    </label>
                    <span className="text-xs font-bold text-primary">
                      Due every {getOrdinalSuffix(monthlyDueDay || 15)}
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    required={isInstallment}
                    value={monthlyDueDay}
                    onChange={(e) =>
                      setMonthlyDueDay(
                        Math.max(1, Math.min(31, parseInt(e.target.value) || 1))
                      )
                    }
                    className="w-full text-sm bg-card"
                    placeholder="e.g. 15 (due every 15th)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedCard
                      ? `Synchronized with ${selectedCard.name} payment due date (every ${getOrdinalSuffix(selectedCard.due_day)}).`
                      : 'Due date automatically rolls over each month (adjusts for February / 30-day months).'}
                  </p>
                </div>

                {/* Monthly Interest Rate */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-indigo-600" /> Monthly Interest Rate (%)
                    </label>
                    {monthlyInterestRate > 0 && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {monthlyInterestRate}% / mo {hasDuration ? `(+₱${totalInterest.toLocaleString('en-PH', { minimumFractionDigits: 2 })} interest)` : `(₱${monthlyInterestOnly.toLocaleString('en-PH', { minimumFractionDigits: 2 })} / mo interest)`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={monthlyInterestRate}
                      onChange={(e) =>
                        setMonthlyInterestRate(
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-full text-sm bg-card"
                      placeholder="0.00"
                    />
                    <span className="text-xs font-bold text-muted-foreground">% / mo</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[0, 1, 1.5, 2, 3, 5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setMonthlyInterestRate(rate)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          monthlyInterestRate === rate
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-card hover:bg-muted text-foreground'
                        }`}
                      >
                        {rate === 0 ? '0% (Interest-Free)' : `${rate}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Preview Calculation */}
                {estimatedMonthly && (
                  <div className="p-3.5 rounded-xl bg-card shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {hasDuration ? 'Calculated Monthly Due:' : 'Monthly Interest Due:'}
                      </span>
                      <span className="text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                        {hasDuration
                          ? `${installmentMonths} equal payments`
                          : 'No fixed term (Monthly interest)'}
                      </span>
                    </div>
                    <div className="text-xl font-extrabold text-foreground">
                      ₱{estimatedMonthly}{' '}
                      <span className="text-xs font-medium text-muted-foreground">/ month</span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1 pt-2">
                      <div className="flex justify-between">
                        <span>Total Purchase:</span>
                        <span className="font-semibold text-foreground">₱{parsedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {parsedDownpayment > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Less Downpayment:</span>
                          <span className="font-semibold">- ₱{parsedDownpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Principal Financed:</span>
                        <span className="font-semibold text-foreground">₱{principalToFinance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                      {monthlyInterestRate > 0 && (
                        <div className="flex justify-between text-indigo-700">
                          <span>
                            {hasDuration
                              ? `Total Interest (${monthlyInterestRate}% x ${installmentMonths} mos):`
                              : 'Monthly Interest Rate:'}
                          </span>
                          <span className="font-semibold">
                            {hasDuration
                              ? `+ ₱${totalInterest.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                              : `${monthlyInterestRate}% / month`}
                          </span>
                        </div>
                      )}
                      {hasDuration && (
                        <div className="flex justify-between font-bold text-foreground pt-1.5">
                          <span>Total Repayable:</span>
                          <span>₱{totalRepayable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-muted-foreground pt-1">
                        <span>Payment Due Schedule:</span>
                        <span className="font-medium text-foreground">
                          Every {getOrdinalSuffix(monthlyDueDay || 15)} of the month
                        </span>
                      </div>
                      {selectedCard && (
                        <div className="text-indigo-600 font-medium pt-1">
                          💳 Swiped on {selectedCard.bank_name} • Statement Cutoff: {getOrdinalSuffix(selectedCard.statement_day)} • Payment Due: {getOrdinalSuffix(selectedCard.due_day)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Flexible / One-Time with Optional Monthly Interest */}
            {!isInstallment && (
              <div className="p-4 rounded-2xl bg-muted/60 space-y-4 animate-in fade-in duration-150">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-indigo-600" /> Monthly Interest Rate (%) (Optional)
                    </label>
                    {monthlyInterestRate > 0 && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {monthlyInterestRate}% / mo (₱{monthlyInterestOnly.toLocaleString('en-PH', { minimumFractionDigits: 2 })} / mo interest)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={monthlyInterestRate}
                      onChange={(e) =>
                        setMonthlyInterestRate(
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      }
                      className="w-full text-sm bg-card"
                      placeholder="0.00"
                    />
                    <span className="text-xs font-bold text-muted-foreground">% / mo</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[0, 1, 1.5, 2, 3, 5].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setMonthlyInterestRate(rate)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                          monthlyInterestRate === rate
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'bg-card hover:bg-muted text-foreground'
                        }`}
                      >
                        {rate === 0 ? '0% (Interest-Free)' : `${rate}%`}
                      </button>
                    ))}
                  </div>
                </div>

                {monthlyInterestRate > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">
                        Monthly Interest Due Day
                      </label>
                      <span className="text-xs font-bold text-primary">
                        Due every {getOrdinalSuffix(monthlyDueDay || 15)}
                      </span>
                    </div>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={monthlyDueDay}
                      onChange={(e) =>
                        setMonthlyDueDay(
                          Math.max(1, Math.min(31, parseInt(e.target.value) || 1))
                        )
                      }
                      className="w-full text-sm bg-card"
                      placeholder="e.g. 15 (due every 15th)"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Reason / What was it for? (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Emergency hospital bill, car repair, tuition fee"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-sm bg-muted/60"
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Date Lent
                </label>
                <Input
                  type="date"
                  required
                  value={loanedOn}
                  onChange={(e) => setLoanedOn(e.target.value)}
                  className="w-full text-sm bg-muted/60"
                />
              </div>

              {!isInstallment && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Promised Return Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-sm bg-muted/60"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1 rounded-2xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  'Save Loan'
                )}
              </Button>
            </div>
          </form>
        </ResponsiveDialogBody>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
