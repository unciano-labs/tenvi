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
  ChevronDown,
} from 'lucide-react';
import { TransactionModal } from '@/components/Forms/TransactionModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

  const kindTabs = [
    { value: 'all' as const, label: 'All activity', icon: null, iconClass: '' },
    { value: 'expense' as const, label: 'Expenses', icon: ArrowUpRight, iconClass: 'text-danger' },
    { value: 'income' as const, label: 'Income', icon: ArrowDownLeft, iconClass: 'text-success' },
    { value: 'transfer' as const, label: 'Transfers', icon: ArrowLeftRight, iconClass: 'text-primary' },
  ];
  const visibleRows = filtered.slice(0, visibleCount);
  const shownCount = Math.min(visibleCount, filtered.length);

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-display text-foreground">All transactions</h1>
          <p className="mt-2 max-w-prose text-sm sm:text-base text-muted-foreground">
            Real-time feed of your expenses, income, debt payments, and savings deposits.
          </p>
        </div>

        <div className="page-header-actions w-full sm:w-auto">
          <Button
            type="button"
            variant="soft"
            onClick={() => {
              setAutoScanReceipt(true);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial sm:h-11 sm:min-h-11"
          >
            <Camera className="size-4 text-primary" />
            Scan receipt
          </Button>

          <Button
            type="button"
            onClick={() => {
              setAutoScanReceipt(false);
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-initial sm:h-11 sm:min-h-11"
          >
            <Plus className="size-4" />
            Record transaction
          </Button>
        </div>
      </div>

      {/* Filter toolbar: kind tabs, search and category wrap as one row when space allows */}
      <Card className="gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* Kind filter (segmented control) */}
          <div
            role="group"
            aria-label="Filter by type"
            className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-muted p-1"
          >
            {kindTabs.map((tab) => {
              const active = kindFilter === tab.value;
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-pressed={active}
                  onClick={() => setKindFilter(tab.value)}
                  className={`shrink-0 rounded-xl px-3 text-sm ${
                    active
                      ? 'bg-card text-foreground shadow-sm hover:bg-card'
                      : 'font-medium text-muted-foreground hover:bg-card/60'
                  }`}
                >
                  {Icon && <Icon className={`size-4 ${active ? tab.iconClass : ''}`} />}
                  {tab.label}
                </Button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative min-w-[min(100%,16rem)] flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search notes or categories"
              aria-label="Search notes or categories"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 sm:h-10 pl-10 text-base sm:text-sm rounded-xl"
            />
          </div>

          {/* Category filter */}
          <div className="relative min-w-[min(100%,12rem)] flex-1 @3xl/main:flex-none @3xl/main:w-56">
            <Filter className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select
              aria-label="Filter by category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setVisibleCount(20);
              }}
              className="h-12 sm:h-10 w-full appearance-none truncate rounded-xl bg-muted pl-10 pr-9 text-base sm:text-sm text-foreground outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) hover:bg-muted/80 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind === 'income' ? 'Income' : 'Expense'})
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        <p className="num text-label text-muted-foreground" aria-live="polite">
          Showing {shownCount} of {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}
        </p>
      </Card>

      {/* Transactions Feed */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={initialTransactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
          description={
            initialTransactions.length === 0
              ? 'Start tracking your spending by recording your first expense or income.'
              : 'No transactions match your current filters.'
          }
          actionText={initialTransactions.length === 0 ? 'Record transaction' : undefined}
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <Card className="gap-4 p-3 sm:p-5">
          {/* Re-keyed on filter change so the new result set springs in (stagger capped at 5) */}
          <ul key={`${kindFilter}|${selectedCategory}`} className="flex flex-col gap-2">
            {visibleRows.map((t, index) => {
              const hasBottomBadges = Boolean(
                t.loan_id || t.credit_card || t.savings || t.transfer_to_savings
              );
              const title =
                t.kind === 'transfer'
                  ? `Transfer: ${t.savings?.name || 'Vault'} → ${t.transfer_to_savings?.name || 'Vault'}`
                  : t.category?.name || (t.kind === 'income' ? 'Income' : 'Expense');

              return (
                <li
                  key={t.id}
                  style={{ ['--stagger' as string]: index }}
                  className="motion-pop-in group flex min-w-0 items-start gap-3 rounded-xl bg-muted/50 p-3 sm:p-4 transition-colors duration-(--motion-fast) ease-(--ease-in-out) hover:bg-muted/80"
                >
                  {/* Kind marker */}
                  <div
                    aria-hidden="true"
                    className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      t.kind === 'income'
                        ? 'bg-success-soft text-success'
                        : t.kind === 'transfer'
                        ? 'bg-lightprimary text-primary'
                        : 'bg-danger-soft text-danger'
                    }`}
                  >
                    {t.kind === 'income' ? '+' : t.kind === 'transfer' ? '⇄' : '−'}
                  </div>

                  {/* Details */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p
                      className="line-clamp-2 text-sm sm:text-base font-semibold leading-snug text-foreground [overflow-wrap:anywhere]"
                      title={title}
                    >
                      {title}
                    </p>

                    <div className="flex min-w-0 items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                      <span className="num shrink-0">{formatDate(t.occurred_on)}</span>
                      <Badge variant="soft" className="shrink-0 text-2xs font-medium capitalize">
                        {t.kind === 'transfer' ? 'Inter-vault' : t.payment_method.replace('_', ' ')}
                      </Badge>
                      {t.note && (
                        <span className="min-w-0 truncate" title={t.note}>
                          {t.note}
                        </span>
                      )}
                    </div>

                    {/* Traceable link pills */}
                    {hasBottomBadges && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {t.loan_id && (
                          <Link
                            href={`/dashboard/loans/${t.loan_id}`}
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-lightprimary px-2.5 py-1 text-xs font-medium text-primary transition-colors duration-(--motion-fast) hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                          >
                            <HandCoins className="size-3.5 shrink-0" />
                            <span className="truncate">Loan: {t.loan?.contact?.name || 'Borrower'} →</span>
                          </Link>
                        )}

                        {t.credit_card && (
                          <Link
                            href={`/dashboard/cards/${t.credit_card.id}`}
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-lightprimary px-2.5 py-1 text-xs font-medium text-primary transition-colors duration-(--motion-fast) hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                            title="Traceable: View card details and statement breakdown"
                          >
                            <CardIcon className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {t.credit_card.bank_name || t.credit_card.name} (••{t.credit_card.last_4}) →
                            </span>
                          </Link>
                        )}

                        {t.savings && (
                          <Link
                            href="/dashboard/savings"
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success transition-colors duration-(--motion-fast) hover:bg-success-soft/70 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                            title="Traceable: View under Savings Stash"
                          >
                            <PiggyBank className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {t.savings.name} ({t.savings.institution_name}) →
                            </span>
                          </Link>
                        )}

                        {t.transfer_to_savings && (
                          <Link
                            href="/dashboard/savings"
                            className="inline-flex max-w-full items-center gap-1 rounded-full bg-lightprimary px-2.5 py-1 text-xs font-medium text-primary transition-colors duration-(--motion-fast) hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring outline-none"
                            title="Traceable: Destination Savings Vault"
                          >
                            <PiggyBank className="size-3.5 shrink-0" />
                            <span className="truncate">To: {t.transfer_to_savings.name} →</span>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Amount column (stacked over delete so long amounts never squeeze the title) */}
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span
                      className={`num whitespace-nowrap pt-0.5 text-sm sm:text-base font-bold ${
                        t.kind === 'income'
                          ? 'text-success'
                          : t.kind === 'transfer'
                          ? 'text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {t.kind === 'income' ? '+' : t.kind === 'transfer' ? '⇄ ' : '− '}
                      {formatMoney(t.amount)}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(t.id)}
                      className="size-10 min-h-10 min-w-10 sm:size-8 sm:min-h-8 sm:min-w-8 text-muted-foreground opacity-70 transition-opacity hover:text-destructive hover:bg-danger-soft sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                      title="Delete transaction"
                      aria-label="Delete transaction"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Lazy Load / Server Cursor Button */}
          {(filtered.length > visibleCount || hasMoreServer) && (
            <div className="flex flex-col items-center gap-2 pt-2 text-center">
              <Button
                type="button"
                variant="soft"
                size="sm"
                disabled={isLoadingMore}
                aria-busy={isLoadingMore || undefined}
                onClick={handleLoadMore}
                className="h-auto min-h-11 max-w-full whitespace-normal px-5 py-2"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Fetching older records…
                  </>
                ) : filtered.length > visibleCount ? (
                  `Load more transactions (${filtered.length - visibleCount} remaining in view)`
                ) : (
                  'Load older transactions from server'
                )}
              </Button>
              <p className="num text-xs text-muted-foreground">
                Showing {shownCount} of {filtered.length} loaded records
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
