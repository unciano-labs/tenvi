'use client';

import React, { useState, useMemo } from 'react';
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
  Sparkles,
  Trophy,
  Palette,
  Compass,
} from 'lucide-react';
import { saveInitialSetupAction } from '@/app/actions/onboarding';
import { formatMoney } from '@/lib/finance/calculations';

interface WelcomeWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  onCompleteWithTour?: () => void;
}

interface AccountPreset {
  id: string;
  name: string;
  defaultNickname: string;
  subtitle: string;
  institution: string;
  type: 'ewallet' | 'digital_bank' | 'cash' | 'traditional_bank';
  defaultColor: 'slate' | 'emerald' | 'blue' | 'amber' | 'stone';
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
}

const ACCOUNT_PRESETS: AccountPreset[] = [
  {
    id: 'gcash',
    name: 'GCash',
    defaultNickname: 'My Everyday GCash',
    subtitle: 'Phone wallet for QR, loads & Foodpanda',
    institution: 'GCash',
    type: 'ewallet',
    defaultColor: 'blue',
    icon: Smartphone,
    iconBg: 'bg-slate-900 text-white',
  },
  {
    id: 'maya',
    name: 'Maya',
    defaultNickname: 'My Maya Wallet',
    subtitle: 'Digital wallet with high-interest savings',
    institution: 'Maya Philippines',
    type: 'digital_bank',
    defaultColor: 'emerald',
    icon: Smartphone,
    iconBg: 'bg-emerald-900 text-white',
  },
  {
    id: 'cash',
    name: 'Cash on Hand',
    defaultNickname: 'Wallet Cash',
    subtitle: 'Paper bills & coins in your pocket or piggy bank',
    institution: 'Physical Wallet',
    type: 'cash',
    defaultColor: 'amber',
    icon: Banknote,
    iconBg: 'bg-amber-900 text-white',
  },
  {
    id: 'bank',
    name: 'Bank Account',
    defaultNickname: 'Main Bank Account',
    subtitle: 'BDO, BPI, UnionBank, Metrobank, etc.',
    institution: 'Traditional Bank',
    type: 'traditional_bank',
    defaultColor: 'slate',
    icon: Building2,
    iconBg: 'bg-slate-900 text-white',
  },
];

// Solid, eye-friendly color themes matching SavingsModal.tsx (ZERO gradients)
const COLOR_THEMES = [
  {
    id: 'slate',
    label: 'Charcoal Slate',
    cardBg: 'bg-slate-900',
    dotBg: 'bg-slate-900',
  },
  {
    id: 'emerald',
    label: 'Forest Emerald',
    cardBg: 'bg-emerald-900',
    dotBg: 'bg-emerald-900',
  },
  {
    id: 'blue',
    label: 'Ocean Navy',
    cardBg: 'bg-blue-900',
    dotBg: 'bg-blue-900',
  },
  {
    id: 'amber',
    label: 'Bronze Amber',
    cardBg: 'bg-amber-900',
    dotBg: 'bg-amber-900',
  },
  {
    id: 'stone',
    label: 'Warm Stone',
    cardBg: 'bg-stone-800',
    dotBg: 'bg-stone-800',
  },
];

const QUICK_NICKNAMES = [
  'Everyday Baon 🥪',
  'Coffee & Snacks ☕',
  'Pocket Cash 👛',
  'Emergency Stash 🛡️',
];

const QUICK_BALANCES = [
  { label: '₱0 (Fresh Start)', value: '0', desc: 'Starting empty' },
  { label: '₱500', value: '500', desc: 'Snacks & baon' },
  { label: '₱1,000', value: '1000', desc: 'Pocket money' },
  { label: '₱5,000', value: '5000', desc: 'Payday stash' },
  { label: '₱10,000', value: '10000', desc: 'Safe buffer' },
];

const MODULE_OPTIONS = [
  {
    id: 'expenses',
    label: 'Daily Food & Expenses',
    desc: 'See where all the snacks, meals, bills, and grocery money goes.',
    icon: Banknote,
    iconBg: 'bg-slate-100 text-slate-800',
    badge: 'Recommended',
    defaultChecked: true,
  },
  {
    id: 'cards',
    label: 'Credit Card & Bill Reminders',
    desc: 'Get alerted before due dates so you never pay late penalties.',
    icon: CreditCard,
    iconBg: 'bg-slate-100 text-slate-800',
    badge: 'Recommended',
    defaultChecked: true,
  },
  {
    id: 'splits',
    label: 'Friends Who Borrowed (Splits)',
    desc: 'Remember who owes you lunch or bill shares without awkwardness.',
    icon: Users,
    iconBg: 'bg-slate-100 text-slate-800',
    badge: 'Popular',
    defaultChecked: false,
  },
  {
    id: 'properties',
    label: 'Big Dream Assets & Properties',
    desc: 'Keep track of your house, car, or future financial milestones.',
    icon: Home,
    iconBg: 'bg-slate-100 text-slate-800',
    badge: 'Long-term',
    defaultChecked: false,
  },
];

export function WelcomeWizardModal({
  isOpen,
  onClose,
  userName,
  onCompleteWithTour,
}: WelcomeWizardModalProps) {
  // Steps: 1 (Pick Spot) -> 2 (Name & Color) -> 3 (Balance) -> 4 (Superpowers) -> 5 (Celebration)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedPreset, setSelectedPreset] = useState<AccountPreset>(ACCOUNT_PRESETS[0]);
  const [accountName, setAccountName] = useState(ACCOUNT_PRESETS[0].defaultNickname);
  const [selectedColor, setSelectedColor] = useState<string>(ACCOUNT_PRESETS[0].defaultColor);
  const [balance, setBalance] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'expenses',
    'cards',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active theme solid styling
  const activeTheme = useMemo(() => {
    return (
      COLOR_THEMES.find((c) => c.id === selectedColor) || COLOR_THEMES[0]
    );
  }, [selectedColor]);

  // Clean numerical balance
  const parsedNumericBalance = useMemo(() => {
    const num = parseFloat(balance.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  }, [balance]);

  if (!isOpen) return null;

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSelectPreset = (preset: AccountPreset) => {
    setSelectedPreset(preset);
    setAccountName(preset.defaultNickname);
    setSelectedColor(preset.defaultColor);
  };

  const handleFinalSubmit = async (withTour: boolean = false) => {
    setIsSubmitting(true);
    try {
      await saveInitialSetupAction({
        accountName: accountName.trim() || selectedPreset.name,
        institutionName: selectedPreset.institution,
        accountType: selectedPreset.type,
        initialBalance: parsedNumericBalance,
        preferredModules: selectedModules,
        colorTheme: selectedColor,
      });

      if (withTour && onCompleteWithTour) {
        onCompleteWithTour();
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save initial setup:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP HEADINGS & BUDDY TIPS
  const stepMeta = {
    1: {
      title: 'Where do you keep your everyday money? 👛',
      subtitle:
        'Pick the main place you use to buy food, groceries, or rides. You can add more pockets later!',
      buddyTip:
        'Tip: Most people start with GCash or Cash on hand. Pick whichever you used today!',
    },
    2: {
      title: 'Name your pocket & pick a color! 🎨',
      subtitle:
        'Give it a friendly nickname so you can spot it quickly on your dashboard.',
      buddyTip:
        'Giving your money a specific purpose (like "Baon" or "Coffee") makes it much easier to save!',
    },
    3: {
      title: 'How much is in this pocket today? 🪙',
      subtitle:
        'Rough guesses are 100% fine! You can also start at ₱0 and adjust anytime.',
      buddyTip:
        'No pressure to count exact coins! A rounded estimate gives you an instant starting point.',
    },
    4: {
      title: 'What is your main money mission? 🎯',
      subtitle:
        'Tell Tenvi what to keep an eye on. Pick any that sound good to you:',
      buddyTip:
        'You can change or add more missions anytime with one tap.',
    },
    5: {
      title: 'High Five! You Are All Set! 🎉',
      subtitle:
        'Your first money pocket has been created and your dashboard is ready to roll.',
      buddyTip:
        'You just took your first big step toward complete financial clarity. Awesome job!',
    },
  }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500 ease-out flex flex-col max-h-[92vh]">
        {/* Top Header - Solid Slate 900 matching project theme */}
        <div className="bg-slate-900 p-5 sm:p-6 text-white relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition active:scale-95 cursor-pointer"
            aria-label="Close welcome setup"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Step Pill */}
          <div className="flex items-center gap-2 mb-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Step {step} of 5
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Newbie Setup
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Welcome, {userName}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
            {stepMeta.subtitle}
          </p>

          {/* Step Progress Bar - Solid Slate */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-4 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
          {/* 🌟 VIRTUAL POCKET CARD PREVIEW (Solid surface, ZERO gradient) */}
          {step !== 4 && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-slate-700" />
                  Your Live Pocket Card
                </span>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Ready to Spend
                </span>
              </div>

              {/* Solid Card Preview */}
              <div
                className={`relative w-full rounded-2xl p-5 sm:p-6 text-white shadow-md ${activeTheme.cardBg} overflow-hidden transition-colors duration-500 ease-out`}
              >
                {/* Card Top Row */}
                <div className="flex items-center justify-between mb-4">
                  {/* Metallic Gold Chip & Wave Accents */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-7 rounded-md bg-amber-400 border border-amber-500 shadow-xs flex items-center justify-center p-1">
                      <div className="w-full h-full border border-amber-700/60 rounded-xs grid grid-cols-2 gap-0.5 opacity-60" />
                    </div>
                    {/* Contactless waves */}
                    <div className="flex items-center gap-0.5 text-white/70">
                      <span className="w-1 h-3 rounded-full border-r-2 border-white/60" />
                      <span className="w-1.5 h-4 rounded-full border-r-2 border-white/75" />
                    </div>
                  </div>

                  {/* Institution Badge */}
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-white/15 text-white border border-white/20 shadow-xs">
                    {selectedPreset.name}
                  </span>
                </div>

                {/* Pocket Nickname */}
                <div className="mb-3">
                  <p className="text-xs text-white/70 font-medium tracking-wide">
                    Money Pocket Nickname
                  </p>
                  <p className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    {accountName.trim() || selectedPreset.defaultNickname}
                  </p>
                </div>

                {/* Card Bottom Row: Balance & User */}
                <div className="flex items-end justify-between pt-2 border-t border-white/15">
                  <div>
                    <span className="text-[11px] text-white/70 uppercase tracking-wider block">
                      Current Stash
                    </span>
                    <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {formatMoney(parsedNumericBalance)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-white/60 uppercase tracking-widest block font-mono">
                      Currency
                    </span>
                    <span className="text-xs font-bold text-white/90 font-mono">
                      PHP • ₱
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🌟 STEP 1: PICK STARTING WALLET */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-500 ease-out">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  1. Which wallet or account do you want to start with?
                </label>
                <p className="text-xs text-slate-600">
                  Tap your everyday money source below:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ACCOUNT_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  const isSelected = selectedPreset.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-4 rounded-2xl border-2 text-left flex items-center gap-3.5 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
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
                            <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0">
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
          )}

          {/* 🌟 STEP 2: NAME & SOLID COLOR THEME */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-500 ease-out">
              {/* Nickname Input */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  Give this pocket a fun nickname:
                </label>
                <p className="text-xs text-slate-600 mb-2.5">
                  Type your own or tap a quick suggestion below:
                </p>

                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Everyday Baon, My GCash, Wallet Cash"
                  className="w-full text-sm font-bold border-2 border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-slate-900 text-slate-900 bg-white transition shadow-xs"
                />

                {/* Quick Nickname Chips */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {QUICK_NICKNAMES.map((nameChip) => (
                    <button
                      key={nameChip}
                      type="button"
                      onClick={() => setAccountName(nameChip)}
                      className="text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer active:scale-95"
                    >
                      {nameChip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector - Solid project colors */}
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-slate-700" />
                  Pick a card color:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                  {COLOR_THEMES.map((theme) => {
                    const isPicked = selectedColor === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setSelectedColor(theme.id)}
                        className={`p-2.5 rounded-2xl border-2 flex items-center gap-2.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
                          isPicked
                            ? 'border-slate-900 bg-slate-100 text-slate-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full ${theme.dotBg} shrink-0 ring-2 ring-white shadow-xs`}
                        />
                        <span className="truncate">{theme.label}</span>
                        {isPicked && (
                          <Check className="w-3.5 h-3.5 text-slate-900 ml-auto shrink-0 stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 🌟 STEP 3: STARTING BALANCE */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-500 ease-out">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-bold text-slate-900">
                    How much money is in here right now?
                  </label>
                  <span className="text-xs text-slate-500 font-medium">
                    Rough estimate is great
                  </span>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Type an amount or tap one of the quick starter chips below:
                </p>

                {/* Big Number Input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center font-black text-2xl text-slate-400">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-2xl sm:text-3xl font-black pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-slate-900 text-slate-900 bg-white transition shadow-xs"
                  />
                </div>

                {/* Quick Coin Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {QUICK_BALANCES.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setBalance(chip.value)}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer active:scale-95 ${
                        balance === chip.value
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-200'
                      }`}
                    >
                      <p className="text-xs font-black">{chip.label}</p>
                      <p
                        className={`text-[10px] truncate ${
                          balance === chip.value
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {chip.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 🌟 STEP 4: PICK FINANCIAL SUPERPOWERS / GOALS */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-500 ease-out">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                  What would you like Tenvi to watch over for you?
                </h3>
                <p className="text-xs text-slate-600">
                  Select your primary goals. You can change these anytime in Settings:
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
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                        isChecked
                          ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${mod.iconBg}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 truncate">
                              {mod.label}
                            </p>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {mod.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-snug mt-0.5">
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center border-2 shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center pt-2">
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  {selectedModules.length} goals selected
                </span>
              </div>
            </div>
          )}

          {/* 🌟 STEP 5: CELEBRATION & HIGH FIVE */}
          {step === 5 && (
            <div className="space-y-5 animate-in zoom-in-95 duration-600 ease-out">
              <div className="relative py-2 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 shadow-xs mb-2">
                  <Trophy className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-slate-900">
                  Woohoo! You Did It, {userName}! 🌟
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Your starter money pocket is officially live. Here is what we prepared for you:
                </p>
              </div>

              {/* Summary Checklist */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-slate-800 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    Money Pocket created:{' '}
                    <strong className="font-bold text-slate-900">
                      {accountName}
                    </strong>{' '}
                    ({formatMoney(parsedNumericBalance)})
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-800 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    Dashboard customized for{' '}
                    <strong className="font-bold text-slate-900">
                      {selectedModules.length} selected goals
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-800 font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    Tenvi AI financial buddy is ready to answer questions
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tenvi Buddy Helper Tip - Solid Slate 100 */}
          <div className="p-3.5 rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-snug">
              <span className="font-bold text-slate-900">Tenvi Buddy: </span>
              {stepMeta.buddyTip}
            </p>
          </div>
        </div>

        {/* Modal Navigation Controls Footer - Solid buttons matching project theme */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {/* Back / Skip Button */}
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="bili-btn-secondary py-2.5 px-4 text-xs sm:text-sm font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : step === 1 ? (
            <button
              type="button"
              onClick={onClose}
              className="bili-btn-secondary py-2.5 px-4 text-xs sm:text-sm font-bold text-slate-500"
            >
              Skip for now
            </button>
          ) : (
            <div />
          )}

          {/* Forward / Finish Buttons */}
          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as any)}
              className="bili-btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : step === 4 ? (
            <button
              type="button"
              onClick={() => setStep(5)}
              className="bili-btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold"
            >
              See My Pocket
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            /* STEP 5 ACTIONS */
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(true)}
                className="bili-btn-secondary py-2.5 px-4 text-xs font-bold"
              >
                <Compass className="w-4 h-4 text-slate-700" />
                Take 30s Tour
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(false)}
                className="bili-btn-primary py-2.5 px-6 text-xs sm:text-sm font-bold disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting Up...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    Explore My Dashboard 🚀
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
