'use client';

import React, { useState } from 'react';
import { deleteBillSplitAction, toggleParticipantPaidAction } from '@/app/actions/splits';
import { toast } from 'sonner';
import {
  Receipt,
  Plus,
  Trash2,
  Users,
  CreditCard as CardIcon,
  Search,
} from 'lucide-react';
import { BillSplitModal } from '@/components/Forms/BillSplitModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { BillSplit, Contact, CreditCard } from '@/types';
import { confirmModal } from '@/components/ui/GlobalDialog';

interface SplitsClientProps {
  initialSplits: BillSplit[];
  contacts: Contact[];
  creditCards: CreditCard[];
}

export function SplitsClient({
  initialSplits,
  contacts,
  creditCards,
}: SplitsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(8);

  const filteredSplits = initialSplits.filter((s) => {
    const participants = s.participants || [];
    const isSettled = participants.length > 0 && participants.every((p) => p.is_paid);

    if (statusFilter === 'pending' && isSettled) return false;
    if (statusFilter === 'settled' && !isSettled) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchNote = s.note?.toLowerCase().includes(q);
      const matchCard = s.credit_card?.bank_name.toLowerCase().includes(q);
      const matchFriend = participants.some((p) =>
        p.contact?.name.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchNote && !matchCard && !matchFriend) return false;
    }

    return true;
  });

  const displayedSplits = filteredSplits.slice(0, visibleCount);

  // Compute total unpaid splits
  const totalUnpaid = initialSplits.reduce((sum, s) => {
    const unpaidSum = (s.participants || [])
      .filter((p) => !p.is_paid)
      .reduce((sub, p) => sub + Number(p.share_amount), 0);
    return sum + unpaidSum;
  }, 0);

  const totalSplitsAmount = initialSplits.reduce(
    (sum, s) => sum + Number(s.total_amount),
    0
  );

  const handleTogglePaid = async (
    splitId: string,
    participantId: string,
    currentStatus: boolean
  ) => {
    const newStatus = !currentStatus;
    const res = await toggleParticipantPaidAction(splitId, participantId, newStatus);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(newStatus ? 'Marked as chipped in!' : 'Marked as unpaid.');
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Delete Bill Split?',
      description: 'Are you sure you want to delete this bill split and all its participant shares? This action cannot be undone.',
      confirmText: 'Delete Split',
      variant: 'danger',
    });
    if (!confirmed) return;
    const res = await deleteBillSplitAction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Bill split deleted.');
    }
  };

  const statusTabs = [
    { value: 'all', label: 'All', count: initialSplits.length },
    {
      value: 'pending',
      label: 'Pending',
      count: initialSplits.filter((s) => (s.participants || []).some((p) => !p.is_paid)).length,
    },
    {
      value: 'settled',
      label: 'Settled',
      count: initialSplits.filter(
        (s) => (s.participants || []).length > 0 && (s.participants || []).every((p) => p.is_paid)
      ).length,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-display text-foreground">Chipping in &amp; bill splits</h1>
          <p className="mt-2 max-w-prose text-sm sm:text-base text-muted-foreground">
            Easily split shared credit card or group purchases and track who has paid.
          </p>
        </div>

        <div className="page-header-actions w-full sm:w-auto">
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto sm:h-11 sm:min-h-11">
            <Plus className="size-4" />
            Split a bill
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:16rem]">
        <StatCard
          label="Unpaid shares (still owed to you)"
          value={formatMoney(totalUnpaid)}
          subtext="Money friends haven't sent back yet"
          icon={Receipt}
          variant="warning"
        />

        <StatCard
          label="Total shared bills logged"
          value={formatMoney(totalSplitsAmount)}
          subtext={`Across ${initialSplits.length} group ${initialSplits.length === 1 ? 'purchase' : 'purchases'}`}
          icon={Users}
          variant="neutral"
        />
      </div>

      {/* Splits List */}
      {initialSplits.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bill splits yet"
          description="When you swipe your card for group dinners or groceries, split it here so everyone can chip in without confusion."
          actionText="Split a bill"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Search and status filter toolbar */}
          <Card className="flex-row flex-wrap items-center gap-3 p-3 sm:p-4">
            <div
              role="group"
              aria-label="Filter by status"
              className="flex max-w-full min-w-0 items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-muted p-1"
            >
              {statusTabs.map((tab) => {
                const active = statusFilter === tab.value;
                return (
                  <Button
                    key={tab.value}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-pressed={active}
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setVisibleCount(8);
                    }}
                    className={`shrink-0 rounded-xl px-3 text-sm ${
                      active
                        ? 'bg-card text-foreground shadow-sm hover:bg-card'
                        : 'font-medium text-muted-foreground hover:bg-card/60'
                    }`}
                  >
                    {tab.label}
                    <span className="num text-xs text-muted-foreground">{tab.count}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex min-w-[min(100%,20rem)] flex-1 items-center gap-3">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search bill, friend or bank"
                  aria-label="Search bill, friend or bank"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(8);
                  }}
                  className="h-12 sm:h-10 pl-10 text-base sm:text-sm rounded-xl"
                />
              </div>

              <span className="num hidden shrink-0 whitespace-nowrap text-label text-muted-foreground sm:inline" aria-live="polite">
                {filteredSplits.length} {filteredSplits.length === 1 ? 'split' : 'splits'}
              </span>
            </div>
          </Card>

          {filteredSplits.length === 0 ? (
            <Card className="items-center gap-2 p-10 text-center">
              <p className="max-w-full break-words text-base font-semibold text-foreground">
                {searchQuery ? <>No bill splits matched &ldquo;{searchQuery}&rdquo;</> : 'No bill splits in this view'}
              </p>
              <p className="text-sm text-muted-foreground">Try adjusting your keywords or clearing filters.</p>
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="mt-2"
              >
                Clear search &amp; filters
              </Button>
            </Card>
          ) : (
            <div key={statusFilter} className="flex flex-col gap-4 sm:gap-6">
              {displayedSplits.map((split, index) => {
                const participants = split.participants || [];
                const paidCount = participants.filter((p) => p.is_paid).length;
                const allPaid = participants.length > 0 && paidCount === participants.length;
                const remainingBalance = participants
                  .filter((p) => !p.is_paid)
                  .reduce((sum, p) => sum + Number(p.share_amount), 0);

                return (
                  <Card
                    key={split.id}
                    style={{ ['--stagger' as string]: index }}
                    className="motion-pop-in gap-5 p-5 sm:p-6"
                  >
                    {/* Header row: title/meta + total (total drops below title when narrow) */}
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
                      <div className="flex min-w-0 flex-[1_1_16rem] flex-col gap-1.5">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="text-title min-w-0 text-foreground">{split.title}</h3>
                          {allPaid && (
                            <Badge variant="success" className="shrink-0 gap-1 text-xs font-medium">
                              All settled ✅
                            </Badge>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                          <span className="num">{formatDate(split.occurred_on)}</span>
                          {split.credit_card && (
                            <Badge variant="soft" className="max-w-full shrink-0 gap-1 text-xs font-medium">
                              <CardIcon className="size-3.5 text-primary" />
                              <span className="truncate">
                                {split.credit_card.bank_name} (••{split.credit_card.last_4})
                              </span>
                            </Badge>
                          )}
                          {split.note && <span className="min-w-0 break-words">· {split.note}</span>}
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-0.5 sm:items-end">
                        <span className="text-label text-muted-foreground">Total bill</span>
                        <span className="num text-figure text-foreground">{formatMoney(split.total_amount)}</span>
                      </div>
                    </div>

                    {/* Progress well */}
                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl bg-muted/60 p-3.5 text-sm">
                      <span className="num min-w-0 text-muted-foreground">
                        {paidCount} of {participants.length} {participants.length === 1 ? 'friend has' : 'friends have'} chipped in
                      </span>
                      <span
                        className={`num shrink-0 font-semibold ${
                          remainingBalance > 0 ? 'text-warning-soft-foreground' : 'text-success'
                        }`}
                      >
                        {remainingBalance > 0
                          ? `${formatMoney(remainingBalance)} remaining`
                          : 'Zero remaining'}
                      </span>
                    </div>

                    {/* Participants */}
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="text-label text-muted-foreground">Participants</p>
                      <div className="max-h-64 overflow-y-auto pr-1 bili-scrollbar">
                        <ul className="grid-fluid-fill gap-2 [--grid-min:15rem]">
                          {participants.map((p) => (
                            <li
                              key={p.id}
                              className={`flex min-w-0 items-center justify-between gap-3 rounded-xl p-3 transition-colors duration-(--motion-fast) ease-(--ease-in-out) ${
                                p.is_paid ? 'bg-success-soft' : 'bg-muted/50 hover:bg-muted'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-foreground" title={p.contact?.name || 'Friend'}>
                                  {p.contact?.name || 'Friend'}
                                </p>
                                <p className="num text-sm text-muted-foreground">{formatMoney(p.share_amount)}</p>
                              </div>

                              {/* 1-Tap Toggle */}
                              <Button
                                type="button"
                                size="sm"
                                variant={p.is_paid ? 'default' : 'soft'}
                                aria-pressed={p.is_paid}
                                onClick={() => handleTogglePaid(split.id, p.id, p.is_paid)}
                                className={`shrink-0 rounded-xl text-xs sm:text-sm ${
                                  p.is_paid
                                    ? 'bg-success text-success-foreground hover:bg-success/90'
                                    : 'bg-card hover:bg-card/70'
                                }`}
                              >
                                {p.is_paid ? 'Paid ✅' : 'Tap when paid'}
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Footer action */}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(split.id)}
                        className="text-muted-foreground hover:bg-danger-soft hover:text-destructive"
                      >
                        <Trash2 className="size-4" /> Remove split
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Lazy Load Button */}
          {filteredSplits.length > visibleCount && (
            <div className="flex flex-col items-center gap-2 text-center">
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="h-auto min-h-11 max-w-full whitespace-normal px-5 py-2"
              >
                Load more splits ({filteredSplits.length - visibleCount} remaining)
              </Button>
              <p className="num text-xs text-muted-foreground">
                Showing {Math.min(visibleCount, filteredSplits.length)} of {filteredSplits.length} splits
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bill Split Modal */}
      <BillSplitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contacts={contacts}
        creditCards={creditCards}
      />
    </div>
  );
}
