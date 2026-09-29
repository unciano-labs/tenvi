'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Building2,
  Banknote,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
  CreditCard,
  Users,
  Home,
  Loader2,
  HelpCircle,
  Sparkles,
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
    subtitle: 'Mobile wallet on your phone',
    institution: 'GCash',
    type: 'ewallet' as const,
    icon: Smartphone,
    iconBg: 'bg-blue-600 text-white',
  },
  {
    id: 'maya',
    name: 'Maya',
    subtitle: 'Digital wallet & savings app',
    institution: 'Maya Philippines',
    type: 'digital_bank' as const,
    icon: Smartphone,
    iconBg: 'bg-emerald-600 text-white',
  },
  {
    id: 'cash',
    name: 'Cash on Hand',
    subtitle: 'Paper bills & coins in your wallet',
    institution: 'Physical Wallet',
    type: 'cash' as const,
    icon: Banknote,
    iconBg: 'bg-amber-600 text-white',
  },
  {
    id: 'bank',
    name: 'Bank Account',
    subtitle: 'BDO, BPI, Metrobank, etc.',
    institution: 'Traditional Bank',
    type: 'traditional_bank' as const,
    icon: Building2,
    iconBg: 'bg-slate-800 text-white',
  },
];

const MODULE_OPTIONS = [
  {
    id: 'expenses',
    label: 'Daily Expenses & Groceries',
    desc: 'Keep track of food, bills, shopping, and everyday receipts.',
    icon: Banknote,
    iconBg: 'bg-slate-800 text-white',
    defaultChecked: true,
  },
  {
    id: 'cards',
    label: 'Credit Cards & Due Dates',
    desc: 'Get reminded before billing deadlines to avoid late fees.',
    icon: CreditCard,
    iconBg: 'bg-blue-700 text-white',
    defaultChecked: true,
  },
  {
    id: 'splits',
    label: 'Borrowed & Lent Money',
    desc: 'Remember who owes you money or what loans you are paying.',
    icon: Users,
    iconBg: 'bg-emerald-700 text-white',
    defaultChecked: false,
  },
  {
    id: 'properties',
    label: 'House, Car & Properties',
    desc: 'Keep track of your home value, vehicle, or rental properties.',
    icon: Home,
    iconBg: 'bg-purple-700 text-white',
    defaultChecked: false,
  },
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
        accountName: accountName.trim() || selectedPreset.name,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-slate-200 animate-in zoom-in-95 duration-200">
        
        {/* Solid Accessible Header */}
        <div className="bg-slate-900 p-6 sm:p-7 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-300 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition active:scale-95"
            aria-label="Close welcome setup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step Pill */}
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
              <span className={`w-2 h-2 rounded-full ${step === 1 ? 'bg-indigo-400 animate-pulse' : 'bg-emerald-400'}`} />
              Step {step} of 2
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {step === 1 ? 'Everyday Money Pocket' : 'Your Main Focus'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Welcome, {userName}! 👋
          </h2>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            Let's get your account set up in two easy steps. No complicated financial terms!
          </p>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-200">
              {/* Question 1: Account Selection */}
              <div>
                <label className="block text-sm sm:text-base font-bold text-slate-900 mb-1">
                  1. Where do you keep your everyday spending money?
                </label>
                <p className="text-xs text-slate-600 mb-3.5">
                  Pick the main place you use to pay for food, bills, or shopping.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ACCOUNT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedPreset.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-4 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all duration-150 active:scale-[0.98] ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${preset.iconBg}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {preset.name}
                            </p>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 animate-in zoom-in-75 duration-150">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {preset.subtitle}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question 2: Nickname */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-900 mb-1">
                  2. Give this money pocket a nickname:
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. My Main GCash, Wallet Cash, BDO Savings"
                  className="w-full text-sm font-medium border-2 border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-600 text-slate-900 bg-white transition"
                />
              </div>

              {/* Question 3: Balance */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs sm:text-sm font-bold text-slate-900">
                    3. How much is in here right now? (Optional)
                  </label>
                  <span className="text-xs text-slate-500 font-medium">Rough estimate is fine</span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center font-bold text-xl text-slate-500">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xl font-bold pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-indigo-600 text-slate-900 bg-white transition"
                  />
                </div>

                {/* Quick tap buttons */}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setBalance('0')}
                    className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition active:scale-95"
                  >
                    ₱0 (Start with zero)
                  </button>
                  {['1000', '5000', '10000'].map((presetVal) => (
                    <button
                      key={presetVal}
                      type="button"
                      onClick={() => setBalance(presetVal)}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition active:scale-95"
                    >
                      ₱{Number(presetVal).toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-200">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                  What would you like Tenvi to help you with?
                </h3>
                <p className="text-xs text-slate-600">
                  Tap any that apply. You can change your choices at any time.
                </p>
              </div>

              <div className="space-y-3">
                {MODULE_OPTIONS.map((mod) => {
                  const Icon = mod.icon;
                  const isChecked = selectedModules.includes(mod.id);
                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModule(mod.id)}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                        isChecked
                          ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${mod.iconBg}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            {mod.label}
                          </p>
                          <p className="text-xs text-slate-600 leading-snug mt-0.5">
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-5 border-t border-slate-200 gap-3">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition py-2 px-3 rounded-xl hover:bg-slate-100 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 transition py-2 px-3 rounded-xl hover:bg-slate-100 active:scale-95"
              >
                Skip for now
              </button>
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-2xl shadow-sm transition active:scale-[0.98]"
              >
                Next Step
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-2xl shadow-sm transition active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting Up...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Finish & Open Dashboard
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
