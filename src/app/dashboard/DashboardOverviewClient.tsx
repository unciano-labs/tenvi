'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  calculateNextDueDate,
  calculateOptimalCardToSwipe,
  calculateTrueNetWorth,
  formatMoney,
  formatDate,
} from '@/lib/finance/calculations';
import {
  Category,
  CreditCard,
  Transaction,
  Loan,
  BillSplit,
  SavingsAccount,
  Property,
  UserOnboarding,
  Liability,
} from '@/types';
import { PayTheseSoonPanel, DueSoonCardItem } from '@/components/Cards/PayTheseSoonPanel';
import { TailwindWelcomeBanner } from '@/components/Dashboard/TailwindWelcomeBanner';
import { TailwindTopCards } from '@/components/Dashboard/TailwindTopCards';
import { TailwindCashFlowChart } from '@/components/Dashboard/TailwindCashFlowChart';
import { TailwindAssetDonut } from '@/components/Dashboard/TailwindAssetDonut';
import { TailwindBestCard } from '@/components/Dashboard/TailwindBestCard';
import { TailwindRecentActivity } from '@/components/Dashboard/TailwindRecentActivity';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogBody,
} from '@/components/ui/responsive-dialog';
import { Landmark, ArrowRight, ShieldCheck, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

// Lazy-load heavier interactive modals to keep initial bundle ultra-fast
const TransactionModal = dynamic(
  () => import('@/components/Forms/TransactionModal').then((m) => m.TransactionModal),
  { ssr: false }
);
const WelcomeWizardModal = dynamic(
  () => import('@/components/Onboarding/WelcomeWizardModal').then((m) => m.WelcomeWizardModal),
  { ssr: false }
);
const DashboardTourSpotlight = dynamic(
  () => import('@/components/Onboarding/DashboardTourSpotlight').then((m) => m.DashboardTourSpotlight),
  { ssr: false }
);

interface DashboardOverviewClientProps {
  userName: string;
  categories: Category[];
  creditCards: CreditCard[];
  transactions: Transaction[];
  loans: Loan[];
  splits: BillSplit[];
  savings: SavingsAccount[];
  properties?: Property[];
  liabilities?: Liability[];
  initialOnboarding?: UserOnboarding | null;
}

export function DashboardOverviewClient({
  userName,
  categories,
  creditCards,
  transactions,
  loans,
  splits,
  savings,
  properties = [],
  liabilities = [],
  initialOnboarding,
}: DashboardOverviewClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardForModal, setSelectedCardForModal] = useState<string | undefined>(undefined);
  const [timeframe, setTimeframe] = useState<'month' | '30days' | '6months'>('month');
  const [isWizardOpen, setIsWizardOpen] = useState(
    Boolean(initialOnboarding && !initialOnboarding.completed)
  );
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isNetWorthModalOpen, setIsNetWorthModalOpen] = useState(false);

  const now = useMemo(() => new Date(), []);
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const todayISO = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }, [now]);

  // Comprehensive True Commercial Net Worth
  const netWorthBreakdown = useMemo(() => {
    return calculateTrueNetWorth({
      savings,
      loans,
      properties,
      creditCards,
      liabilities,
    });
  }, [savings, loans, properties, creditCards, liabilities]);

  // Current Month Primary Inflow / Outflow
  const currentMonthTransactions = useMemo(
    () => transactions.filter((t) => t.occurred_on.startsWith(currentMonthStr)),
    [transactions, currentMonthStr]
  );

  const totalIncome = useMemo(
    () =>
      currentMonthTransactions
        .filter((t) => t.kind === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [currentMonthTransactions]
  );

  const totalExpense = useMemo(
    () =>
      currentMonthTransactions
        .filter((t) => t.kind === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [currentMonthTransactions]
  );

  // Credit Card Recommendations & Due Dates
  const cardRecommendation = useMemo(() => {
    if (creditCards.length === 0) return null;
    return calculateOptimalCardToSwipe(creditCards, transactions, loans, now);
  }, [creditCards, transactions, loans, now]);

  const dueSoonCards = useMemo(() => {
    const items: DueSoonCardItem[] = [];
    creditCards.forEach((c) => {
      const dueInfo = calculateNextDueDate(c.due_day);
      if (dueInfo.daysRemaining <= 3) {
        const matchingRec = cardRecommendation?.rankedCards.find((r) => r.card.id === c.id);
        const amountDue = matchingRec?.totalUtilized || 0;
        if (amountDue > 0) {
          items.push({
            statementId: c.latest_statement?.id,
            cardId: c.id,
            cardName: c.name,
            bankName: c.bank_name,
            last4: c.last_4,
            dueDateFormatted: formatDate(dueInfo.nextDueDate),
            daysRemaining: dueInfo.daysRemaining,
            amountDue,
            urgency: dueInfo.daysRemaining < 0 ? 'overdue' : 'urgent',
          });
        }
      }
    });
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [creditCards, cardRecommendation]);

  // Cashflow Chart Data based on selected timeframe
  const chartData = useMemo(() => {
    if (timeframe === '6months') {
      const list = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('en-US', { month: 'short' });
        const mTx = transactions.filter((t) => t.occurred_on.startsWith(key));
        const income = mTx
          .filter((t) => t.kind === 'income')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expense = mTx
          .filter((t) => t.kind === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        list.push({
          date: label,
          inflow: income,
          outflow: expense,
        });
      }
      return list;
    }

    if (timeframe === '30days') {
      // 5-day intervals over past 30 days
      const list = [];
      for (let i = 5; i >= 0; i--) {
        const endDay = new Date(now);
        endDay.setDate(endDay.getDate() - i * 5);
        const startDay = new Date(endDay);
        startDay.setDate(startDay.getDate() - 4);

        const startISO = startDay.toISOString().split('T')[0];
        const endISO = endDay.toISOString().split('T')[0];
        const label = `${startDay.getDate()} - ${endDay.getDate()} ${endDay.toLocaleString('en-US', { month: 'short' })}`;

        const sliceTx = transactions.filter(
          (t) => t.occurred_on >= startISO && t.occurred_on <= endISO
        );
        const income = sliceTx
          .filter((t) => t.kind === 'income')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expense = sliceTx
          .filter((t) => t.kind === 'expense')
          .reduce((sum, t) => sum + Number(t.amount || 0), 0);

        list.push({
          date: label,
          inflow: income,
          outflow: expense,
        });
      }
      return list;
    }

    // Default 'month': Weekly chunks for comfortable, uncluttered reading
    const weeks = [
      { label: 'Week 1 (1-7)', start: 1, end: 7 },
      { label: 'Week 2 (8-14)', start: 8, end: 14 },
      { label: 'Week 3 (15-21)', start: 15, end: 21 },
      { label: 'Week 4 (22-28)', start: 22, end: 28 },
      { label: 'Week 5 (29+)', start: 29, end: 31 },
    ];

    return weeks.map((w) => {
      const weekTx = currentMonthTransactions.filter((t) => {
        const day = parseInt(t.occurred_on.split('-')[2] || '0', 10);
        return day >= w.start && day <= w.end;
      });

      const income = weekTx
        .filter((t) => t.kind === 'income')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const expense = weekTx
        .filter((t) => t.kind === 'expense')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      return {
        date: w.label,
        inflow: income,
        outflow: expense,
      };
    });
  }, [timeframe, now, transactions, currentMonthTransactions]);

  const handleOpenTransactionModal = (cardId?: string) => {
    setSelectedCardForModal(cardId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-7 animate-in fade-in duration-150">
      {/* 1. Welcome Greeting Banner with Quick Record Action */}
      <TailwindWelcomeBanner
        userName={userName}
        onNewTransaction={() => handleOpenTransactionModal()}
        onStartTour={() => setIsTourOpen(true)}
      />

      {/* 2. Critical Alert: Cards Due Soon (Hidden if zero debt due) */}
      {dueSoonCards.length > 0 && (
        <PayTheseSoonPanel dueSoonCards={dueSoonCards} />
      )}

      {/* 3. Top KPI Cards: Net Worth, Inflow, Outflow, Net Savings */}
      <TailwindTopCards
        netWorth={netWorthBreakdown.netWorth}
        totalAssets={netWorthBreakdown.totalAssets}
        totalLiabilities={netWorthBreakdown.totalLiabilities}
        monthlyInflow={totalIncome}
        monthlyOutflow={totalExpense}
        onOpenNetWorthModal={() => setIsNetWorthModalOpen(true)}
      />

      {/* 4. Middle Section: Cash Flow Chart (8 cols) + Asset Donut (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8">
          <TailwindCashFlowChart
            data={chartData}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            totalInflow={totalIncome}
            totalOutflow={totalExpense}
          />
        </div>
        <div className="lg:col-span-4">
          <TailwindAssetDonut
            totalAssets={netWorthBreakdown.totalAssets}
            cashAmount={netWorthBreakdown.liquidSavings}
            propertyAmount={netWorthBreakdown.fixedAssets}
            receivablesAmount={netWorthBreakdown.receivables}
          />
        </div>
      </div>

      {/* 5. Bottom Section: Best Card Recommendation (6 cols) + Recent Activity Timeline (6 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6">
          <TailwindBestCard
            optimalData={cardRecommendation}
            creditCards={creditCards}
            onAddPurchaseClick={handleOpenTransactionModal}
          />
        </div>
        <div className="lg:col-span-6">
          <TailwindRecentActivity
            transactions={transactions}
          />
        </div>
      </div>

      {/* Lazy Modals: New Transaction */}
      {isModalOpen && (
        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCardForModal(undefined);
          }}
          categories={categories}
          creditCards={creditCards}
          savingsAccounts={savings}
          properties={properties}
          defaultCreditCardId={selectedCardForModal}
        />
      )}

      {/* Lazy Modals: First-Run Onboarding Wizard */}
      <WelcomeWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        userName={userName}
        onCompleteWithTour={() => {
          setIsWizardOpen(false);
          setIsTourOpen(true);
        }}
      />

      {/* Lazy Modals: Guided Feature Spotlight Tour */}
      <DashboardTourSpotlight
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* Net Worth Balance Sheet Detail Dialog */}
      <ResponsiveDialog open={isNetWorthModalOpen} onOpenChange={setIsNetWorthModalOpen}>
        <ResponsiveDialogContent className="sm:max-w-2xl p-0 overflow-hidden">
          <ResponsiveDialogHeader className="p-6 pb-2">
            <ResponsiveDialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Landmark className="size-5 text-primary" />
              <span>True Net Worth Balance Sheet</span>
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription className="text-xs">
              Everything you own minus everything you owe.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="p-6 pt-2 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Assets Column */}
              <div className="space-y-3 p-4 rounded-xl bg-lightsuccess/50 border border-success/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-success">
                    What You Own (Assets)
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatMoney(netWorthBreakdown.totalAssets)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Bank Accounts & Cash</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(netWorthBreakdown.liquidSavings)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Money Owed to You</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(netWorthBreakdown.receivables)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Properties & Vehicles</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(netWorthBreakdown.fixedAssets)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Liabilities Column */}
              <div className="space-y-3 p-4 rounded-xl bg-lighterror/50 border border-danger/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-danger">
                    What You Owe (Debts)
                  </span>
                  <span className="text-sm font-bold text-foreground">
                    {formatMoney(netWorthBreakdown.totalLiabilities)}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Credit Card Balances</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(netWorthBreakdown.creditCardBalances)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Loans & Mortgages</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(netWorthBreakdown.longTermLiabilities)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Summary Pill */}
            <div className="p-4 rounded-xl bg-muted/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-2xs">
                  Assets ({formatMoney(netWorthBreakdown.totalAssets)}) − Debts ({formatMoney(netWorthBreakdown.totalLiabilities)})
                </span>
                <span className="text-base font-bold text-foreground">
                  Net Worth: {formatMoney(netWorthBreakdown.netWorth)}
                </span>
              </div>
              <Badge variant={netWorthBreakdown.netWorth >= 0 ? 'success' : 'warning'} className="font-bold text-xs uppercase self-start sm:self-auto">
                Debt-to-Asset: {netWorthBreakdown.debtToAssetRatio}%
              </Badge>
            </div>
          </ResponsiveDialogBody>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
}
