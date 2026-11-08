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
  calculateCardDueDetails,
  getDueSoonCardItems,
  getCardUrgency,
  formatDate,
  OptimalCardResult,
  CardDueDetails,
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
import { Bell, Plus, CreditCard as CardIcon, Layers } from 'lucide-react';

// Lazy-load modals for optimal performance & LCP (TNV-030)
const CreditCardModal = dynamic(
  () => import('@/components/Forms/CreditCardModal').then((mod) => mod.CreditCardModal),
  { ssr: false }
);

const TransactionModal = dynamic(
  () => import('@/components/Forms/TransactionModal').then((mod) => mod.TransactionModal),
  { ssr: false }
);

const CardInstallmentModal = dynamic(
  () => import('@/components/Forms/CardInstallmentModal').then((mod) => mod.CardInstallmentModal),
  { ssr: false }
);

interface CardsClientProps {
  creditCards: CreditCard[];
  linkedLoans?: any[];
  linkedLiabilities?: any[];
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
  linkedLiabilities = [],
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
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [selectedInstallmentCardId, setSelectedInstallmentCardId] = useState<string>('');
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
      const spending = calculateCardSpending(card, cardTransactions, linkedLoans, linkedLiabilities);
      map.set(card.id, spending);
    });

    return map;
  }, [activeCards, cardTransactions, linkedLoans, linkedLiabilities, initialSpendingMap, removedCardIds]);

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
    return calculateOptimalCardToSwipe(activeCards, cardTransactions, linkedLoans, linkedLiabilities);
  }, [activeCards, cardTransactions, linkedLoans, linkedLiabilities, initialOptimalResult, removedCardIds]);

  // Due details map for each card (memoized)
  const dueDetailsMap = useMemo(() => {
    const map = new Map<string, CardDueDetails>();
    activeCards.forEach((card) => {
      const details = calculateCardDueDetails(
        card,
        card.latest_statement,
        cardTransactions,
        linkedLoans,
        linkedLiabilities
      );
      map.set(card.id, details);
    });
    return map;
  }, [activeCards, cardTransactions, linkedLoans, linkedLiabilities]);

  // Pay These Soon items (balances due within 3 days or overdue, excluding paid items)
  const dueSoonCards = useMemo(() => {
    if (initialDueSoonCards && removedCardIds.length === 0 && paidStatementIds.length === 0) {
      return initialDueSoonCards;
    }

    const items = getDueSoonCardItems(
      activeCards,
      undefined,
      cardTransactions,
      linkedLoans,
      linkedLiabilities
    );

    if (paidStatementIds.length > 0) {
      return items.filter((item) => {
        if (item.statementId && paidStatementIds.includes(item.statementId)) return false;
        if (paidStatementIds.includes(item.cardId)) return false;
        return true;
      });
    }

    return items;
  }, [activeCards, cardTransactions, linkedLoans, linkedLiabilities, initialDueSoonCards, removedCardIds, paidStatementIds]);

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
      if (card.latest_statement?.id && paidStatementIds.includes(card.latest_statement.id)) {
        return;
      }

      const details = dueDetailsMap.get(card.id);
      if (details && details.amountDue > 0 && details.daysRemaining >= -30) {
        if (!earliestCard || details.daysRemaining < earliestCard.daysRemaining) {
          earliestCard = {
            cardId: card.id,
            cardName: details.cardName,
            bankName: details.bankName,
            last4: details.last4,
            dueDateFormatted: details.dueDateFormatted,
            daysRemaining: details.daysRemaining,
            amountDue: details.amountDue,
            urgency: details.urgency === 'overdue' ? 'overdue' : 'urgent',
          };
        }
      }
    });

    return earliestCard;
  }, [dueSoonCards, activeCards, dueDetailsMap, paidStatementIds]);

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
    <div className="flex flex-col gap-6 sm:gap-8 min-w-0">
      {/* 1. Page Header (TNV-018, TNV-031, TNV-032) */}
      <div className="page-header">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-display text-foreground">
            My credit cards
          </h1>
          <p className="max-w-prose text-sm sm:text-base text-muted-foreground">
            Keep track of when bills are made, credit limits, and optimal swipe schedules in plain language.
          </p>
        </div>

        <div className="page-header-actions w-full sm:w-auto">
          <Button
            variant="soft"
            size="default"
            render={<Link href="/dashboard/settings?tab=cards" />}
            className="flex-1 sm:flex-initial px-4"
            aria-label="Open card reminder settings"
          >
            <Bell className="size-4 text-muted-foreground shrink-0" />
            Reminders
          </Button>

          <Button
            variant="soft"
            size="default"
            onClick={() => {
              setSelectedInstallmentCardId(activeCards[0]?.id || '');
              setIsInstallmentModalOpen(true);
            }}
            className="flex-1 sm:flex-initial px-4 text-foreground"
          >
            <Layers className="size-4 text-primary shrink-0" />
            Add installment
          </Button>

          <Button
            variant="primary"
            size="default"
            onClick={() => {
              setEditingCard(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto px-5"
          >
            <Plus className="size-4 shrink-0" />
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
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-card px-6 py-12 text-center shadow-card">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <CardIcon className="size-7" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-title text-foreground">No credit cards added yet</h3>
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
            className="px-6"
          >
            <Plus className="size-4" />
            Add your first card
          </Button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-card px-6 py-10 text-center shadow-card">
          <p className="text-title text-foreground">No cards match your search or filter</p>
          <p className="text-sm text-muted-foreground max-w-sm">Try clearing your filters or searching with a different term.</p>
          <Button
            variant="soft"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setSelectedBank('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="grid-fluid-fill gap-x-5 gap-y-6 [--grid-min:18.5rem]">
          {displayedCards.map((card, index) => {
            const spending = spendingMap.get(card.id) || calculateCardSpending(card, [], []);
            const dueDetails = dueDetailsMap.get(card.id);

            return (
              <div
                key={card.id}
                className="motion-pop-in min-w-0"
                style={{ ['--stagger' as string]: index }}
              >
              <CreditCardTile
                card={card}
                spending={spending}
                dueDetails={dueDetails}
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
              />
              </div>
            );
          })}
        </div>
      )}

      {/* 7. Pagination (TNV-010) */}
      {totalPages > 1 && (
        <div className="flex justify-center">
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

      {isInstallmentModalOpen && (
        <CardInstallmentModal
          isOpen={isInstallmentModalOpen}
          onClose={() => {
            setIsInstallmentModalOpen(false);
            setSelectedInstallmentCardId('');
          }}
          defaultCreditCardId={selectedInstallmentCardId}
          creditCards={activeCards}
        />
      )}
    </div>
  );
}
