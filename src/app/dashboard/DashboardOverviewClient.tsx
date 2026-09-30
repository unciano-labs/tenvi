'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard as CardIcon,
  HandCoins,
  Receipt,
  Plus,
  Calendar,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  PieChart,
  BarChart3,
  Flame,
  Sparkles,
  Clock,
  ChevronRight,
  ShieldCheck,
  Activity,
  Layers,
} from 'lucide-react';
import { StatCard } from '@/components/UI/StatCard';
import { TransactionModal } from '@/components/Forms/TransactionModal';
import {
  formatMoney,
  formatDate,
  calculateNextDueDate,
  calculateOptimalCardToSwipe,
  calculatePropertyFinancials,
  calculateInsuranceRenewal,
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
} from '@/types';
import { OnboardingLaunchpad } from '@/components/Onboarding/OnboardingLaunchpad';
import { WelcomeWizardModal } from '@/components/Onboarding/WelcomeWizardModal';
import { DashboardTourSpotlight } from '@/components/Onboarding/DashboardTourSpotlight';

interface DashboardOverviewClientProps {
  userName: string;
  categories: Category[];
  creditCards: CreditCard[];
  transactions: Transaction[];
  loans: Loan[];
  splits: BillSplit[];
  savings: SavingsAccount[];
  properties?: Property[];
  initialOnboarding?: UserOnboarding | null;
}


const CATEGORY_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-emerald-700', hex: '#10B981' },
  { bg: 'bg-indigo-500', text: 'text-indigo-700', hex: '#6366F1' },
  { bg: 'bg-amber-500', text: 'text-amber-700', hex: '#F59E0B' },
  { bg: 'bg-rose-500', text: 'text-rose-700', hex: '#F43F5E' },
  { bg: 'bg-cyan-500', text: 'text-cyan-700', hex: '#06B6D4' },
  { bg: 'bg-purple-500', text: 'text-purple-700', hex: '#A855F7' },
  { bg: 'bg-blue-500', text: 'text-blue-700', hex: '#3B82F6' },
  { bg: 'bg-orange-500', text: 'text-orange-700', hex: '#F97316' },
  { bg: 'bg-pink-500', text: 'text-pink-700', hex: '#EC4899' },
  { bg: 'bg-slate-500', text: 'text-slate-700', hex: '#64748B' },
];

export function DashboardOverviewClient({
  userName,
  categories,
  creditCards,
  transactions,
  loans,
  splits,
  savings,
  properties = [],
  initialOnboarding,
}: DashboardOverviewClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardForModal, setSelectedCardForModal] = useState<string | undefined>(undefined);
  const [timeframe, setTimeframe] = useState<'month' | '30days' | '6months'>('month');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(
    Boolean(initialOnboarding && !initialOnboarding.completed)
  );
  const [isTourOpen, setIsTourOpen] = useState(false);

  const onboardingProgress = useMemo(() => {
    return {
      accountAdded:
        Boolean(initialOnboarding?.has_added_account) ||
        (savings.length > 0 &&
          (savings.length > 1 ||
            savings.some((s) => Number(s.current_balance) > 0))),
      firstTransaction:
        Boolean(initialOnboarding?.has_added_transaction) || transactions.length > 0,
      cardOrLoanAdded:
        Boolean(initialOnboarding?.has_added_card_or_loan) ||
        creditCards.length > 0 ||
        loans.length > 0,
      aiConsulted: Boolean(initialOnboarding?.has_tried_ai),
    };
  }, [initialOnboarding, savings, transactions, creditCards, loans]);

  const handleOpenAi = () => {
    window.dispatchEvent(new CustomEvent('open-tenvi-ai-chat'));
  };

  const now = useMemo(() => new Date(), []);
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const daysPassedInMonth = Math.max(1, now.getDate());

  const todayISO = useMemo(() => {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }, [now]);

  // 1. Filter transactions according to selected timeframe (excluding future dates)
  const filteredTransactions = useMemo(() => {
    if (timeframe === 'month') {
      return transactions.filter(
        (t) => t.occurred_on.startsWith(currentMonthStr) && t.occurred_on <= todayISO
      );
    }
    if (timeframe === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoCutoff = thirtyDaysAgo.toISOString().split('T')[0];
      return transactions.filter((t) => t.occurred_on >= isoCutoff && t.occurred_on <= todayISO);
    }
    // 6months
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const isoCutoff = sixMonthsAgo.toISOString().split('T')[0];
    return transactions.filter((t) => t.occurred_on >= isoCutoff && t.occurred_on <= todayISO);
  }, [transactions, timeframe, currentMonthStr, now, todayISO]);

  // Recent non-future transactions sorted from current date to oldest
  const recentTransactions = useMemo(() => {
    return transactions
      .filter((t) => t.occurred_on <= todayISO)
      .sort((a, b) => {
        if (b.occurred_on !== a.occurred_on) {
          return b.occurred_on.localeCompare(a.occurred_on);
        }
        return (
          new Date(b.created_at || b.occurred_on).getTime() -
          new Date(a.created_at || a.occurred_on).getTime()
        );
      });
  }, [transactions, todayISO]);

  // Current Month Primary Metrics
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

  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.min(100, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Total Savings Vaults & Cash
  const totalSavings = useMemo(
    () => savings.reduce((sum, a) => sum + Number(a.current_balance || 0), 0),
    [savings]
  );

  // Total Money Owed to User (Active loans balance + unpaid splits)
  const totalLoanBalance = useMemo(
    () => loans.reduce((sum, l) => sum + Number(l.balance_remaining || 0), 0),
    [loans]
  );

  const totalUnpaidSplits = useMemo(
    () =>
      splits.reduce((sum, s) => {
        const unpaidShares = (s.participants || [])
          .filter((p) => !p.is_paid)
          .reduce((sub, p) => sub + Number(p.share_amount || 0), 0);
        return sum + unpaidShares;
      }, 0),
    [splits]
  );

  const totalOwedToYou = totalLoanBalance + totalUnpaidSplits;

  // Financial Health Metrics
  const averageDailyBurn = Math.round(totalExpense / daysPassedInMonth);
  const emergencyRunwayMonths =
    totalExpense > 0 ? (totalSavings / totalExpense).toFixed(1) : totalSavings > 0 ? '12+' : '0';

  // Credit Cards Portfolio Health & Optimal Card
  const totalCreditLimit = useMemo(
    () => creditCards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0),
    [creditCards]
  );

  const cardDueDates = useMemo(
    () =>
      creditCards
        .map((c) => ({
          ...c,
          dueInfo: calculateNextDueDate(c.due_day),
        }))
        .sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining),
    [creditCards]
  );

  const criticalCards = useMemo(
    () => cardDueDates.filter((c) => c.dueInfo.urgency === 'critical' || c.dueInfo.urgency === 'warning'),
    [cardDueDates]
  );

  const cardRecommendation = useMemo(() => {
    if (creditCards.length === 0) return null;
    return calculateOptimalCardToSwipe(creditCards, transactions, loans, now);
  }, [creditCards, transactions, loans, now]);

  const totalUtilizedCredit = useMemo(() => {
    if (!cardRecommendation) return 0;
    return cardRecommendation.rankedCards.reduce((sum, r) => sum + r.totalUtilized, 0);
  }, [cardRecommendation]);

  const overallCreditUtilization =
    totalCreditLimit > 0
      ? Math.min(100, Math.round((totalUtilizedCredit / totalCreditLimit) * 100))
      : 0;

  // 2. 6-Month Historical Cashflow Trend Chart Data
  const sixMonthsTrend = useMemo(() => {
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
        key,
        label,
        income,
        expense,
        net: income - expense,
      });
    }
    return list;
  }, [transactions, now]);

  const maxTrendValue = useMemo(() => {
    const maxVal = Math.max(...sixMonthsTrend.map((m) => Math.max(m.income, m.expense)), 1000);
    return Math.ceil(maxVal * 1.15);
  }, [sixMonthsTrend]);

  // 3. Category Distribution Matrix (Based on current active timeframe)
  const categoryMatrix = useMemo(() => {
    const periodExpenses = filteredTransactions.filter((t) => t.kind === 'expense');
    const periodTotalExpense = periodExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const map = new Map<string, { name: string; amount: number; count: number }>();

    for (const t of periodExpenses) {
      const name = t.category?.name || 'Other Expense';
      const existing = map.get(name) || { name, amount: 0, count: 0 };
      existing.amount += Number(t.amount || 0);
      existing.count += 1;
      map.set(name, existing);
    }

    return Array.from(map.values())
      .map((item, idx) => ({
        ...item,
        percentage: periodTotalExpense > 0 ? Math.round((item.amount / periodTotalExpense) * 100) : 0,
        color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredTransactions]);

  // 4. Properties & Fleet Portfolio Metrics
  const propertiesFinancials = useMemo(() => {
    if (properties.length === 0) return null;

    const totalPortfolioValue = properties.reduce(
      (sum, p) => sum + Number(p.estimated_value || 0),
      0
    );

    let totalMonthlyCommitments = 0;
    let totalExpectedIncomeMonthly = 0;
    const propertyOverviews = [];

    for (const prop of properties) {
      const fin = calculatePropertyFinancials(prop, transactions);
      totalMonthlyCommitments += fin.monthlyCommitment;
      totalExpectedIncomeMonthly += fin.expectedMonthlyIncome;
      propertyOverviews.push({
        property: prop,
        financials: fin,
      });
    }

    return {
      totalPortfolioValue,
      totalMonthlyCommitments,
      totalExpectedIncomeMonthly,
      propertyOverviews,
    };
  }, [properties, transactions]);

  // Quick Action to preselect card in modal
  const handleSwipeWithCard = (cardId: string) => {
    setSelectedCardForModal(cardId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Onboarding Launchpad Checklist */}
      {(!initialOnboarding || !initialOnboarding.dismissed_checklist) && (
        <OnboardingLaunchpad
          progress={onboardingProgress}
          onOpenWizard={() => setIsWizardOpen(true)}
          onOpenAi={handleOpenAi}
          onRecordExpense={() => {
            setSelectedCardForModal(undefined);
            setIsModalOpen(true);
          }}
          onStartTour={() => setIsTourOpen(true)}
        />
      )}

      {/* First-Run Welcome Wizard Modal */}
      <WelcomeWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        userName={userName}
        onCompleteWithTour={() => {
          setIsWizardOpen(false);
          setIsTourOpen(true);
        }}
      />

      {/* Interactive Guided Tour Spotlight */}
      <DashboardTourSpotlight
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* 1. Header with Timeframe Filter & Quick Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Kumusta, {userName}! 👋
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <Sparkles className="w-3 h-3" />
              Live Financial Matrix
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time financial command center for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          {/* Timeframe Selector Pill */}
          <div className="bg-white p-1 rounded-2xl shadow-sm flex items-center gap-1 text-xs font-semibold text-slate-600 max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setTimeframe('month')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeframe === 'month'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('30days')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeframe === '30days'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setTimeframe('6months')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                timeframe === '6months'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              6 Months
            </button>
          </div>

          <button
            data-tour="record-button"
            onClick={() => {
              setSelectedCardForModal(undefined);
              setIsModalOpen(true);
            }}
            className="bili-btn-primary py-2.5 px-4 text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 flex-1 sm:flex-initial cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Record Transaction
          </button>
        </div>
      </div>

      {/* 2. Critical Alert Banner (if upcoming bills due <= 5 days) */}
      {criticalCards.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50 text-amber-900 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-amber-950">
                Payment Deadline Alert
              </h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900">
                {criticalCards.length} {criticalCards.length === 1 ? 'card' : 'cards'} urgent
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {criticalCards.map((card) => (
                <span
                  key={card.id}
                  className="inline-flex items-center justify-between sm:justify-start gap-2 px-3 py-1.5 rounded-xl bg-white shadow-xs font-medium w-full sm:w-auto"
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <CardIcon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                    <span className="font-bold text-slate-900 truncate">
                      {card.bank_name} {card.name}:
                    </span>
                  </span>
                  <span className="text-rose-600 font-extrabold shrink-0">
                    {card.dueInfo.label}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/dashboard/cards"
            className="text-xs font-bold text-amber-900 hover:underline shrink-0 self-center hidden sm:block"
          >
            View Credit Cards →
          </Link>
        </div>
      )}

      {/* 3. Primary Wealth & Cashflow Matrix (4 Borderless Tonal StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          dataTour="savings-card"
          label="Total Liquid Savings"
          value={formatMoney(totalSavings)}
          subtext={`${savings.length} active cash vaults`}
          icon={PiggyBank}
          variant="positive"
        />

        <StatCard
          label="Money In This Month"
          value={formatMoney(totalIncome)}
          subtext={`${currentMonthTransactions.filter((t) => t.kind === 'income').length} income records`}
          icon={ArrowDownLeft}
          variant="positive"
        />

        <StatCard
          label="Money Out This Month"
          value={formatMoney(totalExpense)}
          subtext={`Avg. ${formatMoney(averageDailyBurn)}/day burn`}
          icon={ArrowUpRight}
          variant="negative"
        />

        <StatCard
          dataTour="cashflow-card"
          label="Net Savings & Health"
          value={`${netSavings >= 0 ? '+' : ''}${formatMoney(netSavings)}`}
          subtext={`${savingsRate}% savings retention rate`}
          icon={netSavings >= 0 ? TrendingUp : TrendingDown}
          variant={netSavings >= 0 ? 'positive' : 'negative'}
        />
      </div>

      {/* 4. Financial Health & Runway Matrix Bar (3 Tonal Sub-Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Emergency Living Runway */}
        <div className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Emergency Runway
              </span>
              <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded-full bg-emerald-50">
                {Number(emergencyRunwayMonths) >= 3 ? 'Safe Buffer' : 'Build Buffer'}
              </span>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {emergencyRunwayMonths} Months
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Based on monthly burn of {formatMoney(totalExpense)}
            </p>
          </div>
        </div>

        {/* Credit Utilization Meter */}
        <div className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
            <CardIcon className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Credit Utilization
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  overallCreditUtilization <= 30
                    ? 'bg-emerald-50 text-emerald-700'
                    : overallCreditUtilization <= 50
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700'
                }`}
              >
                {overallCreditUtilization}% Used
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-extrabold text-slate-900">
                {formatMoney(totalUtilizedCredit)}
              </p>
              <span className="text-xs text-slate-400">
                / {formatMoney(totalCreditLimit)}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallCreditUtilization <= 30
                    ? 'bg-emerald-500'
                    : overallCreditUtilization <= 50
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, overallCreditUtilization)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Outstanding Receivables / Owed to You */}
        <div className="bg-white rounded-3xl p-6 shadow-sm overflow-hidden min-w-0 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <HandCoins className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Owed To You
              </span>
              <Link
                href="/dashboard/receivables"
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                View Hub →
              </Link>
            </div>
            <p className="text-xl font-extrabold text-slate-900 mt-1">
              {formatMoney(totalOwedToYou)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {loans.filter((l) => l.status !== 'paid').length} active loans • {splits.length} shared bills
            </p>
          </div>
        </div>
      </div>

      {/* 5. "Best Card to Swipe Today" Featured Recommendation Box */}
      {(() => {
        const bestCard = cardRecommendation?.bestCard;
        if (!bestCard) return null;
        return (
          <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm overflow-hidden min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    ⭐ Best Card to Swipe Today
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    {bestCard.floatDays} Days Interest-Free Runway
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-slate-900 mt-1.5 flex items-center gap-2">
                  {bestCard.card.bank_name}{' '}
                  {bestCard.card.name}
                  <span className="text-xs font-mono font-medium text-slate-400">
                    •••• {bestCard.card.last_4}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">
                  {bestCard.advice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center shrink-0">
              <button
                onClick={() => handleSwipeWithCard(bestCard.card.id)}
                className="px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Swipe With This Card
              </button>
              <Link
                href={`/dashboard/cards/${bestCard.card.id}`}
                className="px-4 py-2.5 rounded-2xl bg-[#F6F7F9] text-slate-700 text-xs font-bold hover:bg-slate-200/70 transition-colors"
              >
                Card Cycles →
              </Link>
            </div>
          </div>
        );
      })()}

      {/* 6. Interactive Visual Charts Section (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A: 6-Month Cash Flow Trend (Interactive SVG Bar Chart) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    6-Month Cash Flow Trend
                  </h3>
                  <p className="text-xs text-slate-500">
                    Income vs Expense monthly dynamics
                  </p>
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Inflow
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  Outflow
                </span>
              </div>
            </div>

            {/* Micro Stats Bar */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 p-2.5 sm:p-3 rounded-2xl bg-[#F6F7F9] mb-6 text-center">
              <div>
                <p className="text-xs uppercase font-semibold text-slate-400 truncate">
                  Avg. Inflow
                </p>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">
                  {formatMoney(
                    sixMonthsTrend.reduce((s, m) => s + m.income, 0) / sixMonthsTrend.length
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-slate-400 truncate">
                  Avg. Outflow
                </p>
                <p className="text-xs font-extrabold text-slate-900 mt-0.5 truncate">
                  {formatMoney(
                    sixMonthsTrend.reduce((s, m) => s + m.expense, 0) / sixMonthsTrend.length
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-slate-400 truncate">
                  Net 6-Mo
                </p>
                <p className="text-xs font-extrabold text-emerald-700 mt-0.5 truncate">
                  +{formatMoney(
                    Math.max(0, sixMonthsTrend.reduce((s, m) => s + m.net, 0))
                  )}
                </p>
              </div>
            </div>

            {/* SVG Visual Bars */}
            <div className="h-48 w-full flex items-end justify-between gap-2 pt-6 pb-2 px-1 relative">
              {sixMonthsTrend.map((m, idx) => {
                const incomeHeight = Math.max(4, Math.round((m.income / maxTrendValue) * 100));
                const expenseHeight = Math.max(4, Math.round((m.expense / maxTrendValue) * 100));
                const isHovered = hoveredBarIndex === idx;

                return (
                  <div
                    key={m.key}
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                  >
                    {/* Tooltip Overlay */}
                    {isHovered && (
                      <div className="absolute -top-14 z-20 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-lg whitespace-nowrap animate-in fade-in duration-100 pointer-events-none left-1/2 -translate-x-1/2">
                        <p className="font-bold text-center text-slate-200">
                          {m.label} ({m.key})
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-emerald-400 font-semibold">
                            +{formatMoney(m.income)}
                          </span>
                          <span className="text-rose-400 font-semibold">
                            -{formatMoney(m.expense)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Dual Columns (Income & Expense) */}
                    <div className="w-full flex items-end justify-center gap-1.5 h-full">
                      <div
                        className="w-full max-w-[16px] bg-emerald-500 rounded-t-md transition-all duration-200 hover:brightness-110"
                        style={{ height: `${incomeHeight}%` }}
                        title={`Inflow: ${formatMoney(m.income)}`}
                      />
                      <div
                        className="w-full max-w-[16px] bg-rose-500 rounded-t-md transition-all duration-200 hover:brightness-110"
                        style={{ height: `${expenseHeight}%` }}
                        title={`Outflow: ${formatMoney(m.expense)}`}
                      />
                    </div>

                    {/* Month Label */}
                    <span
                      className={`text-xs mt-2 font-semibold transition-colors ${
                        isHovered ? 'text-slate-900 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 text-xs text-slate-400 text-center flex items-center justify-center gap-1">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            Hover over any monthly bar to inspect detailed cash in vs cash out
          </div>
        </div>

        {/* Chart B: Category Expense Breakdown Matrix */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Expense Distribution Matrix
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category spending breakdown ({timeframe === 'month' ? 'This Month' : timeframe === '30days' ? 'Last 30 Days' : 'Last 6 Months'})
                  </p>
                </div>
              </div>

              <span className="text-xs font-extrabold text-slate-900 px-3 py-1 rounded-full bg-[#F6F7F9]">
                {categoryMatrix.length} Categories
              </span>
            </div>

            {/* Multi-Segment Proportional Progress Bar */}
            {categoryMatrix.length > 0 && (
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 my-4 shadow-xs">
                {categoryMatrix.map((cat, i) => (
                  <div
                    key={cat.name}
                    className={`${cat.color.bg} transition-all duration-300 hover:opacity-85`}
                    style={{ width: `${cat.percentage}%` }}
                    title={`${cat.name}: ${cat.percentage}% (${formatMoney(cat.amount)})`}
                  />
                ))}
              </div>
            )}

            {/* Category Rows Table / List */}
            {categoryMatrix.length === 0 ? (
              <div className="p-8 text-center bg-[#F6F7F9] rounded-2xl my-4">
                <p className="text-xs text-slate-500 mb-2">
                  No expense transactions logged in this timeframe.
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs font-semibold text-slate-900 underline"
                >
                  Log an expense to view distribution
                </button>
              </div>
            ) : (
              <div className="space-y-3 mt-4 max-h-56 overflow-y-auto pr-1">
                {categoryMatrix.slice(0, 5).map((cat) => (
                  <div
                    key={cat.name}
                    className="p-3 rounded-2xl bg-[#F6F7F9] hover:bg-slate-200/60 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`w-3 h-3 rounded-full ${cat.color.bg} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {cat.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {cat.count} {cat.count === 1 ? 'transaction' : 'transactions'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-slate-900">
                        {formatMoney(cat.amount)}
                      </p>
                      <span className="text-xs font-semibold text-slate-500">
                        {cat.percentage}% of total
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 text-xs text-slate-400 flex items-center justify-between">
            <span>Ranked by highest spending</span>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-bold text-slate-700 hover:underline flex items-center gap-1"
            >
              All Transactions →
            </Link>
          </div>
        </div>
      </div>

      {/* 7. Properties & Asset Fleet Snapshot (if properties are tracked) */}
      {propertiesFinancials && properties.length > 0 && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Properties & Fleet Management
                </h3>
                <p className="text-xs text-slate-500">
                  Vehicles, real estate, rental revenue & fixed run-rate obligations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {properties.length} Assets Tracked
              </span>
              <Link
                href="/dashboard/properties"
                className="text-xs font-bold text-amber-800 hover:underline flex items-center gap-1"
              >
                Portfolio Hub →
              </Link>
            </div>
          </div>

          {/* Properties KPI Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-2xl bg-[#F6F7F9]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Fleet Valuation
              </span>
              <p className="text-lg font-extrabold text-slate-900 mt-1">
                {formatMoney(propertiesFinancials.totalPortfolioValue)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#F6F7F9]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Monthly Fixed Run-Rate
              </span>
              <p className="text-lg font-extrabold text-rose-600 mt-1">
                {formatMoney(propertiesFinancials.totalMonthlyCommitments)}
              </p>
              <span className="text-xs text-slate-400">
                Amortizations + insurance reserve
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-[#F6F7F9]">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Expected Monthly Income
              </span>
              <p className="text-lg font-extrabold text-emerald-700 mt-1">
                {formatMoney(propertiesFinancials.totalExpectedIncomeMonthly)}
              </p>
              <span className="text-xs text-slate-400">
                Daily boundary & rent targets
              </span>
            </div>
          </div>

          {/* Individual Asset Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {propertiesFinancials.propertyOverviews.slice(0, 3).map(({ property, financials }) => (
              <Link
                key={property.id}
                href={`/dashboard/properties/${property.id}`}
                className="p-4 rounded-2xl bg-[#F6F7F9] hover:bg-slate-200/70 transition-colors group block"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <p className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                      {property.name}
                    </p>
                  </div>
                  {property.identifier && (
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-white font-bold text-slate-700">
                      {property.identifier}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Valuation:</span>
                  <span className="font-extrabold text-slate-900">
                    {formatMoney(property.estimated_value)}
                  </span>
                </div>

                {financials.amortizationDue && (
                  <div className="mt-1.5 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Loan Amort:</span>
                    <span
                      className={`font-bold ${
                        financials.amortizationDue.urgency === 'critical'
                          ? 'text-rose-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {formatMoney(property.monthly_amortization)} ({financials.amortizationDue.label})
                    </span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 8. Credit Card Watcher & Recent Transactions (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Credit Cards & Due Dates */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <CardIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Credit Card Watcher
                </h3>
                <p className="text-xs text-slate-500">
                  Payment due date countdowns & limits
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/cards"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              Manage <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {cardDueDates.length === 0 ? (
            <div className="p-8 text-center bg-[#F6F7F9] rounded-2xl">
              <p className="text-sm text-slate-500 mb-3">
                No credit cards tracked yet.
              </p>
              <Link
                href="/dashboard/cards"
                className="text-xs font-semibold text-slate-900 underline"
              >
                Add your first credit card
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {cardDueDates.slice(0, 4).map((card) => (
                <Link
                  key={card.id}
                  href={`/dashboard/cards/${card.id}`}
                  className="p-4 rounded-2xl bg-[#F6F7F9] hover:bg-slate-200/70 transition-colors flex items-center justify-between group"
                  title="View card details and statement cycles"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                      ••{card.last_4}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {card.bank_name} {card.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Limit: {formatMoney(card.credit_limit)} • Due Day {card.due_day}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      card.dueInfo.urgency === 'critical'
                        ? 'bg-rose-50 text-rose-700'
                        : card.dueInfo.urgency === 'warning'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-slate-200/70 text-slate-700'
                    }`}
                  >
                    {card.dueInfo.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Recent Spending Feed */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-500">
                  Latest ledger entries
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/transactions"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-1">
                You haven't recorded any expenses yet
              </h4>
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-5 leading-relaxed">
                Add your first expense or upload a paper receipt to see where your money goes.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-bold rounded-xl shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add First Expense
                </button>
                <Link
                  href="/dashboard/transactions"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl transition active:scale-[0.98]"
                >
                  Upload Receipt or Statement →
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        t.kind === 'income'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {t.kind === 'income' ? '+' : '-'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {t.category?.name || (t.kind === 'income' ? 'Income' : 'Expense')}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span>{formatDate(t.occurred_on)}</span>
                        {t.note && <span className="truncate max-w-[140px]">• {t.note}</span>}
                        {t.credit_card && (
                          <Link
                            href={`/dashboard/cards/${t.credit_card.id}`}
                            className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                            title="View card details and statement cycles"
                          >
                            • {t.credit_card.bank_name || t.credit_card.name} (••{t.credit_card.last_4})
                          </Link>
                        )}
                        {t.savings && (
                          <span className="text-emerald-700 font-medium">
                            • Vault: {t.savings.name}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-sm font-extrabold shrink-0 ${
                      t.kind === 'income'
                        ? 'text-emerald-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {t.kind === 'income' ? '+' : '-'} {formatMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Modal */}
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
    </div>
  );
}
