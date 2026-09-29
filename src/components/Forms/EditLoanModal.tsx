'use client';

import React, { useState, useEffect } from 'react';
import { updateLoanAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import {
  X,
  HandCoins,
  Loader2,
  Calendar,
  Clock,
  CreditCard as CreditCardIcon,
  Percent,
  Bell,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import type { Contact, CreditCard, Loan } from '@/types';
import { INSTALLMENT_MONTHS_OPTIONS } from '@/lib/constants';
import { formatMoney } from '@/lib/finance/calculations';

interface EditLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  contacts: Contact[];
  creditCards?: CreditCard[];
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

export function EditLoanModal({
  isOpen,
  onClose,
  loan,
  contacts,
  creditCards = [],
}: EditLoanModalProps) {
  const [contactId, setContactId] = useState(loan.contact_id || '');
  const [newContactName, setNewContactName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState(
    loan.borrower_phone || loan.contact?.phone || ''
  );
  const [borrowerEmail, setBorrowerEmail] = useState(
    loan.borrower_email || loan.contact?.email || ''
  );
  const [notifyBorrower, setNotifyBorrower] = useState(loan.notify_borrower !== false);
  const [amount, setAmount] = useState(String(loan.amount || ''));
  const [creditCardId, setCreditCardId] = useState(loan.credit_card_id || '');
  const [downpaymentAmount, setDownpaymentAmount] = useState(
    loan.downpayment_amount ? String(loan.downpayment_amount) : ''
  );
  const [reason, setReason] = useState(loan.reason || '');
  const [loanedOn, setLoanedOn] = useState(
    loan.loaned_on || new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState(loan.due_date || '');
  const [isInstallment, setIsInstallment] = useState(loan.is_installment);
  const [installmentMonths, setInstallmentMonths] = useState<number>(
    loan.installment_months || 24
  );
  const [monthlyDueDay, setMonthlyDueDay] = useState<number>(
    loan.monthly_due_day || 15
  );
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<string>(
    loan.monthly_interest_rate != null ? String(loan.monthly_interest_rate) : '0'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state whenever modal opens or loan changes
  useEffect(() => {
    if (loan) {
      setContactId(loan.contact_id || '');
      setNewContactName('');
      setBorrowerPhone(loan.borrower_phone || loan.contact?.phone || '');
      setBorrowerEmail(loan.borrower_email || loan.contact?.email || '');
      setNotifyBorrower(loan.notify_borrower !== false);
      setAmount(String(loan.amount || ''));
      setCreditCardId(loan.credit_card_id || '');
      setDownpaymentAmount(loan.downpayment_amount ? String(loan.downpayment_amount) : '');
      setReason(loan.reason || '');
      setLoanedOn(loan.loaned_on || new Date().toISOString().split('T')[0]);
      setDueDate(loan.due_date || '');
      setIsInstallment(loan.is_installment);
      setInstallmentMonths(loan.installment_months || 24);
      setMonthlyDueDay(loan.monthly_due_day || 15);
      setMonthlyInterestRate(
        loan.monthly_interest_rate != null ? String(loan.monthly_interest_rate) : '0'
      );
    }
  }, [loan, isOpen]);

  // When credit card selection changes, automatically synchronize due day to card's due_day
  const handleCardChange = (cardId: string) => {
    setCreditCardId(cardId);
    if (cardId) {
      const card = creditCards.find((c) => c.id === cardId);
      if (card && card.due_day) {
        setMonthlyDueDay(Number(card.due_day));
      }
    }
  };

  const selectedCard = creditCards.find((c) => c.id === creditCardId);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedDownpayment = parseFloat(downpaymentAmount) || 0;
  const principalToFinance = Math.max(0, parsedAmount - parsedDownpayment);
  const parsedRate = Math.max(0, parseFloat(monthlyInterestRate) || 0);

  // Calculations for live preview
  const totalInterest =
    isInstallment && installmentMonths > 0 && parsedRate > 0
      ? Number(((principalToFinance * (parsedRate / 100)) * installmentMonths).toFixed(2))
      : 0;
  const totalRepayable = principalToFinance + totalInterest;
  const monthlyAmortization =
    isInstallment && installmentMonths > 0 && totalRepayable > 0
      ? Number((totalRepayable / installmentMonths).toFixed(2))
      : null;

  if (!isOpen) return null;

  const handleContactChange = (selectedId: string) => {
    setContactId(selectedId);
    if (selectedId) {
      setNewContactName('');
      const found = contacts.find((c) => c.id === selectedId);
      if (found) {
        if (found.phone) setBorrowerPhone(found.phone);
        if (found.email) setBorrowerEmail(found.email);
      }
    }
  };

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

    if (isInstallment) {
      if (!monthlyDueDay || monthlyDueDay < 1 || monthlyDueDay > 31) {
        toast.error('Please enter a monthly due day between 1 and 31.');
        return;
      }
    }

    setIsSubmitting(true);
    const res = await updateLoanAction({
      loanId: loan.id,
      contactId: contactId || null,
      newContactName: newContactName.trim() || null,
      borrowerPhone: borrowerPhone.trim() || null,
      borrowerEmail: borrowerEmail.trim() || null,
      notifyBorrower,
      amount: parseFloat(amount),
      reason: reason.trim() || null,
      loanedOn,
      dueDate: isInstallment ? null : dueDate || null,
      isInstallment,
      installmentMonths: isInstallment ? installmentMonths : null,
      monthlyDueDay: isInstallment ? monthlyDueDay : null,
      monthlyInterestRate: parsedRate,
      creditCardId: creditCardId || null,
      downpaymentAmount: parsedDownpayment > 0 ? parsedDownpayment : null,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Loan details updated successfully!');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Edit Loan Details</h2>
              <p className="text-xs text-slate-300">
                Modify loan terms, monthly interest, and credit card synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. Borrower Contact */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 tracking-wide block">
              Who borrowed the money?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={contactId}
                onChange={(e) => handleContactChange(e.target.value)}
                className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
              >
                <option value="">Select Existing Contact</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Or enter new name..."
                value={newContactName}
                onChange={(e) => {
                  setNewContactName(e.target.value);
                  if (e.target.value) setContactId('');
                }}
                className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          {/* 2. Amount, Loan Date, & Downpayment */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 tracking-wide block mb-1.5">
                Total Purchase (₱)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 font-bold focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 tracking-wide block mb-1.5">
                Downpayment Paid (₱)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={downpaymentAmount}
                onChange={(e) => setDownpaymentAmount(e.target.value)}
                className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 tracking-wide block mb-1.5">
                Loaned / Swiped Date
              </label>
              <input
                type="date"
                required
                value={loanedOn}
                onChange={(e) => setLoanedOn(e.target.value)}
                className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
          </div>

          {/* 3. Reason / Description */}
          <div>
            <label className="text-xs font-bold text-slate-700 tracking-wide block mb-1.5">
              Reason or Item Purchased
            </label>
            <input
              type="text"
              placeholder="e.g., iPhone 16 Pro Max 256GB, Appliance installment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 font-medium focus:ring-2 focus:ring-slate-900 outline-none"
            />
          </div>

          {/* 4. Swiped Through Credit Card */}
          <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <CreditCardIcon className="w-4 h-4 text-indigo-600" />
                Swiped on a Credit Card?
              </label>
              {selectedCard && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  Billing Cycle Synced
                </span>
              )}
            </div>

            <select
              value={creditCardId}
              onChange={(e) => handleCardChange(e.target.value)}
              className="w-full bg-white border-none rounded-xl py-2.5 px-3 text-xs text-slate-900 font-semibold shadow-sm focus:ring-2 focus:ring-indigo-600 outline-none"
            >
              <option value="">No Card (Cash / Bank Transfer / Other)</option>
              {creditCards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.bank_name}) • Statement: {card.statement_day}th, Due:{' '}
                  {card.due_day}th
                </option>
              ))}
            </select>

            {selectedCard ? (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  Synchronized with {selectedCard.name} ({selectedCard.bank_name})
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Monthly installment due dates follow this card's payment deadline on the{' '}
                  <span className="font-extrabold">{getOrdinalSuffix(Number(selectedCard.due_day))}</span> of
                  every month (Statement cutoff:{' '}
                  <span className="font-extrabold">{getOrdinalSuffix(Number(selectedCard.statement_day))}</span>).
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Linking a credit card automatically calculates statement cutoff and due date schedules.
              </p>
            )}
          </div>

          {/* 5. Monthly Interest Rate */}
          <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-600" />
                Monthly Interest Rate (%)
              </label>
              <span className="text-xs font-bold text-slate-600">
                {parsedRate > 0 ? `${parsedRate.toFixed(2)}% / month` : '0% (Interest-Free)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={monthlyInterestRate}
                onChange={(e) => setMonthlyInterestRate(e.target.value)}
                className="w-32 bg-white border-none rounded-xl py-2 px-3 text-xs text-slate-900 font-bold shadow-sm focus:ring-2 focus:ring-amber-600 outline-none"
              />
              <span className="text-xs font-semibold text-slate-500">% per month</span>

              {/* Quick rate presets */}
              <div className="flex items-center gap-1 ml-auto overflow-x-auto no-scrollbar">
                {[0, 1, 1.5, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setMonthlyInterestRate(String(r))}
                    className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      parsedRate === r
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Interest is computed monthly on the financed principal and added to the repayment schedule.
            </p>
          </div>

          {/* 6. Repayment Structure (Installments vs One-Time) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 tracking-wide">
                Repayment Structure
              </label>
              <div className="flex bg-[#F6F7F9] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsInstallment(true)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    isInstallment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Installments
                </button>
                <button
                  type="button"
                  onClick={() => setIsInstallment(false)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    !isInstallment ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  One-Time / Flexible
                </button>
              </div>
            </div>

            {isInstallment ? (
              <div className="space-y-3 p-4 rounded-2xl bg-[#F6F7F9]">
                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-2">
                    Installment Duration (Months)
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setInstallmentMonths(m)}
                        className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          installmentMonths === m
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-white text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {m} Mos
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-500 font-medium block mb-1">
                    Monthly Due Day (Day of Month)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={monthlyDueDay}
                      onChange={(e) => setMonthlyDueDay(parseInt(e.target.value, 10) || 1)}
                      disabled={Boolean(selectedCard)}
                      className="w-24 bg-white border-none rounded-xl py-2 px-3 text-xs text-slate-900 font-bold shadow-sm focus:ring-2 focus:ring-slate-900 outline-none disabled:opacity-70 disabled:bg-slate-100"
                    />
                    <span className="text-xs font-medium text-slate-500">
                      Every {getOrdinalSuffix(monthlyDueDay)} of the month
                      {selectedCard && ' (Locked to card due date)'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-xs font-bold text-slate-700 tracking-wide block mb-1.5">
                  Target Repayment Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-[#F6F7F9] border-none rounded-2xl py-3 px-3.5 text-xs text-slate-900 font-semibold focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            )}
          </div>

          {/* 7. Live Financial Calculation Summary */}
          {principalToFinance > 0 && isInstallment && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="text-slate-300">Financed Principal:</span>
                <span className="font-bold">{formatMoney(principalToFinance)}</span>
              </div>

              {parsedRate > 0 && (
                <>
                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-300">
                      Total Interest ({parsedRate}%/mo × {installmentMonths} mos):
                    </span>
                    <span className="font-bold text-amber-300">+{formatMoney(totalInterest)}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                    <span className="text-slate-300 font-semibold">Total Repayable Amount:</span>
                    <span className="font-extrabold text-white">{formatMoney(totalRepayable)}</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 block">Monthly Amortization</span>
                  <span className="text-lg font-extrabold text-emerald-400">
                    {formatMoney(monthlyAmortization || 0)}
                    <span className="text-xs text-slate-300 font-normal"> / month</span>
                  </span>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-slate-200">
                  {installmentMonths} installments
                </span>
              </div>
            </div>
          )}

          {/* 8. Borrower Contact Details */}
          <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Borrower Contact & Notification Reminders
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="tel"
                  placeholder="0917XXXXXXX"
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-2.5 pl-8 pr-3 text-xs text-slate-900 font-medium shadow-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="email"
                  placeholder="borrower@example.com"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  className="w-full bg-white border-none rounded-xl py-2.5 pl-8 pr-3 text-xs text-slate-900 font-medium shadow-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={notifyBorrower}
                onChange={(e) => setNotifyBorrower(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-0"
              />
              <span className="text-xs text-slate-700 font-medium">
                Enable automated payment reminders for this borrower
              </span>
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="bili-btn-secondary py-2.5 px-4 text-xs font-semibold shadow-sm"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="bili-btn-primary py-2.5 px-6 text-xs font-semibold shadow-sm flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                'Save Loan Details'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
