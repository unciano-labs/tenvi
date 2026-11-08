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
import { FlippableSavingsCard } from '@/components/Cards/FlippableSavingsCard';

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

  const typeTabs = [
    { value: 'all', label: 'All', count: initialAccounts.length },
    {
      value: 'digital',
      label: 'Digital',
      count: initialAccounts.filter((a) => a.account_type === 'digital_bank').length,
    },
    {
      value: 'traditional',
      label: 'Traditional',
      count: initialAccounts.filter((a) => a.account_type === 'traditional_bank').length,
    },
    {
      value: 'cash',
      label: 'Cash & wallets',
      count: initialAccounts.filter((a) => a.account_type === 'cash' || a.account_type === 'ewallet').length,
    },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-display text-foreground">Savings &amp; cash stash</h1>
          <p className="mt-2 max-w-prose text-sm sm:text-base text-muted-foreground">
            Keep track of your bank savings, high-yield digital banks, and physical cash.
          </p>
        </div>

        <div className="page-header-actions w-full sm:w-auto">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto sm:h-11 sm:min-h-11"
          >
            <Plus className="size-4" />
            Add savings or cash
          </Button>
        </div>
      </div>

      {/* Metrics: fluid grid — 3 across when there is room, stacked on phones (no clipped carousel) */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:14rem]">
        <StatCard
          label="Total savings & cash"
          value={formatMoney(totalSavings)}
          subtext={`Across ${initialAccounts.length} ${initialAccounts.length === 1 ? 'account' : 'accounts'} & wallets`}
          icon={PiggyBank}
          variant="positive"
        />

        <StatCard
          label="High-yield digital banks"
          value={formatMoney(digitalSavings)}
          subtext="Maya, CIMB, MariBank, SeaBank, etc."
          icon={Sparkles}
          variant="neutral"
        />

        <StatCard
          label="Cash on hand & e‑wallets"
          value={formatMoney(cashOnHand)}
          subtext="Physical cash, GCash, Maya wallet"
          icon={Banknote}
          variant="neutral"
        />
      </div>

      {/* Filter toolbar: type tabs scroll (never clip), search fills remaining space */}
      <Card className="flex-row flex-wrap items-center gap-3 p-3 sm:p-4">
        <div
          role="group"
          aria-label="Filter by account type"
          className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-muted p-1"
        >
          {typeTabs.map((tab) => {
            const active = typeFilter === tab.value;
            return (
              <Button
                key={tab.value}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={active}
                onClick={() => {
                  setTypeFilter(tab.value);
                  setVisibleCount(9);
                }}
                className={`shrink-0 rounded-xl px-3 text-sm ${
                  active
                    ? 'bg-card text-foreground shadow-sm hover:bg-card'
                    : 'font-medium text-muted-foreground hover:bg-card/60'
                }`}
              >
                {tab.label}
                <span className={`num text-xs ${active ? 'text-muted-foreground' : 'text-muted-foreground/80'}`}>
                  {tab.count}
                </span>
              </Button>
            );
          })}
        </div>

        <div className="flex min-w-[min(100%,20rem)] flex-1 items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search account or institution"
              aria-label="Search account or institution"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setVisibleCount(9);
              }}
              className="h-12 sm:h-10 pl-10 text-base sm:text-sm rounded-xl"
            />
          </div>

          <span className="num hidden shrink-0 whitespace-nowrap text-label text-muted-foreground sm:inline" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>
      </Card>

      {/* Accounts Grid */}
      {filtered.length === 0 ? (
        searchQuery ? (
          <Card className="items-center gap-2 p-10 text-center">
            <p className="max-w-full break-words text-base font-semibold text-foreground">
              No accounts matched &ldquo;{searchQuery}&rdquo;
            </p>
            <p className="text-sm text-muted-foreground">Try adjusting your keywords or clearing filters.</p>
            <Button
              type="button"
              variant="soft"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
              }}
              className="mt-2"
            >
              Clear search &amp; filters
            </Button>
          </Card>
        ) : (
          <EmptyState
            icon={PiggyBank}
            title={initialAccounts.length === 0 ? 'No savings accounts added yet' : 'No accounts of this type'}
            description={
              initialAccounts.length === 0
                ? 'Add your bank accounts, digital banks (Maya, MariBank, CIMB), or cash envelope to see your total money in one place.'
                : 'No accounts match this filter.'
            }
            actionText={initialAccounts.length === 0 ? 'Add savings or cash' : undefined}
            onAction={() => setIsAddModalOpen(true)}
          />
        )
      ) : (
        <div className="flex flex-col gap-6">
          {/* Re-keyed on filter so the new set springs in (stagger capped at 5) */}
          <div key={typeFilter} className="grid-fluid-fill items-start gap-x-6 gap-y-8 [--grid-min:17.5rem]">
            {displayedAccounts.map((acc, index) => (
              <div key={acc.id} className="motion-pop-in min-w-0" style={{ ['--stagger' as string]: index }}>
                <FlippableSavingsCard
                  account={acc}
                  transactions={savingsTransactions}
                  onOpenBalanceModal={setSelectedForBalance}
                  onDelete={handleDelete}
                />
              </div>
            ))}
          </div>

          {/* Lazy Load Button */}
          {filtered.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 text-center">
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 9)}
                className="h-auto min-h-11 max-w-full whitespace-normal px-5 py-2"
              >
                Load more accounts ({filtered.length - visibleCount} remaining)
              </Button>
              <p className="num text-xs text-muted-foreground">
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
