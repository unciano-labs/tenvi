'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
  Wallet,
  Receipt,
  CreditCard as CreditCardIcon,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { dismissOnboardingChecklistAction } from '@/app/actions/onboarding';

interface LaunchpadProps {
  progress: {
    accountAdded: boolean;
    firstTransaction: boolean;
    cardOrLoanAdded: boolean;
    aiConsulted: boolean;
  };
  onOpenWizard?: () => void;
  onOpenAi?: () => void;
}

export function OnboardingLaunchpad({
  progress,
  onOpenWizard,
  onOpenAi,
}: LaunchpadProps) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const steps = [
    {
      id: 'account',
      title: 'Set up Bank or E-Wallet',
      desc: 'GCash, Maya, Bank, or Cash',
      icon: Wallet,
      done: progress.accountAdded,
      href: '/dashboard/savings',
    },
    {
      id: 'transaction',
      title: 'Log First Expense or Income',
      desc: 'Type an entry or drop a receipt',
      icon: Receipt,
      done: progress.firstTransaction,
      href: '/dashboard/transactions',
    },
    {
      id: 'card',
      title: 'Add Credit Card or Loan',
      desc: 'Track cutoffs & due dates',
      icon: CreditCardIcon,
      done: progress.cardOrLoanAdded,
      href: '/dashboard/cards',
    },
    {
      id: 'ai',
      title: 'Chat with Tenvi AI',
      desc: 'Ask about cash flow or advice',
      icon: Bot,
      done: progress.aiConsulted,
      onClick: onOpenAi,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const percent = Math.round((completedCount / steps.length) * 100);

  if (dismissed || completedCount === steps.length) {
    return null;
  }

  const handleDismiss = async () => {
    setDismissed(true);
    await dismissOnboardingChecklistAction();
  };

  return (
    <div className="mb-6 p-5 sm:p-6 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl shadow-xl relative overflow-hidden border border-indigo-500/25">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-2xl border border-indigo-400/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white">
                Getting Started with Tenvi
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                {percent}% Ready
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Complete these {steps.length - completedCount} quick setup steps to unlock your full financial picture.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="hidden sm:inline-flex text-xs font-semibold px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition mr-1"
            >
              Quick Setup Wizard
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle launchpad"
            className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss launchpad"
            className="p-1.5 text-slate-400 hover:text-white transition rounded-lg hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-800/80 rounded-full h-2 mb-4 overflow-hidden relative z-10">
        <div
          className="bg-gradient-to-r from-indigo-400 to-emerald-400 h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Interactive Milestones */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
          {steps.map((step) => {
            const Icon = step.icon;
            const content = (
              <div
                className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-medium transition cursor-pointer group ${
                  step.done
                    ? 'bg-emerald-950/40 text-emerald-200 border border-emerald-500/30'
                    : 'bg-white/5 hover:bg-white/10 text-slate-100 border border-white/10 hover:border-indigo-400/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      step.done
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-300 group-hover:bg-indigo-500/30'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className={`font-semibold truncate ${step.done ? 'line-through text-slate-400' : 'text-white'}`}>
                      {step.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{step.desc}</p>
                  </div>
                </div>

                <div className="shrink-0 ml-2">
                  {step.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <div className="flex items-center text-slate-400 group-hover:text-indigo-300 transition">
                      <Circle className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );

            if (step.href) {
              return (
                <Link key={step.id} href={step.href}>
                  {content}
                </Link>
              );
            }

            return (
              <div key={step.id} onClick={step.onClick}>
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
