'use client';

import React, { useState } from 'react';
import { updateSavingsBalanceAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import { X, ArrowDownRight, ArrowUpLeft, Loader2, RefreshCw } from 'lucide-react';
import { SavingsAccount } from '@/types';
import { formatMoney } from '@/lib/finance/calculations';

interface SavingsBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: SavingsAccount | null;
}

export function SavingsBalanceModal({
  isOpen,
  onClose,
  account,
}: SavingsBalanceModalProps) {
  const [type, setType] = useState<'deposit' | 'withdraw' | 'set'>('deposit');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    const res = await updateSavingsBalanceAction({
      id: account.id,
      amount: val,
      type,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        type === 'deposit'
          ? 'Deposit recorded!'
          : type === 'withdraw'
          ? 'Withdrawal recorded!'
          : 'Balance updated!'
      );
      setAmount('');
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

        <h2 className="text-xl font-bold text-slate-900 mb-1 pr-10 sm:pr-12">
          Adjust Balance
        </h2>
        <p className="text-xs text-slate-500 mb-4 pr-10 sm:pr-12">
          {account.name} ({account.institution_name})
        </p>

        {/* Current Balance */}
        <div className="p-4 rounded-2xl bg-slate-50 mb-5">
          <span className="text-xs text-slate-400 font-medium block mb-1">
            Current Balance
          </span>
          <span className="text-2xl font-extrabold text-slate-900">
            {formatMoney(account.current_balance)}
          </span>
        </div>

        {/* Action Type Toggle */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-slate-100 mb-5 text-xs sm:text-xs font-bold">
          <button
            type="button"
            onClick={() => setType('deposit')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
              type === 'deposit'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            + Deposit
          </button>
          <button
            type="button"
            onClick={() => setType('withdraw')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
              type === 'withdraw'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ArrowUpLeft className="w-3.5 h-3.5" />
            - Withdraw
          </button>
          <button
            type="button"
            onClick={() => setType('set')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1 transition-all ${
              type === 'set'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Set New
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              {type === 'deposit'
                ? 'Amount to Add (Deposit)'
                : type === 'withdraw'
                ? 'Amount to Deduct (Withdraw)'
                : 'New Total Balance'}
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
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bili-input w-full pl-10 text-xl font-bold text-slate-900"
              />
            </div>
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
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
