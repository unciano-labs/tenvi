'use client';

import React from 'react';
import {
  CheckCircle2,
  Undo2,
  Calendar,
  Wallet,
  Tag,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  Car,
  Receipt,
  Trash2,
  Check,
  Loader2,
  PieChart,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsedPhotoItem } from '@/types';
import { AITransactionItem } from '@/app/actions/ai';

/**
 * Compact inline-SVG donut/bar chart for spending summaries
 * Built entirely with native SVG math - no heavy chart libraries.
 */
export interface SpendingCategoryData {
  name: string;
  amount: number;
  color: string;
}

interface InlineSpendingChartProps {
  categories: SpendingCategoryData[];
  totalAmount: number;
}

export function InlineSpendingChart({ categories, totalAmount }: InlineSpendingChartProps) {
  if (!categories || categories.length === 0 || totalAmount <= 0) return null;

  // Calculate cumulative slice offsets for donut ring
  const strokeWidth = 14;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-muted/40 border border-border/40 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-primary" />
          Spending Breakdown
        </span>
        <span className="text-xs font-extrabold text-foreground">
          ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Native SVG Donut */}
        <div className="relative size-24 shrink-0 flex items-center justify-center">
          <svg className="size-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-muted/60 stroke-current"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {categories.map((cat, i) => {
              const ratio = cat.amount / totalAmount;
              const strokeDasharray = `${ratio * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedPercent * circumference;
              accumulatedPercent += ratio;

              return (
                <circle
                  key={i}
                  cx="50"
                  cy="50"
                  r={radius}
                  stroke={cat.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  fill="transparent"
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 text-2xs min-w-0">
          {categories.map((cat, idx) => {
            const pct = Math.round((cat.amount / totalAmount) * 100);
            return (
              <div key={idx} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-foreground font-medium truncate">{cat.name}</span>
                </div>
                <span className="text-muted-foreground font-semibold shrink-0">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Rich card for a single logged transaction
 */
interface SingleTransactionCardProps {
  transaction: AITransactionItem;
  isUndone?: boolean;
  isUndoing?: boolean;
  onUndo: () => void;
  onEdit?: () => void;
}

export function SingleTransactionCard({
  transaction,
  isUndone = false,
  isUndoing = false,
  onUndo,
  onEdit,
}: SingleTransactionCardProps) {
  const isExpense = transaction.kind === 'expense';

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-card border border-border/50 shadow-xs space-y-2.5">
      {/* Header Pill: Logged · Category · PaymentMethod · ₱Amount */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
            isExpense
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isExpense ? (
            <ArrowDownLeft className="w-3 h-3" />
          ) : (
            <ArrowUpRight className="w-3 h-3" />
          )}
          Logged · {transaction.categoryName || 'General'} ·{' '}
          {transaction.paymentMethod?.replace('_', ' ') || 'Cash'}
        </span>

        <span className="text-xs font-black text-foreground">
          ₱{transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      {/* Note and Details */}
      <div className="space-y-1 text-2xs text-muted-foreground">
        {transaction.note && (
          <div className="flex items-center gap-1.5">
            <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-foreground font-medium truncate">{transaction.note}</span>
          </div>
        )}

        {(transaction.creditCardName || transaction.savingsName) && (
          <div className="flex items-center gap-1.5">
            <Wallet className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate">
              {transaction.creditCardName && `Card: ${transaction.creditCardName}`}
              {transaction.savingsName && `Vault: ${transaction.savingsName}`}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
          <span>{transaction.occurredOn}</span>
        </div>
      </div>

      {/* Action / Undo Bar */}
      <div className="pt-1 flex items-center justify-between border-t border-border/30">
        {isUndone ? (
          <span className="text-2xs font-semibold text-muted-foreground italic">
            Transaction undone & removed
          </span>
        ) : (
          <>
            <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Saved to Ledger
            </span>
            <div className="flex items-center gap-1.5">
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onEdit}
                  className="h-7 text-2xs font-semibold rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Edit
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onUndo}
                disabled={isUndoing}
                className="h-7 text-2xs font-semibold rounded-lg gap-1 cursor-pointer"
              >
                {isUndoing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
                Undo
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Rich card for multi-day batch transactions
 */
interface MultiTransactionCardProps {
  transactions: AITransactionItem[];
  isUndone?: boolean;
  isUndoing?: boolean;
  onUndoAll: () => void;
}

export function MultiTransactionCard({
  transactions,
  isUndone = false,
  isUndoing = false,
  onUndoAll,
}: MultiTransactionCardProps) {
  const total = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const first = transactions[0];

  return (
    <div className="mt-3 p-3.5 rounded-2xl bg-card border border-border/50 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-2xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Layers className="w-3 h-3" />
          Multi-Day Batch ({transactions.length} entries)
        </span>
        <span className="text-xs font-black text-foreground">
          ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      </div>

      <div className="space-y-1 text-2xs text-muted-foreground">
        {first.propertyName && (
          <div className="flex items-center gap-1.5">
            <Car className="w-3 h-3 text-muted-foreground" />
            <span className="font-semibold text-foreground">{first.propertyName}</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
          {transactions.map((tx) => (
            <span
              key={tx.id}
              className="text-3xs font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground"
            >
              {tx.occurredOn}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between border-t border-border/30">
        {isUndone ? (
          <span className="text-2xs font-semibold text-muted-foreground italic">
            All entries undone
          </span>
        ) : (
          <>
            <span className="text-2xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Saved to Property Ledger
            </span>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={onUndoAll}
              disabled={isUndoing}
              className="h-7 text-2xs font-semibold rounded-lg gap-1 cursor-pointer"
            >
              {isUndoing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3" />}
              Undo All ({transactions.length})
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export interface CardOption {
  id: string;
  name: string;
  bank_name?: string;
  last_4?: string;
}

export interface RecentTransactionOption {
  id: string;
  amount: number;
  occurred_on: string;
  payment_method: string;
  credit_card_id?: string | null;
  note?: string | null;
  category_name?: string | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  matchedId?: string;
}

function formatInputDate(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    return dateStr.split('T')[0];
  } catch {
    return dateStr;
  }
}

function formatDisplayDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const raw = dateStr.split('T')[0];
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = Number(parts[0]);
      const month = Number(parts[1]) - 1;
      const day = Number(parts[2]);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    }
    return dateStr;
  } catch {
    return dateStr || '';
  }
}

/**
 * Checks whether a parsed photo item is a duplicate based on:
 * same date, amount, card (or cash), and title.
 */
export function checkParsedItemDuplicate(
  item: ParsedPhotoItem,
  allParsedItems: ParsedPhotoItem[] = [],
  recentTransactions: RecentTransactionOption[] = []
): DuplicateCheckResult {
  const itemAmt = Number(item.amount || 0);
  if (itemAmt <= 0) return { isDuplicate: false };

  const normalizeDate = (d?: string | null) => {
    if (!d) return '';
    try {
      return d.split('T')[0];
    } catch {
      return String(d);
    }
  };

  const cleanTitle = (t?: string | null) => {
    return (t || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isTitleMatch = (t1: string, t2: string) => {
    if (!t1 || !t2) return false;
    if (t1 === t2) return true;
    if (t1.length >= 4 && t2.includes(t1)) return true;
    if (t2.length >= 4 && t1.includes(t2)) return true;
    const words1 = t1.split(' ').filter((w) => w.length > 2);
    const words2 = t2.split(' ').filter((w) => w.length > 2);
    return words1.some((w) => words2.includes(w));
  };

  const itemDate = normalizeDate(item.date);
  const itemTitle = cleanTitle(item.title);
  const itemPaymentMethod = item.paymentMethod || 'cash';
  const itemCardId = item.creditCardId || null;

  // 1. Check duplicate within the current parsed receipt batch (same date, amount, card, title)
  for (const other of allParsedItems) {
    if (other.id === item.id) continue;
    const otherAmt = Number(other.amount || 0);
    const otherDate = normalizeDate(other.date);
    const otherTitle = cleanTitle(other.title);
    const otherPaymentMethod = other.paymentMethod || 'cash';
    const otherCardId = other.creditCardId || null;

    const sameAmount = Math.abs(itemAmt - otherAmt) < 0.01;
    const sameDate = Boolean(itemDate && otherDate && itemDate === otherDate);
    const sameCard =
      itemPaymentMethod === otherPaymentMethod &&
      (itemPaymentMethod !== 'credit_card' || itemCardId === otherCardId);
    const sameTitle = isTitleMatch(itemTitle, otherTitle);

    if (sameAmount && sameDate && sameCard && sameTitle) {
      return {
        isDuplicate: true,
        reason: 'Duplicate in this receipt (same date, amount, card, and title)',
        matchedId: other.id,
      };
    }
  }

  // 2. Check duplicate against user's recent recorded transactions
  for (const tx of recentTransactions) {
    const txAmt = Number(tx.amount || 0);
    const txDate = normalizeDate(tx.occurred_on);
    const txTitle = cleanTitle(tx.note || tx.category_name);
    const txPaymentMethod = tx.payment_method || 'cash';
    const txCardId = tx.credit_card_id || null;

    const sameAmount = Math.abs(itemAmt - txAmt) < 0.01;
    const sameDate = Boolean(itemDate && txDate && itemDate === txDate);

    // Card match logic:
    // If credit card: must have same creditCardId (or both credit_card)
    // If cash: both cash or tx has no credit card
    const sameCard =
      (itemPaymentMethod === 'credit_card' && (itemCardId === txCardId || (!itemCardId && txPaymentMethod === 'credit_card'))) ||
      (itemPaymentMethod === 'cash' && (txPaymentMethod === 'cash' || !txCardId));

    const sameTitle = isTitleMatch(itemTitle, txTitle);

    if (sameAmount && sameDate && sameCard && sameTitle) {
      const cardLabel = itemPaymentMethod === 'credit_card' ? 'same card' : 'cash';
      return {
        isDuplicate: true,
        reason: `Duplicate: already recorded on ${txDate} for ₱${txAmt.toLocaleString()} via ${cardLabel} ("${tx.note || tx.category_name || 'Transaction'}")`,
        matchedId: tx.id,
      };
    }
  }

  // 3. Fallback: server duplicateWarning if detected during vision parsing
  if (item.duplicateWarning?.isDuplicate) {
    return {
      isDuplicate: true,
      reason: item.duplicateWarning.matchedDescription
        ? `Duplicate: matches "${item.duplicateWarning.matchedDescription}"`
        : 'Possible duplicate detected',
      matchedId: item.duplicateWarning.matchedId,
    };
  }

  return { isDuplicate: false };
}

/**
 * Rich card for photo-parsed receipts and line-items
 */
interface PhotoReviewCardProps {
  items: ParsedPhotoItem[];
  isSaved?: boolean;
  isSavingAll?: boolean;
  savingSingleId?: string | null;
  allAvailableBorrowers: Array<{
    id: string;
    name: string;
    isCustom: boolean;
    isProperty?: boolean;
    icon?: string;
  }>;
  availableCards?: CardOption[];
  recentTransactions?: RecentTransactionOption[];
  onUpdateItem: (itemId: string, updates: Partial<ParsedPhotoItem>) => void;
  onUpdateAllItems?: (updates: Partial<ParsedPhotoItem>) => void;
  onSaveSingle: (item: ParsedPhotoItem) => void;
  onDiscardSingle: (itemId: string) => void;
  onSaveAll: () => void;
  onDiscardAll: () => void;
}

export function PhotoReviewCard({
  items,
  isSaved = false,
  isSavingAll = false,
  savingSingleId = null,
  allAvailableBorrowers,
  availableCards = [],
  recentTransactions = [],
  onUpdateItem,
  onUpdateAllItems,
  onSaveSingle,
  onDiscardSingle,
  onSaveAll,
  onDiscardAll,
}: PhotoReviewCardProps) {
  const total = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  // Active payment account for the batch:
  // Check if items already have a creditCardId or default to cash
  const activeCardId = items.find((it) => it.creditCardId)?.creditCardId || null;
  const activeMethod = items[0]?.paymentMethod || (activeCardId ? 'credit_card' : 'cash');
  const currentBatchAccount =
    activeMethod === 'credit_card' && activeCardId
      ? `card:${activeCardId}`
      : activeMethod === 'credit_card' && availableCards.length > 0
      ? `card:${availableCards[0].id}`
      : 'cash';

  const handleBatchAccountChange = (value: string) => {
    let updates: Partial<ParsedPhotoItem>;
    if (value === 'cash') {
      updates = {
        paymentMethod: 'cash',
        creditCardId: null,
        creditCardName: null,
      };
    } else if (value.startsWith('card:')) {
      const cardId = value.replace('card:', '');
      const card = availableCards.find((c) => c.id === cardId);
      updates = {
        paymentMethod: 'credit_card',
        creditCardId: cardId,
        creditCardName: card ? (card.bank_name ? `${card.bank_name} ${card.name}` : card.name) : 'Credit Card',
      };
    } else {
      updates = { paymentMethod: 'cash', creditCardId: null, creditCardName: null };
    }

    if (onUpdateAllItems) {
      onUpdateAllItems(updates);
    } else {
      items.forEach((it) => onUpdateItem(it.id, updates));
    }
  };

  return (
    <div className="mt-3 p-4 rounded-2xl bg-card border border-border/50 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between pb-1 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block">
              Photo Review ({items.length} {items.length === 1 ? 'item' : 'items'})
            </span>
            <span className="text-2xs text-muted-foreground block">
              {isSaved || items.length === 0
                ? 'All items recorded'
                : 'Review line items or select borrowers'}
            </span>
          </div>
        </div>
        {items.length > 0 && (
          <div className="text-right">
            <span className="text-3xs uppercase font-bold text-muted-foreground block">Total</span>
            <span className="text-sm font-black text-foreground">
              ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Account Connection Question & Dropdown (Applied once for all parsed transactions) */}
      <div className="p-3 rounded-xl bg-muted/60 border border-border/40 space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="batch-payment-account-select"
            className="text-xs font-bold text-foreground flex items-center gap-1.5"
          >
            <CreditCard className="w-4 h-4 text-primary" />
            <span>Connect to Card or Cash:</span>
          </label>
          <span className="text-3xs text-muted-foreground font-semibold">
            Applied to all {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        <select
          id="batch-payment-account-select"
          value={currentBatchAccount}
          onChange={(e) => handleBatchAccountChange(e.target.value)}
          disabled={isSaved || isSavingAll}
          className="w-full h-9 px-3 rounded-lg bg-card text-xs font-semibold text-foreground border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
        >
          <option value="cash">💵 Cash / Wallet</option>
          {availableCards.length > 0 && (
            <optgroup label="Credit Cards">
              {availableCards.map((card) => (
                <option key={card.id} value={`card:${card.id}`}>
                  💳 {card.bank_name ? `${card.bank_name} ` : ''}{card.name} {card.last_4 ? `(•••• ${card.last_4})` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Items list */}
      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
        {items.map((item) => {
          const dupCheck = checkParsedItemDuplicate(item, items, recentTransactions);

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl bg-muted/40 border space-y-2 transition-colors ${
                dupCheck.isDuplicate ? 'border-amber-500/40 bg-amber-500/5' : 'border-border/30'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
                    {dupCheck.isDuplicate && (
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 shrink-0"
                        title={dupCheck.reason || 'Duplicate: same date, amount, card, and title'}
                      >
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                        Duplicate
                      </span>
                    )}
                  </div>

                  {/* Transaction Date Display & Adjustment */}
                  <div className="flex items-center gap-1.5 mt-1.5 text-2xs text-muted-foreground font-medium flex-wrap">
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3 text-primary shrink-0" />
                      <span>Date:</span>
                    </span>
                    <input
                      type="date"
                      value={formatInputDate(item.date)}
                      onChange={(e) => onUpdateItem(item.id, { date: e.target.value })}
                      disabled={isSaved}
                      className="h-6 px-1.5 py-0.5 rounded bg-card text-foreground font-semibold text-2xs border border-border/40 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:cursor-not-allowed disabled:bg-transparent"
                      title="Transaction date"
                    />
                    <span className="text-3xs text-muted-foreground/75 hidden sm:inline">
                      ({formatDisplayDate(item.date)})
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-foreground">
                    ₱{Number(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Duplicate Warning Sign & Explanatory Notice */}
              {dupCheck.isDuplicate && (
                <div className="flex items-start gap-1.5 text-3xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 px-2 py-1.5 rounded-lg border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span className="leading-tight">{dupCheck.reason}</span>
                </div>
              )}

              {/* Type selector: Expense vs Receivable */}
              <div className="flex items-center gap-1.5 text-2xs pt-1">
                <button
                  type="button"
                  onClick={() => onUpdateItem(item.id, { type: 'expense', borrowerName: undefined })}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    item.type === 'expense'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateItem(item.id, { type: 'receivable' })}
                  className={`px-2 py-0.5 rounded-md font-semibold cursor-pointer ${
                    item.type === 'receivable'
                      ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Receivable
                </button>
              </div>

              {/* Borrower selector if receivable */}
              {item.type === 'receivable' && (
                <div className="pt-1">
                  <select
                    value={item.borrowerName || ''}
                    onChange={(e) => onUpdateItem(item.id, { borrowerName: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg bg-card text-2xs font-medium border border-border/40 text-foreground"
                  >
                    <option value="">Select Borrower / Property</option>
                    {allAvailableBorrowers.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.icon ? `${b.icon} ` : ''}
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isSaved && (
                <div className="pt-1 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onDiscardSingle(item.id)}
                    className="text-2xs font-semibold text-muted-foreground hover:text-rose-600 cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Discard
                  </button>
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => onSaveSingle(item)}
                    disabled={savingSingleId === item.id || (item.type === 'receivable' && !item.borrowerName)}
                    className="h-7 text-2xs font-bold rounded-lg gap-1 cursor-pointer"
                  >
                    {savingSingleId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Save Item
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between border-t border-border/30">
        {isSaved || items.length === 0 ? (
          <span className="text-2xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All items confirmed & saved
          </span>
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onDiscardAll}
              disabled={isSavingAll}
              className="text-2xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Discard All ({items.length})
            </Button>
            {items.length > 1 && (
              <Button
                type="button"
                size="xs"
                onClick={onSaveAll}
                disabled={isSavingAll || items.some((it) => it.type === 'receivable' && !it.borrowerName)}
                className="h-8 px-3 text-2xs font-bold rounded-xl gap-1.5 cursor-pointer shadow-xs"
              >
                {isSavingAll ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving All...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Save All ({items.length})
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
