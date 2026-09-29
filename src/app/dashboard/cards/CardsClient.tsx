'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { deleteCreditCardAction } from '@/app/actions/cards';
import { toast } from 'sonner';
import {
  CreditCard as CardIcon,
  Plus,
  Trash2,
  Clock,
  Pencil,
  Zap,
  ShieldCheck,
  Bell,
  Sparkles,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { CreditCardModal } from '@/components/Forms/CreditCardModal';
import { TransactionModal } from '@/components/Forms/TransactionModal';
import { EmptyState } from '@/components/UI/EmptyState';
import { StatCard } from '@/components/UI/StatCard';
import {
  formatMoney,
  calculateNextDueDate,
  calculateOptimalCardToSwipe,
} from '@/lib/finance/calculations';
import { CreditCard, Category } from '@/types';
import { confirmModal } from '@/components/UI/GlobalDialog';

interface CardsClientProps {
  creditCards: CreditCard[];
  linkedLoans?: any[];
  cardTransactions?: any[];
  categories?: Category[];
}

export function CardsClient({
  creditCards,
  linkedLoans = [],
  cardTransactions = [],
  categories = [],
}: CardsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [showAllRankings, setShowAllRankings] = useState(false);
  const [isSwipeModalOpen, setIsSwipeModalOpen] = useState(false);
  const [selectedSwipeCardId, setSelectedSwipeCardId] = useState<string>('');

  // Calculate Optimal Card to Swipe Today (Float Optimization)
  const optimalResult = calculateOptimalCardToSwipe(
    creditCards,
    cardTransactions,
    linkedLoans,
    new Date()
  );
  const { bestCard, rankedCards, cautionCards, todayFormatted } = optimalResult;

  // Spending power & wallet metrics
  const totalCards = creditCards.length;
  const totalSpendingPower = creditCards.reduce(
    (sum, c) => sum + Number(c.credit_limit || 0),
    0
  );
  const totalSwipedRemaining = linkedLoans.reduce(
    (sum, l) => sum + Number(l.balance_remaining || 0),
    0
  );
  const totalDirectCardSpend = cardTransactions
    .filter((t) => t.kind === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalUtilized = totalSwipedRemaining + totalDirectCardSpend;
  const availableSpendingPower = Math.max(0, totalSpendingPower - totalUtilized);
  const uniqueBanks = Array.from(
    new Set(creditCards.map((c) => c.bank_name).filter(Boolean))
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [visibleCardCount, setVisibleCardCount] = useState<number>(8);

  const filteredCards = creditCards.filter((card) => {
    if (selectedBank !== 'all' && card.bank_name !== selectedBank) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = card.name?.toLowerCase().includes(q);
      const matchBank = card.bank_name?.toLowerCase().includes(q);
      const matchDigits = card.last_4?.includes(q);
      if (!matchName && !matchBank && !matchDigits) return false;
    }
    return true;
  });

  const displayedCards = filteredCards.slice(0, visibleCardCount);

  const handleDelete = async (id: string) => {
    const confirmed = await confirmModal({
      title: 'Remove Credit Card?',
      description: 'Are you sure you want to remove this credit card? Existing card transactions will be preserved in your general records.',
      confirmText: 'Remove Card',
      variant: 'danger',
    });
    if (!confirmed) return;
    const res = await deleteCreditCardAction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Credit card removed.');
    }
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

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Cards & Due Dates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Keep track of statement cutoffs, credit limits, and optimal swipe schedules.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/dashboard/settings"
            className="bili-btn-secondary py-2.5 px-3.5 text-xs font-semibold shadow-xs flex items-center gap-1.5"
            title="Configure SMS & Email reminders"
          >
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            Alerts
          </Link>
          <button
            onClick={() => {
              setEditingCard(null);
              setIsModalOpen(true);
            }}
            className="bili-btn-primary py-2.5 px-4 text-xs font-semibold shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Credit Card
          </button>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <StatCard
          label="Total Spending Power"
          value={formatMoney(totalSpendingPower)}
          subtext={
            totalCards > 0
              ? `Combined limit across ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`
              : 'Add cards to calculate'
          }
          icon={Zap}
          variant="positive"
        />

        <StatCard
          label="Cards in Wallet"
          value={`${totalCards} ${totalCards === 1 ? 'Card' : 'Cards'}`}
          subtext={
            uniqueBanks.length > 0
              ? `Issued by ${uniqueBanks.length} ${uniqueBanks.length === 1 ? 'bank' : 'banks'}`
              : 'No cards registered yet'
          }
          icon={CardIcon}
          variant="neutral"
        />

        <StatCard
          label="Available Spending Power"
          value={formatMoney(availableSpendingPower)}
          subtext={
            totalSwipedRemaining > 0
              ? `${formatMoney(totalSwipedRemaining)} swiped for others`
              : 'Ready to swipe'
          }
          icon={ShieldCheck}
          variant={totalSwipedRemaining > 0 ? 'warning' : 'positive'}
        />
      </div>

      {/* 3. Streamlined Float Optimization Spotlight (Best Card to Swipe) */}
      {bestCard && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-100 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full">
                    Best to Swipe Today
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {bestCard.floatDays} Days Interest-Free Runway
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{bestCard.card.bank_name} {bestCard.card.name}</span>
                  <span className="text-xs font-mono font-medium text-slate-400">
                    •••• {bestCard.card.last_4}
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed max-w-2xl">
                  {bestCard.advice}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              <button
                onClick={() => {
                  setSelectedSwipeCardId(bestCard.card.id);
                  setIsSwipeModalOpen(true);
                }}
                className="bili-btn-primary py-2 px-3.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Log Swipe
              </button>
              <Link
                href={`/dashboard/cards/${bestCard.card.id}`}
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
              >
                Statements →
              </Link>
              {rankedCards.length > 1 && (
                <button
                  type="button"
                  onClick={() => setShowAllRankings((prev) => !prev)}
                  className="text-xs font-medium text-slate-500 hover:text-indigo-600 px-2 py-2 transition-colors cursor-pointer whitespace-nowrap"
                >
                  {showAllRankings ? 'Hide rankings' : `Compare (${rankedCards.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Caution alerts if any cards are within 1-2 days of cutoff */}
          {cautionCards.length > 0 && (
            <div className="pt-2.5 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Approaching cutoff (hold spending if possible):</span>
              <span className="font-semibold text-amber-950 truncate">
                {cautionCards.map((c) => `${c.card.bank_name} ${c.card.name}`).join(', ')}
              </span>
            </div>
          )}

          {/* Collapsible Grace Period Comparison Table */}
          {showAllRankings && rankedCards.length > 1 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {rankedCards.map((rc, idx) => (
                  <div
                    key={rc.card.id}
                    className={`p-3 rounded-2xl flex items-center justify-between gap-3 ${
                      rc.isBestCard
                        ? 'bg-emerald-50/90 text-emerald-950 font-medium'
                        : rc.recommendationTier === 'caution'
                        ? 'bg-amber-50/70 text-amber-950'
                        : 'bg-[#F6F7F9] text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center font-bold text-[10px] text-slate-700 shadow-2xs shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {rc.card.bank_name} {rc.card.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Cutoff: Day {rc.card.statement_day} • Due: {rc.paymentDueDateFormatted}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-slate-900 block">
                        {rc.floatDays}d Float
                      </span>
                      <Link
                        href={`/dashboard/cards/${rc.card.id}`}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Search & Filter Bar */}
      {creditCards.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl shadow-sm">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search bank, name, or last 4..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bili-input w-full pl-9 py-2 text-xs bg-slate-50 border-0"
            />
          </div>

          <div className="flex items-center gap-3 justify-between sm:justify-end">
            {uniqueBanks.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="bili-input py-1.5 px-3 text-xs bg-slate-100"
                >
                  <option value="all">All Banks ({creditCards.length})</option>
                  {uniqueBanks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <span className="text-xs text-slate-400 whitespace-nowrap font-medium">
              {filteredCards.length} {filteredCards.length === 1 ? 'card' : 'cards'}
            </span>
          </div>
        </div>
      )}

      {/* 5. Minimalist, Uncluttered Cards Grid */}
      {creditCards.length === 0 ? (
        <EmptyState
          icon={CardIcon}
          title="No credit cards added"
          description="Add your credit cards to see active countdowns to your payment due dates and avoid late fees."
          actionText="Add Credit Card"
          onAction={() => {
            setEditingCard(null);
            setIsModalOpen(true);
          }}
        />
      ) : filteredCards.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center shadow-sm space-y-2">
          <p className="text-sm font-bold text-slate-700">No cards matched your search</p>
          <p className="text-xs text-slate-400">Try adjusting your keywords or clearing bank filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedBank('all');
            }}
            className="text-xs font-semibold text-indigo-600 hover:underline pt-1 cursor-pointer"
          >
            Clear Search & Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayedCards.map((card) => {
            const dueInfo = calculateNextDueDate(card.due_day);
            const rec = rankedCards.find((r) => r.card.id === card.id);

            const thisCardTxs = (cardTransactions || []).filter(
              (t) => t.credit_card_id === card.id
            );
            const cardDirectSpend = thisCardTxs
              .filter((t) => t.kind === 'expense')
              .reduce((sum, t) => sum + Number(t.amount || 0), 0);

            const cardLoans = linkedLoans.filter((l) => l.credit_card_id === card.id);
            const totalSwipedOthers = cardLoans.reduce(
              (sum, l) => sum + Number(l.balance_remaining || 0),
              0
            );

            const totalUtilizedOnCard = cardDirectSpend + totalSwipedOthers;
            const availableOnCard = Math.max(0, Number(card.credit_limit || 0) - totalUtilizedOnCard);
            const utilizationPct =
              card.credit_limit > 0
                ? Math.min(100, Math.round((totalUtilizedOnCard / Number(card.credit_limit)) * 100))
                : 0;

            return (
              <div
                key={card.id}
                className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 border border-slate-100/70"
              >
                {/* Top Section: Card Identity & Urgency Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Mini Visual Card Preview */}
                      <Link
                        href={`/dashboard/cards/${card.id}`}
                        className="w-14 h-9 sm:w-16 sm:h-10 rounded-xl p-1.5 text-white shadow-xs flex flex-col justify-between shrink-0 transition-transform hover:scale-105"
                        style={getCardBgStyle(card.color_theme)}
                        title="View statement cycles"
                      >
                        <div className="flex justify-between items-center opacity-80">
                          <CardIcon className="w-2.5 h-2.5" />
                        </div>
                        <p className="text-[9px] font-mono tracking-wider font-bold">
                          ••{card.last_4}
                        </p>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] uppercase font-bold text-slate-400 truncate">
                          {card.bank_name}
                        </p>
                        <Link
                          href={`/dashboard/cards/${card.id}`}
                          className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate block"
                        >
                          {card.name}
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                      {rec?.isBestCard && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5 fill-current" />
                          Best to Swipe
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
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
                  </div>

                  {/* Clean Utilization Meter */}
                  {card.credit_limit > 0 && (
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          Available: <strong className="text-slate-900 font-bold">{formatMoney(availableOnCard)}</strong>
                        </span>
                        <span className="text-slate-400 font-medium">
                          Limit: {formatMoney(card.credit_limit)} ({utilizationPct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            utilizationPct > 80
                              ? 'bg-rose-500'
                              : utilizationPct > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${utilizationPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Key Schedule Grid (Minimalist Tonal Box) */}
                <div className="bg-[#F6F7F9] p-3 rounded-2xl grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Statement Cutoff</span>
                    <span className="font-bold text-slate-800">
                      Day {card.statement_day} of month
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Payment Due Day</span>
                    <span className="font-bold text-slate-800">
                      Day {card.due_day} {rec ? `(${rec.floatDays}d float)` : ''}
                    </span>
                  </div>
                </div>

                {/* Quiet Activity Summary */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-0.5">
                  <span className="truncate pr-2">
                    {totalUtilizedOnCard > 0 ? (
                      <>
                        Swiped: <strong className="text-slate-800 font-semibold">{formatMoney(cardDirectSpend)}</strong> ({thisCardTxs.length})
                        {totalSwipedOthers > 0 && (
                          <span className="text-blue-700 font-medium"> • {formatMoney(totalSwipedOthers)} for others</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">Zero active card balance</span>
                    )}
                  </span>
                  <Link
                    href={`/dashboard/cards/${card.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 shrink-0 hover:underline flex items-center gap-0.5"
                  >
                    Statements <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Footer Toolbar */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Next due: {dueInfo.nextDueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingCard(card);
                        setIsModalOpen(true);
                      }}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-[#F6F7F9] hover:bg-slate-200/80 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3 h-3 text-slate-400" />
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(card.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-xl hover:bg-rose-50 cursor-pointer"
                      title="Remove credit card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination / Load More */}
      {filteredCards.length > visibleCardCount && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setVisibleCardCount((prev) => prev + 6)}
            className="bili-btn-secondary px-6 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            Load More Cards ({filteredCards.length - visibleCardCount} remaining)
          </button>
        </div>
      )}

      {/* Modals */}
      <CreditCardModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCard(null);
        }}
        card={editingCard}
      />

      <TransactionModal
        isOpen={isSwipeModalOpen}
        onClose={() => {
          setIsSwipeModalOpen(false);
          setSelectedSwipeCardId('');
        }}
        defaultCreditCardId={selectedSwipeCardId}
        categories={categories}
        creditCards={creditCards}
      />
    </div>
  );
}
