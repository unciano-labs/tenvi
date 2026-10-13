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

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground truncate">
            Chipping In & Bill Splits
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Easily split shared credit card or group purchases and track who has paid.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="rounded-xl gap-2 font-semibold shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Split a Bill
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <StatCard
          label="Unpaid Shares (Still Owed to You)"
          value={formatMoney(totalUnpaid)}
          subtext="Money friends haven't sent back yet"
          icon={Receipt}
          variant="warning"
        />

        <StatCard
          label="Total Shared Bills Logged"
          value={formatMoney(totalSplitsAmount)}
          subtext={`Across ${initialSplits.length} group purchases`}
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
          actionText="Split a Bill"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {/* Search and Status Filter Bar */}
          <Card className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-3xl shadow-xs overflow-hidden min-w-0">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted rounded-2xl overflow-x-auto no-scrollbar max-w-full shrink-0">
              <Button
                type="button"
                variant={statusFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setVisibleCount(8);
                }}
                className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                  statusFilter === 'all' ? 'shadow-xs' : 'text-muted-foreground'
                }`}
              >
                All ({initialSplits.length})
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'pending' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setStatusFilter('pending');
                  setVisibleCount(8);
                }}
                className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                  statusFilter === 'pending' ? 'shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Pending ({initialSplits.filter((s) => (s.participants || []).some((p) => !p.is_paid)).length})
              </Button>
              <Button
                type="button"
                variant={statusFilter === 'settled' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setStatusFilter('settled');
                  setVisibleCount(8);
                }}
                className={`rounded-xl text-xs font-semibold whitespace-nowrap ${
                  statusFilter === 'settled' ? 'shadow-xs' : 'text-muted-foreground'
                }`}
              >
                Settled ({initialSplits.filter((s) => (s.participants || []).length > 0 && (s.participants || []).every((p) => p.is_paid)).length})
              </Button>
            </div>

            {/* Search Input and Counter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search bill, friend, bank..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(8);
                  }}
                  className="pl-9 h-10 text-xs rounded-xl"
                />
              </div>

              <span className="text-xs text-muted-foreground font-medium whitespace-nowrap hidden sm:inline">
                {filteredSplits.length} {filteredSplits.length === 1 ? 'split' : 'splits'}
              </span>
            </div>
          </Card>

          {filteredSplits.length === 0 ? (
            <Card className="p-10 text-center shadow-xs space-y-2">
              <p className="text-sm font-bold text-foreground">No bill splits matched "{searchQuery}"</p>
              <p className="text-xs text-muted-foreground">Try adjusting your keywords or clearing filters.</p>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs font-semibold"
              >
                Clear Search & Filters
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {displayedSplits.map((split) => {
                const participants = split.participants || [];
                const paidCount = participants.filter((p) => p.is_paid).length;
                const allPaid = participants.length > 0 && paidCount === participants.length;
                const remainingBalance = participants
                  .filter((p) => !p.is_paid)
                  .reduce((sum, p) => sum + Number(p.share_amount), 0);

                return (
                  <Card
                    key={split.id}
                    className="p-6 sm:p-7 shadow-xs overflow-hidden min-w-0 space-y-5"
                  >
                    {/* Header row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h3 className="text-lg font-bold text-foreground truncate max-w-[280px] sm:max-w-none">
                            {split.title}
                          </h3>
                          {allPaid && (
                            <Badge variant="success" className="text-xs font-bold gap-1 shrink-0">
                              All Settled ✅
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1 min-w-0">
                          <span>{formatDate(split.occurred_on)}</span>
                          {split.credit_card && (
                            <Badge variant="soft" className="gap-1 font-medium shrink-0">
                              <CardIcon className="w-3 h-3 text-primary" />
                              {split.credit_card.bank_name} (••{split.credit_card.last_4})
                            </Badge>
                          )}
                          {split.note && <span className="truncate max-w-[200px]">• {split.note}</span>}
                        </div>
                      </div>

                      <div className="sm:text-right shrink-0">
                        <span className="text-xs text-muted-foreground block">Total Bill</span>
                        <span className="text-2xl font-extrabold text-foreground">
                          {formatMoney(split.total_amount)}
                        </span>
                      </div>
                    </div>

                    {/* Progress banner */}
                    <div className="p-3.5 rounded-2xl bg-muted/60 flex items-center justify-between text-xs font-semibold gap-2 min-w-0">
                      <span className="text-muted-foreground truncate">
                        {paidCount} of {participants.length} friends have chipped in
                      </span>
                      <span
                        className={`shrink-0 ${
                          remainingBalance > 0 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'
                        }`}
                      >
                        {remainingBalance > 0
                          ? `${formatMoney(remainingBalance)} remaining`
                          : 'Zero remaining'}
                      </span>
                    </div>

                    {/* Participants List */}
                    <div className="space-y-2 min-w-0">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Participants
                      </p>
                      <div className="max-h-56 overflow-y-auto pr-1.5 bili-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {participants.map((p) => (
                            <div
                              key={p.id}
                              className={`p-3.5 rounded-2xl flex items-center justify-between transition-all gap-2 min-w-0 ${
                                p.is_paid
                                  ? 'bg-emerald-500/10'
                                  : 'bg-muted/50 hover:bg-muted'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-foreground truncate">
                                  {p.contact?.name || 'Friend'}
                                </p>
                                <p className="text-xs font-extrabold text-muted-foreground truncate">
                                  {formatMoney(p.share_amount)}
                                </p>
                              </div>

                              {/* 1-Tap Toggle */}
                              <Button
                                type="button"
                                size="xs"
                                variant={p.is_paid ? 'default' : 'soft'}
                                onClick={() =>
                                  handleTogglePaid(split.id, p.id, p.is_paid)
                                }
                                className={`text-xs font-semibold rounded-xl shrink-0 ${
                                  p.is_paid
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : ''
                                }`}
                              >
                                {p.is_paid ? 'Paid ✅' : 'Tap when paid'}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Footer action */}
                    <div className="pt-2 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleDelete(split.id)}
                        className="text-muted-foreground hover:text-destructive gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove split
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Lazy Load Button */}
          {filteredSplits.length > visibleCount && (
            <div className="pt-2 text-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setVisibleCount((prev) => prev + 8)}
                className="px-6 py-2.5 text-xs font-semibold rounded-xl"
              >
                Load More Splits ({filteredSplits.length - visibleCount} remaining)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
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
