'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSearchParams, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { CreditCard, Category } from '@/types';
import {
  calculateNextDueDate,
  calculateOptimalCardToSwipe,
  calculateCardSpending,
  getCardUrgency,
  formatDate,
  OptimalCardResult,
} from '@/lib/finance/calculations';
import { softDeleteCreditCardAction, restoreCreditCardAction } from '@/app/actions/cards';

import { Button } from '@/components/ui/button';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

import { CardsSummaryRow } from '@/components/Cards/CardsSummaryRow';
import { PayTheseSoonPanel, DueSoonCardItem } from '@/components/Cards/PayTheseSoonPanel';
import { BestCardTodayPanel } from '@/components/Cards/BestCardTodayPanel';
import { CardsToolbar, CardSortOption } from '@/components/Cards/CardsToolbar';
import { CreditCardTile, CardSpendingSummary } from '@/components/Cards/CreditCardTile';
import { Bell, Plus, CreditCard as CardIcon } from 'lucide-react';

// Lazy-load modals for optimal performance & LCP (TNV-030)
const CreditCardModal = dynamic(
  () => import('@/components/Forms/CreditCardModal').then((mod) => mod.CreditCardModal),
  { ssr: false }
);

const TransactionModal = dynamic(
  () => import('@/components/Forms/TransactionModal').then((mod) => mod.TransactionModal),
  { ssr: false }
);

interface CardsClientProps {
  creditCards: CreditCard[];
  linkedLoans?: any[];
  cardTransactions?: any[];
  categories?: Category[];
  initialSpendingMap?: Record<string, CardSpendingSummary>;
  initialTotals?: {
    totalLimit: number;
    totalUsed: number;
    boughtForOthers: number;
  };
  initialOptimalResult?: OptimalCardResult;
  initialDueSoonCards?: DueSoonCardItem[];
}

export function CardsClient({
  creditCards,
  linkedLoans = [],
  cardTransactions = [],
  categories = [],
  initialSpendingMap,
  initialTotals,
  initialOptimalResult,
  initialDueSoonCards,
}: CardsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [isSwipeModalOpen, setIsSwipeModalOpen] = useState(false);
  const [selectedSwipeCardId, setSelectedSwipeCardId] = useState<string>('');
  const [removedCardIds, setRemovedCardIds] = useState<string[]>([]);
  const [paidStatementIds, setPaidStatementIds] = useState<string[]>([]);

  const searchParams = useSearchParams();
  const pathname = usePathname();

  const validSorts: CardSortOption[] = ['due_date', 'most_used', 'most_left'];
  const paramSort = searchParams?.get('sort') as CardSortOption;

  // Toolbar & filter state with URL state restoration (TNV-025)
  const [searchQuery, setSearchQuery] = useState(() => searchParams?.get('q') || '');
  const [selectedBank, setSelectedBank] = useState(() => searchParams?.get('bank') || 'all');
  const [sortBy, setSortBy] = useState<CardSortOption>(() =>
    validSorts.includes(paramSort) ? paramSort : 'due_date'
  );
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 24;

  // Sync state to URL without full page reload
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedBank !== 'all') params.set('bank', selectedBank);
    if (sortBy !== 'due_date') params.set('sort', sortBy);

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    window.history.replaceState(null, '', newUrl);
  }, [searchQuery, selectedBank, sortBy, pathname]);

  // Active cards (excluding soft-deleted during current session)
  const activeCards = useMemo(
    () => creditCards.filter((c) => !removedCardIds.includes(c.id)),
    [creditCards, removedCardIds]
  );

  // Spending map (memoized, populated from server compute when available)
  const spendingMap = useMemo(() => {
    const map = new Map<string, CardSpendingSummary>();

    if (initialSpendingMap && removedCardIds.length === 0) {
      Object.entries(initialSpendingMap).forEach(([cardId, val]) => {
        map.set(cardId, val);
      });
      return map;
    }

    activeCards.forEach((card) => {
      const spending = calculateCardSpending(card, cardTransactions, linkedLoans);
      map.set(card.id, spending);
    });

    return map;
  }, [activeCards, cardTransactions, linkedLoans, initialSpendingMap, removedCardIds]);

  // Overall totals
  const totalLimit = useMemo(() => {
    if (initialTotals && removedCardIds.length === 0) return initialTotals.totalLimit;
    return activeCards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  }, [activeCards, initialTotals, removedCardIds]);

  const totalUsed = useMemo(() => {
    if (initialTotals && removedCardIds.length === 0) return initialTotals.totalUsed;
    let sum = 0;
    spendingMap.forEach((v) => {
      sum += v.totalUsed;
    });
    return sum;
  }, [spendingMap, initialTotals, removedCardIds]);

  const boughtForOthers = useMemo(() => {
    if (initialTotals && removedCardIds.length === 0) return initialTotals.boughtForOthers;
    let sum = 0;
    spendingMap.forEach((v) => {
      sum += v.loansSpend;
    });
    return sum;
  }, [spendingMap, initialTotals, removedCardIds]);

  // Optimal card to swipe calculation (memoized)
  const optimalResult = useMemo(() => {
    if (initialOptimalResult && removedCardIds.length === 0) return initialOptimalResult;
    return calculateOptimalCardToSwipe(activeCards, cardTransactions, linkedLoans);
  }, [activeCards, cardTransactions, linkedLoans, initialOptimalResult, removedCardIds]);

  // Pay These Soon items (balances due within 3 days or overdue, excluding paid items)
  const dueSoonCards = useMemo(() => {
    if (initialDueSoonCards && removedCardIds.length === 0 && paidStatementIds.length === 0) {
      return initialDueSoonCards;
    }

    const items: DueSoonCardItem[] = [];

    activeCards.forEach((card) => {
      if (card.latest_statement?.id && paidStatementIds.includes(card.latest_statement.id)) {
        return;
      }

      const spending = spendingMap.get(card.id);
      const totalBalance = card.latest_statement
        ? Number(card.latest_statement.billed_amount || 0) - Number(card.latest_statement.paid_amount || 0)
        : spending?.totalUsed || 0;

      if (totalBalance > 0) {
        const dueInfo = calculateNextDueDate(card.due_day);
        const urgencyInfo = getCardUrgency(dueInfo.nextDueDate, totalBalance);

        // Hide if all cards paid or no dues incoming within 3 days (daysRemaining <= 3)
        if (dueInfo.daysRemaining <= 3) {
          items.push({
            statementId: card.latest_statement?.id,
            cardId: card.id,
            cardName: card.name,
            bankName: card.bank_name,
            last4: card.last_4,
            dueDateFormatted: formatDate(dueInfo.nextDueDate),
            daysRemaining: dueInfo.daysRemaining,
            amountDue: totalBalance,
            urgency: urgencyInfo.urgency === 'overdue' ? 'overdue' : 'urgent',
          });
        }
      }
    });

    return items.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [activeCards, spendingMap, initialDueSoonCards, removedCardIds, paidStatementIds]);

  // Next payment info for the 3rd tile in summary row
  const nextPaymentItem = useMemo(() => {
    if (dueSoonCards.length > 0) {
      const nearest = dueSoonCards[0];
      return {
        cardName: nearest.cardName,
        bankName: nearest.bankName,
        dueDateFormatted: nearest.dueDateFormatted,
        daysRemaining: nearest.daysRemaining,
        amountDue: nearest.amountDue,
      };
    }

    let earliestCard: DueSoonCardItem | null = null;
    activeCards.forEach((card) => {
      const spending = spendingMap.get(card.id);
      const totalBalance = card.latest_statement
        ? Number(card.latest_statement.billed_amount || 0) - Number(card.latest_statement.paid_amount || 0)
        : spending?.totalUsed || 0;

      if (totalBalance > 0) {
        const dueInfo = calculateNextDueDate(card.due_day);
        if (!earliestCard || dueInfo.daysRemaining < earliestCard.daysRemaining) {
          earliestCard = {
            cardId: card.id,
            cardName: card.name,
            bankName: card.bank_name,
            last4: card.last_4,
            dueDateFormatted: formatDate(dueInfo.nextDueDate),
            daysRemaining: dueInfo.daysRemaining,
            amountDue: totalBalance,
            urgency: 'urgent',
          };
        }
      }
    });

    return earliestCard;
  }, [dueSoonCards, activeCards, spendingMap]);

  // Unique banks for toolbar filter
  const uniqueBanks = useMemo(
    () => Array.from(new Set(activeCards.map((c) => c.bank_name).filter(Boolean))),
    [activeCards]
  );

  // Filter & Sort
  const filteredCards = useMemo(() => {
    let result = activeCards.filter((card) => {
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

    result.sort((a, b) => {
      const spendingA = spendingMap.get(a.id);
      const spendingB = spendingMap.get(b.id);
      const usedA = spendingA?.totalUsed || 0;
      const usedB = spendingB?.totalUsed || 0;
      const leftA = Math.max(0, Number(a.credit_limit || 0) - usedA);
      const leftB = Math.max(0, Number(b.credit_limit || 0) - usedB);

      if (sortBy === 'most_used') {
        return usedB - usedA;
      }
      if (sortBy === 'most_left') {
        return leftB - leftA;
      }

      // Default: sort by nearest payment due date
      const dueA = calculateNextDueDate(a.due_day).daysRemaining;
      const dueB = calculateNextDueDate(b.due_day).daysRemaining;
      return dueA - dueB;
    });

    return result;
  }, [activeCards, selectedBank, searchQuery, sortBy, spendingMap]);

  // Pagination logic (TNV-010: 24 cards per page)
  const totalPages = Math.ceil(filteredCards.length / PAGE_SIZE);
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages || 1);
  const displayedCards = useMemo(() => {
    return filteredCards.slice(
      (safeCurrentPage - 1) * PAGE_SIZE,
      safeCurrentPage * PAGE_SIZE
    );
  }, [filteredCards, safeCurrentPage]);

  // Soft delete with 8-second Undo (TNV-022)
  const handleDeleteCard = async (cardId: string) => {
    const targetCard = creditCards.find((c) => c.id === cardId);
    const cardTitle = targetCard ? `${targetCard.bank_name} ${targetCard.name}` : 'Card';

    setRemovedCardIds((prev) => [...prev, cardId]);
    const res = await softDeleteCreditCardAction(cardId);
    if (res?.error) {
      setRemovedCardIds((prev) => prev.filter((id) => id !== cardId));
      toast.error(res.error);
      return;
    }

    toast.success(`${cardTitle} removed.`, {
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: async () => {
          setRemovedCardIds((prev) => prev.filter((id) => id !== cardId));
          const restoreRes = await restoreCreditCardAction(cardId);
          if (restoreRes?.error) {
            setRemovedCardIds((prev) => [...prev, cardId]);
            toast.error(restoreRes.error);
          } else {
            toast.success(`${cardTitle} restored.`);
          }
        },
      },
    });
  };

  const handleEditCard = (card: CreditCard) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleOpenSwipePurchase = (cardId: string) => {
    setSelectedSwipeCardId(cardId);
    setIsSwipeModalOpen(true);
  };

  const handlePaidSuccess = (statementId: string) => {
    setPaidStatementIds((prev) => [...prev, statementId]);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-150 px-4 sm:px-6 lg:px-8 pb-24 md:pb-12">
      {/* 1. Page Header (TNV-018, TNV-031, TNV-032) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            My Credit Cards
          </h1>
          <p className="text-sm text-muted-foreground">
            Keep track of when bills are made, credit limits, and optimal swipe schedules in plain language.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="soft"
            size="default"
            render={<Link href="/dashboard/settings?tab=cards" />}
            className="min-h-12 h-12 px-4 font-semibold"
            aria-label="Open card reminder settings"
          >
            <Bell className="mr-2 size-4 text-muted-foreground" />
            Reminders
          </Button>

          <Button
            variant="primary"
            size="default"
            onClick={() => {
              setEditingCard(null);
              setIsModalOpen(true);
            }}
            className="min-h-12 h-12 px-5 font-semibold cursor-pointer shadow-none"
          >
            <Plus className="mr-1.5 size-4" />
            Add a card
          </Button>
        </div>
      </div>

      {/* 2. Summary Row (TNV-019) */}
      <CardsSummaryRow
        totalLimit={totalLimit}
        totalUsed={totalUsed}
        boughtForOthers={boughtForOthers}
        nextPayment={nextPaymentItem}
      />

      {/* 3. Pay These Soon Panel (TNV-020) - Hidden if all cards paid or no dues incoming in 3 days */}
      {dueSoonCards.length > 0 && (
        <PayTheseSoonPanel
          dueSoonCards={dueSoonCards}
          onPaidSuccess={handlePaidSuccess}
        />
      )}

      {/* 4. Best Card Today Panel (TNV-023) */}
      <BestCardTodayPanel
        optimalData={optimalResult}
        onAddPurchaseClick={handleOpenSwipePurchase}
      />

      {/* 5. Toolbar: Search, Bank Filter, Sort (TNV-024) */}
      <CardsToolbar
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        selectedBank={selectedBank}
        onBankChange={(b) => {
          setSelectedBank(b);
          setCurrentPage(1);
        }}
        sortBy={sortBy}
        onSortChange={setSortBy}
        banks={uniqueBanks}
        totalCount={activeCards.length}
        filteredCount={filteredCards.length}
        onClearFilters={() => {
          setSearchQuery('');
          setSelectedBank('all');
          setCurrentPage(1);
        }}
      />

      {/* 6. Card Grid (TNV-017 & TNV-021) */}
      {activeCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-10 text-center shadow-card space-y-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CardIcon className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-foreground">No credit cards added yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add your credit cards to automatically calculate billing grace periods and track due dates.
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingCard(null);
              setIsModalOpen(true);
            }}
            className="min-h-12 h-12 px-6"
          >
            <Plus className="mr-2 size-4" />
            Add your first card
          </Button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-card p-8 text-center shadow-card space-y-3">
          <p className="text-base font-semibold text-foreground">No cards match your current search or filter</p>
          <p className="text-xs text-muted-foreground">Try clearing your filters or searching with a different term.</p>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedBank('all');
            }}
            className="min-h-10"
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {displayedCards.map((card) => {
            const spending = spendingMap.get(card.id) || calculateCardSpending(card, [], []);

            return (
              <CreditCardTile
                key={card.id}
                card={card}
                spending={spending}
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
              />
            );
          })}
        </div>
      )}

      {/* 7. Pagination (TNV-010) */}
      {totalPages > 1 && (
        <div className="pt-4 flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className={safeCurrentPage <= 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={page === safeCurrentPage}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className={safeCurrentPage >= totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* 8. Modals (Lazy-loaded, TNV-030) */}
      {isModalOpen && (
        <CreditCardModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCard(null);
          }}
          card={editingCard}
        />
      )}

      {isSwipeModalOpen && (
        <TransactionModal
          isOpen={isSwipeModalOpen}
          onClose={() => {
            setIsSwipeModalOpen(false);
            setSelectedSwipeCardId('');
          }}
          defaultCreditCardId={selectedSwipeCardId}
          categories={categories}
          creditCards={activeCards}
        />
      )}
    </div>
  );
}
