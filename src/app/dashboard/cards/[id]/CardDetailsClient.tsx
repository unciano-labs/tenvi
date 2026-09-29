'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Zap,
  TrendingDown,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  UploadCloud,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { deleteCreditCardAction } from '@/app/actions/cards';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { CreditCard, Transaction, Category, Loan } from '@/types';
import {
  formatMoney,
  formatDate,
  calculateNextDueDate,
  groupTransactionsByStatementDate,
  calculateOptimalCardToSwipe,
  StatementGroup,
} from '@/lib/finance/calculations';
import { CreditCardModal } from '@/components/Forms/CreditCardModal';
import { TransactionModal } from '@/components/Forms/TransactionModal';
import { StatementUploadModal } from '@/components/Forms/StatementUploadModal';
import { confirmModal } from '@/components/UI/GlobalDialog';

interface CardDetailsClientProps {
  card: CreditCard;
  transactions: Transaction[];
  linkedLoans?: Loan[];
  categories: Category[];
  allCards: CreditCard[];
}

export function CardDetailsClient({
  card,
  transactions,
  linkedLoans = [],
  categories,
  allCards,
}: CardDetailsClientProps) {
  const router = useRouter();

  const [currentTransactions, setCurrentTransactions] = useState<Transaction[]>(transactions);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSwipeModalOpen, setIsSwipeModalOpen] = useState(false);
  const [isUploadStatementOpen, setIsUploadStatementOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllCutoffs, setShowAllCutoffs] = useState(false);
  const [collapsedStatements, setCollapsedStatements] = useState<Record<string, boolean>>({});

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
  const totalDirectSpend = currentTransactions
    .filter((t) => t.kind === 'expense' && !t.loan_id)
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalSwipedLoansRemaining = linkedLoans.reduce(
    (sum, l) => sum + Number(l.balance_remaining || 0),
    0
  );

  const totalUtilized = totalDirectSpend + totalSwipedLoansRemaining;
  const creditLimit = Number(card.credit_limit || 0);
  const availablePower = Math.max(0, creditLimit - totalUtilized);
  const utilizationPercent =
    creditLimit > 0 ? Math.min(100, Math.round((totalUtilized / creditLimit) * 100)) : 0;
  const dueInfo = calculateNextDueDate(card.due_day);

  // Grace period / float calculation for today
  const floatResult = calculateOptimalCardToSwipe([card], currentTransactions, linkedLoans, new Date());
  const thisCardRec = floatResult.bestCard;

  const handleDeleteTransaction = async (id: string, note?: string | null) => {
    const confirmed = await confirmModal({
      title: 'Delete Transaction?',
      description: `Are you sure you want to delete this card transaction${note ? ` ("${note}")` : ''}? This action cannot be undone.`,
      confirmText: 'Delete Transaction',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }

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

  const handleDelete = async () => {
    const confirmed = await confirmModal({
      title: 'Remove Credit Card?',
      description: `Are you sure you want to remove ${card.bank_name} - ${card.name}? Card transaction history will be preserved in your general transactions.`,
      confirmText: 'Remove Card',
      variant: 'danger',
    });
    if (!confirmed) return;
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

  const getCardBgStyle = (theme?: string) => {
    if (!theme) return { backgroundColor: '#0f172a' };
    if (theme.startsWith('#')) return { backgroundColor: theme };
    switch (theme) {
      case 'indigo':
        return { backgroundColor: '#1e3a8a' };
      case 'emerald':
        return { backgroundColor: '#065f46' };
      case 'rose':
        return { backgroundColor: '#9f1239' };
      case 'amber':
        return { backgroundColor: '#92400e' };
      default:
        return { backgroundColor: '#0f172a' };
    }
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150 max-w-6xl mx-auto">
      {/* 1. Breadcrumb & Clean Header */}
      <div>
        <Link
          href="/dashboard/cards"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Cards & Due Dates
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                {card.bank_name} {card.name}
              </h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  dueInfo.urgency === 'critical'
                    ? 'bg-rose-50 text-rose-700'
                    : dueInfo.urgency === 'warning'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {dueInfo.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Card ending in <strong className="font-mono text-slate-700">•••• {card.last_4}</strong> • Statement cutoff on Day {card.statement_day}
            </p>
          </div>

          {/* Clean Top Action Buttons (Primary and Edit only - no misplaced delete button here) */}
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="bili-btn-secondary py-2.5 px-3.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              Edit Card
            </button>

            <button
              onClick={() => setIsSwipeModalOpen(true)}
              className="bili-btn-primary py-2.5 px-4 text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Log Card Swipe
            </button>
          </div>
        </div>
      </div>

      {/* 2. Unified Hero: Compact Physical Card + Financial Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* Physical Card Representation */}
        <div
          className="p-5 sm:p-6 rounded-3xl text-white shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[190px]"
          style={getCardBgStyle(card.color_theme)}
        >
          <div className="flex justify-between items-start">
            <div className="min-w-0 pr-2">
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400 truncate">
                {card.bank_name}
              </p>
              <p className="text-base sm:text-lg font-bold tracking-tight mt-0.5 truncate">
                {card.name}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
              <CardIcon className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <p className="text-xs text-slate-400 font-medium">Card Number</p>
              <p className="text-sm font-mono tracking-widest font-bold">
                •••• •••• •••• {card.last_4}
              </p>
            </div>

            <div className="flex justify-between items-end border-t border-white/10 pt-2 text-xs">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Cutoff</span>
                <span className="font-bold text-slate-200">Day {card.statement_day}</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-medium">Credit Limit</span>
                <span className="font-bold text-white">
                  {creditLimit > 0 ? formatMoney(creditLimit) : 'No limit set'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Financial Overview & Key Schedule */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden min-w-0 border border-slate-100 flex flex-col justify-between space-y-4">
          {/* Credit Utilization Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-500 font-medium">
                Available Spending Power:{' '}
                <strong className="text-slate-900 font-bold text-sm">
                  {formatMoney(availablePower)}
                </strong>
              </span>
              <span className="text-slate-400 font-medium">
                Used: <strong className="text-slate-700">{formatMoney(totalUtilized)}</strong> ({utilizationPercent}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  utilizationPercent > 80
                    ? 'bg-rose-500'
                    : utilizationPercent > 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </div>

          {/* Key Schedule & Smart Float Well */}
          <div className="bg-[#F6F7F9] p-3.5 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-xs font-medium">Statement Cutoff</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                Day {card.statement_day} of month
              </span>
              <span className="text-xs text-slate-400">
                Next: {thisCardRec?.nextCutoffDateFormatted || 'Upcoming'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-xs font-medium">Payment Due Day</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                Day {card.due_day} of month
              </span>
              <span className="text-xs text-emerald-700 font-semibold">
                Due: {thisCardRec?.paymentDueDateFormatted || 'Upcoming'}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block text-xs font-medium">Interest-Free Float</span>
              <span className="font-bold text-slate-900 block mt-0.5">
                {thisCardRec ? `${thisCardRec.floatDays} Days Runway` : '30-45 Days'}
              </span>
              <span 
                className="text-xs text-slate-500 block truncate"
                title={thisCardRec?.advice || 'Optimized cash runway'}
              >
                {thisCardRec?.advice || 'Optimized cash runway'}
              </span>
            </div>
          </div>

          {/* Direct Activity Summary */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
            <span className="truncate pr-2">
              {totalUtilized > 0 ? (
                <>
                  Direct Swipes: <strong className="text-slate-800">{formatMoney(totalDirectSpend)}</strong> ({currentTransactions.length})
                  {totalSwipedLoansRemaining > 0 && (
                    <span className="text-blue-700 font-medium"> • {formatMoney(totalSwipedLoansRemaining)} for others</span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">No active card balance currently logged.</span>
              )}
            </span>

            <span className="text-xs text-slate-400 shrink-0 font-medium">
              Next Due: {dueInfo.nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Swiped for Others / Connected Installment Loans */}
      {linkedLoans.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden min-w-0 border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                <HandCoins className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Swiped for Others on this Card ({linkedLoans.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Loans charged to this card line that friends/relatives are paying back.
                </p>
              </div>
            </div>

            <span className="text-xs font-extrabold text-blue-900 bg-blue-50 px-3 py-1 rounded-xl">
              {formatMoney(totalSwipedLoansRemaining)} remaining
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {linkedLoans.map((loan) => (
              <Link
                key={loan.id}
                href={`/dashboard/loans/${loan.id}`}
                className="p-3 rounded-2xl bg-[#F6F7F9] hover:bg-slate-200/70 transition-colors flex items-center justify-between group text-xs"
              >
                <div className="min-w-0 pr-2">
                  <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {loan.contact?.name || 'Borrower'} {loan.reason ? `• ${loan.reason}` : ''}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Original: {formatMoney(loan.amount)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-extrabold text-blue-900 block">
                    {formatMoney(loan.balance_remaining)}
                  </span>
                  <span className="text-xs text-blue-700 font-semibold">
                    Schedule →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. Statement Cycles & Transactions Section */}
      <div className="space-y-4">
        {/* Section Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-indigo-600" />
              Statement Cycles & Transactions
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Monthly billing cycle ends on day {card.statement_day}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Single clean Upload Statement button */}
            <button
              onClick={() => setIsUploadStatementOpen(true)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Statement
            </button>

            {/* Search Filter */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search swipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bili-input w-full pl-8 py-1.5 text-xs bg-slate-50 border-0"
              />
            </div>
          </div>
        </div>

        {/* Statement Cut-Off Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-xs">
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white shadow-xs w-fit">
            <button
              type="button"
              onClick={() => setShowAllCutoffs(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !showAllCutoffs
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current & Unbilled
            </button>
            <button
              type="button"
              onClick={() => setShowAllCutoffs(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                showAllCutoffs
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Cut-Offs ({cutoffsWithTransactions.length})
            </button>
          </div>

          <div className="text-xs text-slate-400 font-medium">
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
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm space-y-3 border border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Transactions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery
                ? `No transactions matched "${searchQuery}". Try clearing the search.`
                : 'No card swipes recorded for this statement period.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsSwipeModalOpen(true)}
                className="bili-btn-primary py-2 px-3.5 text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Log First Swipe
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const isCollapsed = collapsedStatements[group.statementKey] ?? false;

              return (
                <div
                  key={group.statementKey}
                  className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden min-w-0 border border-slate-100 space-y-3"
                >
                  {/* Statement Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-extrabold text-slate-900">
                          Cutoff: {group.statementDateFormatted}
                        </span>

                        {group.isCurrentCycle ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
                            Current Unbilled Cycle
                          </span>
                        ) : group.status === 'billed_due_soon' ? (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800">
                            {group.statusLabel}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {group.statusLabel}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400">
                        Cycle: {group.cycleStartDateFormatted} – {group.cycleEndDateFormatted} • Due: <strong className="text-slate-700">{group.dueDateFormatted}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">
                          Statement Total
                        </span>
                        <span className="text-sm sm:text-base font-extrabold text-slate-900">
                          {formatMoney(group.netSpend)}
                        </span>
                      </div>

                      <button
                        onClick={() => toggleStatementCollapse(group.statementKey)}
                        className="p-1.5 rounded-xl bg-[#F6F7F9] hover:bg-slate-200/80 text-slate-600 transition-colors cursor-pointer"
                        title={isCollapsed ? 'Expand statement' : 'Collapse statement'}
                      >
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Statement Transactions List */}
                  {!isCollapsed && (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      {group.transactions.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-[#F6F7F9] text-center space-y-1.5">
                          <p className="text-xs text-slate-500">
                            {group.isCurrentCycle
                              ? 'No swipes recorded in this statement cycle yet. Charges logged after the last cutoff will appear here.'
                              : 'No swipes recorded for this statement period.'}
                          </p>
                          {group.isCurrentCycle && (
                            <button
                              onClick={() => setIsSwipeModalOpen(true)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Log a swipe for this cycle
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5 bili-scrollbar">
                          {group.transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="group p-3 rounded-2xl bg-[#F6F7F9] hover:bg-slate-200/60 transition-colors flex items-center justify-between text-xs gap-3"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="p-1.5 rounded-xl bg-white shadow-2xs shrink-0 text-slate-700">
                                  {tx.kind === 'expense' ? (
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                                  ) : (
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 truncate">
                                      {tx.note || 'Card Purchase'}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white text-slate-700 shadow-2xs shrink-0">
                                      {tx.category?.name || 'General'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-400 block mt-0.5">
                                    {formatDate(tx.occurred_on)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span
                                  className={`text-xs sm:text-sm font-extrabold whitespace-nowrap ${
                                    tx.kind === 'expense' ? 'text-slate-900' : 'text-emerald-700'
                                  }`}
                                >
                                  {tx.kind === 'expense' ? '-' : '+'}
                                  {formatMoney(Number(tx.amount))}
                                </span>

                                {/* Accessible touch/hover Delete button */}
                                <button
                                  type="button"
                                  disabled={deletingTxId === tx.id}
                                  onClick={() => handleDeleteTransaction(tx.id, tx.note)}
                                  className="opacity-70 sm:opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="Delete transaction"
                                >
                                  {deletingTxId === tx.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Bottom helper card when cutoffs are hidden */}
            {!showAllCutoffs && hiddenCutoffsCount > 0 && !searchQuery.trim() && (
              <div className="p-3.5 rounded-3xl bg-white shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <p className="text-slate-600">
                    <strong className="text-slate-900">{hiddenCutoffsCount}</strong> other statement cut-off{hiddenCutoffsCount > 1 ? 's' : ''} hidden.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllCutoffs(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#F6F7F9] hover:bg-slate-200/70 text-slate-900 font-bold transition-colors shadow-2xs shrink-0 cursor-pointer"
                >
                  Show All {cutoffsWithTransactions.length} Cut-Offs →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Card Settings & Danger Zone (Conventional, Safe Placement for Destructive Actions) */}
      <div className="mt-8 pt-6 border-t border-slate-200/60 pb-28 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Card Settings & Danger Zone
        </h4>

        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden min-w-0 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h5 className="text-sm font-bold text-slate-900">
              Delete Credit Card
            </h5>
            <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
              Permanently remove this card and all associated statement records. Existing transaction records will remain preserved in your general ledger.
            </p>
            <p className="text-xs text-slate-400 font-mono pt-1">
              Credit Card ID: {card.id}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            Delete Card
          </button>
        </div>
      </div>

      {/* Modals */}
      <TransactionModal
        isOpen={isSwipeModalOpen}
        onClose={() => setIsSwipeModalOpen(false)}
        categories={categories}
        creditCards={allCards}
        defaultCreditCardId={card.id}
        defaultPaymentMethod="credit_card"
      />

      <CreditCardModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        card={card}
      />

      <StatementUploadModal
        isOpen={isUploadStatementOpen}
        onClose={() => setIsUploadStatementOpen(false)}
        card={card}
        categories={categories}
      />
    </div>
  );
}
