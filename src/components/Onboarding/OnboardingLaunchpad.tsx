'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
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
  Sparkles,
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
      title: 'Bank or E-Wallet',
      desc: 'Add GCash, Maya, Bank, or Cash',
      icon: Wallet,
      iconBg: 'bg-blue-600 text-white',
      done: progress.accountAdded,
      href: '/dashboard/savings',
    },
    {
      id: 'transaction',
      title: 'Record an Expense',
      desc: 'Type an entry or snap a receipt',
      icon: Receipt,
      iconBg: 'bg-amber-600 text-white',
      done: progress.firstTransaction,
      href: '/dashboard/transactions',
    },
    {
      id: 'card',
      title: 'Credit Card or Loan',
      desc: 'Track due dates & avoid late fees',
      icon: CreditCardIcon,
      iconBg: 'bg-slate-800 text-white',
      done: progress.cardOrLoanAdded,
      href: '/dashboard/cards',
    },
    {
      id: 'ai',
      title: 'Ask Tenvi AI',
      desc: 'Get friendly financial answers',
      icon: Bot,
      iconBg: 'bg-purple-600 text-white',
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
    <div className="mb-6 p-5 sm:p-6 bg-white text-slate-900 rounded-3xl shadow-sm border-2 border-slate-200 transition-all duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Getting Started Checklist
              </h3>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                {completedCount} of {steps.length} Completed ({percent}%)
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Follow these simple steps to set up your finances. Tap any step to get started!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="hidden sm:inline-flex text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition active:scale-95"
            >
              Setup Wizard
            </button>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle launchpad"
            className="p-2 text-slate-500 hover:text-slate-800 transition rounded-xl hover:bg-slate-100 active:scale-95"
          >
            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss launchpad"
            className="p-2 text-slate-400 hover:text-slate-700 transition rounded-xl hover:bg-slate-100 active:scale-95"
            title="Dismiss checklist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Solid High-Contrast Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-4 overflow-hidden border border-slate-200/80">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Interactive Milestones */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const content = (
              <div
                className={`p-4 rounded-2xl border-2 flex items-center justify-between text-xs transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  step.done
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-none'
                    : 'bg-slate-50 hover:bg-white border-slate-200 hover:border-indigo-400 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      step.done ? 'bg-emerald-600 text-white' : step.iconBg
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold truncate ${
                        step.done ? 'line-through text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-600 truncate mt-0.5">
                      {step.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-1">
                  {step.done ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center animate-in zoom-in-75 duration-200">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 flex items-center justify-center text-slate-400 group-hover:border-indigo-600 transition-colors">
                      <ArrowRight className="w-3.5 h-3.5" />
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
