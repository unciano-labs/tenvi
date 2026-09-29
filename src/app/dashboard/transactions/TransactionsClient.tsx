'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { deleteTransactionAction } from '@/app/actions/transactions';
import { toast } from 'sonner';
import {
  Wallet,
  Plus,
  Trash2,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  PiggyBank,
  CreditCard as CardIcon,
} from 'lucide-react';
import { TransactionModal } from '@/components/Forms/TransactionModal';
import { EmptyState } from '@/components/UI/EmptyState';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { Category, CreditCard, SavingsAccount, Transaction } from '@/types';
import { confirmModal } from '@/components/UI/GlobalDialog';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [kindFilter, setKindFilter] = useState<'all' | 'expense' | 'income'>('all');
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
  const filtered = initialTransactions
    .filter((t) => {
      // Exclude future dates
      if (t.occurred_on > todayISO) return false;
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false;
      if (selectedCategory !== 'all' && t.category_id !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchNote = t.note?.toLowerCase().includes(query);
        const matchCategory = t.category?.name.toLowerCase().includes(query);
        if (!matchNote && !matchCategory) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Current date on top, oldest at the bottom
      if (b.occurred_on !== a.occurred_on) {
        return b.occurred_on.localeCompare(a.occurred_on);
      }
      // If dates are identical, most recently created on top
      return (
        new Date(b.created_at || b.occurred_on).getTime() -
        new Date(a.created_at || a.occurred_on).getTime()
      );
    });

  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Delete Transaction?',
      description: 'Are you sure you want to delete this transaction record? This action cannot be undone.',
      confirmText: 'Delete Transaction',
      variant: 'danger',
    });
    if (!confirmed) return;
    const res = await deleteTransactionAction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Transaction removed.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Money In & Money Out
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track daily expenses, salaries, and side income.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bili-btn-primary py-3 px-5 text-sm font-semibold shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Record Expense or Income
        </button>
      </div>

      {/* Filter Controls (Pill buttons without borders) */}
      <div className="bg-white rounded-3xl p-5 shadow-sm overflow-hidden min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Kind Filter Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl max-w-full overflow-x-auto no-scrollbar shrink-0">
            <button
              onClick={() => setKindFilter('all')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                kindFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Activity
            </button>
            <button
              onClick={() => setKindFilter('expense')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                kindFilter === 'expense'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Expenses
            </button>
            <button
              onClick={() => setKindFilter('income')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                kindFilter === 'income'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Income
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search notes or categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bili-input w-full pl-9 py-2 text-xs"
            />
          </div>
        </div>

        {/* Category Filter Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 max-w-full">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 shrink-0">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setVisibleCount(20);
              }}
              className="bili-input py-1.5 px-3 text-xs bg-slate-100 max-w-[200px] sm:max-w-none truncate"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind === 'income' ? 'Income' : 'Expense'})
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} transactions
          </span>
        </div>
      </div>

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
        <div className="bg-white rounded-3xl p-5 sm:p-8 shadow-sm overflow-hidden min-w-0 space-y-4">
          <div className="space-y-3">
            {filtered.slice(0, visibleCount).map((t) => (
              <div
                key={t.id}
                className="p-3.5 sm:p-4 rounded-2xl bg-[#F6F7F9] hover:bg-slate-100/70 transition-colors flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 ${
                      t.kind === 'income'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {t.kind === 'income' ? '+' : '-'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {t.category?.name || (t.kind === 'income' ? 'Income' : 'Expense')}
                      </p>
                      <span className="text-xs sm:text-xs font-medium text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded-full capitalize shrink-0">
                        {t.payment_method.replace('_', ' ')}
                      </span>
                      {t.loan_id && (
                        <Link
                          href={`/dashboard/loans/${t.loan_id}`}
                          className="inline-flex items-center gap-1 text-xs sm:text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-full transition-colors shrink-0"
                        >
                          <HandCoins className="w-3 h-3" />
                          Loan: {t.loan?.contact?.name || 'Borrower'} →
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs sm:text-xs text-slate-400 mt-0.5">
                      <span>{formatDate(t.occurred_on)}</span>
                      {t.note && <span className="truncate max-w-[160px] sm:max-w-xs">• {t.note}</span>}

                      {/* Traceable Connected Credit Card Link */}
                      {t.credit_card && (
                        <Link
                          href={`/dashboard/cards/${t.credit_card.id}`}
                          className="inline-flex items-center gap-1 text-xs sm:text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-full transition-colors shrink-0"
                          title="Traceable: View card details and statement breakdown"
                        >
                          <CardIcon className="w-3 h-3 text-indigo-600" />
                          {t.credit_card.bank_name || t.credit_card.name} (••{t.credit_card.last_4}) →
                        </Link>
                      )}

                      {/* Traceable Connected Savings Account Link */}
                      {t.savings && (
                        <Link
                          href="/dashboard/savings"
                          className="inline-flex items-center gap-1 text-xs sm:text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-full transition-colors shrink-0"
                          title="Traceable: View under Savings Stash"
                        >
                          <PiggyBank className="w-3 h-3 text-emerald-600" />
                          {t.savings.name} ({t.savings.institution_name}) →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                  <span
                    className={`text-sm sm:text-base font-extrabold whitespace-nowrap ${
                      t.kind === 'income' ? 'text-emerald-700' : 'text-slate-900'
                    }`}
                  >
                    {t.kind === 'income' ? '+' : '-'} {formatMoney(t.amount)}
                  </span>

                  <button
                    onClick={() => handleDelete(t.id)}
                    className="opacity-70 sm:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-1.5 rounded-xl hover:bg-rose-50 cursor-pointer"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Lazy Load Button */}
          {filtered.length > visibleCount && (
            <div className="pt-4 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="bili-btn-secondary px-6 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                Load More Transactions ({filtered.length - visibleCount} remaining)
              </button>
              <p className="text-xs text-slate-400 mt-2">
                Showing {visibleCount} of {filtered.length} transactions
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        creditCards={creditCards}
        savingsAccounts={savingsAccounts}
      />
    </div>
  );
}
