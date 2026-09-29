'use client';

import React, { useState } from 'react';
import {
  toggleParticipantPaidAction,
  deleteBillSplitAction,
} from '@/app/actions/splits';
import { toast } from 'sonner';
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  CreditCard as CardIcon,
  Users,
  Search,
} from 'lucide-react';
import { BillSplitModal } from '@/components/Forms/BillSplitModal';
import { EmptyState } from '@/components/UI/EmptyState';
import { StatCard } from '@/components/UI/StatCard';
import { formatMoney, formatDate } from '@/lib/finance/calculations';
import { Contact, CreditCard, BillSplit } from '@/types';
import { confirmModal } from '@/components/UI/GlobalDialog';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [visibleCount, setVisibleCount] = useState<number>(8);

  const filteredSplits = initialSplits.filter((split) => {
    const participants = split.participants || [];
    const allPaid = participants.length > 0 && participants.every((p) => p.is_paid);
    if (statusFilter === 'pending' && allPaid) return false;
    if (statusFilter === 'settled' && !allPaid) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = split.title?.toLowerCase().includes(q);
      const matchNote = split.note?.toLowerCase().includes(q);
      const matchParticipant = participants.some((p) =>
        p.contact?.name?.toLowerCase().includes(q)
      );
      const matchBank = split.credit_card?.bank_name?.toLowerCase().includes(q);
      if (!matchTitle && !matchNote && !matchParticipant && !matchBank) return false;
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
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Chipping In & Bill Splits
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Easily split shared credit card or group purchases and track who has paid.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bili-btn-primary py-3 px-5 text-sm font-semibold shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Split a Bill
        </button>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl shadow-sm">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar max-w-full shrink-0">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setVisibleCount(8);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All ({initialSplits.length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('pending');
                  setVisibleCount(8);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'pending'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Pending ({initialSplits.filter((s) => (s.participants || []).some((p) => !p.is_paid)).length})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('settled');
                  setVisibleCount(8);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'settled'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Settled ({initialSplits.filter((s) => (s.participants || []).length > 0 && (s.participants || []).every((p) => p.is_paid)).length})
              </button>
            </div>

            {/* Search Input and Counter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search bill, friend, bank..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setVisibleCount(8);
                  }}
                  className="bili-input w-full pl-9 py-2 text-xs"
                />
              </div>

              <span className="text-xs text-slate-400 font-medium whitespace-nowrap hidden sm:inline">
                {filteredSplits.length} {filteredSplits.length === 1 ? 'split' : 'splits'}
              </span>
            </div>
          </div>

          {filteredSplits.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm space-y-2">
              <p className="text-sm font-bold text-slate-700">No bill splits matched "{searchQuery}"</p>
              <p className="text-xs text-slate-400">Try adjusting your keywords or clearing filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline pt-1 cursor-pointer"
              >
                Clear Search & Filters
              </button>
            </div>
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
              <div
                key={split.id}
                className="bg-white rounded-3xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow space-y-5"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">
                        {split.title}
                      </h3>
                      {allPaid && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                          All Settled ✅
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                      <span>{formatDate(split.occurred_on)}</span>
                      {split.credit_card && (
                        <span className="inline-flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          <CardIcon className="w-3 h-3" />
                          {split.credit_card.bank_name} (••{split.credit_card.last_4})
                        </span>
                      )}
                      {split.note && <span>• {split.note}</span>}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-slate-400 block">Total Bill</span>
                    <span className="text-2xl font-extrabold text-slate-900">
                      {formatMoney(split.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Progress banner */}
                <div className="p-3.5 rounded-2xl bg-[#F6F7F9] flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-600">
                    {paidCount} of {participants.length} friends have chipped in
                  </span>
                  <span
                    className={
                      remainingBalance > 0 ? 'text-amber-800' : 'text-emerald-700'
                    }
                  >
                    {remainingBalance > 0
                      ? `${formatMoney(remainingBalance)} remaining`
                      : 'Zero remaining'}
                  </span>
                </div>

                {/* Participants List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Participants
                  </p>
                  <div className="max-h-56 overflow-y-auto pr-1.5 bili-scrollbar">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {participants.map((p) => (
                        <div
                          key={p.id}
                          className={`p-3.5 rounded-2xl flex items-center justify-between transition-all ${
                            p.is_paid
                              ? 'bg-emerald-50/60'
                              : 'bg-[#F6F7F9] hover:bg-slate-100'
                          }`}
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {p.contact?.name || 'Friend'}
                            </p>
                            <p className="text-xs font-extrabold text-slate-600">
                              {formatMoney(p.share_amount)}
                            </p>
                          </div>

                          {/* 1-Tap Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              handleTogglePaid(split.id, p.id, p.is_paid)
                            }
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-sm ${
                              p.is_paid
                                ? 'bg-emerald-700 text-white'
                               : 'bg-white text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {p.is_paid ? 'Paid ✅' : 'Tap when paid'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleDelete(split.id)}
                    className="text-xs font-medium text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove split
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

        {/* Lazy Load Button */}
        {filteredSplits.length > visibleCount && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 8)}
              className="bili-btn-secondary px-6 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
            >
              Load More Splits ({filteredSplits.length - visibleCount} remaining)
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
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
