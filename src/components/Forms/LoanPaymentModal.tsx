'use client';

import React, { useState } from 'react';
import { recordLoanPaymentAction } from '@/app/actions/loans';
import { toast } from 'sonner';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { Loan } from '@/types';
import { formatMoney } from '@/lib/finance/calculations';

interface LoanPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan | null;
}

export function LoanPaymentModal({
  isOpen,
  onClose,
  loan,
}: LoanPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Please enter a valid repayment amount.');
      return;
    }

    setIsSubmitting(true);
    const res = await recordLoanPaymentAction({
      loanId: loan.id,
      amount: payAmount,
      paymentMethod,
      paidOn,
      note: note.trim() || null,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Repayment recorded!');
      setAmount('');
      setNote('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 pr-10 sm:pr-12">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">Record Repayment</h2>
            <p className="text-xs text-slate-500">
              For {loan.contact?.name || 'borrower'}
            </p>
          </div>
        </div>

        {/* Current Balance Box */}
        <div className="p-4 rounded-2xl bg-slate-50 mb-6">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
            <span>Remaining Balance</span>
            <span>Total Loaned: {formatMoney(loan.amount)}</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {formatMoney(loan.balance_remaining)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Repayment Amount (PHP)
              </label>
              <button
                type="button"
                onClick={() => setAmount(loan.balance_remaining.toString())}
                className="text-xs font-semibold text-emerald-700 hover:underline"
              >
                Pay in full ({formatMoney(loan.balance_remaining)})
              </button>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-xl font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={loan.balance_remaining}
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bili-input w-full pl-10 text-xl font-bold text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              How did they pay?
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bili-input w-full text-sm"
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="maya">Maya</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Payment Date
            </label>
            <input
              type="date"
              required
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
              className="bili-input w-full text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Sent via GCash with ref #1234"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="bili-input w-full text-sm"
            />
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
                  Saving...
                </>
              ) : (
                'Save Repayment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
