'use client';

import React, { useState } from 'react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { Sparkles, CreditCard, Car, CalendarClock, ArrowRight } from 'lucide-react';

interface PromptScenario {
  id: string;
  icon: typeof CreditCard;
  tabLabel: string;
  userPrompt: string;
  aiResponse: {
    title: string;
    metrics?: Array<{ label: string; value: string; highlight?: boolean }>;
    body: string;
    actionTip?: string;
  };
}

const SCENARIOS: PromptScenario[] = [
  {
    id: 'cards',
    icon: CreditCard,
    tabLabel: 'Credit Card Optimizer',
    userPrompt: 'Which credit card should I use for a ₱15,000 electronics purchase today?',
    aiResponse: {
      title: 'Recommendation: BDO Titanium Mastercard',
      metrics: [
        { label: 'Interest-Free Float', value: '52 Days', highlight: true },
        { label: 'Available Limit', value: '₱145,000' },
        { label: 'Utilization After', value: '18% (Optimal)' },
      ],
      body: 'Your BDO Titanium statement cut off yesterday. Charging today gives you maximum interest-free cash float until your payment due date next month.',
      actionTip: 'Pro-tip: Avoid using your Citi card today — its cutoff is in 36 hours, leaving only 20 days until payment.',
    },
  },
  {
    id: 'fleet',
    icon: Car,
    tabLabel: 'Fleet & Asset Cash Flow',
    userPrompt: "How did my 3 transport vehicle units perform this month?",
    aiResponse: {
      title: 'Monthly Fleet Cash Flow Performance',
      metrics: [
        { label: 'Gross Boundary', value: '₱78,500' },
        { label: 'Maintenance & Fuel', value: '₱14,200' },
        { label: 'Net Cash Flow', value: '+₱64,300', highlight: true },
      ],
      body: 'All 3 units hit 94% uptime target. Unit 1 led with ₱28,000 gross collections, followed by Unit 3 with ₱26,500.',
      actionTip: 'Action Required: Unit 2 LTO registration & emission inspection is due in 14 days.',
    },
  },
  {
    id: 'commitments',
    icon: CalendarClock,
    tabLabel: 'Run-Rate & Obligations',
    userPrompt: 'What are my total fixed obligations and amortizations for next month?',
    aiResponse: {
      title: 'Upcoming Monthly Run-Rate Summary',
      metrics: [
        { label: 'Loan Amortization', value: '₱34,500' },
        { label: 'Insurance Reserve', value: '₱6,200' },
        { label: 'Total Obligations', value: '₱58,400', highlight: true },
      ],
      body: 'Your obligations are fully covered by projected passive rental and boundary inflows (₱82,000 expected, providing 1.4x coverage ratio).',
      actionTip: 'Automated reserve transfer of ₱6,200 will be allocated to your Annual Insurance Vault on the 1st.',
    },
  },
];

export function AiChatDemo() {
  const [activeTab, setActiveTab] = useState<string>('cards');
  const currentScenario = SCENARIOS.find((s) => s.id === activeTab) || SCENARIOS[0];
  const Icon = currentScenario.icon;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl bg-card/90 dark:bg-card/80 border border-border/70 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Top Demo Bar / Prompt Switcher */}
      <div className="p-3 sm:p-4 bg-muted/40 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="relative">
            <TenviIcon variant="solid" className="w-6 h-6 rounded-lg shadow-2xs" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Sparkles className="w-1.5 h-1.5" />
            </span>
          </div>
          <span className="text-xs font-bold text-foreground">Interactive AI Copilot Preview</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {SCENARIOS.map((scenario) => {
            const TabIcon = scenario.icon;
            const isActive = scenario.id === activeTab;
            return (
              <button
                key={scenario.id}
                type="button"
                onClick={() => setActiveTab(scenario.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none shrink-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{scenario.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Simulated Chat Interface */}
      <div className="p-5 sm:p-8 space-y-6">
        {/* User Prompt */}
        <div className="flex items-start justify-end gap-3">
          <div className="max-w-md bg-primary/10 dark:bg-primary/20 border border-primary/20 text-foreground px-4 py-3 rounded-2xl rounded-tr-xs shadow-2xs">
            <p className="text-xs sm:text-sm font-medium leading-relaxed">
              &quot;{currentScenario.userPrompt}&quot;
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold text-muted-foreground">
            You
          </div>
        </div>

        {/* Tenvi AI Response */}
        <div className="flex items-start gap-3">
          <div className="relative shrink-0 mt-0.5">
            <TenviIcon variant="solid" className="w-8 h-8 rounded-xl shadow-xs" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Sparkles className="w-2 h-2" />
            </span>
          </div>

          <div className="flex-1 max-w-2xl bg-muted/50 border border-border/50 rounded-2xl rounded-tl-xs p-4 sm:p-5 space-y-4 shadow-xs">
            {/* AI Response Header & Tag */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-border/40">
              <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-primary" />
                {currentScenario.aiResponse.title}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                Live Data Verified
              </span>
            </div>

            {/* Metrics Grid */}
            {currentScenario.aiResponse.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {currentScenario.aiResponse.metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border ${
                      metric.highlight
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-background/80 border-border/50 text-foreground'
                    }`}
                  >
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {metric.label}
                    </div>
                    <div className="text-xs sm:text-sm font-bold mt-0.5">
                      {metric.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Body Explanation */}
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal">
              {currentScenario.aiResponse.body}
            </p>

            {/* Action Tip */}
            {currentScenario.aiResponse.actionTip && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">
                  {currentScenario.aiResponse.actionTip}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
