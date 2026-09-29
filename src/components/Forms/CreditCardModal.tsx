'use client';

import React, { useState, useEffect } from 'react';
import { createCreditCardAction, updateCreditCardAction } from '@/app/actions/cards';
import { toast } from 'sonner';
import { X, CreditCard as CardIcon, Loader2, Calendar, Building2, Palette, Check } from 'lucide-react';
import { PH_CREDIT_CARD_BANKS } from '@/lib/constants';
import { CreditCard } from '@/types';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  card?: CreditCard | null;
}

const PRESET_CARD_COLORS = [
  { id: '#0f172a', name: 'Charcoal Black', hex: '#0f172a' },
  { id: '#1e3a8a', name: 'Royal Navy', hex: '#1e3a8a' },
  { id: '#065f46', name: 'Forest Emerald', hex: '#065f46' },
  { id: '#9f1239', name: 'Burgundy Crimson', hex: '#9f1239' },
  { id: '#92400e', name: 'Bronze Amber', hex: '#92400e' },
  { id: '#581c87', name: 'Imperial Purple', hex: '#581c87' },
  { id: '#0f766e', name: 'Deep Teal', hex: '#0f766e' },
  { id: '#334155', name: 'Graphite Slate', hex: '#334155' },
];

function resolveCardHex(color: string): string {
  if (!color) return '#0f172a';
  if (color.startsWith('#')) return color;
  switch (color) {
    case 'indigo':
      return '#1e3a8a';
    case 'emerald':
      return '#065f46';
    case 'rose':
      return '#9f1239';
    case 'amber':
      return '#92400e';
    case 'slate':
      return '#0f172a';
    default:
      return color.startsWith('#') ? color : '#0f172a';
  }
}

export function CreditCardModal({ isOpen, onClose, card }: CreditCardModalProps) {
  const [selectedBank, setSelectedBank] = useState<string>(PH_CREDIT_CARD_BANKS[0]);
  const [customBankName, setCustomBankName] = useState('');
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [statementDay, setStatementDay] = useState('15');
  const [dueDay, setDueDay] = useState('5');
  const [colorTheme, setColorTheme] = useState('#0f172a');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card) {
      const isKnownBank = (PH_CREDIT_CARD_BANKS as readonly string[]).includes(
        card.bank_name
      );
      if (isKnownBank) {
        setSelectedBank(card.bank_name);
        setCustomBankName('');
      } else {
        setSelectedBank('Other Bank');
        setCustomBankName(card.bank_name);
      }

      setName(card.name || '');
      setLast4(card.last_4 || '');
      setCreditLimit(card.credit_limit ? card.credit_limit.toString() : '');
      setStatementDay(card.statement_day ? card.statement_day.toString() : '15');
      setDueDay(card.due_day ? card.due_day.toString() : '5');
      setColorTheme(resolveCardHex(card.color_theme || '#0f172a'));
    } else {
      setSelectedBank(PH_CREDIT_CARD_BANKS[0]);
      setCustomBankName('');
      setName('');
      setLast4('');
      setCreditLimit('');
      setStatementDay('15');
      setDueDay('5');
      setColorTheme('#0f172a');
    }
  }, [card, isOpen]);

  if (!isOpen) return null;

  const isEditing = Boolean(card);
  const finalBankName =
    selectedBank === 'Other Bank' ? customBankName.trim() : selectedBank;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalBankName) {
      toast.error('Please select or enter the bank name.');
      return;
    }

    if (!last4 || last4.length !== 4) {
      toast.error('Please enter exactly 4 numbers for the last 4 digits.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      name,
      bankName: finalBankName,
      last4,
      creditLimit: creditLimit ? parseFloat(creditLimit) : 0,
      statementDay: parseInt(statementDay, 10),
      dueDay: parseInt(dueDay, 10),
      colorTheme: colorTheme.trim() || '#0f172a',
    };

    let res;
    if (isEditing && card) {
      res = await updateCreditCardAction(card.id, payload);
    } else {
      res = await createCreditCardAction(payload);
    }

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        isEditing
          ? 'Credit card details updated!'
          : 'Credit card added successfully!'
      );
      onClose();
    }
  };

  const activeCardBg = resolveCardHex(colorTheme);

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
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <CardIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">
              {isEditing ? 'Edit Credit Card Details' : 'Add Credit Card'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditing
                ? 'Update statement cutoff, due day, limit, color, or nickname'
                : 'Track due dates and customize your card theme'}
            </p>
          </div>
        </div>

        {/* Live Physical Card Preview */}
        <div className="mb-6 p-1">
          <div
            className="p-5 rounded-3xl text-white shadow-md relative overflow-hidden flex flex-col justify-between h-40 transition-colors duration-200"
            style={{ backgroundColor: activeCardBg }}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase font-semibold tracking-wider text-white/70">
                  {finalBankName || 'Bank Name'}
                </p>
                <p className="text-base font-bold tracking-tight mt-0.5">
                  {name || 'Card Nickname'}
                </p>
              </div>
              <CardIcon className="w-6 h-6 text-white/70" />
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="text-xs text-white/70 font-medium">Card Number</p>
                <p className="text-sm font-mono tracking-widest font-bold">
                  •••• •••• •••• {last4 || '0000'}
                </p>
              </div>

              {creditLimit && parseFloat(creditLimit) > 0 ? (
                <div className="text-right">
                  <p className="text-xs text-white/70 font-medium">Spending Power</p>
                  <p className="text-xs font-bold">
                    ₱{parseFloat(creditLimit).toLocaleString()}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PH Bank Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Issuing Philippine Bank
            </label>
            <select
              value={selectedBank}
              onChange={(e) => setSelectedBank(e.target.value)}
              className="bili-input w-full text-sm font-medium"
            >
              {PH_CREDIT_CARD_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Bank Name if "Other Bank" selected */}
          {selectedBank === 'Other Bank' && (
            <div className="animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Type Bank / Institution Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Citystate Savings, Standard Chartered, Atome"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                className="bili-input w-full text-sm"
              />
            </div>
          )}

          {/* Nickname & Last 4 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Card Nickname
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BDO Gold, BPI Rewards, Everyday Card"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bili-input w-full text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Last 4 Digits
              </label>
              <input
                type="text"
                maxLength={4}
                required
                placeholder="1234"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
                className="bili-input w-full text-sm font-mono tracking-wider"
              />
            </div>
          </div>

          {/* Credit Limit / Spending Power */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Spending Power / Credit Limit (PHP) - Optional
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-sm font-bold text-slate-400">
                ₱
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="50,000.00"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="bili-input w-full pl-8 text-sm"
              />
            </div>
          </div>

          {/* Statement Cutoff Day & Due Day */}
          <div className="p-4 rounded-2xl bg-[#F6F7F9] space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Monthly Billing Cycle
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Statement Cutoff Day
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Day</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={statementDay}
                    onChange={(e) => setStatementDay(e.target.value)}
                    className="bili-input w-full text-center font-bold bg-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">
                  Due Day (Pay By)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Day</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="bili-input w-full text-center font-bold bg-white text-sm text-indigo-900"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Example: If your payment is due every 5th of the month, set Due Day to 5.
            </p>
          </div>

          {/* Custom Card Color Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400" />
                Card Color Theme
              </label>
              <span className="text-xs font-mono font-bold text-slate-600">
                {activeCardBg.toUpperCase()}
              </span>
            </div>

            {/* Preset Color Swatches */}
            <div className="flex flex-wrap items-center gap-2.5">
              {PRESET_CARD_COLORS.map((c) => {
                const isSelected = activeCardBg.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColorTheme(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'scale-110 shadow-md ring-2 ring-slate-900 ring-offset-2'
                        : 'opacity-85 hover:opacity-100 hover:scale-105'
                    }`}
                    title={c.name}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Interactive Color Picker & Hex Input */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F6F7F9]">
              <div className="flex items-center gap-2">
                <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-sm shrink-0">
                  <input
                    type="color"
                    value={activeCardBg}
                    onChange={(e) => setColorTheme(e.target.value)}
                    className="absolute -top-3 -left-3 w-14 h-14 cursor-pointer border-0 p-0"
                    title="Open Color Palette"
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700">Custom Picker:</span>
              </div>

              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={7}
                  placeholder="#0F172A"
                  value={colorTheme}
                  onChange={(e) => setColorTheme(e.target.value)}
                  className="bili-input w-full py-1.5 px-3 text-xs font-mono uppercase bg-white"
                />
              </div>
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
                  {isEditing ? 'Saving changes...' : 'Adding card...'}
                </>
              ) : (
                isEditing ? 'Save Changes' : 'Add Card'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
