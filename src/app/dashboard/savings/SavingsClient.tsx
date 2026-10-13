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
  ArrowUpDown,
  Receipt,
  ChevronDown,
  ChevronUp,
  Search,
} from 'lucide-react';
import { SavingsModal } from '@/components/Forms/SavingsModal';
import { SavingsBalanceModal } from '@/components/Forms/SavingsBalanceModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { formatMoney } from '@/lib/finance/calculations';
import { SavingsAccount } from '@/types';
import { confirmModal } from '@/components/ui/GlobalDialog';

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
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
            Savings & Cash Stash
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Keep track of your bank savings, high-yield digital banks, and physical cash.
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-xl gap-2 font-semibold shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Savings or Cash
        </Button>
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
      <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-3xl shadow-xs overflow-hidden min-w-0">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted rounded-2xl overflow-x-auto no-scrollbar max-w-full shrink-0">
          <Button
            type="button"
            variant={typeFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setTypeFilter('all');
              setVisibleCount(9);
            }}
            className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
              typeFilter === 'all' ? 'shadow-xs' : 'text-muted-foreground'
            }`}
          >
            All ({initialAccounts.length})
          </Button>
          <Button
            type="button"
            variant={typeFilter === 'digital' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setTypeFilter('digital');
              setVisibleCount(9);
            }}
            className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
              typeFilter === 'digital' ? 'shadow-xs' : 'text-muted-foreground'
            }`}
          >
            Digital ({initialAccounts.filter((a) => a.account_type === 'digital_bank').length})
          </Button>
          <Button
            type="button"
            variant={typeFilter === 'traditional' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setTypeFilter('traditional');
              setVisibleCount(9);
            }}
            className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
              typeFilter === 'traditional' ? 'shadow-xs' : 'text-muted-foreground'
            }`}
          >
            Traditional ({initialAccounts.filter((a) => a.account_type === 'traditional_bank').length})
          </Button>
          <Button
            type="button"
            variant={typeFilter === 'cash' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setTypeFilter('cash');
              setVisibleCount(9);
            }}
            className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
              typeFilter === 'cash' ? 'shadow-xs' : 'text-muted-foreground'
            }`}
          >
            Cash & Wallets ({initialAccounts.filter((a) => a.account_type === 'cash' || a.account_type === 'ewallet').length})
          </Button>
        </div>

        {/* Search input and counter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search account, institution..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(9);
              }}
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>

          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>
      </Card>

      {/* Accounts Grid */}
      {filtered.length === 0 ? (
        searchQuery ? (
          <Card className="p-10 text-center shadow-xs space-y-2">
            <p className="text-sm font-bold text-foreground">No accounts matched "{searchQuery}"</p>
            <p className="text-xs text-muted-foreground">Try adjusting your keywords or clearing filters.</p>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className="text-xs font-semibold"
            >
              Clear Search & Filters
            </Button>
          </Card>
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
                <Card
                  key={acc.id}
                  className="p-6 shadow-xs overflow-hidden min-w-0 flex flex-col justify-between space-y-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="size-10 rounded-2xl bg-muted text-foreground flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-bold text-foreground truncate">
                            {acc.name}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {acc.institution_name}
                            {acc.account_number_last4 ? ` ••${acc.account_number_last4}` : ''}
                          </p>
                        </div>
                      </div>

                      {acc.interest_rate && acc.interest_rate > 0 && (
                        <Badge variant="warning" className="shrink-0 gap-1 font-bold text-xs">
                          <Sparkles className="w-3 h-3" />
                          {acc.interest_rate}% p.a.
                        </Badge>
                      )}
                    </div>

                    {/* Balance Display */}
                    <div className="mt-4 p-4 rounded-2xl bg-muted/60 min-w-0">
                      <span className="text-xs text-muted-foreground block mb-1">
                        Current Stash
                      </span>
                      <span className="text-2xl font-extrabold text-foreground truncate block">
                        {formatMoney(balance)}
                      </span>

                      {/* Target Goal Progress */}
                      {target > 0 && progress !== null && (
                        <div className="mt-3 space-y-1.5">
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground font-medium">
                            <span className="truncate">Target: {formatMoney(target)}</span>
                            <span className="font-bold text-foreground shrink-0 ml-2">{progress}%</span>
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
                        <div className="mt-3 p-3.5 rounded-2xl bg-primary/5 space-y-2 min-w-0">
                          <div className="flex items-center justify-between text-xs min-w-0">
                            <span className="font-bold text-foreground flex items-center gap-1.5 truncate">
                              <Receipt className="w-3.5 h-3.5 text-primary shrink-0" />
                              Connected Activity ({thisAccTxs.length})
                            </span>
                            {thisAccTxs.length > 0 && (
                              <Button
                                type="button"
                                variant="soft"
                                size="xs"
                                onClick={() =>
                                  setExpandedAccountTxs((prev) => ({
                                    ...prev,
                                    [acc.id]: !isExpanded,
                                  }))
                                }
                                className="text-xs shrink-0 rounded-lg gap-1"
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
                              </Button>
                            )}
                          </div>

                          {isExpanded && thisAccTxs.length > 0 && (
                            <div className="max-h-48 overflow-y-auto pr-1.5 space-y-1.5 pt-1 bili-scrollbar">
                              {thisAccTxs.map((tx) => (
                                <div
                                  key={tx.id}
                                  className="p-2.5 rounded-xl bg-card flex items-center justify-between text-xs text-foreground shadow-xs gap-2 min-w-0"
                                >
                                  <div className="truncate min-w-0 flex-1">
                                    <div className="font-semibold text-foreground truncate flex items-center gap-1.5 min-w-0">
                                      <Badge variant="soft" className="text-2xs font-medium shrink-0">
                                        {tx.category?.name ||
                                          (tx.kind === 'income' ? 'Deposit' : 'Expense')}
                                      </Badge>
                                      <span className="truncate">
                                        {tx.note ||
                                          (tx.kind === 'income'
                                            ? 'Deposit'
                                            : 'Withdrawal')}
                                      </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {tx.occurred_on}
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0">
                                    <span
                                      className={`font-bold ${
                                        tx.kind === 'income'
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-foreground'
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
                            <p className="text-xs text-muted-foreground">
                              No direct transactions linked yet. Expenses or income tagged to this account will appear here.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Card Actions */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <Button
                      onClick={() => setSelectedForBalance(acc)}
                      size="sm"
                      className="rounded-xl gap-1.5 font-semibold text-xs flex-1 sm:flex-initial"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      Deposit / Withdraw
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDelete(acc.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      title="Remove account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Lazy Load Button */}
          {filtered.length > visibleCount && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 9)}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl"
              >
                Load More Accounts ({filtered.length - visibleCount} remaining)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
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
