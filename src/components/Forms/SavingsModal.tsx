'use client';

import React, { useState } from 'react';
import { createSavingsAccountAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import { X, PiggyBank, Loader2, Sparkles, Building2 } from 'lucide-react';
import { PH_SAVINGS_INSTITUTIONS } from '@/lib/constants';

interface SavingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SavingsModal({ isOpen, onClose }: SavingsModalProps) {
  const [selectedInstitution, setSelectedInstitution] = useState<string>(
    PH_SAVINGS_INSTITUTIONS[0]?.name || ''
  );
  const [customInstitution, setCustomInstitution] = useState('');
  const [name, setName] = useState('');
  const [accountNumberLast4, setAccountNumberLast4] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Determine institution object
  const matchedInst = PH_SAVINGS_INSTITUTIONS.find(
    (i) => i.name === selectedInstitution
  );
  const accountType = matchedInst ? matchedInst.type : 'traditional_bank';
  const finalInstitutionName =
    selectedInstitution === 'Other Bank / Account'
      ? customInstitution.trim()
      : selectedInstitution;

  // Group institutions by category
  const groups = Array.from(
    new Set(PH_SAVINGS_INSTITUTIONS.map((i) => i.group))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalInstitutionName) {
      toast.error('Please select or specify the account or bank.');
      return;
    }

    setIsSubmitting(true);
    const res = await createSavingsAccountAction({
      name: name.trim() || finalInstitutionName,
      accountType,
      institutionName: finalInstitutionName,
      accountNumberLast4: accountNumberLast4 || null,
      currentBalance: currentBalance ? parseFloat(currentBalance) : 0,
      targetAmount: targetAmount ? parseFloat(targetAmount) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      colorTheme,
    });

    setIsSubmitting(false);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Savings account / cash wallet added!');
      setName('');
      setCurrentBalance('');
      setTargetAmount('');
      setInterestRate('');
      setAccountNumberLast4('');
      onClose();
    }
  };

  const colors = [
    { id: 'emerald', name: 'Emerald', bg: 'bg-emerald-900' },
    { id: 'indigo', name: 'Navy', bg: 'bg-indigo-900' },
    { id: 'blue', name: 'Ocean', bg: 'bg-blue-900' },
    { id: 'amber', name: 'Bronze', bg: 'bg-amber-900' },
    { id: 'slate', name: 'Charcoal', bg: 'bg-slate-900' },
  ];

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
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <PiggyBank className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-slate-900">
              Add Savings or Cash Account
            </h2>
            <p className="text-xs text-slate-500">
              Track traditional banks, digital banks, e-wallets, or physical cash
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Institution Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Where is the money kept?
            </label>
            <select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              className="bili-input w-full text-sm font-medium"
            >
              {groups.map((group) => (
                <optgroup key={group} label={group}>
                  {PH_SAVINGS_INSTITUTIONS.filter((i) => i.group === group).map(
                    (inst) => (
                      <option key={inst.name} value={inst.name}>
                        {inst.name}
                      </option>
                    )
                  )}
                </optgroup>
              ))}
            </select>

            {selectedInstitution === 'Other Bank / Account' && (
              <input
                type="text"
                required
                placeholder="Type custom bank or account name..."
                value={customInstitution}
                onChange={(e) => setCustomInstitution(e.target.value)}
                className="bili-input w-full text-sm mt-2"
                autoFocus
              />
            )}
          </div>

          {/* Account Nickname */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Account / Goal Nickname
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Emergency Fund, Japan Trip Stash, Payroll, Daily Wallet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bili-input w-full text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Current Balance */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Current Balance (PHP)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="bili-input w-full pl-8 text-base font-bold text-slate-900"
                />
              </div>
            </div>

            {/* Target Goal Amount (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Target Goal (Optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-sm font-bold text-slate-400">
                  ₱
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 50,000.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="bili-input w-full pl-8 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Interest Rate (for digital banks like Maya, CIMB, MariBank) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Interest Rate p.a. % (Optional)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="e.g. 4.5, 6.0"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="bili-input w-full pr-8 text-sm"
                />
                <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-slate-400">
                  %
                </span>
              </div>
            </div>

            {/* Account last 4 digits */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Last 4 Digits (Optional)
              </label>
              <input
                type="text"
                maxLength={4}
                placeholder="e.g. 8821"
                value={accountNumberLast4}
                onChange={(e) => setAccountNumberLast4(e.target.value.replace(/\D/g, ''))}
                className="bili-input w-full text-sm font-mono tracking-wider text-center"
              />
            </div>
          </div>

          {/* Color theme */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Card Color
            </label>
            <div className="flex items-center gap-3">
              {colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorTheme(c.id)}
                  className={`w-9 h-9 rounded-2xl ${c.bg} flex items-center justify-center transition-transform ${
                    colorTheme === c.id
                      ? 'scale-110 shadow-md ring-2 ring-slate-900 ring-offset-2'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  title={c.name}
                />
              ))}
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
                  Saving...
                </>
              ) : (
                'Add Savings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
