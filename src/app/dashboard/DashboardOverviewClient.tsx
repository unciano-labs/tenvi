'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  Wallet,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard as CardIcon,
  HandCoins,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building2,
  PieChart,
  BarChart3,
  Sparkles,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BestCardTodayPanel } from '@/components/Cards/BestCardTodayPanel';
import { PayTheseSoonPanel, DueSoonCardItem } from '@/components/Cards/PayTheseSoonPanel';
import {
  formatMoney,
  formatDate,
  calculateNextDueDate,
  calculateOptimalCardToSwipe,
  calculatePropertyFinancials,
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

// Lazy-load modals
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

const cashflowChartConfig = {
  inflow: {
    label: 'Inflow',
    color: '#10B981',
  },
  outflow: {
    label: 'Outflow',
    color: '#F43F5E',
  },
} satisfies ChartConfig;

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
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const isoCutoff = sixMonthsAgo.toISOString().split('T')[0];
    return transactions.filter((t) => t.occurred_on >= isoCutoff && t.occurred_on <= todayISO);
  }, [transactions, timeframe, currentMonthStr, now, todayISO]);

  // Recent non-future transactions
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

  // Total Money Owed to User
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

  // Bills due soon for PayTheseSoonPanel
  const dueSoonCards = useMemo(() => {
    const items: DueSoonCardItem[] = [];
    creditCards.forEach((c) => {
      const dueInfo = calculateNextDueDate(c.due_day);
      if (dueInfo.daysRemaining <= 7) {
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
            urgency: dueInfo.daysRemaining <= 3 ? 'urgent' : 'soon',
          });
        }
      }
    });
    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [creditCards, cardRecommendation]);

  // 6-Month Historical Cashflow Trend Chart Data
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
        inflow: income,
        outflow: expense,
        net: income - expense,
      });
    }
    return list;
  }, [transactions, now]);

  // Category Distribution Matrix
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

  // Properties & Fleet Portfolio Metrics
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

      {/* 1. Header with Timeframe Toggle & Quick Action (TNV-034) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Kumusta, {userName}! 👋
            </h1>
            <Badge variant="success" className="hidden sm:inline-flex items-center gap-1">
              <Sparkles className="size-3" />
              Live Financial Matrix
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time financial command center for {now.toLocaleString('default', { month: 'long', year: 'numeric' })}.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
          {/* Timeframe Selector with shadcn ToggleGroup (TNV-034) */}
          <ToggleGroup
            value={[timeframe]}
            onValueChange={(val) => {
              const selected = Array.isArray(val) && val.length > 0 ? (val[val.length - 1] as 'month' | '30days' | '6months') : null;
              if (selected) setTimeframe(selected);
            }}
            className="bg-muted p-1 rounded-2xl"
          >
            <ToggleGroupItem value="month" className="rounded-xl text-xs px-3 font-semibold min-h-9">
              This Month
            </ToggleGroupItem>
            <ToggleGroupItem value="30days" className="rounded-xl text-xs px-3 font-semibold min-h-9">
              Last 30 Days
            </ToggleGroupItem>
            <ToggleGroupItem value="6months" className="rounded-xl text-xs px-3 font-semibold min-h-9">
              6 Months
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="primary"
            size="default"
            onClick={() => {
              setSelectedCardForModal(undefined);
              setIsModalOpen(true);
            }}
            className="min-h-12 h-12 px-5 font-semibold cursor-pointer shadow-none flex-1 sm:flex-initial"
          >
            <Plus className="mr-1.5 size-4" />
            Record Transaction
          </Button>
        </div>
      </div>

      {/* 2. Pay These Soon Panel (Reused, TNV-034) */}
      {dueSoonCards.length > 0 && (
        <PayTheseSoonPanel dueSoonCards={dueSoonCards} />
      )}

      {/* 3. Primary Metrics Cards Grid (TNV-034) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Liquid Savings
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
              <PiggyBank className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {formatMoney(totalSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {savings.length} active vaults & accounts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Money In This Month
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-success-soft text-success-soft-foreground">
              <ArrowDownLeft className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {formatMoney(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">
              {currentMonthTransactions.filter((t) => t.kind === 'income').length} income records
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Money Out This Month
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-danger-soft text-danger-soft-foreground">
              <ArrowUpRight className="size-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {formatMoney(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg. {formatMoney(averageDailyBurn)}/day burn
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Net Savings & Health
            </CardTitle>
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {netSavings >= 0 ? (
                <TrendingUp className="size-5 text-success-soft-foreground" />
              ) : (
                <TrendingDown className="size-5 text-danger-soft-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {netSavings >= 0 ? '+' : ''}{formatMoney(netSavings)}
            </div>
            <p className="text-xs text-muted-foreground">
              {savingsRate}% savings retention rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 4. Financial Health & Runway Matrix Bar (3 Tonal Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Emergency Living Runway */}
        <Card className="shadow-card flex items-center p-6 gap-4">
          <div className="size-12 rounded-2xl bg-success-soft text-success-soft-foreground flex items-center justify-center shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Emergency Runway
              </span>
              <Badge variant={Number(emergencyRunwayMonths) >= 3 ? 'success' : 'warning'}>
                {Number(emergencyRunwayMonths) >= 3 ? 'Safe Buffer' : 'Build Buffer'}
              </Badge>
            </div>
            <p className="text-xl font-extrabold text-foreground mt-1">
              {emergencyRunwayMonths} Months
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Based on monthly burn of {formatMoney(totalExpense)}
            </p>
          </div>
        </Card>

        {/* Credit Utilization Meter */}
        <Card className="shadow-card flex items-center p-6 gap-4">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CardIcon className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Credit Utilization
              </span>
              <Badge
                variant={
                  overallCreditUtilization <= 30
                    ? 'success'
                    : overallCreditUtilization <= 50
                    ? 'warning'
                    : 'danger'
                }
              >
                {overallCreditUtilization}% Used
              </Badge>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-extrabold text-foreground">
                {formatMoney(totalUtilizedCredit)}
              </p>
              <span className="text-xs text-muted-foreground">
                / {formatMoney(totalCreditLimit)}
              </span>
            </div>
            <Progress
              value={overallCreditUtilization}
              variant={overallCreditUtilization <= 30 ? 'success' : overallCreditUtilization <= 50 ? 'warning' : 'danger'}
              className="h-1.5 mt-2"
              aria-label={`Overall credit utilization: ${overallCreditUtilization}%`}
            />
          </div>
        </Card>

        {/* Outstanding Receivables / Owed to You */}
        <Card className="shadow-card flex items-center p-6 gap-4">
          <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <HandCoins className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Owed To You
              </span>
              <Link
                href="/dashboard/receivables"
                className="text-xs font-bold text-primary hover:underline"
              >
                View Hub →
              </Link>
            </div>
            <p className="text-xl font-extrabold text-foreground mt-1">
              {formatMoney(totalOwedToYou)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loans.filter((l) => l.status !== 'paid').length} active loans • {splits.length} shared bills
            </p>
          </div>
        </Card>
      </div>

      {/* 5. Best Card Today Recommendation Panel (Reused, TNV-034) */}
      {cardRecommendation && cardRecommendation.bestCard && (
        <BestCardTodayPanel
          optimalData={cardRecommendation}
          onAddPurchaseClick={handleSwipeWithCard}
        />
      )}

      {/* 6. Visual Charts Section: Recharts shadcn Chart + Expense Matrix (TNV-034) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart A: 6-Month Cash Flow Trend */}
        <Card className="shadow-card flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-success-soft text-success-soft-foreground">
                  <BarChart3 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    6-Month Cash Flow Trend
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Income vs Expense monthly dynamics
                  </CardDescription>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  Inflow
                </span>
                <span className="flex items-center gap-1.5 text-foreground">
                  <span className="size-2.5 rounded-full bg-rose-500" />
                  Outflow
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Micro Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-2xl bg-muted/60 text-center">
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground truncate">
                  Avg. Inflow
                </p>
                <p className="text-xs font-extrabold text-foreground mt-0.5 truncate">
                  {formatMoney(
                    sixMonthsTrend.reduce((s, m) => s + m.inflow, 0) / sixMonthsTrend.length
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground truncate">
                  Avg. Outflow
                </p>
                <p className="text-xs font-extrabold text-foreground mt-0.5 truncate">
                  {formatMoney(
                    sixMonthsTrend.reduce((s, m) => s + m.outflow, 0) / sixMonthsTrend.length
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground truncate">
                  Net 6-Mo
                </p>
                <p className="text-xs font-extrabold text-success-soft-foreground mt-0.5 truncate">
                  +{formatMoney(
                    Math.max(0, sixMonthsTrend.reduce((s, m) => s + m.net, 0))
                  )}
                </p>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <ChartContainer config={cashflowChartConfig} className="h-56 w-full">
              <BarChart data={sixMonthsTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs fill-muted-foreground"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(v) => `₱${Math.round(v / 1000)}k`}
                  className="text-xs fill-muted-foreground"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-muted-foreground capitalize">{name}:</span>
                          <span className="font-bold text-foreground">{formatMoney(Number(value))}</span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="inflow" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="outflow" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ChartContainer>

            {/* Accessible Text Table for Screen Readers (WCAG) */}
            <div className="sr-only">
              <h4>Monthly Cash Flow Summary Table</h4>
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Inflow</th>
                    <th>Outflow</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {sixMonthsTrend.map((d) => (
                    <tr key={d.key}>
                      <td>{d.label}</td>
                      <td>{formatMoney(d.inflow)}</td>
                      <td>{formatMoney(d.outflow)}</td>
                      <td>{formatMoney(d.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
              <Activity className="size-3.5 text-muted-foreground" />
              Hover or focus on monthly bars for detailed cash in vs cash out
            </div>
          </CardContent>
        </Card>

        {/* Chart B: Category Expense Breakdown Matrix */}
        <Card className="shadow-card flex flex-col justify-between">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <PieChart className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Expense Distribution Matrix
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Category spending breakdown ({timeframe === 'month' ? 'This Month' : timeframe === '30days' ? 'Last 30 Days' : 'Last 6 Months'})
                  </CardDescription>
                </div>
              </div>

              <Badge variant="secondary">
                {categoryMatrix.length} Categories
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {/* Multi-Segment Proportional Progress Bar */}
            {categoryMatrix.length > 0 && (
              <div className="w-full h-3 rounded-full overflow-hidden flex bg-muted shadow-xs">
                {categoryMatrix.map((cat) => (
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
              <div className="p-8 text-center bg-muted/60 rounded-2xl">
                <p className="text-xs text-muted-foreground mb-2">
                  No expense transactions logged in this timeframe.
                </p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs font-semibold text-foreground underline p-0"
                >
                  Log an expense to view distribution
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {categoryMatrix.slice(0, 5).map((cat) => (
                  <div
                    key={cat.name}
                    className="p-3 rounded-2xl bg-muted/60 hover:bg-muted transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`size-3 rounded-full ${cat.color.bg} shrink-0`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {cat.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {cat.count} {cat.count === 1 ? 'transaction' : 'transactions'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-extrabold text-foreground">
                        {formatMoney(cat.amount)}
                      </p>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {cat.percentage}% of total
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-xs text-muted-foreground flex items-center justify-between">
              <span>Ranked by highest spending</span>
              <Link
                href="/dashboard/transactions"
                className="text-xs font-bold text-foreground hover:underline flex items-center gap-1"
              >
                All Transactions →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7. Properties & Asset Fleet Snapshot */}
      {propertiesFinancials && properties.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-soft text-amber-soft-foreground">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Properties & Fleet Management
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Vehicles, real estate, rental revenue & fixed run-rate obligations
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {properties.length} Assets Tracked
                </Badge>
                <Link
                  href="/dashboard/properties"
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Portfolio Hub →
                </Link>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Properties KPI Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Fleet Valuation
                </span>
                <p className="text-lg font-extrabold text-foreground mt-1">
                  {formatMoney(propertiesFinancials.totalPortfolioValue)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Monthly Fixed Run-Rate
                </span>
                <p className="text-lg font-extrabold text-danger-soft-foreground mt-1">
                  {formatMoney(propertiesFinancials.totalMonthlyCommitments)}
                </p>
                <span className="text-xs text-muted-foreground">
                  Amortizations + insurance reserve
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-muted/60">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Expected Monthly Income
                </span>
                <p className="text-lg font-extrabold text-success-soft-foreground mt-1">
                  {formatMoney(propertiesFinancials.totalExpectedIncomeMonthly)}
                </p>
                <span className="text-xs text-muted-foreground">
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
                  className="p-4 rounded-2xl bg-muted/60 hover:bg-muted transition-colors group block"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-amber-500" />
                      <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {property.name}
                      </p>
                    </div>
                    {property.identifier && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-card font-bold text-foreground shadow-xs">
                        {property.identifier}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Valuation:</span>
                    <span className="font-extrabold text-foreground">
                      {formatMoney(property.estimated_value)}
                    </span>
                  </div>

                  {financials.amortizationDue && (
                    <div className="mt-1.5 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Loan Amort:</span>
                      <span
                        className={`font-bold ${
                          financials.amortizationDue.urgency === 'critical'
                            ? 'text-danger-soft-foreground'
                            : 'text-foreground'
                        }`}
                      >
                        {formatMoney(property.monthly_amortization)} ({financials.amortizationDue.label})
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. Credit Card Watcher & Recent Transactions (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Credit Card Watcher */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CardIcon className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Credit Card Watcher
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Payment due date countdowns & limits
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/dashboard/cards"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                Manage <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {cardDueDates.length === 0 ? (
              <div className="p-8 text-center bg-muted/60 rounded-2xl">
                <p className="text-sm text-muted-foreground mb-3">
                  No credit cards tracked yet.
                </p>
                <Link
                  href="/dashboard/cards"
                  className="text-xs font-semibold text-primary underline"
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
                    className="p-4 rounded-2xl bg-muted/60 hover:bg-muted transition-colors flex items-center justify-between group"
                    title="View card details and statement cycles"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-9 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold font-mono">
                        ••{card.last_4}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                          {card.bank_name} {card.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Limit: {formatMoney(card.credit_limit)} • Due Day {card.due_day}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={
                        card.dueInfo.urgency === 'critical'
                          ? 'danger'
                          : card.dueInfo.urgency === 'warning'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {card.dueInfo.label}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Recent Spending Feed */}
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-success-soft text-success-soft-foreground">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">
                    Recent Transactions
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest ledger entries
                  </CardDescription>
                </div>
              </div>
              <Link
                href="/dashboard/transactions"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                View All <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </CardHeader>

          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="p-8 text-center bg-muted/60 rounded-3xl">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="size-6" />
                </div>
                <h4 className="text-base font-bold text-foreground mb-1">
                  You haven't recorded any expenses yet
                </h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5 leading-relaxed">
                  Add your first expense or upload a paper receipt to see where your money goes.
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Button
                    variant="primary"
                    onClick={() => setIsModalOpen(true)}
                    className="min-h-10 text-xs font-bold"
                  >
                    <Plus className="mr-1.5 size-4" />
                    Add First Expense
                  </Button>
                  <Button
                    variant="soft"
                    render={<Link href="/dashboard/transactions" />}
                    className="min-h-10 text-xs font-bold"
                  >
                    Upload Receipt or Statement →
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentTransactions.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    className="p-3.5 rounded-2xl bg-muted/60 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`size-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          t.kind === 'income'
                            ? 'bg-success-soft text-success-soft-foreground'
                            : 'bg-danger-soft text-danger-soft-foreground'
                        }`}
                      >
                        {t.kind === 'income' ? '+' : '-'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {t.category?.name || (t.kind === 'income' ? 'Income' : 'Expense')}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span>{formatDate(t.occurred_on)}</span>
                          {t.note && <span className="truncate max-w-[140px]">• {t.note}</span>}
                          {t.credit_card && (
                            <Link
                              href={`/dashboard/cards/${t.credit_card.id}`}
                              className="text-primary hover:underline font-medium"
                              title="View card details and statement cycles"
                            >
                              • {t.credit_card.bank_name || t.credit_card.name} (••{t.credit_card.last_4})
                            </Link>
                          )}
                          {t.savings && (
                            <span className="text-success-soft-foreground font-medium">
                              • Vault: {t.savings.name}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-sm font-extrabold shrink-0 ${
                        t.kind === 'income'
                          ? 'text-success-soft-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {t.kind === 'income' ? '+' : '-'} {formatMoney(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Modal */}
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
    </div>
  );
}
