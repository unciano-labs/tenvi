'use client';

import React, { useState, useEffect } from 'react';
import { createTransactionAction } from '@/app/actions/transactions';
import { toast } from 'sonner';
import {
  X,
  PlusCircle,
  MinusCircle,
  Loader2,
  Calendar,
  CreditCard as CreditCardIcon,
  Building2,
  Car,
  FileText,
} from 'lucide-react';
import { Property, Category, CreditCard } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';

interface PropertyTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  defaultPropertyId?: string;
  defaultKind?: 'income' | 'expense';
  categories: Category[];
  creditCards?: CreditCard[];
}

export function PropertyTransactionModal({
  isOpen,
  onClose,
  properties,
  defaultPropertyId,
  defaultKind = 'income',
  categories,
  creditCards = [],
}: PropertyTransactionModalProps) {
  const [kind, setKind] = useState<'income' | 'expense'>(defaultKind);
  const [propertyId, setPropertyId] = useState<string>(
    defaultPropertyId || (properties[0]?.id ?? '')
  );
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [creditCardId, setCreditCardId] = useState('');
  const [occurredOn, setOccurredOn] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKind(defaultKind);
      if (defaultPropertyId) {
        setPropertyId(defaultPropertyId);
      } else if (properties.length > 0 && !propertyId) {
        setPropertyId(properties[0].id);
      }
      setAmount('');
      setNote('');
      setOccurredOn(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, defaultKind, defaultPropertyId, properties]);

  if (!isOpen) return null;

  const filteredCategories = categories.filter((c) => c.kind === kind);
  const selectedProperty = properties.find((p) => p.id === propertyId);

  // Quick preset shortcuts for fast 1-click entries
  const handleQuickPreset = (presetNote: string, presetAmount?: number) => {
    setNote(presetNote);
    if (presetAmount) {
      setAmount(String(presetAmount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    if (!propertyId) {
      toast.error('Please select a property or asset.');
      return;
    }

    setIsSubmitting(true);
    const res = await createTransactionAction({
      kind,
      amount: parseFloat(amount),
      categoryId: categoryId || null,
      paymentMethod,
      creditCardId: paymentMethod === 'credit_card' ? creditCardId || null : null,
      propertyId,
      occurredOn,
      note: note.trim() || (kind === 'income' ? 'Property Income' : 'Property Expense'),
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        kind === 'income' ? 'Income logged to property!' : 'Expense recorded on property!'
      );
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto bili-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                kind === 'income'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {kind === 'income' ? (
                <PlusCircle className="w-5 h-5" />
              ) : (
                <MinusCircle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-slate-900">
                {kind === 'income' ? 'Log Property Income' : 'Log Property Expense'}
              </h3>
              <p className="text-xs text-slate-500">
                {selectedProperty
                  ? `Assigning transaction to ${selectedProperty.name}`
                  : 'Track earnings and operating costs per asset'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Kind Toggle (Income vs Expense) */}
        <div className="flex p-1.5 rounded-2xl bg-[#F6F7F9]">
          <button
            type="button"
            onClick={() => setKind('income')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              kind === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Money In (Income)
          </button>

          <button
            type="button"
            onClick={() => setKind('expense')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              kind === 'expense'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MinusCircle className="w-3.5 h-3.5" />
            Money Out (Expense)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Property Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Target Property / Asset</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.identifier ? `(${p.identifier})` : ''} • {p.property_type}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Amount (₱)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-3.5 rounded-2xl bg-[#F6F7F9] text-xl font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          {selectedProperty && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 block">
                Quick 1-Click Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {kind === 'income' ? (
                  <>
                    {Number(selectedProperty.expected_income_daily || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPreset(
                            `Daily Boundary (${selectedProperty.identifier || selectedProperty.name})`,
                            Number(selectedProperty.expected_income_daily)
                          )
                        }
                        className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        + Daily Boundary (₱{selectedProperty.expected_income_daily})
                      </button>
                    )}
                    {Number(selectedProperty.expected_income_monthly || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPreset(
                            `Monthly Rent (${selectedProperty.name})`,
                            Number(selectedProperty.expected_income_monthly)
                          )
                        }
                        className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        + Monthly Rent (₱{selectedProperty.expected_income_monthly})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('Booking / Trip Fare')}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Trip Fare
                    </button>
                  </>
                ) : (
                  <>
                    {Number(selectedProperty.monthly_amortization || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPreset(
                            `Monthly Amortization (${selectedProperty.name})`,
                            Number(selectedProperty.monthly_amortization)
                          )
                        }
                        className="text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        - Monthly Amort (₱{selectedProperty.monthly_amortization})
                      </button>
                    )}
                    {Number(selectedProperty.annual_insurance_amount || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickPreset(
                            `Annual Insurance Renewal (${selectedProperty.name})`,
                            Number(selectedProperty.annual_insurance_amount)
                          )
                        }
                        className="text-[11px] font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        - Yearly Insurance (₱{selectedProperty.annual_insurance_amount})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('Oil Change / PMS Maintenance')}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      PMS / Maintenance
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickPreset('Gas / Fuel')}
                      className="text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Gasoline / Fuel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="">Select a category (optional)</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Method & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Payment Channel</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 capitalize"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Date</label>
              <input
                type="date"
                required
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* If Credit Card, choose card */}
          {paymentMethod === 'credit_card' && creditCards.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-2xl bg-indigo-50/70">
              <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <CreditCardIcon className="w-3.5 h-3.5 text-indigo-600" />
                Charge to Credit Card
              </label>
              <select
                value={creditCardId}
                onChange={(e) => setCreditCardId(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white text-xs text-slate-900 font-semibold focus:outline-none"
              >
                <option value="">Select a card</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bank_name} {c.name} (•••• {c.last_4})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description / Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Note / Description</label>
            <input
              type="text"
              placeholder={
                kind === 'income'
                  ? 'e.g. Daily Boundary via GCash, Tenant Rent'
                  : 'e.g. Annual Comprehensive Insurance, Monthly Amortization'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`py-2.5 px-6 text-xs font-semibold shadow-sm flex items-center gap-2 rounded-2xl text-white cursor-pointer ${
                kind === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bili-btn-primary'
              }`}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {kind === 'income' ? 'Record Income' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
