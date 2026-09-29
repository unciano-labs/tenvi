'use client';

import React, { useState, useEffect } from 'react';
import { createLoanAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import { X, HandCoins, Loader2, Calendar, Clock, CreditCard as CreditCardIcon, Sparkles, Bell, Phone, Mail, Percent } from 'lucide-react';
import type { Contact, CreditCard } from '@/types';
import { INSTALLMENT_MONTHS_OPTIONS } from '@/lib/constants';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: Contact[];
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
  const [installmentMonths, setInstallmentMonths] = useState<number>(24);
  const [monthlyDueDay, setMonthlyDueDay] = useState<number>(15);
  const [monthlyInterestRate, setMonthlyInterestRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const parsedAmount = parseFloat(amount) || 0;
  const parsedDownpayment = parseFloat(downpaymentAmount) || 0;
  const principalToFinance = Math.max(0, parsedAmount - parsedDownpayment);
  const totalInterest =
    isInstallment && monthlyInterestRate > 0 && installmentMonths > 0
      ? principalToFinance * (monthlyInterestRate / 100) * installmentMonths
      : 0;
  const totalRepayable = principalToFinance + totalInterest;

  const estimatedMonthly =
    isInstallment && installmentMonths > 0 && totalRepayable > 0
      ? (totalRepayable / installmentMonths).toLocaleString('en-PH', {
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
    const res = await createLoanAction({
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
      monthlyInterestRate: isInstallment ? monthlyInterestRate : null,
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
          ? `Installment loan recorded! (${installmentMonths} months schedule created)`
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
      setIsInstallment(false);
      onClose();
    }
  };


  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto bili-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6 pr-10 sm:pr-12">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <HandCoins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">Record a Receivable / Loan</h2>
            <p className="text-xs text-slate-500">Track money lent, business advances, or receivables with one-time or installment plans</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Who owes you / Entity */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Who Owes You? (Person, Business, or Asset Entity)
            </label>
            {contacts.length > 0 && (
              <select
                value={contactId}
                onChange={(e) => handleContactChange(e.target.value)}
                className="bili-input w-full text-sm mb-2"
              >
                <option value="">-- Choose from existing contacts / entities --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              placeholder={
                contacts.length > 0
                  ? 'Or type a new person or entity (e.g. Toyota Vios Fleet, Kuya Jun)...'
                  : 'Enter person or entity (e.g. Toyota Vios Operations, Grab Fleet)'
              }
              value={newContactName}
              onChange={(e) => {
                setNewContactName(e.target.value);
                if (e.target.value) setContactId('');
              }}
              className="bili-input w-full text-sm"
            />
          </div>

          {/* Borrower Contact & Notification Settings */}
          <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-blue-600" />
                Automated Reminders (3 Days Before Due)
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyBorrower}
                  onChange={(e) => setNotifyBorrower(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <p className="text-xs text-slate-500">
              Provide the borrower&apos;s mobile number or email so Tenvi can automatically dispatch a friendly payment reminder 3 days before their due date.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> Mobile Number (SMS)
                </label>
                <input
                  type="tel"
                  placeholder="0917 123 4567"
                  value={borrowerPhone}
                  onChange={(e) => setBorrowerPhone(e.target.value)}
                  className="bili-input w-full text-sm bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" /> Email Address
                </label>
                <input
                  type="email"
                  placeholder="borrower@email.com"
                  value={borrowerEmail}
                  onChange={(e) => setBorrowerEmail(e.target.value)}
                  className="bili-input w-full text-sm bg-white"
                />
              </div>
            </div>
          </div>


          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Total Purchase / Loan Amount (PHP)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-xl font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bili-input w-full pl-10 text-xl font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Credit Card Swiped (Optional) */}
          {creditCards.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CreditCardIcon className="w-3.5 h-3.5" /> Charged to Credit Card? (Optional)
              </label>
              <select
                value={creditCardId}
                onChange={(e) => handleCardChange(e.target.value)}
                className="bili-input w-full text-sm"
              >
                <option value="">-- No (Paid with cash or direct transfer) --</option>
                {creditCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.bank_name} - {card.name} (•••• {card.last_4})
                  </option>
                ))}
              </select>
              {selectedCard && (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/60 mt-2 space-y-1">
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
          <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Downpayment Received Upfront (Optional)
              </label>
              {parsedDownpayment > 0 && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  ₱{parsedDownpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })} Paid Upfront
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={parsedAmount || undefined}
                  placeholder="0.00 (optional)"
                  value={downpaymentAmount}
                  onChange={(e) => setDownpaymentAmount(e.target.value)}
                  className="bili-input w-full pl-8 text-sm font-semibold text-slate-900 bg-white"
                />
              </div>

              <select
                value={downpaymentPaymentMethod}
                onChange={(e) => setDownpaymentPaymentMethod(e.target.value)}
                className="bili-input w-full text-sm bg-white"
              >
                <option value="cash">Received in Cash</option>
                <option value="gcash">Received via GCash</option>
                <option value="maya">Received via Maya</option>
                <option value="bank_transfer">Received via Bank Transfer</option>
              </select>
            </div>

            {parsedDownpayment > 0 && (
              <div className="text-xs text-slate-500 flex justify-between items-center pt-1">
                <span>Remaining Net Loan to Amortize:</span>
                <span className="font-extrabold text-slate-900">
                  ₱{principalToFinance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {/* Repayment Type Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Repayment Plan
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#F6F7F9] rounded-2xl">
              <button
                type="button"
                onClick={() => setIsInstallment(false)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
                  !isInstallment
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Flexible / One-Time
              </button>
              <button
                type="button"
                onClick={() => setIsInstallment(true)}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  isInstallment
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Monthly Installment
              </button>
            </div>
          </div>

          {/* Installment Options */}
          {isInstallment && (
            <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-4 animate-in fade-in duration-150">
              {/* Term in Months */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Duration (Number of Months)
                </label>
                <div className="flex flex-wrap gap-2">
                  {INSTALLMENT_MONTHS_OPTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInstallmentMonths(m)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        installmentMonths === m
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {m} Months {m === 24 ? '⭐' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Due Day */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Monthly Due Day (Day of Month)
                  </label>
                  <span className="text-xs font-bold text-blue-600">
                    Due every {getOrdinalSuffix(monthlyDueDay || 15)}
                  </span>
                </div>
                <input
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
                  className="bili-input w-full text-sm bg-white"
                  placeholder="e.g. 15 (due every 15th)"
                />
                <p className="text-xs text-slate-400 mt-1">
                  {selectedCard
                    ? `Synchronized with ${selectedCard.name} payment due date (every ${getOrdinalSuffix(selectedCard.due_day)}).`
                    : 'We automatically adjust for shorter months like February or 30-day months.'}
                </p>
              </div>

              {/* Monthly Interest Rate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-indigo-600" /> Monthly Interest Rate (%)
                  </label>
                  {monthlyInterestRate > 0 && (
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {monthlyInterestRate}% / mo (+₱{totalInterest.toLocaleString('en-PH', { minimumFractionDigits: 2 })} interest)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
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
                    className="bili-input w-full text-sm bg-white"
                    placeholder="0.00"
                  />
                  <span className="text-xs font-bold text-slate-500">% / mo</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[0, 1, 1.5, 2, 3].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setMonthlyInterestRate(rate)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                        monthlyInterestRate === rate
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {rate === 0 ? '0% (Interest-Free)' : `${rate}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Calculation */}
              {estimatedMonthly && (
                <div className="p-3.5 rounded-xl bg-white shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      Calculated Monthly Due:
                    </span>
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                      {installmentMonths} equal payments
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900">
                    ₱{estimatedMonthly}{' '}
                    <span className="text-xs font-medium text-slate-400">/ month</span>
                  </div>
                  <div className="text-xs text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span>Total Purchase:</span>
                      <span className="font-semibold text-slate-700">₱{parsedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {parsedDownpayment > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Less Downpayment:</span>
                        <span className="font-semibold">- ₱{parsedDownpayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Principal Financed:</span>
                      <span className="font-semibold text-slate-700">₱{principalToFinance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {monthlyInterestRate > 0 && (
                      <div className="flex justify-between text-indigo-700">
                        <span>Total Interest ({monthlyInterestRate}% x {installmentMonths} mos):</span>
                        <span className="font-semibold">+ ₱{totalInterest.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-slate-900 pt-0.5 border-t border-slate-100">
                      <span>Total Repayable:</span>
                      <span>₱{totalRepayable.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
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

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Reason / What was it for? (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Emergency hospital bill, car repair, tuition fee"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bili-input w-full text-sm"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date Lent
              </label>
              <input
                type="date"
                required
                value={loanedOn}
                onChange={(e) => setLoanedOn(e.target.value)}
                className="bili-input w-full text-sm"
              />
            </div>

            {!isInstallment && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Promised Return Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bili-input w-full text-sm"
                />
              </div>
            )}
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="bili-btn-secondary flex-1 py-3 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bili-btn-primary flex-1 py-3 text-sm shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording...
                </>
              ) : (
                'Save Loan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
