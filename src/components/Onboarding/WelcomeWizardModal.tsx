'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Wallet,
  Smartphone,
  Building2,
  Banknote,
  Check,
  ArrowRight,
  X,
  CreditCard,
  Users,
  Home,
  Loader2,
} from 'lucide-react';
import { saveInitialSetupAction } from '@/app/actions/onboarding';

interface WelcomeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
}

const ACCOUNT_PRESETS = [
  {
    id: 'gcash',
    name: 'GCash',
    institution: 'GCash',
    type: 'ewallet' as const,
    icon: Smartphone,
    color: 'from-blue-600 to-sky-500',
  },
  {
    id: 'maya',
    name: 'Maya',
    institution: 'Maya Philippines',
    type: 'digital_bank' as const,
    icon: Smartphone,
    color: 'from-emerald-600 to-teal-500',
  },
  {
    id: 'cash',
    name: 'Cash on Hand',
    institution: 'Physical Wallet',
    type: 'cash' as const,
    icon: Banknote,
    color: 'from-amber-600 to-yellow-500',
  },
  {
    id: 'bank',
    name: 'Primary Bank',
    institution: 'BDO / BPI / UnionBank',
    type: 'traditional_bank' as const,
    icon: Building2,
    color: 'from-indigo-600 to-purple-500',
  },
];

const MODULE_OPTIONS = [
  { id: 'expenses', label: 'Expenses & Income', icon: Banknote, defaultChecked: true },
  { id: 'cards', label: 'Credit Card Cutoffs', icon: CreditCard, defaultChecked: true },
  { id: 'splits', label: 'Bill Splits & Loans', icon: Users, defaultChecked: false },
  { id: 'properties', label: 'Property & Assets', icon: Home, defaultChecked: false },
];

export function WelcomeWizardModal({
  isOpen,
  onClose,
  userName,
}: WelcomeWizardModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPreset, setSelectedPreset] = useState(ACCOUNT_PRESETS[0]);
  const [accountName, setAccountName] = useState(ACCOUNT_PRESETS[0].name);
  const [balance, setBalance] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'expenses',
    'cards',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSelectPreset = (preset: typeof ACCOUNT_PRESETS[0]) => {
    setSelectedPreset(preset);
    setAccountName(preset.name);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await saveInitialSetupAction({
        accountName: accountName || selectedPreset.name,
        institutionName: selectedPreset.institution,
        accountType: selectedPreset.type,
        initialBalance: parseFloat(balance.replace(/[^0-9.]/g, '')) || 0,
        preferredModules: selectedModules,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save initial setup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-indigo-500/30 rounded-xl text-indigo-300">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
              Welcome to Tenvi
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            Hello, {userName}! Let's set up your ledger.
          </h2>
          <p className="text-xs text-indigo-200 mt-1">
            Step {step} of 2: {step === 1 ? 'Your Primary Spending Pocket' : 'Custom Preferences'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Pick where you hold your everyday money:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {ACCOUNT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-600'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl text-white bg-gradient-to-br ${preset.color} shrink-0`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {preset.name}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {preset.type.replace('_', ' ')}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  2. Account Display Name:
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. My Main GCash"
                  className="w-full text-sm font-medium border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    3. Current Estimated Balance (PHP):
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">Optional</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-slate-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-sm font-semibold pl-8 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  {['1000', '5000', '10000', '20000'].map((presetVal) => (
                    <button
                      key={presetVal}
                      type="button"
                      onClick={() => setBalance(presetVal)}
                      className="text-[11px] font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                    >
                      +₱{Number(presetVal).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  What features will you use the most?
                </h3>
                <p className="text-xs text-slate-500">
                  Select your primary focus so we can tailor your dashboard shortcuts.
                </p>
              </div>

              <div className="space-y-2.5">
                {MODULE_OPTIONS.map((mod) => {
                  const Icon = mod.icon;
                  const isChecked = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${
                            isChecked
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-slate-900">
                          {mod.label}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition"
              >
                Skip for now
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Next Step
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Setting Up...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Launch My Dashboard
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
