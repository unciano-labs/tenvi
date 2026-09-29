'use client';

import React, { useState } from 'react';
import { createTransactionAction } from '@/app/actions/transactions';
import { toast } from 'sonner';
import {
  X,
  PlusCircle,
  MinusCircle,
  Loader2,
  Calendar,
  FileText,
  CreditCard as CreditCardIcon,
} from 'lucide-react';
import { Category, CreditCard, SavingsAccount, Property } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';
import { PiggyBank, Building2 } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  creditCards: CreditCard[];
  savingsAccounts?: SavingsAccount[];
  properties?: Property[];
  defaultCreditCardId?: string;
  defaultPropertyId?: string;
  defaultPaymentMethod?: string;
}

export function TransactionModal({
  isOpen,
  onClose,
  categories,
  creditCards,
  savingsAccounts = [],
  properties = [],
  defaultCreditCardId,
  defaultPropertyId,
  defaultPaymentMethod,
}: TransactionModalProps) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>(
    defaultPaymentMethod || (defaultCreditCardId ? 'credit_card' : 'cash')
  );
  const [creditCardId, setCreditCardId] = useState(defaultCreditCardId || '');
  const [savingsId, setSavingsId] = useState('');
  const [propertyId, setPropertyId] = useState(defaultPropertyId || '');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (defaultCreditCardId) {
        setPaymentMethod('credit_card');
        setCreditCardId(defaultCreditCardId);
      } else if (defaultPaymentMethod) {
        setPaymentMethod(defaultPaymentMethod);
      }
      if (defaultPropertyId) {
        setPropertyId(defaultPropertyId);
      }
    }
  }, [isOpen, defaultCreditCardId, defaultPropertyId, defaultPaymentMethod]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.kind === kind);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    const res = await createTransactionAction({
      kind,
      amount: parseFloat(amount),
      categoryId: categoryId || null,
      paymentMethod,
      creditCardId: paymentMethod === 'credit_card' ? creditCardId || null : null,
      savingsId: paymentMethod !== 'credit_card' ? savingsId || null : null,
      propertyId: propertyId || null,
      occurredOn,
      note: note.trim() || null,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        kind === 'expense' ? 'Recorded Money Out!' : 'Recorded Money In!'
      );
      // Reset & close
      setAmount('');
      setNote('');
      setSavingsId('');
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

        <h2 className="text-xl font-bold text-slate-900 mb-6 pr-10 sm:pr-12">
          Record Transaction
        </h2>

        {/* Big Kind Switcher: Money Out (Expense) vs Money In (Income) */}
        <div className="grid grid-cols-2 gap-3 p-1.5 rounded-2xl bg-slate-100 mb-6">
          <button
            type="button"
            onClick={() => {
              setKind('expense');
              setCategoryId('');
            }}
            className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              kind === 'expense'
                ? 'bg-white text-rose-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MinusCircle className="w-4 h-4" />
            Money Out (Expense)
          </button>
          <button
            type="button"
            onClick={() => {
              setKind('income');
              setCategoryId('');
            }}
            className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              kind === 'income'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Money In (Income)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Amount (PHP)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-2xl font-bold text-slate-400">
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
                className="bili-input w-full pl-10 text-2xl font-extrabold text-slate-900 h-14"
              />
            </div>
          </div>

          {/* Category Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className={`p-2.5 rounded-xl text-xs font-medium text-left truncate transition-all ${
                    categoryId === cat.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPaymentMethod(pm.id)}
                  className={`py-2 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-semibold transition-all cursor-pointer text-center truncate ${
                    paymentMethod === pm.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Linked Credit Card Dropdown if Credit Card chosen */}
          {paymentMethod === 'credit_card' && (
            <div className="p-4 rounded-2xl bg-indigo-50/60 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1.5">
                <CreditCardIcon className="w-4 h-4 text-indigo-700" />
                Select Credit Card
              </label>
              {creditCards.length === 0 ? (
                <p className="text-xs text-indigo-700">
                  No credit cards added yet. You can add one in the Cards module.
                </p>
              ) : (
                <select
                  value={creditCardId}
                  onChange={(e) => setCreditCardId(e.target.value)}
                  className="bili-input w-full bg-white text-slate-900 text-sm"
                >
                  <option value="">-- Choose card --</option>
                  {creditCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.bank_name} - {card.name} (•••• {card.last_4})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Linked Savings Account / Vault if applicable */}
          {savingsAccounts.length > 0 && paymentMethod !== 'credit_card' && (
            <div className="p-4 rounded-2xl bg-emerald-50/60 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-emerald-950 mb-2 flex items-center gap-1.5">
                <PiggyBank className="w-4 h-4 text-emerald-700" />
                Connect to Savings / Vault Account (Optional)
              </label>
              <select
                value={savingsId}
                onChange={(e) => setSavingsId(e.target.value)}
                className="bili-input w-full bg-white text-slate-900 text-sm"
              >
                <option value="">-- None (General Cash Flow) --</option>
                {savingsAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.institution_name} • ₱
                    {Number(acc.current_balance).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                    })})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-800/80 mt-1.5">
                {kind === 'income'
                  ? 'Deposit will be automatically added to this vault balance.'
                  : 'Expense will be automatically deducted from this vault balance.'}
              </p>
            </div>
          )}

          {/* Linked Property / Asset (Optional) */}
          {properties.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/60 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-amber-950 mb-2 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-amber-700" />
                Connect to Property / Vehicle (Optional)
              </label>
              <select
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                className="bili-input w-full bg-white text-slate-900 text-sm"
              >
                <option value="">-- None (Personal / General) --</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.identifier ? `(${p.identifier})` : ''} • {p.property_type}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-amber-800/80 mt-1.5">
                {kind === 'income'
                  ? 'Earnings will be attributed to this property/vehicle revenue.'
                  : 'Costs will be attributed to this property/vehicle expenses.'}
              </p>
            </div>
          )}

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date
              </label>
              <input
                type="date"
                required
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="bili-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch with team"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="bili-input w-full text-sm"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-3">
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
                'Save Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
