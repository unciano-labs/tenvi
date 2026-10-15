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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  VisaLogo,
  MastercardLogo,
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
  const [showAllCutoffs, setShowAllCutoffs] = useState(false);
  const [collapsedStatements, setCollapsedStatements] = useState<Record<string, boolean>>({});

  // Confirmation dialog state
  const [isDeleteCardOpen, setIsDeleteCardOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<{ id: string; note?: string | null } | null>(null);
  const [liabilityToDelete, setLiabilityToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deletingLiabilityId, setDeletingLiabilityId] = useState<string | null>(null);

  React.useEffect(() => {
    setCurrentTransactions(transactions);
  }, [transactions]);

  // Group transactions into statement cycles
  const statementGroups = groupTransactionsByStatementDate(
    currentTransactions,
    card.statement_day,
    card.due_day
  );

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


  // 1. All statement cycles that actually have transactions or are active/current
  const cutoffsWithTransactions = statementGroups.filter(
    (g) => g.transactions.length > 0 || g.isCurrentMonth || g.isCurrentCycle
  );

  // 2. Default statement cycles: Current Unbilled Cycle on top + Current Month Cut-Off
  const defaultCutoffKeys = new Set(
    statementGroups
      .filter((g) => g.isCurrentMonth || g.isCurrentCycle)
      .map((g) => g.statementKey)
  );

  // Number of cut-offs with transactions that are hidden in default view
  const hiddenCutoffsCount = cutoffsWithTransactions.filter(
    (g) => !defaultCutoffKeys.has(g.statementKey)
  ).length;

  // 3. Filter groups based on search query and default vs all cut-offs toggle
  const visibleGroups = statementGroups
    .filter((group) => {
      if (searchQuery.trim()) return group.transactions.length > 0;
      if (showAllCutoffs) return group.transactions.length > 0 || group.isCurrentMonth || group.isCurrentCycle;
      return defaultCutoffKeys.has(group.statementKey);
    })
    .map((group) => {
      if (!searchQuery.trim()) return group;
      const query = searchQuery.toLowerCase();
      const filteredTxs = group.transactions.filter((tx) => {
        const noteMatch = (tx.note || '').toLowerCase().includes(query);
        const catMatch = (tx.category?.name || '').toLowerCase().includes(query);
        const amtMatch = String(tx.amount || '').includes(query);
        return noteMatch || catMatch || amtMatch;
      });
      return {
        ...group,
        transactions: filteredTxs,
      };
    })
    .filter((group) => {
      if (!searchQuery.trim()) return true;
      return group.transactions.length > 0;
    });

  // Active installment commitments from card-linked liabilities
  const activeCycleInstallments = useMemo(() => {
    return (linkedLiabilities || [])
      .filter((lib) => lib.status !== 'paid_off' && Number(lib.current_principal_balance) > 0 && Number(lib.monthly_payment) > 0)
      .map((lib) => {
        const remainingBalance = Number(lib.current_principal_balance || 0);
        const monthlyPayment = Number(lib.monthly_payment || 0);
        const totalTerms = Number(lib.term_months || 0);

        const paidCount = Array.isArray(lib.paid_installment_numbers)
          ? lib.paid_installment_numbers.length
          : 0;
        const remainingTerms = Math.max(0, totalTerms - paidCount);
        const currentTermIndex = Math.min(totalTerms, paidCount + 1);

        return {
          lib,
          remainingBalance,
          monthlyPayment,
          totalTerms,
          remainingTerms,
          currentTermIndex,
          paidCount,
        };
      });
  }, [linkedLiabilities]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 md:pb-12">
      {/* 1. Breadcrumb & Clean Header */}
      <div>
        <Link
          href="/dashboard/cards"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="size-3.5" />
          Back to Credit Cards
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {card.bank_name} {card.name}
              </h1>
              <Badge variant={urgencyInfo.variant} className="font-medium text-xs py-0.5 px-2.5">
                {urgencyInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Card ending in <strong className="font-mono text-foreground">•••• {card.last_4}</strong> • Bill is made on Day {card.statement_day}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 self-start sm:self-auto flex-wrap">
            <Button
              variant="soft"
              size="default"
              onClick={() => setIsEditModalOpen(true)}
              className="min-h-11 h-11 sm:min-h-12 sm:h-12 px-3 sm:px-4 font-semibold cursor-pointer"
            >
              <Pencil className="mr-1.5 size-4 text-muted-foreground" />
              Edit Card
            </Button>

            <Button
              variant="soft"
              size="default"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="min-h-11 h-11 sm:min-h-12 sm:h-12 px-3.5 sm:px-4 font-semibold cursor-pointer text-foreground hover:text-primary"
            >
              <Layers className="mr-1.5 size-4 text-primary" />
              Add Installment
            </Button>

            <Button
              variant="primary"
              size="default"
              onClick={() => setIsSwipeModalOpen(true)}
              className="min-h-11 h-11 sm:min-h-12 sm:h-12 px-4 sm:px-5 font-semibold cursor-pointer shadow-none"
            >
              <Plus className="mr-1.5 size-4" />
              Log Card Swipe
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Unified Hero: Compact Physical Card + Financial Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Physical Card Representation - Inheriting color, solid matte theme, border, glow, and pattern */}
        {(() => {
          const { theme, network, pattern } = parseCardStyle((card as any).color || card.color_theme, card.name);
          return (
            <div
              className={`p-5 sm:p-6 rounded-[22px] text-white border ${theme.borderColor} ${theme.bgColor} ${theme.glowShadow} relative overflow-hidden flex flex-col justify-between min-h-[210px] shadow-card transition-all duration-300`}
              style={{ backgroundColor: theme.bgHex || theme.accentHex }}
            >
              {/* Subtle solid accent top highlight line */}
              <div className={`absolute top-0 inset-x-8 h-[2px] ${theme.barColor} opacity-70 z-10`} />

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
                    className="size-7 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Edit card appearance"
                    aria-label="Edit card appearance"
                  >
                    <Pencil className="size-3" />
                  </button>
                </div>
              </div>

              {/* Middle: EMV Chip + Contactless Wave */}
              <div className="relative z-10 flex items-center justify-between my-2">
                <div className="flex items-center gap-2">
                  <EmvChip />
                  <ContactlessWave />
                </div>

                <div className="text-right">
                  <span className="text-xs font-medium uppercase tracking-wider text-white/80 block">
                    Available Spending:
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-white leading-tight">
                    {formatMoney(availablePower)}
                  </span>
                </div>
              </div>

              {/* Bottom: Card Number + Network Logo */}
              <div className="relative z-10 flex justify-between items-end pt-1">
                <div className="font-mono text-xs sm:text-sm font-semibold tracking-widest text-white/80">
                  •••• •••• •••• {card.last_4}
                </div>

                <div className="flex items-center">
                  {network === 'mastercard' ? (
                    <MastercardLogo className="h-5" />
                  ) : (
                    <VisaLogo className="h-4" />
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Financial Overview & Key Schedule */}
        <Card className="lg:col-span-2 shadow-card overflow-hidden flex flex-col justify-between">
          <CardContent className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
            {/* Credit Utilization Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  Left to spend:{' '}
                  <strong className="text-foreground font-bold text-sm">
                    {formatMoney(availablePower)}
                  </strong>
                </span>
                <span className="text-muted-foreground font-medium">
                  Used: <strong className="text-foreground">{formatMoney(totalUtilized)}</strong> ({utilizationPercent}%)
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
            <div className="bg-muted/60 p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-xs font-medium">Bill is made</span>
                <span className="font-bold text-foreground block mt-0.5">
                  Day {card.statement_day} of month
                </span>
                <span className="text-xs text-muted-foreground">
                  Next: {thisCardRec?.nextCutoffDateFormatted || 'Upcoming'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-xs font-medium">Pay by</span>
                <span className="font-bold text-foreground block mt-0.5">
                  Day {card.due_day} of month
                </span>
                <span className="text-xs text-success-soft-foreground font-semibold">
                  Due: {thisCardRec?.paymentDueDateFormatted || 'Upcoming'}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-xs font-medium">Days to pay</span>
                <span className="font-bold text-foreground block mt-0.5">
                  {thisCardRec ? `${thisCardRec.floatDays} Days` : '30-45 Days'}
                </span>
                <span 
                  className="text-xs text-muted-foreground block truncate"
                  title={thisCardRec?.advice || 'Optimized cash float'}
                >
                  {thisCardRec?.advice || 'Optimized cash float'}
                </span>
              </div>
            </div>

            {/* Direct Activity Summary */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
              <span className="truncate pr-2">
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
        <Card className="shadow-card">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Layers className="size-4" />
              </div>
              <div>
                <p className="font-bold text-foreground">Card Installment Plans</p>
                <p className="text-muted-foreground text-xs">
                  Track 0% interest promos, BNPL purchases, or bank loans deducted from this credit limit.
                </p>
              </div>
            </div>
            <Button
              variant="soft"
              size="sm"
              onClick={() => setIsInstallmentModalOpen(true)}
              className="text-xs font-bold shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Plus className="mr-1 size-3.5" />
              Record Installment
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
                    className="group p-3.5 rounded-2xl bg-muted/60 hover:bg-muted transition-all border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-primary/40 transition-colors">
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
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-primary/10 text-primary border-primary/25">
                              {paidCount} OF {totalTerms} PAID
                            </Badge>
                          )}
                          {lib.liability_type === 'credit_card_installment' && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold bg-primary/15 text-primary border-primary/30">
                              Card Plan
                            </Badge>
                          )}
                          {lib.property?.name && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal bg-background/50">
                              <Building2 className="size-2.5 mr-1" />
                              {lib.property.name}
                            </Badge>
                          )}
                          {isPaid ? (
                            <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[10px] py-0 px-1.5">
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

                    <div className="text-right sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 gap-1.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-extrabold text-foreground block text-sm sm:text-xs">
                            {formatMoney(remainingBalance)}
                          </span>
                          <span className="text-[10px] text-muted-foreground hidden sm:block">
                            Remaining balance
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={deletingLiabilityId === lib.id}
                          onClick={() => setLiabilityToDelete({ id: lib.id, name: lib.name })}
                          className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity size-7 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                          aria-label="Delete installment"
                        >
                          {deletingLiabilityId === lib.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Trash2 className="size-3.5" />
                          )}
                        </Button>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
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
                    className="p-3.5 rounded-2xl bg-muted/60 hover:bg-muted transition-all border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-background border border-border/60 flex items-center justify-center shrink-0 mt-0.5 group-hover:border-primary/40 transition-colors">
                        <HandCoins className="size-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {loan.contact?.name || 'Borrower'} {loan.reason ? `• ${loan.reason}` : ''}
                          </p>
                          {loan.is_installment && (
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/5 text-primary border-primary/20">
                              INSTALLMENT
                            </Badge>
                          )}
                          {isPaid ? (
                            <Badge variant="soft" className="bg-emerald-500/10 text-emerald-600 text-[10px] py-0 px-1.5">
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

                    <div className="text-right sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                      <div>
                        <span className="font-extrabold text-foreground block text-sm sm:text-xs">
                          {formatMoney(remainingBalance)}
                        </span>
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                          Remaining balance
                        </span>
                      </div>
                      <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform sm:mt-1">
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
        <Card className="shadow-card">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Receipt className="size-4 text-primary" />
                Statement Cycles & Transactions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly billing cycle ends on day {card.statement_day}
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
              <Button
                variant="soft"
                size="sm"
                onClick={() => setIsUploadStatementOpen(true)}
                className="min-h-10 text-xs font-semibold cursor-pointer"
              >
                <UploadCloud className="mr-1.5 size-3.5" />
                Upload Statement
              </Button>

              <div className="relative w-full sm:w-60">
                <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search purchases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs bg-muted min-h-10 h-10 rounded-xl"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statement Cut-Off Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-muted w-fit">
            <Button
              type="button"
              variant={!showAllCutoffs ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowAllCutoffs(false)}
              className="rounded-xl text-xs h-8 px-3 font-semibold"
            >
              Current & Unbilled
            </Button>
            <Button
              type="button"
              variant={showAllCutoffs ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setShowAllCutoffs(true)}
              className="rounded-xl text-xs h-8 px-3 font-semibold"
            >
              All Cut-Offs ({cutoffsWithTransactions.length})
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-medium">
            {!showAllCutoffs && hiddenCutoffsCount > 0 ? (
              <span>
                {hiddenCutoffsCount} other statement cut-off{hiddenCutoffsCount > 1 ? 's' : ''} hidden
              </span>
            ) : (
              <span>Showing all active statement cut-offs</span>
            )}
          </div>
        </div>

        {/* Statement Groups List */}
        {visibleGroups.length === 0 ? (
          <Card className="shadow-card text-center p-10 space-y-3">
            <div className="size-10 rounded-2xl bg-muted text-muted-foreground mx-auto flex items-center justify-center">
              <Receipt className="size-5" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Transactions Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No transactions matched "${searchQuery}". Try clearing the search.`
                : 'No card purchases recorded for this statement period.'}
            </p>
            {!searchQuery && (
              <Button
                variant="primary"
                onClick={() => setIsSwipeModalOpen(true)}
                className="min-h-10 text-xs font-semibold"
              >
                <Plus className="mr-1.5 size-3.5" />
                Log First Swipe
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const isCollapsed = collapsedStatements[group.statementKey] ?? false;
              const isRelevantCycle = group.isCurrentCycle || group.status === 'billed_due_soon';
              const cycleInstallmentTotal = isRelevantCycle
                ? activeCycleInstallments.reduce((sum, item) => sum + item.monthlyPayment, 0)
                : 0;

              return (
                <Card key={group.statementKey} className="shadow-card overflow-hidden">
                  <CardContent className="p-5 sm:p-6 space-y-3">
                    {/* Statement Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-foreground">
                            Bill is made: {group.statementDateFormatted}
                          </span>

                          {group.isCurrentCycle ? (
                            <Badge variant="secondary" className="text-xs font-bold">
                              Current Unbilled Cycle
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
                          Cycle: {group.cycleStartDateFormatted} – {group.cycleEndDateFormatted} • Pay by: <strong className="text-foreground">{group.dueDateFormatted}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="text-xs text-muted-foreground block font-medium">
                            Statement Total
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-foreground">
                            {formatMoney(group.netSpend + cycleInstallmentTotal)}
                          </span>
                          {cycleInstallmentTotal > 0 && (
                            <span className="text-[10px] text-muted-foreground block font-medium">
                              incl. {formatMoney(cycleInstallmentTotal)} installments
                            </span>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleStatementCollapse(group.statementKey)}
                          className="size-8 rounded-xl bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                          aria-label={isCollapsed ? 'Expand statement' : 'Collapse statement'}
                        >
                          {isCollapsed ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronUp className="size-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Statement Transactions List */}
                    {!isCollapsed && (
                      <div className="space-y-2 pt-1">
                        {/* Active Card Installment Billings */}
                        {isRelevantCycle && activeCycleInstallments.length > 0 && (
                          <div className="space-y-1.5 pb-1">
                            {activeCycleInstallments.map((inst) => (
                              <div
                                key={`cycle-inst-${inst.lib.id}`}
                                className="group p-3 rounded-2xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors flex items-start justify-between text-xs gap-3 min-w-0"
                              >
                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                  <div className="p-1.5 rounded-xl bg-card shadow-xs shrink-0 text-primary mt-0.5">
                                    <Layers className="size-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                                      <span className="font-bold text-foreground truncate">
                                        {inst.lib.name}
                                      </span>
                                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-primary/15 text-primary border-primary/30">
                                        {inst.paidCount} OF {inst.totalTerms} PAID
                                      </Badge>
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-card text-muted-foreground shadow-xs shrink-0">
                                        Loan Installment
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                      <span>Due: <strong className="text-foreground">{group.dueDateFormatted}</strong></span>
                                      <span>•</span>
                                      <span>Remaining bal: {formatMoney(inst.remainingBalance)}</span>
                                    </div>
                                    <div className="pt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setScheduleLiability(inst.lib)}
                                        className="inline-flex items-center gap-1 text-2xs font-semibold text-primary hover:underline cursor-pointer"
                                      >
                                        <Calendar className="size-2.5" />
                                        View Amortization Schedule →
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="shrink-0 flex items-center gap-2 text-right pt-0.5">
                                  <div className="text-right">
                                    <span className="text-xs sm:text-sm font-extrabold whitespace-nowrap text-foreground block">
                                      -{formatMoney(inst.monthlyPayment)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block font-medium">
                                      {inst.remainingTerms} mos left
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {group.transactions.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-muted/60 text-center space-y-1.5">
                            <p className="text-xs text-muted-foreground">
                              {group.isCurrentCycle
                                ? isRelevantCycle && activeCycleInstallments.length > 0
                                  ? 'No additional purchases recorded in this statement cycle.'
                                  : 'No purchases recorded in this statement cycle yet. Charges logged after your bill is made will appear here.'
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
                        ) : (
                          <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5">
                            {group.transactions.map((tx) => (
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
                                    className={`text-xs sm:text-sm font-extrabold whitespace-nowrap ${
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
                                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity size-7 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
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
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Bottom helper card when cutoffs are hidden */}
            {!showAllCutoffs && hiddenCutoffsCount > 0 && !searchQuery.trim() && (
              <Card className="shadow-card p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4 text-primary shrink-0" />
                  <p>
                    <strong className="text-foreground">{hiddenCutoffsCount}</strong> other statement cut-off{hiddenCutoffsCount > 1 ? 's' : ''} hidden.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => setShowAllCutoffs(true)}
                  className="font-bold shrink-0 cursor-pointer text-xs"
                >
                  Show All {cutoffsWithTransactions.length} Cut-Offs →
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* 5. Card Settings & Danger Zone */}
      <div className="mt-8 pt-6 pb-28 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Card Settings & Danger Zone
        </h4>

        <Card className="shadow-card">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-foreground">
                Delete Credit Card
              </h5>
              <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                Permanently remove this card and all associated statement records. Existing transaction records will remain preserved in your general ledger.
              </p>
              <p className="text-xs text-muted-foreground/60 font-mono pt-1">
                Credit Card ID: {card.id}
              </p>
            </div>

            <Button
              type="button"
              variant="destructive"
              onClick={() => setIsDeleteCardOpen(true)}
              className="min-h-10 text-xs font-bold shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete Card
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
