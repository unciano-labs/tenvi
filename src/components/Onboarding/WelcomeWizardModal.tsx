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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
    defaultNickname: 'My GCash Wallet',
    subtitle: 'Daily allowance, QR code & food',
    institution: 'GCash (Mynt)',
    type: 'ewallet',
    defaultColor: 'blue',
    icon: Smartphone,
    iconBg: 'bg-blue-600 text-white',
  },
  {
    id: 'maya',
    name: 'Maya',
    defaultNickname: 'Maya Wallet & Savings',
    subtitle: 'Bills, daily spend, interest',
    institution: 'Maya Philippines',
    type: 'digital_bank',
    defaultColor: 'emerald',
    icon: Smartphone,
    iconBg: 'bg-emerald-600 text-white',
  },
  {
    id: 'cash',
    name: 'Physical Cash / Wallet',
    defaultNickname: 'Pocket Cash & Baon',
    subtitle: 'Jeepney fare, food, cash on hand',
    institution: 'Cash On Hand',
    type: 'cash',
    defaultColor: 'amber',
    icon: Banknote,
    iconBg: 'bg-amber-600 text-white',
  },
  {
    id: 'bpi',
    name: 'BPI Bank',
    defaultNickname: 'BPI Payroll / Checking',
    subtitle: 'Payroll & main savings',
    institution: 'Bank of the Philippine Islands',
    type: 'traditional_bank',
    defaultColor: 'stone',
    icon: Building2,
    iconBg: 'bg-rose-700 text-white',
  },
  {
    id: 'bdo',
    name: 'BDO Unibank',
    defaultNickname: 'BDO Savings',
    subtitle: 'Main savings & debit card',
    institution: 'BDO Unibank',
    type: 'traditional_bank',
    defaultColor: 'blue',
    icon: Building2,
    iconBg: 'bg-blue-800 text-white',
  },
  {
    id: 'unionbank',
    name: 'UnionBank',
    defaultNickname: 'UnionBank Everyday',
    subtitle: 'Online transfers & crypto cashouts',
    institution: 'UnionBank of the Philippines',
    type: 'digital_bank',
    defaultColor: 'amber',
    icon: Building2,
    iconBg: 'bg-amber-700 text-white',
  },
];

const COLOR_THEMES = [
  { id: 'slate', label: 'Midnight Slate', dotBg: 'bg-slate-900', cardBg: 'bg-slate-900' },
  { id: 'emerald', label: 'Forest Green', dotBg: 'bg-emerald-700', cardBg: 'bg-emerald-700' },
  { id: 'blue', label: 'Deep Ocean', dotBg: 'bg-blue-700', cardBg: 'bg-blue-700' },
  { id: 'amber', label: 'Warm Caramel', dotBg: 'bg-amber-700', cardBg: 'bg-amber-700' },
  { id: 'stone', label: 'Graphite Stone', dotBg: 'bg-stone-800', cardBg: 'bg-stone-800' },
] as const;

const QUICK_NICKNAMES = [
  'Everyday Baon',
  'Food & Groceries',
  'Salary / Payroll',
  'Personal Stash',
  'Jeep & Commute',
];

const QUICK_BALANCES = [
  { label: '₱500', value: '500', desc: 'Commute & coffee' },
  { label: '₱1,000', value: '1000', desc: 'Couple days of baon' },
  { label: '₱5,000', value: '5000', desc: 'Half-month grocery' },
  { label: '₱10,000', value: '10000', desc: 'Fresh payroll cutoff' },
  { label: '₱0', value: '0', desc: 'Start fresh from zero' },
];

const MODULE_OPTIONS = [
  {
    id: 'cards',
    label: 'Credit Cards & Cutoff Reminders',
    desc: 'Never pay late fees on BPI, BDO, or UB again',
    icon: CreditCard,
    iconBg: 'bg-blue-100 text-blue-800',
    badge: 'Popular',
  },
  {
    id: 'receivables',
    label: 'Utang & Bill Splits with Friends',
    desc: 'Track who owes you for samgyup or travel',
    icon: Users,
    iconBg: 'bg-emerald-100 text-emerald-800',
    badge: 'Social',
  },
  {
    id: 'properties',
    label: 'Car, Motorcycle & Assets Vault',
    desc: 'Never forget LTO OR/CR and insurance renewals',
    icon: Home,
    iconBg: 'bg-amber-100 text-amber-800',
    badge: 'Assets',
  },
];

export function WelcomeWizardModal({
  isOpen,
  onClose,
  userName,
  onCompleteWithTour,
}: WelcomeWizardModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [selectedPreset, setSelectedPreset] = useState<AccountPreset>(ACCOUNT_PRESETS[0]);
  const [accountName, setAccountName] = useState(ACCOUNT_PRESETS[0].defaultNickname);
  const [selectedColor, setSelectedColor] = useState<'slate' | 'emerald' | 'blue' | 'amber' | 'stone'>(
    ACCOUNT_PRESETS[0].defaultColor
  );
  const [balance, setBalance] = useState('1000');
  const [selectedModules, setSelectedModules] = useState<string[]>(['cards', 'receivables']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedNumericBalance = useMemo(() => {
    const n = parseFloat(balance);
    return isNaN(n) ? 0 : n;
  }, [balance]);

  const activeTheme = useMemo(() => {
    return COLOR_THEMES.find((t) => t.id === selectedColor) || COLOR_THEMES[0];
  }, [selectedColor]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: AccountPreset) => {
    setSelectedPreset(preset);
    setAccountName(preset.defaultNickname);
    setSelectedColor(preset.defaultColor);
  };

  const toggleModule = (id: string) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleFinalSubmit = async (withTour: boolean) => {
    setIsSubmitting(true);
    try {
      await saveInitialSetupAction({
        accountName: accountName.trim() || selectedPreset.defaultNickname,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-500">
      <div className="relative w-full max-w-xl bg-card rounded-3xl shadow-lift overflow-hidden animate-in zoom-in-95 duration-500 ease-out flex flex-col max-h-[92vh]">
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
            <Badge variant="neutral" className="bg-slate-800 text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
              Step {step} of 5
            </Badge>
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
          {/* 🌟 VIRTUAL POCKET CARD PREVIEW (Solid surface) */}
          {step !== 4 && (
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                  Your Live Pocket Card
                </span>
                <Badge variant="success">
                  Ready to Spend
                </Badge>
              </div>

              {/* Solid Card Preview */}
              <div
                className={`relative w-full rounded-2xl p-5 sm:p-6 text-white shadow-card ${activeTheme.cardBg} overflow-hidden transition-colors duration-500 ease-out`}
              >
                {/* Card Top Row */}
                <div className="flex items-center justify-between mb-4">
                  {/* Metallic Gold Chip & Wave Accents */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-7 rounded-md bg-amber-400 shadow-xs flex items-center justify-center p-1">
                      <div className="w-full h-full rounded-xs grid grid-cols-2 gap-0.5 opacity-60 bg-amber-500/30" />
                    </div>
                    {/* Contactless waves SVG */}
                    <div className="flex items-center text-white/70">
                      <svg className="w-4 h-4 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                        <path d="M12 19a8.5 8.5 0 0 1 0-14" />
                      </svg>
                    </div>
                  </div>

                  {/* Institution Badge */}
                  <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-white/20 text-white shadow-xs">
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
                <div className="flex items-end justify-between pt-2">
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
                <label className="block text-sm font-bold text-foreground mb-1">
                  1. Which wallet or account do you want to start with?
                </label>
                <p className="text-xs text-muted-foreground">
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
                      className={`p-4 rounded-2xl text-left flex items-center gap-3.5 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                        isSelected
                          ? 'bg-card ring-2 ring-primary text-foreground shadow-card'
                          : 'bg-muted/60 hover:bg-muted text-muted-foreground shadow-2xs'
                      }`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${preset.iconBg}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-foreground truncate">
                            {preset.name}
                          </p>
                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                <label className="block text-sm font-bold text-foreground mb-1">
                  Give this pocket a fun nickname:
                </label>
                <p className="text-xs text-muted-foreground mb-2.5">
                  Type your own or tap a quick suggestion below:
                </p>

                <Input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Everyday Baon, My GCash, Wallet Cash"
                />

                {/* Quick Nickname Chips */}
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {QUICK_NICKNAMES.map((nameChip) => (
                    <button
                      key={nameChip}
                      type="button"
                      onClick={() => setAccountName(nameChip)}
                      className="text-xs font-semibold px-3 py-1.5 bg-muted/60 hover:bg-muted text-foreground rounded-xl transition cursor-pointer active:scale-95"
                    >
                      {nameChip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector - Solid project colors */}
              <div>
                <label className="block text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-muted-foreground" />
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
                        className={`p-2.5 rounded-2xl flex items-center gap-2.5 text-xs font-bold transition cursor-pointer active:scale-95 ${
                          isPicked
                            ? 'bg-card ring-2 ring-primary text-foreground shadow-card'
                            : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full ${theme.dotBg} shrink-0 ring-2 ring-white shadow-xs`}
                        />
                        <span className="truncate">{theme.label}</span>
                        {isPicked && (
                          <Check className="w-3.5 h-3.5 text-primary ml-auto shrink-0 stroke-[3]" />
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
                  <label className="block text-sm font-bold text-foreground">
                    How much money is in here right now?
                  </label>
                  <span className="text-xs text-muted-foreground font-medium">
                    Rough estimate is great
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Type an amount or tap one of the quick starter chips below:
                </p>

                {/* Big Number Input */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center font-black text-2xl text-muted-foreground z-10">
                    ₱
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-2xl sm:text-3xl font-black pl-11 pr-4 py-3.5 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground bg-muted/60 transition shadow-xs"
                  />
                </div>

                {/* Quick Coin Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {QUICK_BALANCES.map((chip) => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => setBalance(chip.value)}
                      className={`p-2.5 rounded-xl text-left transition cursor-pointer active:scale-95 ${
                        balance === chip.value
                          ? 'bg-primary text-primary-foreground shadow-card'
                          : 'bg-muted/60 hover:bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-xs font-black">{chip.label}</p>
                      <p
                        className={`text-[10px] truncate ${
                          balance === chip.value
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
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
                <h3 className="text-sm sm:text-base font-bold text-foreground mb-1">
                  What would you like Tenvi to watch over for you?
                </h3>
                <p className="text-xs text-muted-foreground">
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
                      className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                        isChecked
                          ? 'bg-card ring-2 ring-primary text-foreground shadow-card'
                          : 'bg-muted/60 hover:bg-muted text-muted-foreground shadow-2xs'
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
                            <p className="text-sm font-bold text-foreground truncate">
                              {mod.label}
                            </p>
                            <Badge variant="neutral">
                              {mod.badge}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                            {mod.desc}
                          </p>
                        </div>
                      </div>

                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center pt-2">
                <Badge variant="neutral">
                  {selectedModules.length} goals selected
                </Badge>
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
                <h3 className="text-xl font-black text-foreground">
                  Woohoo! You Did It, {userName}! 🌟
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Your starter money pocket is officially live. Here is what we prepared for you:
                </p>
              </div>

              {/* Summary Checklist */}
              <div className="p-4 rounded-2xl bg-muted/60 space-y-2.5">
                <div className="flex items-center gap-2.5 text-xs text-foreground font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    Money Pocket created:{' '}
                    <strong className="font-bold">
                      {accountName}
                    </strong>{' '}
                    ({formatMoney(parsedNumericBalance)})
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-foreground font-semibold">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>
                    Dashboard customized for{' '}
                    <strong className="font-bold">
                      {selectedModules.length} selected goals
                    </strong>
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-foreground font-semibold">
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

          {/* Tenvi Buddy Helper Tip - Soft tonal well */}
          <div className="p-3.5 rounded-2xl bg-muted/60 text-foreground flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-foreground leading-snug">
              <span className="font-bold">Tenvi Buddy: </span>
              {stepMeta.buddyTip}
            </p>
          </div>
        </div>

        {/* Modal Navigation Controls Footer */}
        <div className="p-4 sm:p-5 bg-card flex items-center justify-between gap-3 shrink-0">
          {/* Back / Skip Button */}
          {step > 1 && step < 5 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((prev) => (prev - 1) as any)}
              size="sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : step === 1 ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              size="sm"
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          ) : (
            <div />
          )}

          {/* Forward / Finish Buttons */}
          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep((prev) => (prev + 1) as any)}
              size="sm"
            >
              Next Step
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : step === 4 ? (
            <Button
              type="button"
              onClick={() => setStep(5)}
              size="sm"
            >
              See My Pocket
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            /* STEP 5 ACTIONS */
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(true)}
                size="sm"
              >
                <Compass className="w-4 h-4" />
                Take 30s Tour
              </Button>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleFinalSubmit(false)}
                size="sm"
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
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
