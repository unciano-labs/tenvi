'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  ArrowLeft,
  CreditCard as CardIcon,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Calendar,
  Receipt,
  HandCoins,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Loader2,
  AlertTriangle,
  Building2,
  Car,
  Landmark,
  Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { deleteCreditCardAction } from '@/app/actions/cards';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { deleteLiabilityAction } from '@/app/actions/liabilities';
import { CreditCard, Transaction, Category, Loan, Liability } from '@/types';
import {
  formatMoney,
  formatDate,
  calculateNextDueDate,
  groupTransactionsByStatementDate,
  calculateOptimalCardToSwipe,
  calculateCardSpending,
  getUsageLevel,
  getCardUrgency,
} from '@/lib/finance/calculations';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, ExpandableCardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

import {
  parseCardStyle,
  CardPatternOverlay,
  EmvChip,
  ContactlessWave,
  CardNetworkLogo,
} from '@/components/Cards/CardThemeTokens';

// Lazy-load modal forms
const CreditCardModal = dynamic(
  () => import('@/components/Forms/CreditCardModal').then((m) => m.CreditCardModal),
  { ssr: false }
);
const TransactionModal = dynamic(
  () => import('@/components/Forms/TransactionModal').then((m) => m.TransactionModal),
  { ssr: false }
);
const StatementUploadModal = dynamic(
  () => import('@/components/Forms/StatementUploadModal').then((m) => m.StatementUploadModal),
  { ssr: false }
);
const AmortizationScheduleModal = dynamic(
  () => import('@/components/Forms/AmortizationScheduleModal').then((m) => m.AmortizationScheduleModal),
  { ssr: false }
);
const CardInstallmentModal = dynamic(
  () => import('@/components/Forms/CardInstallmentModal').then((m) => m.CardInstallmentModal),
  { ssr: false }
);

interface CardDetailsClientProps {
  card: CreditCard;
  transactions: Transaction[];
  linkedLoans?: Loan[];
  linkedLiabilities?: Liability[];
  categories: Category[];
  allCards: CreditCard[];
}

export function CardDetailsClient({
  card,
  transactions,
  linkedLoans = [],
  linkedLiabilities = [],
  categories,
  allCards,
}: CardDetailsClientProps) {
  const router = useRouter();

  const [currentTransactions, setCurrentTransactions] = useState<Transaction[]>(transactions);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSwipeModalOpen, setIsSwipeModalOpen] = useState(false);
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [isUploadStatementOpen, setIsUploadStatementOpen] = useState(false);
  const [scheduleLiability, setScheduleLiability] = useState<Liability | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedStatements, setCollapsedStatements] = useState<Record<string, boolean>>({});

  // Confirmation dialog state
  const [isDeleteCardOpen, setIsDeleteCardOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<{ id: string; note?: string | null } | null>(null);
  const [liabilityToDelete, setLiabilityToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingLiabilityId, setDeletingLiabilityId] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentTransactions(transactions);
  }, [transactions]);

  // Group transactions and installments into statement cycles
  const statementGroups = useMemo(() => {
    return groupTransactionsByStatementDate(
      currentTransactions,
      card.statement_day,
      card.due_day,
      new Date(),
      12,
      linkedLoans,
      linkedLiabilities
    );
  }, [currentTransactions, card.statement_day, card.due_day, linkedLoans, linkedLiabilities]);

  // Current calendar month's statement key (e.g. '2026-11')
  const currentMonthKey = useMemo(() => {
    const found = statementGroups.find((g) => g.isCurrentMonth);
    if (found) return found.statementKey;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [statementGroups]);

  // Selected statement month in drop-down (default to current month's statement)
  const [selectedStatementMonth, setSelectedStatementMonth] = useState<string>(currentMonthKey);

  // Dropdown options for selectable statement months
  const statementMonthOptions = useMemo(() => {
    return statementGroups.map((g) => {
      const [yearStr, monthStr] = g.statementKey.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10) - 1;
      const monthDate = new Date(y, m, 1);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      let label = monthName;
      if (g.isCurrentMonth) {
        label = `${monthName} (Current Month)`;
      } else if (g.isCurrentCycle) {
        label = `${monthName} (Unbilled Cycle)`;
      }

      const totalItems = g.transactions.length + (g.installments?.length || 0);

      return {
        key: g.statementKey,
        label,
        monthName,
        isCurrentMonth: g.isCurrentMonth,
        isCurrentCycle: g.isCurrentCycle,
        txCount: totalItems,
      };
    });
  }, [statementGroups]);

  const currentMonthLabel = useMemo(() => {
    const group = statementGroups.find((g) => g.isCurrentMonth);
    if (group) {
      const [y, m] = group.statementKey.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [statementGroups]);

  // Financial calculations
  const {
    directSpend: totalDirectSpend,
    loansSpend: totalSwipedLoansRemaining,
    totalUsed: totalUtilized,
    availableToSpend: availablePower,
    utilizationPercent,
  } = calculateCardSpending(card, currentTransactions, linkedLoans, linkedLiabilities);
  const creditLimit = Number(card.credit_limit || 0);
  const usageInfo = getUsageLevel(utilizationPercent);
  const dueInfo = calculateNextDueDate(card.due_day);
  const urgencyInfo = getCardUrgency(dueInfo.nextDueDate, totalUtilized);

  // Float calculation for today
  const floatResult = calculateOptimalCardToSwipe([card], currentTransactions, linkedLoans, new Date(), linkedLiabilities);
  const thisCardRec = floatResult.bestCard;

  const handleConfirmDeleteTx = async () => {
    if (!txToDelete) return;
    const { id } = txToDelete;
    setTxToDelete(null);

    setDeletingTxId(id);
    const previous = currentTransactions;
    setCurrentTransactions((prev) => prev.filter((t) => t.id !== id));

    const res = await deleteTransactionAction(id);
    setDeletingTxId(null);

    if (res?.error) {
      toast.error(res.error);
      setCurrentTransactions(previous);
    } else {
      toast.success('Transaction removed successfully.');
      router.refresh();
    }
  };

  const handleConfirmDeleteLiability = async () => {
    if (!liabilityToDelete) return;
    const { id, name } = liabilityToDelete;
    setLiabilityToDelete(null);
    setDeletingLiabilityId(id);

    const res = await deleteLiabilityAction(id);
    setDeletingLiabilityId(null);

    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`"${name}" removed successfully.`);
      router.refresh();
    }
  };

  const handleConfirmDeleteCard = async () => {
    setIsDeleteCardOpen(false);
    const res = await deleteCreditCardAction(card.id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Credit card removed successfully.');
      router.push('/dashboard/cards');
    }
  };

  const toggleStatementCollapse = (key: string) => {
    setCollapsedStatements((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };


  // 1. All statement cycles that actually have transactions or installments or are active/current
  const cutoffsWithTransactions = useMemo(() => {
    return statementGroups.filter(
      (g) =>
        g.transactions.length > 0 ||
        (g.installments && g.installments.length > 0) ||
        g.isCurrentMonth ||
        g.isCurrentCycle
    );
  }, [statementGroups]);

  // 2. Filter visible statement groups based on selected statement month and search query
  const visibleGroups = useMemo(() => {
    let groups: typeof statementGroups = [];
    if (selectedStatementMonth === 'all') {
      groups = cutoffsWithTransactions;
    } else {
      const matched = statementGroups.find((g) => g.statementKey === selectedStatementMonth);
      if (matched) {
        groups = [matched];
      } else {
        const fallback = statementGroups.find((g) => g.isCurrentMonth) || statementGroups[0];
        groups = fallback ? [fallback] : [];
      }
    }

    if (!searchQuery.trim()) {
      return groups;
    }

    const query = searchQuery.toLowerCase();
    return groups
      .map((group) => {
        const filteredTxs = group.transactions.filter((tx) => {
          const noteMatch = (tx.note || '').toLowerCase().includes(query);
          const catMatch = (tx.category?.name || '').toLowerCase().includes(query);
          const amtMatch = String(tx.amount || '').includes(query);
          return noteMatch || catMatch || amtMatch;
        });
        const filteredInsts = (group.installments || []).filter((inst) => {
          const nameMatch = (inst.name || '').toLowerCase().includes(query);
          const contactMatch = (inst.lenderOrContact || '').toLowerCase().includes(query);
          const amtMatch = String(inst.amount || '').includes(query);
          return nameMatch || contactMatch || amtMatch;
        });
        return {
          ...group,
          transactions: filteredTxs,
          installments: filteredInsts,
        };
      })
      .filter((group) => group.transactions.length > 0 || (group.installments && group.installments.length > 0));
  }, [statementGroups, selectedStatementMonth, cutoffsWithTransactions, searchQuery]);

  // Check if search query matches transactions or installments in other statement months
  const hasMatchesInOtherMonths = useMemo(() => {
    if (!searchQuery.trim() || selectedStatementMonth === 'all') return false;
    const query = searchQuery.toLowerCase();
    const txMatch = currentTransactions.some((tx) => {
      const noteMatch = (tx.note || '').toLowerCase().includes(query);
      const catMatch = (tx.category?.name || '').toLowerCase().includes(query);
      const amtMatch = String(tx.amount || '').includes(query);
      return noteMatch || catMatch || amtMatch;
    });
    if (txMatch) return true;
    return statementGroups.some((g) =>
      (g.installments || []).some(
        (inst) =>
          (inst.name || '').toLowerCase().includes(query) ||
          (inst.lenderOrContact || '').toLowerCase().includes(query) ||
          String(inst.amount || '').includes(query)
      )
    );
  }, [searchQuery, selectedStatementMonth, currentTransactions, statementGroups]);



  return (
    <div className="flex flex-col gap-6 sm:gap-8 min-w-0">
      {/* 1. Breadcrumb & Clean Header */}
      <div>
        <Link
          href="/dashboard/cards"
          className="-ml-2 mb-2 inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to credit cards
        </Link>

        <div className="page-header">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
              <h1 className="text-display text-foreground min-w-0">
                {card.bank_name} {card.name}
              </h1>
              <Badge variant={urgencyInfo.variant} className="font-medium text-xs py-0.5 px-2.5">
                {urgencyInfo.label}
              </Badge>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">
              Card ending in <strong className="num font-semibold text-foreground whitespace-nowrap">•••• {card.last_4}</strong> · Bill is made on day <span className="num">{card.statement_day}</span>
            </p>
          </div>

          <div className="page-header-actions w-full sm:w-auto">
            <Button
              variant="soft"
              size="default"
              onClick={() => setIsEditModalOpen(true)}
              className="flex-1 sm:flex-initial px-4"
            >
              <Pencil className="size-4 text-muted-foreground" />
              Edit card
            </Button>

            <Button
              variant="soft"
              size="default"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 text-foreground"
            >
              <Layers className="size-4 text-primary" />
              Add installment
            </Button>

            <Button
              variant="primary"
              size="default"
              onClick={() => setIsSwipeModalOpen(true)}
              className="w-full sm:w-auto px-5"
            >
              <Plus className="size-4" />
              Log card swipe
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Unified Hero: Compact Physical Card + Financial Overview Card */}
      <div className="grid grid-cols-1 gap-5 items-start @4xl/main:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)] @4xl/main:items-stretch">
        {/* Physical Card Representation - Inheriting color, solid matte theme, border, glow, and pattern */}
        {(() => {
          const { theme, network, pattern } = parseCardStyle((card as any).color || card.color_theme, card.name);
          return (
            <div
              className={`w-full max-w-sm aspect-[1.586/1] min-h-[200px] p-5 rounded-[22px] text-white ${theme.bgColor} ${theme.glowShadow} relative overflow-hidden flex flex-col justify-between`}
              style={{ backgroundColor: theme.bgHex || theme.accentHex }}
            >

              {/* Background Pattern Overlay */}
              <CardPatternOverlay pattern={pattern} accentHex={theme.accentHex} />

              {/* Top: Bank & Nickname */}
              <div className="relative z-10 flex justify-between items-start">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                    {card.bank_name}
                  </p>
                  <p className="text-base font-semibold leading-snug text-white whitespace-normal break-words mt-0.5">
                    {card.name}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="no-spring -m-1 size-9 rounded-full bg-white/10 hover:bg-white/20 text-white/85 hover:text-white flex items-center justify-center transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white"
                    title="Edit card appearance"
                    aria-label="Edit card appearance"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
              </div>

              {/* Middle: EMV Chip + Contactless Wave */}
              <div className="relative z-10 flex items-center justify-between gap-3 my-2">
                <div className="flex shrink-0 items-center gap-2">
                  <EmvChip />
                  <ContactlessWave />
                </div>

                <div className="min-w-0 text-right">
                  <span className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                    Available spending
                  </span>
                  <span className="num block text-2xl font-bold tracking-tight text-white leading-tight break-words">
                    {formatMoney(availablePower)}
                  </span>
                </div>
              </div>

              {/* Bottom: Card Number + Network Logo */}
              <div className="relative z-10 flex justify-between items-end pt-1">
                <div className="num font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/80 whitespace-nowrap">
                  •••• •••• •••• {card.last_4}
                </div>

                <div className="flex items-center">
                  <CardNetworkLogo network={network} className="h-5" />
                </div>
              </div>
            </div>
          );
        })()}

        {/* Financial Overview & Key Schedule */}
        <Card className="p-0 sm:p-0 gap-0 justify-between">
          <CardContent className="p-5 sm:p-6 flex flex-1 flex-col justify-between gap-5">
            {/* Credit Utilization Bar */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">
                  Left to spend{' '}
                  <strong className="num text-figure text-foreground block">
                    {formatMoney(availablePower)}
                  </strong>
                </span>
                <span className="num text-muted-foreground">
                  Used <strong className="font-semibold text-foreground">{formatMoney(totalUtilized)}</strong> ({utilizationPercent}%)
                </span>
              </div>
              <Progress
                value={utilizationPercent}
                variant={usageInfo.variant}
                className="h-2"
                aria-label={`Credit card utilization: ${utilizationPercent}%`}
              />
            </div>

            {/* Key Schedule Well */}
            <div className="bg-muted/50 p-4 rounded-xl grid-fluid gap-4 [--grid-min:9.5rem] text-sm">
              <div>
                <span className="text-muted-foreground block text-label">Bill is made</span>
                <span className="font-semibold text-foreground block mt-1">
                  Day {card.statement_day} of month
                </span>
                <span className="text-xs text-muted-foreground">
                  Next: {thisCardRec?.nextCutoffDateFormatted || 'Upcoming'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-label">Pay by</span>
                <span className="font-semibold text-foreground block mt-1">
                  Day {card.due_day} of month
                </span>
                <span className="text-xs text-success-soft-foreground font-semibold">
                  Due: {thisCardRec?.paymentDueDateFormatted || 'Upcoming'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-label">Days to pay</span>
                <span className="num font-semibold text-foreground block mt-1">
                  {thisCardRec ? `${thisCardRec.floatDays} days` : '30–45 days'}
                </span>
                <span 
                  className="text-xs leading-snug text-muted-foreground block line-clamp-2"
                  title={thisCardRec?.advice || 'Optimized cash float'}
                >
                  {thisCardRec?.advice || 'Optimized cash float'}
                </span>
              </div>
            </div>

            {/* Direct Activity Summary */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="min-w-0">
                {totalUtilized > 0 ? (
                  <>
                    Direct purchases: <strong className="text-foreground">{formatMoney(totalDirectSpend)}</strong> ({currentTransactions.length})
                    {totalSwipedLoansRemaining > 0 && (
                      <span className="text-warning-soft-foreground font-medium"> • {formatMoney(totalSwipedLoansRemaining)} in loans & installments</span>
                    )}
                  </>
                ) : (
                  <span>Nothing to pay right now</span>
                )}
              </span>

              <span className="text-xs text-muted-foreground shrink-0 font-medium">
                Pay by: {dueInfo.nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Card Installments & Linked Loans */}
      {linkedLoans.length === 0 && linkedLiabilities.length === 0 ? (
        <Card className="p-0 sm:p-0 gap-0">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0 flex-[1_1_18rem]">
              <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Layers className="size-4.5" />
              </div>
              <div className="min-w-0">
                <p className="text-title text-foreground">Card installment plans</p>
                <p className="text-muted-foreground text-sm max-w-prose">
                  Track 0% interest promos, BNPL purchases, or bank loans deducted from this credit limit.
                </p>
              </div>
            </div>
            <Button
              variant="soft"
              size="sm"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="w-full sm:w-auto shrink-0"
            >
              <Plus className="size-4" />
              Record installment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Layers className="size-4" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold leading-snug">
                  Card Installments & Linked Loans ({linkedLoans.length + linkedLiabilities.length})
                </CardTitle>
                <CardDescription className="text-xs">
                  Active mortgages, asset loans, and installment purchases tied to this credit limit.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs font-medium hidden sm:inline-flex">
                {formatMoney(totalSwipedLoansRemaining)} remaining
              </Badge>
              <Button
                variant="soft"
                size="sm"
                onClick={() => setIsInstallmentModalOpen(true)}
                className="text-xs font-semibold h-8 cursor-pointer"
              >
                <Plus className="mr-1 size-3.5" />
                Add Installment
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Linked Mortgages & Financed Liabilities */}
              {linkedLiabilities.map((lib) => {
                const isPaid = lib.status === 'paid_off' || Number(lib.current_principal_balance) <= 0;
                const remainingBalance = Number(lib.current_principal_balance || 0);
                const originalPrincipal = Number(lib.original_principal || 0);
                const monthlyPayment = Number(lib.monthly_payment || 0);
                const totalTerms = Number(lib.term_months || 0);

                const paidCount = Array.isArray(lib.paid_installment_numbers)
                  ? lib.paid_installment_numbers.length
                  : isPaid
                  ? totalTerms
                  : 0;
                const remainingTerms = Math.max(0, totalTerms - paidCount);
                const currentTermIndex = Math.min(totalTerms, paidCount + 1);

                const targetUrl = lib.property_id
                  ? `/dashboard/properties/${lib.property_id}`
                  : '/dashboard/properties';

                return (
                  <div
                    key={lib.id}
                    className="group p-3.5 rounded-2xl bg-muted/60 hover:bg-muted transition-colors duration-(--motion-fast) ease-(--ease-in-out) flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-background flex items-center justify-center shrink-0 mt-0.5">
                        {lib.liability_type === 'mortgage' ? (
                          <Building2 className="size-4 text-emerald-500" />
                        ) : lib.liability_type === 'auto_loan' ? (
                          <Car className="size-4 text-blue-500" />
                        ) : lib.liability_type === 'credit_card_installment' ? (
                          <Layers className="size-4 text-primary" />
                        ) : (
                          <Landmark className="size-4 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-foreground truncate">
                            {lib.name}
                          </p>
                          {totalTerms > 0 && (
                            <Badge variant="outline" className="text-[11px] py-0 px-1.5 font-bold bg-primary/10 text-primary border-primary/25">
                              {paidCount} of {totalTerms} paid
                            </Badge>
                          )}
                          {lib.liability_type === 'credit_card_installment' && (
                            <Badge variant="outline" className="text-[11px] py-0 px-1.5 font-semibold bg-primary/15 text-primary border-primary/30">
                              Card Plan
                            </Badge>
                          )}
                          {lib.property?.name && (
                            <Badge variant="outline" className="text-[11px] py-0 px-1.5 font-normal bg-background/50">
                              <Building2 className="size-2.5 mr-1" />
                              {lib.property.name}
                            </Badge>
                          )}
                          {isPaid ? (
                            <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[11px] py-0 px-1.5">
                              Paid Off
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2.5 text-muted-foreground mt-1 flex-wrap">
                          {monthlyPayment > 0 && (
                            <span className="font-semibold text-foreground">
                              {formatMoney(monthlyPayment)} <span className="font-normal text-muted-foreground">/ mo</span>
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="size-3 text-primary" />
                            Due Day {lib.due_day || card.due_day || 15}
                          </span>
                          <span>Original: {formatMoney(originalPrincipal)}</span>
                        </div>
                        <div className="pt-1.5 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setScheduleLiability(lib)}
                            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Calendar className="size-3" />
                            View Amortization Schedule →
                          </button>
                          {lib.property_id && (
                            <Link
                              href={targetUrl}
                              className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Asset View →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-2 sm:pt-0 gap-1.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="num font-bold text-foreground block text-sm">
                            {formatMoney(remainingBalance)}
                          </span>
                          <span className="text-[11px] text-muted-foreground hidden sm:block">
                            Remaining balance
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={deletingLiabilityId === lib.id}
                          onClick={() => setLiabilityToDelete({ id: lib.id, name: lib.name })}
                          className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity size-9 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                          aria-label="Delete installment"
                        >
                          {deletingLiabilityId === lib.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {remainingTerms > 0 ? `${remainingTerms} mos left` : 'Completed'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Linked P2P Loans / Swipes */}
              {linkedLoans.map((loan) => {
                const isPaid = loan.status === 'paid' || Number(loan.balance_remaining) <= 0;
                const remainingBalance = Number(loan.balance_remaining || 0);
                const originalAmount = Number(loan.amount || 0);
                const monthlyAmort = loan.monthly_amount || (loan.installment_months ? originalAmount / loan.installment_months : null);

                let remainingTermsText = '';
                if (loan.installment_months && monthlyAmort && !isPaid) {
                  const estimatedRemaining = Math.min(
                    loan.installment_months,
                    Math.max(1, Math.ceil(remainingBalance / monthlyAmort))
                  );
                  remainingTermsText = `${estimatedRemaining} of ${loan.installment_months} mos left`;
                } else if (loan.installment_months) {
                  remainingTermsText = `${loan.installment_months} mos total`;
                }

                return (
                  <Link
                    key={loan.id}
                    href={`/dashboard/loans/${loan.id}`}
                    className="p-3.5 rounded-2xl bg-muted/60 hover:bg-muted transition-colors duration-(--motion-fast) ease-(--ease-in-out) flex flex-col sm:flex-row sm:items-center justify-between gap-3 group text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-background flex items-center justify-center shrink-0 mt-0.5">
                        <HandCoins className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {loan.contact?.name || 'Borrower'} {loan.reason ? `• ${loan.reason}` : ''}
                          </p>
                          {loan.is_installment && (
                            <Badge variant="outline" className="text-[11px] py-0 px-1.5 bg-primary/5 text-primary border-primary/20">
                              INSTALLMENT
                            </Badge>
                          )}
                          {isPaid ? (
                            <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[11px] py-0 px-1.5">
                              Paid
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2.5 text-muted-foreground mt-1 flex-wrap">
                          {monthlyAmort && monthlyAmort > 0 && (
                            <span className="font-semibold text-foreground">
                              {formatMoney(monthlyAmort)} <span className="font-normal text-muted-foreground">/ mo</span>
                            </span>
                          )}
                          {remainingTermsText && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="size-3" />
                              {remainingTermsText}
                            </span>
                          )}
                          <span>Original: {formatMoney(originalAmount)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center pt-2 sm:pt-0">
                      <div>
                        <span className="num font-bold text-foreground block text-sm">
                          {formatMoney(remainingBalance)}
                        </span>
                        <span className="text-[11px] text-muted-foreground hidden sm:block">
                          Remaining balance
                        </span>
                      </div>
                      <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform duration-(--motion-fast) ease-(--ease-in-out) sm:mt-1">
                        Schedule →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Statement Cycles & Transactions Section */}
      <div className="space-y-4">
        {/* Section Toolbar */}
        <Card className="p-0 sm:p-0 gap-0">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 flex-[1_1_16rem]">
              <h2 className="text-title text-foreground flex items-center gap-2">
                <Receipt className="size-4.5 shrink-0 text-primary" />
                Statement cycles & transactions
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Monthly billing cycle ends on day {card.statement_day}
              </p>
            </div>

            <div className="flex min-w-0 flex-[1_1_30rem] flex-wrap items-center justify-end gap-2.5">
              {/* Statement Month Dropdown */}
              <div className="min-w-[min(100%,15rem)] flex-[1_1_15rem]">
                <Select
                  value={selectedStatementMonth}
                  onValueChange={(val) => {
                    if (val) setSelectedStatementMonth(val);
                  }}
                >
                  <SelectTrigger size="sm" className="min-h-11 h-11 text-sm font-medium rounded-xl bg-muted w-full" aria-label="Statement month">
                    <Calendar className="size-4 text-primary shrink-0" />
                    <SelectValue placeholder="Select statement month" className="block min-w-0 truncate">
                      {(val: string | null) => {
                        if (!val || val === 'all') return 'All statement months';
                        const opt = statementMonthOptions.find((o) => o.key === val);
                        return opt?.label || val;
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="all">
                      All statement months ({cutoffsWithTransactions.length})
                    </SelectItem>
                    <SelectSeparator />
                    {statementMonthOptions.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Upload Statement Button */}
              <Button
                variant="soft"
                size="sm"
                onClick={() => setIsUploadStatementOpen(true)}
                className="min-h-11 h-11 flex-[1_1_auto] sm:flex-initial"
              >
                <UploadCloud className="size-4" />
                Upload statement
              </Button>

              {/* Search Purchases */}
              <div className="relative min-w-[min(100%,12rem)] flex-[1_1_12rem]">
                <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search purchases"
                  aria-label="Search purchases"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted min-h-11 h-11 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Statement Cycle Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-xs">
          <div className="flex min-w-0 items-center gap-2 flex-wrap">
            <span className="text-muted-foreground font-medium">Viewing</span>
            {selectedStatementMonth === 'all' ? (
              <Badge variant="secondary" className="text-xs font-semibold py-0.5 px-2">
                All statement cycles ({visibleGroups.length})
              </Badge>
            ) : (
              (() => {
                const activeGroup = statementGroups.find((g) => g.statementKey === selectedStatementMonth);
                if (!activeGroup) return null;
                return (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={activeGroup.isCurrentMonth ? 'default' : 'secondary'}
                      className="text-xs font-semibold py-0.5 px-2"
                    >
                      Cut-off: {activeGroup.statementDateFormatted}
                    </Badge>
                    <span className="text-muted-foreground">
                      Cycle: {activeGroup.cycleStartDateFormatted} – {activeGroup.cycleEndDateFormatted} • Due: <strong className="text-foreground whitespace-nowrap">{activeGroup.dueDateFormatted}</strong>
                    </span>
                  </div>
                );
              })()
            )}
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            {selectedStatementMonth !== currentMonthKey ? (
              <button
                type="button"
                onClick={() => setSelectedStatementMonth(currentMonthKey)}
                className="text-primary hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                ← Back to current month ({currentMonthLabel})
              </button>
            ) : (
              <span className="text-muted-foreground">
                Default view: Current month&apos;s statement
              </span>
            )}
          </div>
        </div>

        {/* Statement Groups List */}
        {visibleGroups.length === 0 ? (
          <Card className="items-center text-center px-6 py-10 sm:px-6 sm:py-10 gap-3">
            <div className="size-11 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center">
              <Receipt className="size-5" />
            </div>
            <h3 className="text-title text-foreground">No transactions found</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {searchQuery
                ? `No transactions matched "${searchQuery}" in this statement period.`
                : 'No card purchases recorded for this statement period.'}
            </p>
            {searchQuery && hasMatchesInOtherMonths && (
              <div className="pt-1">
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setSelectedStatementMonth('all')}
                  className="text-xs font-semibold cursor-pointer"
                >
                  Search all statement months →
                </Button>
              </div>
            )}
            {!searchQuery && (
              <Button
                variant="primary"
                onClick={() => setIsSwipeModalOpen(true)}
                className="shadow-none"
              >
                <Plus className="size-4" />
                Log first swipe
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const isCollapsed = collapsedStatements[group.statementKey] ?? false;

              // Deduplicate loans and transactions inside this cycle:
              // If loan ID is the same, hide duplicate loan or transaction, and do not add to total
              const seenCycleLoanIds = new Set<string>();

              const displayInstallments = (group.installments || []).filter((inst) => {
                const loanId = (inst.sourceId || '').trim();
                if (!loanId) return true;
                if (seenCycleLoanIds.has(loanId)) return false; // Duplicate loan in this cycle - hide!
                seenCycleLoanIds.add(loanId);
                return true;
              });

              const displayTransactions = (group.transactions || []).filter((tx) => {
                const loanId = (tx.loan_id || '').trim();
                if (!loanId) return true;
                if (seenCycleLoanIds.has(loanId)) return false; // Duplicate loan/transaction with same loan ID - hide!
                seenCycleLoanIds.add(loanId);
                return true;
              });

              const cycleInstallmentTotal = displayInstallments.reduce((sum, item) => sum + item.amount, 0);
              const cycleNetSpend = displayTransactions.reduce((sum, tx) => {
                const amt = Number(tx.amount || 0);
                return tx.kind === 'expense' ? sum + amt : sum - amt;
              }, 0);
              const hasInstallments = displayInstallments.length > 0;

              return (
                <Card key={group.statementKey} className="p-0 sm:p-0 gap-0">
                  <CardContent className="p-5 sm:p-6">
                    {/* Statement Header */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-title text-foreground">
                            Bill is made: {group.statementDateFormatted}
                          </span>

                          {group.isCurrentCycle ? (
                            <Badge variant="secondary" className="text-xs font-bold">
                              Current unbilled cycle
                            </Badge>
                          ) : group.status === 'billed_due_soon' ? (
                            <Badge variant="warning" className="text-xs font-bold">
                              {group.statusLabel}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs font-semibold">
                              {group.statusLabel}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Cycle: {group.cycleStartDateFormatted} – {group.cycleEndDateFormatted} • Pay by: <strong className="text-foreground whitespace-nowrap">{group.dueDateFormatted}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 ml-auto">
                        <div className="text-right">
                          <span className="text-label text-muted-foreground block">
                            Statement total
                          </span>
                          <span className="num text-lg font-bold text-foreground">
                            {formatMoney(cycleNetSpend + cycleInstallmentTotal)}
                          </span>
                          {cycleInstallmentTotal > 0 && (
                            <span className="num text-xs text-muted-foreground block">
                              incl. {formatMoney(cycleInstallmentTotal)} installments
                            </span>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatementCollapse(group.statementKey)}
                          className="size-10 min-h-10 min-w-10 rounded-xl bg-muted text-muted-foreground hover:text-foreground"
                          aria-label={isCollapsed ? 'Expand statement' : 'Collapse statement'}
                          aria-expanded={!isCollapsed}
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-[rotate] duration-(--motion-base) ease-(--ease-spring-pop)",
                              !isCollapsed && "rotate-180"
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {/* Statement Transactions List with 350ms ease-out expand */}
                    <ExpandableCardContent
                      expanded={!isCollapsed}
                      contentClassName="space-y-2 pt-4"
                    >
                        {/* Statement Installment Commitments */}
                        {hasInstallments && (
                          <div className="space-y-1.5 pb-1">
                            {displayInstallments.map((inst) => {
                              const isPaid = inst.isPaid;
                              return (
                                <div
                                  key={inst.id}
                                  className="group p-3 rounded-2xl bg-primary/5 hover:bg-primary/10 transition-colors flex items-start justify-between text-xs gap-3 min-w-0"
                                >
                                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                    <div className="p-1.5 rounded-xl bg-card shadow-xs shrink-0 text-primary mt-0.5">
                                      <Layers className="size-3.5" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                                        <span className="font-bold text-foreground truncate">
                                          {inst.name}
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="text-[11px] py-0 px-1.5 font-bold bg-primary/15 text-primary border-0"
                                        >
                                          {inst.installmentNumber} OF {inst.totalTerms} {isPaid ? 'PAID' : 'SCHEDULED'}
                                        </Badge>
                                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-card text-muted-foreground shadow-xs shrink-0">
                                          {inst.sourceType === 'loan' ? 'Lent Loan' : 'Card Installment'}
                                        </span>
                                        {inst.lenderOrContact && (
                                          <span className="text-[11px] text-muted-foreground truncate">
                                            ({inst.lenderOrContact})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                        <span>
                                          Due: <strong className="text-foreground whitespace-nowrap">{inst.dueDateFormatted || group.dueDateFormatted}</strong>
                                        </span>
                                        {inst.remainingBalance > 0 && (
                                          <>
                                            <span>•</span>
                                            <span>Remaining bal: {formatMoney(inst.remainingBalance)}</span>
                                          </>
                                        )}
                                      </div>
                                      <div className="pt-0.5 flex items-center gap-3">
                                        {inst.rawLiability && (
                                          <button
                                            type="button"
                                            onClick={() => setScheduleLiability(inst.rawLiability)}
                                            className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:underline cursor-pointer"
                                          >
                                            <Calendar className="size-2.5" />
                                            View Amortization Schedule →
                                          </button>
                                        )}
                                        {inst.sourceType === 'loan' && inst.sourceId && (
                                          <Link
                                            href={`/dashboard/loans/${inst.sourceId}`}
                                            className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:underline cursor-pointer"
                                          >
                                            View Loan Details →
                                          </Link>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-2 text-right pt-0.5">
                                    <div className="text-right">
                                      <span className="num text-sm font-bold whitespace-nowrap text-foreground block">
                                        -{formatMoney(inst.amount)}
                                      </span>
                                      <span className="text-[11px] text-muted-foreground block font-medium">
                                        {Math.max(0, inst.totalTerms - inst.installmentNumber)} mos left
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {displayTransactions.length === 0 ? (
                          !hasInstallments ? (
                            <div className="p-4 rounded-2xl bg-muted/60 text-center space-y-1.5">
                              <p className="text-xs text-muted-foreground">
                                {group.isCurrentCycle
                                  ? 'No purchases recorded in this statement cycle yet. Charges logged after your bill is made will appear here.'
                                  : 'No purchases recorded for this statement period.'}
                              </p>
                              {group.isCurrentCycle && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  onClick={() => setIsSwipeModalOpen(true)}
                                  className="text-xs font-bold text-primary p-0 h-auto cursor-pointer"
                                >
                                  <Plus className="mr-1 size-3.5" />
                                  Log a swipe for this cycle
                                </Button>
                              )}
                            </div>
                          ) : group.isCurrentCycle ? (
                            <div className="pt-1 flex justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSwipeModalOpen(true)}
                                className="text-xs font-semibold text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <Plus className="mr-1 size-3.5" />
                                Log a swipe for this cycle
                              </Button>
                            </div>
                          ) : null
                        ) : (
                          <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5">
                            {displayTransactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="group p-3 rounded-2xl bg-muted/60 hover:bg-muted transition-colors flex items-start justify-between text-xs gap-3 min-w-0"
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <div className="p-1.5 rounded-xl bg-card shadow-xs shrink-0 text-foreground mt-0.5">
                                    {tx.kind === 'expense' ? (
                                      <TrendingDown className="size-3.5 text-danger-soft-foreground" />
                                    ) : (
                                      <TrendingUp className="size-3.5 text-success-soft-foreground" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                      <span className="font-bold text-foreground truncate">
                                        {tx.note || 'Card Purchase'}
                                      </span>
                                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-card text-muted-foreground shadow-xs shrink-0">
                                        {tx.category?.name || 'General'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      <span>{formatDate(tx.occurred_on)}</span>
                                    </div>
                                    {tx.loan_id && (
                                      <div className="pt-1">
                                        <Link
                                          href={`/dashboard/loans/${tx.loan_id}`}
                                          className="inline-flex items-center gap-1 text-2xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors shrink-0"
                                        >
                                          Loan: {tx.loan?.contact?.name || 'Borrower'} →
                                        </Link>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2 text-right pt-0.5">
                                  <span
                                    className={`num text-sm font-bold whitespace-nowrap ${
                                      tx.kind === 'expense' ? 'text-foreground' : 'text-success-soft-foreground'
                                    }`}
                                  >
                                    {tx.kind === 'expense' ? '-' : '+'}
                                    {formatMoney(Number(tx.amount))}
                                  </span>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={deletingTxId === tx.id}
                                    onClick={() => setTxToDelete({ id: tx.id, note: tx.note })}
                                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity size-9 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                                    aria-label="Delete transaction"
                                  >
                                    {deletingTxId === tx.id ? (
                                      <Loader2 className="size-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="size-3.5" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </ExpandableCardContent>
                  </CardContent>
                </Card>
              );
            })}

            {/* Bottom helper card when a single statement month is viewed and other cutoffs exist */}
            {selectedStatementMonth !== 'all' && cutoffsWithTransactions.length > 1 && !searchQuery.trim() && (
              <Card className="p-4 sm:p-4 flex-row flex-wrap items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 flex-[1_1_18rem] items-start gap-2 text-muted-foreground">
                  <Calendar className="mt-0.5 size-4 text-primary shrink-0" />
                  <p>
                    Viewing <strong className="text-foreground">{statementMonthOptions.find((o) => o.key === selectedStatementMonth)?.monthName || 'selected month'}</strong> statement. There are <strong className="text-foreground">{cutoffsWithTransactions.length - 1}</strong> other active statement cut-off{cutoffsWithTransactions.length - 1 > 1 ? 's' : ''}.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => setSelectedStatementMonth('all')}
                  className="shrink-0"
                >
                  Show all {cutoffsWithTransactions.length} statement months →
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 5. Card Settings & Danger Zone */}
      <div className="flex flex-col gap-3 pt-4">
        <h2 className="text-title text-foreground">
          Card settings
        </h2>

        <Card className="p-0 sm:p-0 gap-0">
          <CardContent className="p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
              <h3 className="text-base font-semibold text-foreground">
                Delete credit card
              </h3>
              <p className="text-sm text-muted-foreground max-w-prose leading-relaxed">
                Permanently remove this card and all associated statement records. Existing transaction records will remain preserved in your general ledger.
              </p>
              <p className="text-xs text-muted-foreground font-mono pt-1 break-all">
                Credit Card ID: {card.id}
              </p>
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteCardOpen(true)}
              className="w-full sm:w-auto shrink-0"
            >
              <Trash2 className="size-4" />
              Delete card
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={isDeleteCardOpen} onOpenChange={setIsDeleteCardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this credit card?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {card.bank_name} - {card.name}? Card transaction history will be preserved in your general transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteCard}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!txToDelete} onOpenChange={(open) => !open && setTxToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this card transaction{txToDelete?.note ? ` ("${txToDelete.note}")` : ''}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteTx}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!liabilityToDelete} onOpenChange={(open) => !open && setLiabilityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this installment plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{liabilityToDelete?.name}&quot;? The remaining balance will be released back to your available credit limit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteLiability}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modals */}
      {isSwipeModalOpen && (
        <TransactionModal
          isOpen={isSwipeModalOpen}
          onClose={() => setIsSwipeModalOpen(false)}
          categories={categories}
          creditCards={allCards}
          defaultCreditCardId={card.id}
          defaultPaymentMethod="credit_card"
        />
      )}

      {isInstallmentModalOpen && (
        <CardInstallmentModal
          isOpen={isInstallmentModalOpen}
          onClose={() => setIsInstallmentModalOpen(false)}
          creditCards={allCards && allCards.length > 0 ? allCards : [card]}
          defaultCreditCardId={card.id}
          onSuccess={() => router.refresh()}
        />
      )}

      {isEditModalOpen && (
        <CreditCardModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          card={card}
        />
      )}

      {isUploadStatementOpen && (
        <StatementUploadModal
          isOpen={isUploadStatementOpen}
          onClose={() => setIsUploadStatementOpen(false)}
          card={card}
          categories={categories}
        />
      )}

      {scheduleLiability && (
        <AmortizationScheduleModal
          isOpen={Boolean(scheduleLiability)}
          onClose={() => setScheduleLiability(null)}
          liability={scheduleLiability}
        />
      )}
    </div>
  );
}
