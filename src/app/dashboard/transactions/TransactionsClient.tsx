'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { deleteTransactionAction, fetchMoreTransactionsAction } from '@/app/actions/transactions';
import { toast } from 'sonner';
import {
  Wallet,
  Plus,
  Trash2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  HandCoins,
  PiggyBank,
  CreditCard as CardIcon,
  Camera,
  Loader2,
} from 'lucide-react';
import { TransactionModal } from '@/components/Forms/TransactionModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { Category, CreditCard, SavingsAccount, Transaction } from '@/types';
import { confirmModal } from '@/components/ui/GlobalDialog';

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  categories: Category[];
  creditCards: CreditCard[];
  savingsAccounts?: SavingsAccount[];
}

export function TransactionsClient({
  initialTransactions,
  categories,
  creditCards,
  savingsAccounts = [],
}: TransactionsClientProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [hasMoreServer, setHasMoreServer] = useState<boolean>(initialTransactions.length >= 50);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [autoScanReceipt, setAutoScanReceipt] = useState(false);
  const [kindFilter, setKindFilter] = useState<'all' | 'expense' | 'income' | 'transfer'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(20);

  // Current date (YYYY-MM-DD)
  const now = new Date();
  const todayISO = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Filtered transactions:
  // 1. Strictly exclude future dates (occurred_on <= todayISO)
  // 2. Display from current date to oldest (current on top)
  const filtered = transactions
    .filter((t) => {
      // Exclude future dates
      if (t.occurred_on > todayISO) return false;

      // Filter by kind
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;

      // Filter by category
      if (selectedCategory !== 'all' && t.category_id !== selectedCategory) return false;

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const categoryName = t.category?.name?.toLowerCase() || '';
        const noteText = t.note?.toLowerCase() || '';
        const methodText = t.payment_method?.toLowerCase() || '';
        return (
          categoryName.includes(query) ||
          noteText.includes(query) ||
          methodText.includes(query)
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Sort by occurred_on descending (newest on top)
      const dateA = new Date(a.occurred_on).getTime();
      const dateB = new Date(b.occurred_on).getTime();
      if (dateB !== dateA) return dateB - dateA;

      // If dates equal, fallback to created_at descending
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const handleLoadMore = async () => {
    // If we have more filtered rows locally, expand the window first
    if (visibleCount < filtered.length) {
      setVisibleCount((prev) => prev + 25);
      return;
    }

    // Otherwise, fetch older cursor page from database
    if (!hasMoreServer || isLoadingMore) return;

    setIsLoadingMore(true);
    try {
      const oldest = transactions[transactions.length - 1];
      if (!oldest) return;

      const res = await fetchMoreTransactionsAction({
        beforeOccurredOn: oldest.occurred_on,
        beforeCreatedAt: oldest.created_at,
        limit: 50,
      });

      if (res.transactions && res.transactions.length > 0) {
        setTransactions((prev) => [...prev, ...res.transactions]);
        setVisibleCount((prev) => prev + res.transactions.length);
      }
      setHasMoreServer(Boolean(res.hasMore));
    } catch {
      toast.error('Failed to load older transactions');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Delete Transaction?',
      description: 'Are you sure you want to delete this transaction record? This cannot be undone.',
      confirmText: 'Delete Record',
      variant: 'danger',
    });
    if (!confirmed) return;

    const res = await deleteTransactionAction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success('Transaction deleted.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            All Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time feed of your expenses, income, debt payments, and savings deposits.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
          <Button
            type="button"
            variant="soft"
            onClick={() => {
              setAutoScanReceipt(true);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial rounded-xl gap-2 font-semibold min-h-11 h-11 active:scale-[0.99] transition-transform text-xs sm:text-sm"
          >
            <Camera className="w-4 h-4 text-primary shrink-0" />
            <span>Scan Receipt</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              setAutoScanReceipt(false);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial rounded-xl gap-2 font-semibold shadow-xs min-h-11 h-11 active:scale-[0.99] transition-transform text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Record Transaction</span>
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      <Card className="p-5 shadow-xs overflow-hidden min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Kind Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-2xl max-w-full overflow-x-auto no-scrollbar min-w-0">
            <Button
              type="button"
              variant={kindFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setKindFilter('all')}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                kindFilter === 'all' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              All Activity
            </Button>
            <Button
              type="button"
              variant={kindFilter === 'expense' ? 'destructive-soft' : 'ghost'}
              size="sm"
              onClick={() => setKindFilter('expense')}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap gap-1.5 ${
                kindFilter === 'expense' ? 'shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Expenses
            </Button>
            <Button
              type="button"
              variant={kindFilter === 'income' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setKindFilter('income')}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap gap-1.5 ${
                kindFilter === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Income
            </Button>
            <Button
              type="button"
              variant={kindFilter === 'transfer' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setKindFilter('transfer')}
              className={`rounded-xl text-xs font-semibold whitespace-nowrap gap-1.5 ${
                kindFilter === 'transfer' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs' : 'text-muted-foreground'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              Transfers
            </Button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
              <Search className="w-4 h-4" />
            </div>
            <Input
              type="text"
              placeholder="Search notes or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 max-w-full">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-semibold text-muted-foreground shrink-0">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setVisibleCount(20);
              }}
              className="py-1.5 px-3 text-xs bg-muted text-foreground rounded-xl max-w-[200px] sm:max-w-none truncate outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind === 'income' ? 'Income' : 'Expense'})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-muted-foreground font-medium">
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} transactions
          </span>
        </div>
      </Card>

      {/* Transactions Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No transactions found"
          description={
            initialTransactions.length === 0
              ? 'Start tracking your spending by recording your first expense or income.'
              : 'No transactions match your current filters.'
          }
          actionText={initialTransactions.length === 0 ? 'Record Transaction' : undefined}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <Card className="p-5 sm:p-7 shadow-xs overflow-hidden min-w-0 space-y-4">
          <div className="space-y-3">
            {filtered.slice(0, visibleCount).map((t) => (
              <div
                key={t.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-muted/50 hover:bg-muted/80 transition-colors flex items-center justify-between gap-3 group min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={`size-9 sm:size-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                      t.kind === 'income'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : t.kind === 'transfer'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {t.kind === 'income' ? '+' : t.kind === 'transfer' ? '⇄' : '-'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-foreground whitespace-normal break-words">
                        {t.kind === 'transfer'
                          ? `Transfer: ${t.savings?.name || 'Vault'} → ${t.transfer_to_savings?.name || 'Vault'}`
                          : t.category?.name || (t.kind === 'income' ? 'Income' : 'Expense')}
                      </p>
                      <Badge variant="soft" className="text-2xs capitalize shrink-0 font-medium">
                        {t.kind === 'transfer' ? 'Inter-Vault' : t.payment_method.replace('_', ' ')}
                      </Badge>
                      {t.loan_id && (
                        <Link
                          href={`/dashboard/loans/${t.loan_id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors shrink-0"
                        >
                          <HandCoins className="w-3 h-3" />
                          Loan: {t.loan?.contact?.name || 'Borrower'} →
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs text-muted-foreground mt-0.5 min-w-0">
                      <span className="shrink-0">{formatDate(t.occurred_on)}</span>
                      {t.note && <span className="truncate max-w-[160px] sm:max-w-xs">• {t.note}</span>}

                      {/* Traceable Connected Credit Card Link */}
                      {t.credit_card && (
                        <Link
                          href={`/dashboard/cards/${t.credit_card.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors shrink-0 truncate max-w-[200px]"
                          title="Traceable: View card details and statement breakdown"
                        >
                          <CardIcon className="w-3 h-3 text-primary shrink-0" />
                          <span className="truncate">{t.credit_card.bank_name || t.credit_card.name} (••{t.credit_card.last_4})</span> →
                        </Link>
                      )}

                      {/* Traceable Connected Savings Account Link */}
                      {t.savings && (
                        <Link
                          href="/dashboard/savings"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-full transition-colors shrink-0 truncate max-w-[200px]"
                          title="Traceable: View under Savings Stash"
                        >
                          <PiggyBank className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{t.savings.name} ({t.savings.institution_name})</span> →
                        </Link>
                      )}

                      {/* Traceable Connected Destination Savings Account Link */}
                      {t.transfer_to_savings && (
                        <Link
                          href="/dashboard/savings"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-0.5 rounded-full transition-colors shrink-0 truncate max-w-[200px]"
                          title="Traceable: Destination Savings Vault"
                        >
                          <PiggyBank className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate">To: {t.transfer_to_savings.name}</span> →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <span
                    className={`text-sm sm:text-base font-extrabold whitespace-nowrap ${
                      t.kind === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : t.kind === 'transfer'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-foreground'
                    }`}
                  >
                    {t.kind === 'income' ? '+' : t.kind === 'transfer' ? '⇄ ' : '- '} {formatMoney(t.amount)}
                  </span>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(t.id)}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Lazy Load / Server Cursor Button */}
          {(filtered.length > visibleCount || hasMoreServer) && (
            <div className="pt-4 text-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isLoadingMore}
                onClick={handleLoadMore}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Fetching Older Records...
                  </>
                ) : filtered.length > visibleCount ? (
                  `Load More Transactions (${filtered.length - visibleCount} remaining in view)`
                ) : (
                  'Load Older Transactions From Server'
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} loaded records
                {hasMoreServer && ' (more available in archive)'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setAutoScanReceipt(false);
        }}
        categories={categories}
        creditCards={creditCards}
        savingsAccounts={savingsAccounts}
        autoTriggerScan={autoScanReceipt}
      />
    </div>
  );
}
