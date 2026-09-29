'use client';

import React, { useState } from 'react';
import { deleteSavingsAccountAction } from '@/app/actions/savings';
import { toast } from 'sonner';
import {
  PiggyBank,
  Plus,
  Trash2,
  Sparkles,
  Banknote,
  Building2,
  Smartphone,
  Target,
  ArrowUpDown,
  Receipt,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { SavingsModal } from '@/components/Forms/SavingsModal';
import { SavingsBalanceModal } from '@/components/Forms/SavingsBalanceModal';
import { EmptyState } from '@/components/UI/EmptyState';
import { StatCard } from '@/components/UI/StatCard';
import { formatMoney } from '@/lib/finance/calculations';
import { SavingsAccount } from '@/types';
import { confirmModal } from '@/components/UI/GlobalDialog';

interface SavingsClientProps {
  initialAccounts: SavingsAccount[];
  savingsTransactions?: any[];
}

export function SavingsClient({
  initialAccounts,
  savingsTransactions = [],
}: SavingsClientProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedForBalance, setSelectedForBalance] =
    useState<SavingsAccount | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(9);
  const [expandedAccountTxs, setExpandedAccountTxs] = useState<Record<string, boolean>>({});

  const totalSavings = initialAccounts.reduce(
    (sum, a) => sum + Number(a.current_balance),
    0
  );

  const digitalSavings = initialAccounts
    .filter((a) => a.account_type === 'digital_bank')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const cashOnHand = initialAccounts
    .filter((a) => a.account_type === 'cash' || a.account_type === 'ewallet')
    .reduce((sum, a) => sum + Number(a.current_balance), 0);

  const filtered = initialAccounts.filter((a) => {
    if (typeFilter === 'digital' && a.account_type !== 'digital_bank') return false;
    if (typeFilter === 'traditional' && a.account_type !== 'traditional_bank') return false;
    if (typeFilter === 'cash' && a.account_type !== 'cash' && a.account_type !== 'ewallet') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = a.name?.toLowerCase().includes(q);
      const matchInst = a.institution_name?.toLowerCase().includes(q);
      const matchNum = a.account_number_last4?.includes(q);
      if (!matchName && !matchInst && !matchNum) return false;
    }
    return true;
  });

  const displayedAccounts = filtered.slice(0, visibleCount);

  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Remove Savings Account?',
      description: 'Are you sure you want to remove this savings account or e-wallet? This action cannot be undone.',
      confirmText: 'Remove Account',
      variant: 'danger',
    });
    if (!confirmed) return;
    const res = await deleteSavingsAccountAction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Account removed.');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash':
        return Banknote;
      case 'digital_bank':
        return Sparkles;
      case 'ewallet':
        return Smartphone;
      default:
        return Building2;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Savings & Cash Stash
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Keep track of your bank savings, high-yield digital banks, and physical cash.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bili-btn-primary py-3 px-5 text-sm font-semibold shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Savings or Cash
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          label="Total Savings & Cash"
          value={formatMoney(totalSavings)}
          subtext={`Across ${initialAccounts.length} accounts & wallets`}
          icon={PiggyBank}
          variant="positive"
        />

        <StatCard
          label="High-Yield Digital Banks"
          value={formatMoney(digitalSavings)}
          subtext="Maya, CIMB, MariBank, SeaBank, etc."
          icon={Sparkles}
          variant="neutral"
        />

        <StatCard
          label="Cash on Hand & E-Wallets"
          value={formatMoney(cashOnHand)}
          subtext="Physical cash, GCash, Maya wallet"
          icon={Banknote}
          variant="neutral"
        />
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl shadow-sm">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar max-w-full shrink-0">
          <button
            onClick={() => {
              setTypeFilter('all');
              setVisibleCount(9);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({initialAccounts.length})
          </button>
          <button
            onClick={() => {
              setTypeFilter('digital');
              setVisibleCount(9);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === 'digital'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Digital ({initialAccounts.filter((a) => a.account_type === 'digital_bank').length})
          </button>
          <button
            onClick={() => {
              setTypeFilter('traditional');
              setVisibleCount(9);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === 'traditional'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Traditional ({initialAccounts.filter((a) => a.account_type === 'traditional_bank').length})
          </button>
          <button
            onClick={() => {
              setTypeFilter('cash');
              setVisibleCount(9);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
              typeFilter === 'cash'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Cash & Wallets ({initialAccounts.filter((a) => a.account_type === 'cash' || a.account_type === 'ewallet').length})
          </button>
        </div>

        {/* Search input and counter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search account, institution..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(9);
              }}
              className="bili-input w-full pl-9 py-2 text-xs"
            />
          </div>

          <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>
      </div>

      {/* Accounts Grid */}
      {filtered.length === 0 ? (
        searchQuery ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm space-y-2">
            <p className="text-sm font-bold text-slate-700">No accounts matched "{searchQuery}"</p>
            <p className="text-xs text-slate-400">Try adjusting your keywords or clearing filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className="text-xs font-semibold text-emerald-600 hover:underline pt-1 cursor-pointer"
            >
              Clear Search & Filters
            </button>
          </div>
        ) : (
          <EmptyState
            icon={PiggyBank}
            title="No savings accounts added yet"
            description={
              initialAccounts.length === 0
                ? 'Add your bank accounts, digital banks (Maya, MariBank, CIMB), or cash envelope to see your total money in one place.'
                : 'No accounts match this filter.'
            }
            actionText={initialAccounts.length === 0 ? 'Add Savings or Cash' : undefined}
            onAction={() => setIsAddModalOpen(true)}
          />
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedAccounts.map((acc) => {
            const Icon = getTypeIcon(acc.account_type);
            const target = Number(acc.target_amount || 0);
            const balance = Number(acc.current_balance);
            const progress = target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : null;

            return (
              <div
                key={acc.id}
                className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {acc.name}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                          {acc.institution_name}
                          {acc.account_number_last4 ? ` ••${acc.account_number_last4}` : ''}
                        </p>
                      </div>
                    </div>

                    {acc.interest_rate && acc.interest_rate > 0 && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 flex items-center gap-1 shrink-0">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        {acc.interest_rate}% p.a.
                      </span>
                    )}
                  </div>

                  {/* Balance Display */}
                  <div className="mt-4 p-4 rounded-2xl bg-[#F6F7F9]">
                    <span className="text-xs text-slate-400 block mb-1">
                      Current Stash
                    </span>
                    <span className="text-2xl font-extrabold text-slate-900">
                      {formatMoney(balance)}
                    </span>

                    {/* Target Goal Progress */}
                    {target > 0 && progress !== null && (
                      <div className="mt-3 space-y-1.5">
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                          <span>Target: {formatMoney(target)}</span>
                          <span className="font-bold text-slate-700">{progress}%</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Connected Transactions Activity */}
                  {(() => {
                    const thisAccTxs = (savingsTransactions || []).filter(
                      (t) => t.savings_id === acc.id
                    );
                    const isExpanded = expandedAccountTxs[acc.id] ?? false;

                    return (
                      <div className="mt-3 p-3.5 rounded-2xl bg-emerald-50/70 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                            <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                            Connected Transactions ({thisAccTxs.length})
                          </span>
                          {thisAccTxs.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAccountTxs((prev) => ({
                                  ...prev,
                                  [acc.id]: !isExpanded,
                                }))
                              }
                              className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 flex items-center gap-0.5 cursor-pointer bg-white/70 px-2 py-0.5 rounded-lg shadow-xs"
                            >
                              {isExpanded ? (
                                <>
                                  Hide <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  View <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {isExpanded && thisAccTxs.length > 0 && (
                          <div className="max-h-48 overflow-y-auto pr-1.5 space-y-1.5 pt-1 bili-scrollbar">
                            {thisAccTxs.map((tx) => (
                              <div
                                key={tx.id}
                                className="p-2.5 rounded-xl bg-white/90 flex items-center justify-between text-xs text-slate-800 shadow-xs"
                              >
                                <div className="truncate pr-2">
                                  <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-medium shrink-0">
                                      {tx.category?.name ||
                                        (tx.kind === 'income' ? 'Deposit' : 'Expense')}
                                    </span>
                                    <span className="truncate">
                                      {tx.note ||
                                        (tx.kind === 'income'
                                          ? 'Deposit'
                                          : 'Withdrawal')}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {tx.occurred_on}
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <span
                                    className={`font-bold ${
                                      tx.kind === 'income'
                                        ? 'text-emerald-700'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {tx.kind === 'income' ? '+' : '-'}
                                    {formatMoney(Number(tx.amount))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {thisAccTxs.length === 0 && (
                          <p className="text-[11px] text-emerald-800/80">
                            No direct transactions linked yet. Expenses or income tagged to this account will appear here.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Card Actions */}
                <div className="pt-2 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedForBalance(acc)}
                    className="bili-btn-primary py-2 px-3.5 text-xs font-semibold shadow-sm flex items-center gap-1.5"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    Deposit / Withdraw
                  </button>

                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 transition-colors p-1"
                    title="Remove account"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lazy Load Button */}
        {filtered.length > visibleCount && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 9)}
              className="bili-btn-secondary px-6 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              Load More Accounts ({filtered.length - visibleCount} remaining)
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              Showing {Math.min(visibleCount, filtered.length)} of {filtered.length} accounts
            </p>
          </div>
        )}
      </div>
    )}

      {/* Modals */}
      <SavingsModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <SavingsBalanceModal
        isOpen={!!selectedForBalance}
        onClose={() => setSelectedForBalance(null)}
        account={selectedForBalance}
      />
    </div>
  );
}
