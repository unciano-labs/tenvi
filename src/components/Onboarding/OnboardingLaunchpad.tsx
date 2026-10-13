'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  X,
  Wallet,
  Receipt,
  CreditCard as CreditCardIcon,
  Bot,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Compass,
  Trophy,
} from 'lucide-react';
import { dismissOnboardingChecklistAction } from '@/app/actions/onboarding';
import { Badge } from '@/components/ui/badge';

interface LaunchpadProps {
  progress: {
    accountAdded: boolean;
    firstTransaction: boolean;
    cardOrLoanAdded: boolean;
    aiConsulted: boolean;
  };
  onOpenWizard?: () => void;
  onOpenAi?: () => void;
  onRecordExpense?: () => void;
  onStartTour?: () => void;
}

export function OnboardingLaunchpad({
  progress,
  onOpenWizard,
  onOpenAi,
  onRecordExpense,
  onStartTour,
}: LaunchpadProps) {
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const missions = [
    {
      id: 'account',
      title: '1. Create Your Wallet',
      desc: 'GCash, Maya, Bank, or Cash',
      proTip: 'Where your daily spending money lives',
      icon: Wallet,
      iconBg: 'bg-primary text-primary-foreground',
      done: progress.accountAdded,
      onClick: onOpenWizard,
      actionLabel: 'Setup Wallet',
    },
    {
      id: 'transaction',
      title: '2. Record First Expense',
      desc: 'Bought coffee, lunch, or a snack?',
      proTip: 'Tap to log an expense in 5 seconds',
      icon: Receipt,
      iconBg: 'bg-emerald-500 text-white',
      done: progress.firstTransaction,
      onClick: onRecordExpense,
      actionLabel: 'Log Expense',
    },
    {
      id: 'cardOrLoan',
      title: '3. Add Credit Card / Debt',
      desc: 'BPI, BDO, UnionBank, Spay, Loan',
      proTip: 'Track limits, statement cutoffs, and due dates',
      icon: CreditCardIcon,
      iconBg: 'bg-indigo-500 text-white',
      done: progress.cardOrLoanAdded,
      href: '/dashboard/cards',
      actionLabel: 'Open Cards',
    },
    {
      id: 'ai',
      title: '4. Ask Tenvi AI',
      desc: 'Ask: "How can I budget this month?"',
      proTip: 'Get instant insights on your spending',
      icon: Bot,
      iconBg: 'bg-amber-500 text-white',
      done: progress.aiConsulted,
      onClick: onOpenAi,
      actionLabel: 'Ask AI Copilot',
    },
  ];

  const completedCount = missions.filter((m) => m.done).length;
  const percent = Math.round((completedCount / missions.length) * 100);
  const allCompleted = completedCount === missions.length;
  const nextMission = missions.find((m) => !m.done);

  if (dismissed) {
    return null;
  }

  const handleDismiss = async () => {
    setDismissed(true);
    await dismissOnboardingChecklistAction();
  };

  // Solid Celebration banner when all missions are complete (Solid tone)
  if (allCompleted) {
    return (
      <div className="mb-6 p-5 sm:p-6 bg-slate-900 text-white rounded-3xl shadow-card animate-in fade-in duration-600 ease-out relative overflow-hidden">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <Trophy className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  All 4 Starter Missions Completed! 🏆
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                  100% Mastered
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Awesome job! You have unlocked your full personal financial command center.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onStartTour && (
              <button
                onClick={onStartTour}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition cursor-pointer active:scale-95"
              >
                <Compass className="w-4 h-4 text-slate-300" />
                Tour Again
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer active:scale-95"
              title="Dismiss banner"
              aria-label="Dismiss completion banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 sm:p-6 bg-card text-foreground rounded-3xl shadow-card transition-all duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-muted/60 text-foreground flex items-center justify-center shrink-0 shadow-xs">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                Starter Missions 🚀
              </h3>
              <Badge variant="neutral">
                Mission {completedCount} of {missions.length} Done ({percent}%)
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium">
              {nextMission ? (
                <>
                  <span className="text-foreground font-bold">Next Mission: </span>
                  {nextMission.desc}
                </>
              ) : (
                'Follow these simple steps to master your money!'
              )}
            </p>
          </div>
        </div>

        {/* Right Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onStartTour && (
            <button
              onClick={onStartTour}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition cursor-pointer active:scale-95"
            >
              <Compass className="w-3.5 h-3.5 text-muted-foreground" />
              Take 30s Tour
            </button>
          )}

          {onOpenWizard && (
            <button
              onClick={onOpenWizard}
              className="hidden sm:inline-flex text-xs font-bold px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground transition cursor-pointer active:scale-95"
            >
              Setup Wizard
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Toggle missions"
            className="p-2 text-muted-foreground hover:text-foreground transition rounded-xl hover:bg-muted active:scale-95 cursor-pointer"
          >
            {collapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>

          <button
            onClick={handleDismiss}
            aria-label="Dismiss missions"
            className="p-2 text-muted-foreground hover:text-foreground transition rounded-xl hover:bg-muted active:scale-95 cursor-pointer"
            title="Dismiss checklist"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar - Solid Slate */}
      <div className="w-full bg-muted/60 rounded-full h-2 mb-4 overflow-hidden">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Interactive 4 Mission Cards */}
      {!collapsed && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {missions.map((mission) => {
            const Icon = mission.icon;
            const isNext = !mission.done && mission.id === nextMission?.id;

            const cardContent = (
              <div
                className={`p-4 rounded-2xl flex items-center justify-between text-xs transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  mission.done
                    ? 'bg-emerald-50/70 text-emerald-950 shadow-none'
                    : isNext
                    ? 'bg-card ring-2 ring-primary shadow-card'
                    : 'bg-muted/60 hover:bg-muted/80 shadow-xs'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      mission.done ? 'bg-emerald-600 text-white' : mission.iconBg
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-sm font-bold truncate ${
                          mission.done
                            ? 'line-through text-muted-foreground font-medium'
                            : 'text-foreground font-extrabold'
                        }`}
                      >
                        {mission.title}
                      </p>
                      {isNext && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-primary text-primary-foreground shrink-0">
                          DO NEXT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {mission.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 ml-1">
                  {mission.done ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center animate-in zoom-in-75 duration-200 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                        isNext
                          ? 'text-primary bg-primary/10'
                          : 'text-muted-foreground bg-muted'
                      }`}
                    >
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  )}
                </div>
              </div>
            );

            if (mission.href) {
              return (
                <Link key={mission.id} href={mission.href}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <button
                key={mission.id}
                type="button"
                onClick={mission.onClick}
                className="w-full text-left"
              >
                {cardContent}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
