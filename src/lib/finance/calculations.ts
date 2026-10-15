/**
 * Pure calculation facades for Tenvi
 * Adopted from MVP_ARCHITECTURE_REF.md - Single source of truth for business math
 */

import { CURRENCY_SYMBOL } from '@/lib/constants';
import { convertCurrency } from './fx';

/**
 * Format numbers into Philippine Peso currency strings
 * e.g., 1250.5 -> "₱1,250.50"
 */
export function formatMoney(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : Number(amount || 0);
  if (isNaN(num)) return `${CURRENCY_SYMBOL}0.00`;

  return (
    CURRENCY_SYMBOL +
    num.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Format date into clean, human-readable text
 * e.g. "2026-10-04" -> "Oct 4, 2026"
 */
export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export interface DueDateInfo {
  nextDueDate: Date;
  daysRemaining: number;
  label: string;
  urgency: 'critical' | 'warning' | 'normal';
}

/**
 * Calculate the next due date given a card's day-of-month due day
 */
export function calculateNextDueDate(dueDay: number, fromDate: Date = getTodayManila()): DueDateInfo {
  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const todayDate = fromDate.getUTCDate();

  // Determine target month/year
  let targetMonth = month;
  let targetYear = year;

  if (dueDay < todayDate) {
    // Due day already passed this month, moves to next month
    targetMonth = month + 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear = year + 1;
    }
  }

  // Handle month length (e.g. Feb 30 -> Feb 28/29)
  const maxDaysInMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const clampedDay = Math.min(dueDay, maxDaysInMonth);

  const nextDueDate = new Date(Date.UTC(targetYear, targetMonth, clampedDay));

  // Normalize midnight for clean day subtraction
  const todayMidnight = new Date(Date.UTC(year, month, todayDate));
  const diffTime = nextDueDate.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let urgency: 'critical' | 'warning' | 'normal' = 'normal';
  let label = '';

  if (daysRemaining === 0) {
    label = 'Due today!';
    urgency = 'critical';
  } else if (daysRemaining === 1) {
    label = 'Due tomorrow';
    urgency = 'critical';
  } else if (daysRemaining <= 5) {
    label = `Due in ${daysRemaining} days`;
    urgency = 'warning';
  } else {
    label = `Due in ${daysRemaining} days`;
    urgency = 'normal';
  }

  return {
    nextDueDate,
    daysRemaining,
    label,
    urgency,
  };
}

/**
 * Determine loan status and repayment percentage
 */
export function calculateLoanStatus(
  originalAmount: number,
  balanceRemaining: number
): {
  status: 'unpaid' | 'partial' | 'paid';
  percentPaid: number;
  paidAmount: number;
} {
  const orig = Math.max(0, originalAmount);
  const bal = Math.max(0, balanceRemaining);
  const paid = Math.max(0, orig - bal);

  let status: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (bal <= 0) {
    status = 'paid';
  } else if (paid > 0 && bal < orig) {
    status = 'partial';
  }

  const percentPaid = orig > 0 ? Math.min(100, Math.round((paid / orig) * 100)) : 100;

  return {
    status,
    percentPaid,
    paidAmount: paid,
  };
}

/**
 * Cent-safe split calculation across multiple participants
 * Ensures the sum of individual shares exactly matches totalAmount
 */
export function calculateSplitShares(
  totalAmount: number,
  participantCount: number
): number[] {
  if (participantCount <= 0) return [];
  if (participantCount === 1) return [Number(totalAmount.toFixed(2))];

  const totalCents = Math.round(totalAmount * 100);
  const baseShareCents = Math.floor(totalCents / participantCount);
  let remainderCents = totalCents - baseShareCents * participantCount;

  const shares: number[] = [];
  for (let i = 0; i < participantCount; i++) {
    const extraCent = remainderCents > 0 ? 1 : 0;
    if (remainderCents > 0) remainderCents--;
    shares.push((baseShareCents + extraCent) / 100);
  }

  return shares;
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
  statementDate?: string; // YYYY-MM-DD (when card statement day is provided)
}

export interface InstallmentScheduleOptions {
  monthlyInterestRate?: number | null;
  cardStatementDay?: number | null;
  cardDueDay?: number | null;
}

/**
 * Generate monthly installment schedule with cent-safe distribution,
 * monthly interest calculation, and calendar month due-day clamping.
 * If credit card cycle options are provided, installment dates strictly follow
 * the card's statement cutoff and payment due dates.
 */
export function generateInstallmentSchedule(
  principalAmount: number,
  months: number,
  monthlyDueDay: number,
  startDateStr: string = new Date().toISOString().split('T')[0],
  options?: InstallmentScheduleOptions
): InstallmentScheduleItem[] {
  if (months <= 0) return [];

  const interestRate = Math.max(0, Number(options?.monthlyInterestRate || 0));
  const totalInterest =
    interestRate > 0
      ? Number((principalAmount * (interestRate / 100) * months).toFixed(2))
      : 0;

  const principalShares = calculateSplitShares(principalAmount, months);
  const interestShares = interestRate > 0 ? calculateSplitShares(totalInterest, months) : [];

  const startDate = new Date(startDateStr);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();

  const cardStatementDay = options?.cardStatementDay ? Number(options.cardStatementDay) : null;
  const cardDueDay = options?.cardDueDay ? Number(options.cardDueDay) : null;

  // If card due day is provided, it dictates the effective monthly due day
  const effectiveDueDay = cardDueDay ? Math.max(1, Math.min(31, cardDueDay)) : monthlyDueDay;

  // Determine first billing statement cycle if cardStatementDay is provided:
  // If swipe date > statement_day: purchase is billed on next month's statement
  // If swipe date <= statement_day: purchase is billed on this month's statement
  let firstBillMonth = startMonth;
  let firstBillYear = startYear;

  if (cardStatementDay) {
    if (startDay > cardStatementDay) {
      firstBillMonth += 1;
      if (firstBillMonth > 11) {
        firstBillMonth = 0;
        firstBillYear += 1;
      }
    }
  }

  const schedule: InstallmentScheduleItem[] = [];

  for (let i = 1; i <= months; i++) {
    let dueDateStr = '';
    let statementDateStr: string | undefined = undefined;

    if (cardStatementDay) {
      const cycleIndex = i - 1;
      const stmtMonth = (firstBillMonth + cycleIndex) % 12;
      const stmtYear = firstBillYear + Math.floor((firstBillMonth + cycleIndex) / 12);

      const maxDaysInStmtMonth = new Date(stmtYear, stmtMonth + 1, 0).getDate();
      const clampedStmtDay = Math.min(cardStatementDay, maxDaysInStmtMonth);
      const stmtDateObj = new Date(stmtYear, stmtMonth, clampedStmtDay);
      statementDateStr = `${stmtDateObj.getFullYear()}-${String(stmtDateObj.getMonth() + 1).padStart(2, '0')}-${String(stmtDateObj.getDate()).padStart(2, '0')}`;

      // Card payment due date for that statement:
      // If effectiveDueDay <= clampedStmtDay: due date is in following month
      // If effectiveDueDay > clampedStmtDay: due date is in same month
      let dueMonth = stmtMonth;
      let dueYear = stmtYear;
      if (effectiveDueDay <= clampedStmtDay) {
        dueMonth += 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear += 1;
        }
      }
      const maxDaysDue = new Date(dueYear, dueMonth + 1, 0).getDate();
      const clampedDue = Math.min(effectiveDueDay, maxDaysDue);
      const dueDateObj = new Date(dueYear, dueMonth, clampedDue);
      dueDateStr = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;
    } else {
      const targetMonth = startMonth + i;
      const targetYear = startYear + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;

      const maxDays = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const clampedDay = Math.min(effectiveDueDay, maxDays);

      const dueDateObj = new Date(targetYear, normalizedMonth, clampedDay);
      dueDateStr = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;
    }

    const pAmt = principalShares[i - 1] ?? 0;
    const iAmt = interestShares[i - 1] ?? 0;
    const totalInstAmt = Number((pAmt + iAmt).toFixed(2));

    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      amount: totalInstAmt,
      principalAmount: pAmt,
      interestAmount: iAmt,
      statementDate: statementDateStr,
    });
  }

  return schedule;
}

export interface StatementGroup {
  statementKey: string;
  statementDate: string; // YYYY-MM-DD
  statementDateFormatted: string; // e.g. "Oct 15, 2026"
  cycleStartDate: string; // YYYY-MM-DD
  cycleStartDateFormatted: string; // e.g. "Sep 16, 2026"
  cycleEndDate: string; // YYYY-MM-DD
  cycleEndDateFormatted: string; // e.g. "Oct 15, 2026"
  dueDate: string; // YYYY-MM-DD
  dueDateFormatted: string; // e.g. "Nov 5, 2026"
  daysUntilDue: number;
  status: 'current_unbilled' | 'billed_due_soon' | 'closed' | 'scheduled_future';
  statusLabel: string;
  isCurrentCycle: boolean;
  isNextCycle: boolean;
  isCurrentMonth: boolean;
  totalExpenses: number;
  totalIncome: number;
  netSpend: number;
  transactions: any[];
}

/**
 * Group transactions for a credit card into billing statement cycles
 * based on statement cutoff day and payment due day.
 */
export function groupTransactionsByStatementDate(
  transactions: any[],
  statementDay: number,
  dueDay: number,
  referenceDate: Date = new Date()
): StatementGroup[] {
  const safeStatementDay = Math.max(1, Math.min(31, Number(statementDay) || 15));
  const safeDueDay = Math.max(1, Math.min(31, Number(dueDay) || 5));

  const formatISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  const todayYear = referenceDate.getFullYear();
  const todayMonth = referenceDate.getMonth();
  const todayDate = referenceDate.getDate();
  const todayMidnight = new Date(todayYear, todayMonth, todayDate);

  // Current calendar month's statement cutoff key (e.g. 2026-09 for September 15 cutoff)
  const currentMonthKey = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}`;

  // Compute current active cycle key
  let curCycleMonth = todayMonth;
  let curCycleYear = todayYear;
  if (todayDate > safeStatementDay) {
    curCycleMonth += 1;
    if (curCycleMonth > 11) {
      curCycleMonth = 0;
      curCycleYear += 1;
    }
  }
  const currentCycleKey = `${curCycleYear}-${String(curCycleMonth + 1).padStart(2, '0')}`;

  // Compute next future cycle key (+1 month after current cycle)
  let nextCycleMonth = curCycleMonth + 1;
  let nextCycleYear = curCycleYear;
  if (nextCycleMonth > 11) {
    nextCycleMonth = 0;
    nextCycleYear += 1;
  }
  const nextCycleKey = `${nextCycleYear}-${String(nextCycleMonth + 1).padStart(2, '0')}`;

  const helperBuildCycle = (cycleYear: number, cycleMonth: number) => {
    // Statement Cutoff
    const maxDaysInCycleMonth = new Date(cycleYear, cycleMonth + 1, 0).getDate();
    const clampedCutoff = Math.min(safeStatementDay, maxDaysInCycleMonth);
    const cutoffDate = new Date(cycleYear, cycleMonth, clampedCutoff);

    // Previous Cutoff + 1 day = Cycle Start
    let prevMonth = cycleMonth - 1;
    let prevYear = cycleYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    const maxDaysPrev = new Date(prevYear, prevMonth + 1, 0).getDate();
    const clampedPrevCutoff = Math.min(safeStatementDay, maxDaysPrev);
    const prevCutoffDate = new Date(prevYear, prevMonth, clampedPrevCutoff);
    const cycleStartDate = new Date(prevCutoffDate);
    cycleStartDate.setDate(cycleStartDate.getDate() + 1);

    // Payment Due Date
    let dueMonth = cycleMonth;
    let dueYear = cycleYear;
    if (safeDueDay <= clampedCutoff) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }
    const maxDaysDueMonth = new Date(dueYear, dueMonth + 1, 0).getDate();
    const clampedDue = Math.min(safeDueDay, maxDaysDueMonth);
    const dueDate = new Date(dueYear, dueMonth, clampedDue);

    const statementKey = `${cycleYear}-${String(cycleMonth + 1).padStart(2, '0')}`;
    const isCurrentCycle = statementKey === currentCycleKey;
    const isNextCycle = statementKey === nextCycleKey;
    const isCurrentMonth = statementKey === currentMonthKey;

    const diffDays = Math.ceil(
      (dueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );

    let status: 'current_unbilled' | 'billed_due_soon' | 'closed' | 'scheduled_future' = 'closed';
    let statusLabel = 'Past Statement';

    if (isCurrentCycle) {
      status = 'current_unbilled';
      statusLabel = 'Current Unbilled Cycle';
    } else if (cutoffDate.getTime() > todayMidnight.getTime()) {
      status = 'scheduled_future';
      statusLabel = isNextCycle ? 'Next Statement Cycle' : 'Scheduled Future Cycle';
    } else if (diffDays >= 0) {
      status = 'billed_due_soon';
      if (diffDays === 0) statusLabel = 'Due Today';
      else if (diffDays === 1) statusLabel = 'Due Tomorrow';
      else statusLabel = `Due in ${diffDays} days`;
    } else {
      status = 'closed';
      statusLabel = 'Closed Cycle';
    }

    return {
      statementKey,
      statementDate: formatISO(cutoffDate),
      statementDateFormatted: formatDate(cutoffDate),
      cycleStartDate: formatISO(cycleStartDate),
      cycleStartDateFormatted: formatDate(cycleStartDate),
      cycleEndDate: formatISO(cutoffDate),
      cycleEndDateFormatted: formatDate(cutoffDate),
      dueDate: formatISO(dueDate),
      dueDateFormatted: formatDate(dueDate),
      daysUntilDue: diffDays,
      status,
      statusLabel,
      isCurrentCycle,
      isNextCycle,
      isCurrentMonth,
      totalExpenses: 0,
      totalIncome: 0,
      netSpend: 0,
      transactions: [] as any[],
    };
  };

  const groupsMap = new Map<string, StatementGroup>();

  // Always ensure current month's statement cutoff is created
  const currentMonthGroup = helperBuildCycle(todayYear, todayMonth);
  groupsMap.set(currentMonthKey, currentMonthGroup);

  // Also ensure active unbilled cycle is created if different
  if (!groupsMap.has(currentCycleKey)) {
    groupsMap.set(currentCycleKey, helperBuildCycle(curCycleYear, curCycleMonth));
  }

  // Group each transaction
  for (const tx of transactions) {
    const dateStr = tx.occurred_on || tx.created_at?.split('T')[0] || '';
    if (!dateStr) continue;

    const parts = dateStr.split('-');
    if (parts.length < 3) continue;

    const txY = parseInt(parts[0], 10);
    const txM = parseInt(parts[1], 10) - 1;
    const txD = parseInt(parts[2], 10);

    let cycleM = txM;
    let cycleY = txY;
    if (txD > safeStatementDay) {
      cycleM += 1;
      if (cycleM > 11) {
        cycleM = 0;
        cycleY += 1;
      }
    }

    const key = `${cycleY}-${String(cycleM + 1).padStart(2, '0')}`;
    let group = groupsMap.get(key);
    if (!group) {
      group = helperBuildCycle(cycleY, cycleM);
      groupsMap.set(key, group);
    }

    group.transactions.push(tx);
    const amt = Number(tx.amount || 0);
    if (tx.kind === 'expense') {
      group.totalExpenses += amt;
      group.netSpend += amt;
    } else if (tx.kind === 'income') {
      group.totalIncome += amt;
      group.netSpend -= amt;
    }
  }

  // Sort transactions inside each group newest first
  for (const group of groupsMap.values()) {
    group.transactions.sort((a, b) => {
      const dateA = a.occurred_on || a.created_at || '';
      const dateB = b.occurred_on || b.created_at || '';
      return dateB.localeCompare(dateA);
    });
  }

  // Convert map to array and sort statement cycles descending (newest statement cutoff first)
  const result = Array.from(groupsMap.values()).sort((a, b) =>
    b.statementDate.localeCompare(a.statementDate)
  );

  return result;
}

export interface CardSpendRecommendation {
  card: any;
  floatDays: number;
  daysSinceCutoff: number;
  daysUntilNextCutoff: number;
  nextCutoffDate: string; // YYYY-MM-DD
  nextCutoffDateFormatted: string; // e.g. "Oct 20, 2026"
  paymentDueDate: string; // YYYY-MM-DD
  paymentDueDateFormatted: string; // e.g. "Nov 12, 2026"
  totalDirectSpend: number;
  totalSwipedLoans: number;
  totalUtilized: number;
  availablePower: number;
  utilizationPercent: number;
  isBestCard: boolean;
  recommendationTier: 'optimal' | 'good' | 'caution';
  advice: string;
}

export interface OptimalCardResult {
  bestCard: CardSpendRecommendation | null;
  rankedCards: CardSpendRecommendation[];
  cautionCards: CardSpendRecommendation[];
  todayFormatted: string;
}

export interface CardSpendingSummary {
  directSpend: number;
  loansSpend: number;
  totalUsed: number;
  availableToSpend: number;
  utilizationPercent: number;
  lastSwipeDate?: string | null;
}

/**
 * Standardized credit card spending and utilization calculation.
 * Ensures consistent spending power, total used, and available credit across all views:
 * - Cards dashboard overview (/dashboard/cards)
 * - Individual card details page (/dashboard/cards/[id])
 * - Optimal card to swipe algorithm
 *
 * Rules:
 * 1. directSpend: sum of expense transactions with this card, excluding loan-linked expenses (!t.loan_id)
 *    to prevent double counting with loan balances.
 * 2. loansSpend: sum of unpaid loan balances (status !== 'paid') swiped on this card.
 * 3. totalUsed = directSpend + loansSpend.
 * 4. availableToSpend = Math.max(0, creditLimit - totalUsed).
 */
export function calculateCardSpending(
  card: { id: string; credit_limit?: number | string | null },
  transactions: Array<{ credit_card_id?: string | null; kind?: string | null; amount?: number | string | null; loan_id?: string | null }> = [],
  loans: Array<{ credit_card_id?: string | null; balance_remaining?: number | string | null; status?: string | null }> = []
): CardSpendingSummary {
  const cardId = card?.id;
  const creditLimit = Number(card?.credit_limit || 0);

  const hasAnyTxCardId = (transactions || []).some((t) => Boolean(t.credit_card_id));
  const directSpend = (transactions || [])
    .filter((t) => {
      if (hasAnyTxCardId && t.credit_card_id !== cardId) return false;
      const isExpense = t.kind?.toLowerCase() === 'expense';
      return isExpense && !t.loan_id;
    })
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const hasAnyLoanCardId = (loans || []).some((l) => Boolean(l.credit_card_id));
  const loansSpend = (loans || [])
    .filter((l) => {
      if (hasAnyLoanCardId && l.credit_card_id !== cardId) return false;
      return l.status !== 'paid';
    })
    .reduce((sum, l) => sum + Number(l.balance_remaining || 0), 0);

  const totalUsed = directSpend + loansSpend;
  const availableToSpend = Math.max(0, creditLimit - totalUsed);
  const utilizationPercent =
    creditLimit > 0 ? Math.min(100, Math.round((totalUsed / creditLimit) * 100)) : 0;

  return {
    directSpend,
    loansSpend,
    totalUsed,
    availableToSpend,
    utilizationPercent,
  };
}

/**
 * Identify the optimal credit card to use for spending on a specific date
 * to maximize the interest-free grace period (cash float duration).
 */
export function calculateOptimalCardToSwipe(
  cards: any[],
  transactions: any[] = [],
  linkedLoans: any[] = [],
  referenceDate: Date = getTodayManila()
): OptimalCardResult {
  const activeCards = (cards || []).filter((c) => c && c.is_active !== false);

  const formatISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  const todayYear = referenceDate.getFullYear();
  const todayMonth = referenceDate.getMonth();
  const todayDate = referenceDate.getDate();
  const todayMidnight = new Date(todayYear, todayMonth, todayDate);
  const todayFormatted = formatDate(todayMidnight);

  if (activeCards.length === 0) {
    return {
      bestCard: null,
      rankedCards: [],
      cautionCards: [],
      todayFormatted,
    };
  }

  const recommendations: CardSpendRecommendation[] = activeCards.map((card) => {
    const safeStatementDay = Math.max(1, Math.min(31, Number(card.statement_day) || 15));
    const safeDueDay = Math.max(1, Math.min(31, Number(card.due_day) || 5));

    // Calculate which statement cutoff will capture today's purchase
    let billCutoffMonth = todayMonth;
    let billCutoffYear = todayYear;
    let daysSinceCutoff = 0;

    if (todayDate > safeStatementDay) {
      // Cutoff already occurred earlier this month
      daysSinceCutoff = todayDate - safeStatementDay;
      billCutoffMonth += 1;
      if (billCutoffMonth > 11) {
        billCutoffMonth = 0;
        billCutoffYear += 1;
      }
    } else {
      // Cutoff has not yet occurred this month (previous cutoff was last month)
      let prevMonth = todayMonth - 1;
      let prevYear = todayYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear -= 1;
      }
      const prevMaxDays = new Date(prevYear, prevMonth + 1, 0).getDate();
      const prevClamped = Math.min(safeStatementDay, prevMaxDays);
      daysSinceCutoff = prevMaxDays - prevClamped + todayDate;
    }

    // Cutoff date for today's purchase
    const maxDaysInBillMonth = new Date(billCutoffYear, billCutoffMonth + 1, 0).getDate();
    const clampedBillCutoff = Math.min(safeStatementDay, maxDaysInBillMonth);
    const nextCutoffDate = new Date(billCutoffYear, billCutoffMonth, clampedBillCutoff);

    const daysUntilNextCutoff = Math.max(
      0,
      Math.round((nextCutoffDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Payment due date for that statement
    let dueMonth = billCutoffMonth;
    let dueYear = billCutoffYear;
    if (safeDueDay <= clampedBillCutoff) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }
    const maxDaysDue = new Date(dueYear, dueMonth + 1, 0).getDate();
    const clampedDue = Math.min(safeDueDay, maxDaysDue);
    const paymentDueDate = new Date(dueYear, dueMonth, clampedDue);

    const floatDays = Math.max(
      1,
      Math.round((paymentDueDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Available spending power calculation
    const {
      directSpend: cardDirectSpend,
      loansSpend: cardSwipedLoans,
      totalUsed: totalUtilized,
      availableToSpend: availablePower,
      utilizationPercent,
    } = calculateCardSpending(card, transactions, linkedLoans);

    // Determine recommendation tier and advice
    let recommendationTier: 'optimal' | 'good' | 'caution' = 'good';
    let advice = '';

    if (daysUntilNextCutoff <= 2) {
      recommendationTier = 'caution';
      const daysText =
        daysUntilNextCutoff === 0
          ? 'today'
          : daysUntilNextCutoff === 1
          ? 'tomorrow'
          : `in ${daysUntilNextCutoff} days`;
      advice = `Statement cutoff is ${daysText} (${formatDate(
        nextCutoffDate
      )}). If you can wait a few days, purchases will roll over to the next cycle for 45+ days of float.`;
    } else if (daysSinceCutoff <= 10) {
      recommendationTier = 'optimal';
      advice = `Statement cutoff passed ${daysSinceCutoff} ${
        daysSinceCutoff === 1 ? 'day' : 'days'
      } ago! Today's swipe won't be billed until ${formatDate(
        nextCutoffDate
      )} and isn't due until ${formatDate(paymentDueDate)}.`;
    } else {
      recommendationTier = 'good';
      advice = `Gives you ${floatDays} days until payment is due on ${formatDate(
        paymentDueDate
      )}. Next statement cutoff is ${formatDate(nextCutoffDate)}.`;
    }

    return {
      card,
      floatDays,
      daysSinceCutoff,
      daysUntilNextCutoff,
      nextCutoffDate: formatISO(nextCutoffDate),
      nextCutoffDateFormatted: formatDate(nextCutoffDate),
      paymentDueDate: formatISO(paymentDueDate),
      paymentDueDateFormatted: formatDate(paymentDueDate),
      totalDirectSpend: cardDirectSpend,
      totalSwipedLoans: cardSwipedLoans,
      totalUtilized,
      availablePower,
      utilizationPercent,
      isBestCard: false,
      recommendationTier,
      advice,
    };
  });

  // Rank cards:
  recommendations.sort((a, b) => {
    // Deprioritize caution cards (closing in 0-2 days)
    if (a.recommendationTier === 'caution' && b.recommendationTier !== 'caution') return 1;
    if (b.recommendationTier === 'caution' && a.recommendationTier !== 'caution') return -1;

    // Deprioritize cards with zero available limit if other cards have available limit
    const aHasLimit = a.card.credit_limit <= 0 || a.availablePower > 0;
    const bHasLimit = b.card.credit_limit <= 0 || b.availablePower > 0;
    if (aHasLimit && !bHasLimit) return -1;
    if (!aHasLimit && bHasLimit) return 1;

    // Primary: highest float days
    if (b.floatDays !== a.floatDays) {
      return b.floatDays - a.floatDays;
    }

    // Tie-break: highest available power
    return b.availablePower - a.availablePower;
  });

  // Mark the best card
  if (recommendations.length > 0) {
    recommendations[0].isBestCard = true;
    if (recommendations[0].recommendationTier !== 'caution') {
      recommendations[0].recommendationTier = 'optimal';
    }
  }

  const cautionCards = recommendations.filter((r) => r.recommendationTier === 'caution');

  return {
    bestCard: recommendations[0] || null,
    rankedCards: recommendations,
    cautionCards,
    todayFormatted,
  };
}

export interface InsuranceRenewalInfo {
  nextRenewalDate: Date | null;
  daysRemaining: number | null;
  label: string;
  urgency: 'critical' | 'warning' | 'normal';
  formattedDate: string;
}

/**
 * Calculate renewal status and days remaining for annual insurance
 */
export function calculateInsuranceRenewal(
  renewalDateStr: string | null | undefined,
  fromDate: Date = new Date()
): InsuranceRenewalInfo {
  if (!renewalDateStr) {
    return {
      nextRenewalDate: null,
      daysRemaining: null,
      label: 'Not set',
      urgency: 'normal',
      formattedDate: 'Not scheduled',
    };
  }

  const parts = renewalDateStr.split('-');
  if (parts.length < 3) {
    return {
      nextRenewalDate: null,
      daysRemaining: null,
      label: 'Invalid date',
      urgency: 'normal',
      formattedDate: renewalDateStr,
    };
  }

  const origMonth = parseInt(parts[1], 10) - 1;
  const origDay = parseInt(parts[2], 10);

  const currentYear = fromDate.getFullYear();
  const todayMidnight = new Date(currentYear, fromDate.getMonth(), fromDate.getDate());

  // Attempt current year anniversary
  let candidate = new Date(currentYear, origMonth, origDay);
  if (candidate.getTime() < todayMidnight.getTime()) {
    // If passed this year, the next annual renewal is next year
    candidate = new Date(currentYear + 1, origMonth, origDay);
  }

  const diffTime = candidate.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let urgency: 'critical' | 'warning' | 'normal' = 'normal';
  let label = '';

  if (daysRemaining === 0) {
    label = 'Renews today!';
    urgency = 'critical';
  } else if (daysRemaining === 1) {
    label = 'Renews tomorrow';
    urgency = 'critical';
  } else if (daysRemaining <= 7) {
    label = `Renews in ${daysRemaining} days`;
    urgency = 'critical';
  } else if (daysRemaining <= 30) {
    label = `Renews in ${daysRemaining} days`;
    urgency = 'warning';
  } else {
    label = `Renews in ${daysRemaining} days`;
    urgency = 'normal';
  }

  return {
    nextRenewalDate: candidate,
    daysRemaining,
    label,
    urgency,
    formattedDate: formatDate(candidate),
  };
}

export interface PropertyFinancials {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  incomeCount: number;
  expenseCount: number;
  monthlyAmortization: number;
  annualInsurance: number;
  monthlyCommitment: number;
  expectedDailyIncome: number;
  expectedMonthlyIncome: number;
  amortizationDue: DueDateInfo | null;
  insuranceRenewal: InsuranceRenewalInfo;
}

export function calculatePropertyFinancials(
  property: {
    id: string;
    monthly_amortization?: number | null;
    amortization_due_day?: number | null;
    annual_insurance_amount?: number | null;
    insurance_renewal_date?: string | null;
    expected_income_daily?: number | null;
    expected_income_monthly?: number | null;
  },
  transactions: Array<{
    property_id?: string | null;
    kind: 'income' | 'expense' | 'transfer';
    amount: number | string;
  }>
): PropertyFinancials {
  const propTx = transactions.filter((t) => t.property_id === property.id);

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;

  for (const t of propTx) {
    const amt = Number(t.amount || 0);
    if (t.kind === 'income') {
      totalIncome += amt;
      incomeCount++;
    } else if (t.kind === 'expense') {
      totalExpense += amt;
      expenseCount++;
    }
  }

  const monthlyAmortization = Number(property.monthly_amortization || 0);
  const annualInsurance = Number(property.annual_insurance_amount || 0);
  const monthlyCommitment = monthlyAmortization + annualInsurance / 12;

  const amortizationDue = property.amortization_due_day
    ? calculateNextDueDate(property.amortization_due_day)
    : null;

  const insuranceRenewal = calculateInsuranceRenewal(property.insurance_renewal_date);

  return {
    totalIncome,
    totalExpense,
    netCashFlow: totalIncome - totalExpense,
    incomeCount,
    expenseCount,
    monthlyAmortization,
    annualInsurance,
    monthlyCommitment,
    expectedDailyIncome: Number(property.expected_income_daily || 0),
    expectedMonthlyIncome: Number(property.expected_income_monthly || 0),
    amortizationDue,
    insuranceRenewal,
  };
}

export interface DocumentExpiryStatus {
  hasExpiry: boolean;
  expiryDate: Date | null;
  formattedDate: string;
  daysRemaining: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
  urgency: 'expired' | 'critical' | 'warning' | 'valid' | 'none';
  label: string;
  badgeClass: string;
}

/**
 * Calculate the expiration status and urgency of property and asset documents
 * e.g. LTO OR/CR, LTFRB Franchise, Insurance Policies
 */
export function calculateDocumentExpiryStatus(
  expiryDateStr?: string | null,
  notifyBeforeDays: number = 30,
  referenceDate: Date = new Date()
): DocumentExpiryStatus {
  if (!expiryDateStr) {
    return {
      hasExpiry: false,
      expiryDate: null,
      formattedDate: 'Permanent / No Expiry',
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false,
      urgency: 'none',
      label: 'No Expiration',
      badgeClass: 'bg-muted text-muted-foreground',
    };
  }

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return {
      hasExpiry: false,
      expiryDate: null,
      formattedDate: 'Invalid Date',
      daysRemaining: null,
      isExpired: false,
      isExpiringSoon: false,
      urgency: 'none',
      label: 'Invalid Date',
      badgeClass: 'bg-muted text-muted-foreground',
    };
  }

  const todayMidnight = new Date(referenceDate);
  todayMidnight.setHours(0, 0, 0, 0);

  const expiryMidnight = new Date(expiry);
  expiryMidnight.setHours(0, 0, 0, 0);

  const diffTime = expiryMidnight.getTime() - todayMidnight.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formattedDate = formatDate(expiry);

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      hasExpiry: true,
      expiryDate: expiryMidnight,
      formattedDate,
      daysRemaining,
      isExpired: true,
      isExpiringSoon: true,
      urgency: 'expired',
      label: overdueDays === 1 ? 'Expired yesterday' : `Expired ${overdueDays} days ago`,
      badgeClass: 'bg-rose-500/10 text-rose-500',
    };
  }

  if (daysRemaining === 0) {
    return {
      hasExpiry: true,
      expiryDate: expiryMidnight,
      formattedDate,
      daysRemaining: 0,
      isExpired: false,
      isExpiringSoon: true,
      urgency: 'critical',
      label: 'Expires today!',
      badgeClass: 'bg-rose-500/10 text-rose-500 animate-pulse',
    };
  }

  if (daysRemaining <= 7) {
    return {
      hasExpiry: true,
      expiryDate: expiryMidnight,
      formattedDate,
      daysRemaining,
      isExpired: false,
      isExpiringSoon: true,
      urgency: 'critical',
      label: daysRemaining === 1 ? 'Expires tomorrow' : `Expires in ${daysRemaining} days`,
      badgeClass: 'bg-rose-500/10 text-rose-500',
    };
  }

  const threshold = Math.max(30, Number(notifyBeforeDays) || 30);
  if (daysRemaining <= threshold) {
    return {
      hasExpiry: true,
      expiryDate: expiryMidnight,
      formattedDate,
      daysRemaining,
      isExpired: false,
      isExpiringSoon: true,
      urgency: 'warning',
      label: `Expires in ${daysRemaining} days`,
      badgeClass: 'bg-amber-500/10 text-amber-500',
    };
  }

  return {
    hasExpiry: true,
    expiryDate: expiryMidnight,
    formattedDate,
    daysRemaining,
    isExpired: false,
    isExpiringSoon: false,
    urgency: 'valid',
    label: `Valid (${daysRemaining} days left)`,
    badgeClass: 'bg-emerald-500/10 text-emerald-500',
  };
}

/**
 * TNV-015: Single source of truth for "today" in Tenvi, strictly calculated in Asia/Manila timezone (UTC+8).
 * Normalizes time to midnight (00:00:00.000 UTC).
 */
export function getTodayManila(refDate: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const parts = formatter.formatToParts(refDate);
  const year = parseInt(parts.find((p) => p.type === 'year')!.value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month')!.value, 10) - 1;
  const day = parseInt(parts.find((p) => p.type === 'day')!.value, 10);

  return new Date(Date.UTC(year, month, day));
}

/**
 * Returns today's ISO date string 'YYYY-MM-DD' in Asia/Manila timezone.
 */
export function getTodayManilaString(refDate: Date = new Date()): string {
  const d = getTodayManila(refDate);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CardUrgencyInfo {
  urgency: 'none' | 'ok' | 'soon' | 'urgent' | 'overdue';
  label: string;
  daysRemaining: number;
  variant: 'neutral' | 'success' | 'warning' | 'danger';
}

/**
 * TNV-013: Calculate urgency based on billed balance and due date.
 * - Owed nothing: 'none'
 * - Overdue (past due with balance): 'overdue'
 * - 3 days or fewer: 'urgent'
 * - 7 days or fewer: 'soon'
 * - More than 7 days: 'ok'
 */
export function getCardUrgency(
  dueDateInput: Date | string,
  billedAmount: number,
  asOfDate: Date = getTodayManila()
): CardUrgencyInfo {
  if (billedAmount <= 0) {
    return {
      urgency: 'none',
      label: 'Nothing to pay right now',
      daysRemaining: 0,
      variant: 'neutral',
    };
  }

  const due = typeof dueDateInput === 'string' ? new Date(dueDateInput) : dueDateInput;
  const dueMidnight = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate()));
  const asOfMidnight = new Date(Date.UTC(asOfDate.getUTCFullYear(), asOfDate.getUTCMonth(), asOfDate.getUTCDate()));

  const diffMs = dueMidnight.getTime() - asOfMidnight.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    const overdueDays = Math.abs(daysRemaining);
    return {
      urgency: 'overdue',
      label: `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
      daysRemaining,
      variant: 'danger',
    };
  }

  if (daysRemaining <= 3) {
    const label =
      daysRemaining === 0
        ? 'Due today'
        : daysRemaining === 1
          ? 'Due tomorrow'
          : `Due in ${daysRemaining} days`;
    return {
      urgency: 'urgent',
      label,
      daysRemaining,
      variant: 'danger',
    };
  }

  if (daysRemaining <= 7) {
    return {
      urgency: 'soon',
      label: `Due in ${daysRemaining} days`,
      daysRemaining,
      variant: 'warning',
    };
  }

  return {
    urgency: 'ok',
    label: `Due in ${daysRemaining} days`,
    daysRemaining,
    variant: 'success',
  };
}

export interface UsageLevelInfo {
  level: 'healthy' | 'high' | 'maxed';
  label: string;
  variant: 'success' | 'warning' | 'danger';
}

/**
 * TNV-014: Determine card credit usage level and color variant.
 * - under 50%: 'healthy'
 * - 50% to 79%: 'high'
 * - 80% and above: 'maxed'
 */
export function getUsageLevel(pct: number): UsageLevelInfo {
  const safePct = Math.max(0, pct);
  if (safePct < 50) {
    return {
      level: 'healthy',
      label: 'Healthy usage',
      variant: 'success',
    };
  }
  if (safePct < 80) {
    return {
      level: 'high',
      label: 'High usage',
      variant: 'warning',
    };
  }
  return {
    level: 'maxed',
    label: 'Near limit',
    variant: 'danger',
  };
}

/**
 * Helper to clamp day of month given year and month (0-indexed).
 */
export function clampDayOfMonth(year: number, month: number, day: number): number {
  const maxDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.min(day, maxDays);
}

export interface CardCycleDates {
  cycleStart: Date;
  cycleEnd: Date;
  dueDate: Date;
  daysToPay: number;
  isCutoffToday: boolean;
}

/**
 * TNV-016: Cycle and due date calculation with calendar month and leap year clamping.
 */
export function calculateCardCycleDates(
  statementDay: number,
  dueDay: number,
  asOf: Date = getTodayManila()
): CardCycleDates {
  const currentYear = asOf.getUTCFullYear();
  const currentMonth = asOf.getUTCMonth();
  const todayDate = asOf.getUTCDate();

  // Clamp statement day for current month
  const clampedStatementDayCurrent = clampDayOfMonth(currentYear, currentMonth, statementDay);
  const isCutoffToday = clampedStatementDayCurrent === todayDate;

  // Determine which cycle we are in
  let cycleEndYear = currentYear;
  let cycleEndMonth = currentMonth;

  if (todayDate > clampedStatementDayCurrent) {
    // Statement has closed for current month, next cycle end is next month
    cycleEndMonth += 1;
    if (cycleEndMonth > 11) {
      cycleEndMonth = 0;
      cycleEndYear += 1;
    }
  }

  const clampedCycleEndDay = clampDayOfMonth(cycleEndYear, cycleEndMonth, statementDay);
  const cycleEnd = new Date(Date.UTC(cycleEndYear, cycleEndMonth, clampedCycleEndDay));

  // Cycle start is previous month's statement day + 1
  let cycleStartMonth = cycleEndMonth - 1;
  let cycleStartYear = cycleEndYear;
  if (cycleStartMonth < 0) {
    cycleStartMonth = 11;
    cycleStartYear -= 1;
  }
  const clampedCycleStartDay = clampDayOfMonth(cycleStartYear, cycleStartMonth, statementDay) + 1;
  const cycleStart = new Date(Date.UTC(cycleStartYear, cycleStartMonth, clampedCycleStartDay));

  // Determine due date
  let dueYear = cycleEndYear;
  let dueMonth = cycleEndMonth;

  if (dueDay <= statementDay) {
    // Due date falls in the following month after statement cutoff
    dueMonth += 1;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear += 1;
    }
  }

  const clampedDueDay = clampDayOfMonth(dueYear, dueMonth, dueDay);
  const dueDate = new Date(Date.UTC(dueYear, dueMonth, clampedDueDay));

  const diffMs = dueDate.getTime() - asOf.getTime();
  const daysToPay = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));

  return {
    cycleStart,
    cycleEnd,
    dueDate,
    daysToPay,
    isCutoffToday,
  };
}

export interface NetWorthBreakdown {
  liquidSavings: number;
  receivables: number;
  fixedAssets: number;
  totalAssets: number;
  creditCardBalances: number;
  longTermLiabilities: number;
  totalLiabilities: number;
  netWorth: number;
  debtToAssetRatio: number;
}

/**
 * Commercial FinTech Net Worth Engine with Multi-Currency FX Support
 * Net Worth = (Liquid Cash + Receivables + Fixed Assets) - (Credit Card Balances + Term Liabilities)
 * All values normalized to baseCurrency (default: PHP)
 */
export function calculateTrueNetWorth(params: {
  savings: Array<{ current_balance?: number | string | null; is_active?: boolean; currency?: string | null }>;
  loans: Array<{ balance_remaining?: number | string | null; status?: string; currency?: string | null }>;
  properties: Array<{ estimated_value?: number | string | null; status?: string; currency?: string | null }>;
  creditCards?: Array<{ latest_statement?: { billed_amount?: number | string | null; paid_amount?: number | string | null } | null; currency?: string | null }>;
  liabilities?: Array<{ current_principal_balance?: number | string | null; status?: string; currency?: string | null }>;
  baseCurrency?: string;
  exchangeRates?: Record<string, number>;
}): NetWorthBreakdown {
  const baseCurrency = (params.baseCurrency || 'PHP').toUpperCase();
  const rates = params.exchangeRates;

  const toBase = (val: number | string | null | undefined, curr?: string | null) => {
    const num = Number(val || 0);
    if (!curr || curr.toUpperCase() === baseCurrency) return num;
    return convertCurrency(num, curr, baseCurrency, rates);
  };

  const liquidSavings = (params.savings || [])
    .filter((s) => s.is_active !== false)
    .reduce((sum, s) => sum + toBase(s.current_balance, s.currency), 0);

  const receivables = (params.loans || [])
    .filter((l) => l.status !== 'paid')
    .reduce((sum, l) => sum + toBase(l.balance_remaining, l.currency), 0);

  const fixedAssets = (params.properties || [])
    .filter((p) => p.status !== 'sold' && p.status !== 'inactive')
    .reduce((sum, p) => sum + toBase(p.estimated_value, p.currency), 0);

  const totalAssets = Number((liquidSavings + receivables + fixedAssets).toFixed(2));

  let creditCardBalances = 0;
  if (params.creditCards) {
    creditCardBalances = params.creditCards.reduce((sum, card) => {
      const stmt = card.latest_statement;
      if (!stmt) return sum;
      const unpaid = Math.max(0, Number(stmt.billed_amount || 0) - Number(stmt.paid_amount || 0));
      return sum + toBase(unpaid, card.currency);
    }, 0);
  }

  const longTermLiabilities = (params.liabilities || [])
    .filter((l) => l.status === 'active')
    .reduce((sum, l) => sum + toBase(l.current_principal_balance, l.currency), 0);

  const totalLiabilities = Number((creditCardBalances + longTermLiabilities).toFixed(2));
  const netWorth = Number((totalAssets - totalLiabilities).toFixed(2));
  const debtToAssetRatio =
    totalAssets > 0 ? Math.min(100, Math.round((totalLiabilities / totalAssets) * 100)) : 0;

  return {
    liquidSavings: Number(liquidSavings.toFixed(2)),
    receivables: Number(receivables.toFixed(2)),
    fixedAssets: Number(fixedAssets.toFixed(2)),
    totalAssets,
    creditCardBalances: Number(creditCardBalances.toFixed(2)),
    longTermLiabilities: Number(longTermLiabilities.toFixed(2)),
    totalLiabilities,
    netWorth,
    debtToAssetRatio,
  };
}

// ============================================================================
// REDUCING-BALANCE LOAN & MORTGAGE AMORTIZATION ENGINE (Task 3.1)
// ============================================================================

export interface AmortizationScheduleRow {
  installmentNumber: number;
  dueDate: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AmortizationSummary {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  schedule: AmortizationScheduleRow[];
}

/**
 * Calculate fixed monthly amortization payment (PMT formula)
 * PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calculateMonthlyAmortizationPayment(
  principal: number,
  annualInterestRate: number,
  termMonths: number
): number {
  const p = Math.max(0, principal);
  const n = Math.max(0, Math.round(termMonths));
  if (p === 0 || n === 0) return 0;

  const annualRate = Math.max(0, annualInterestRate);
  if (annualRate === 0) {
    return Number((p / n).toFixed(2));
  }

  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, n);
  const pmt = p * ((r * factor) / (factor - 1));
  return Number(pmt.toFixed(2));
}

/**
 * Calculate monthly amortization payment based on interest rate input mode:
 * - Monthly Add-on Rate: (Principal / Term in Months) + (Principal * (Monthly Rate / 100))
 * - Annual Rate: Standard monthly amortization using Monthly Rate = Annual Rate / 12
 */
export function calculateLiabilityAmortization(params: {
  principal: number;
  interestRate: number;
  termMonths: number;
  rateType?: 'annual' | 'monthly_addon';
}): number {
  const p = Math.max(0, Number(params.principal || 0));
  const n = Math.max(0, Math.round(Number(params.termMonths || 0)));
  const rate = Math.max(0, Number(params.interestRate || 0));
  const rateType = params.rateType || 'annual';

  if (p === 0 || n === 0) return 0;

  if (rateType === 'monthly_addon') {
    const monthlyRateDecimal = rate / 100;
    const monthlyPayment = p / n + p * monthlyRateDecimal;
    return Number(monthlyPayment.toFixed(2));
  }

  return calculateMonthlyAmortizationPayment(p, rate, n);
}

/**
 * Generate full reducing-balance amortization schedule
 * Guarantees final period convergence to exactly 0.00
 */
export function calculateAmortizationSchedule(params: {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  startDate?: string;
  monthlyDueDay?: number;
}): AmortizationSummary {
  const principal = Math.max(0, Number(params.principal || 0));
  const termMonths = Math.max(0, Math.round(Number(params.termMonths || 0)));
  const annualRate = Math.max(0, Number(params.annualInterestRate || 0));
  const startDateStr = params.startDate || new Date().toISOString().split('T')[0];
  const dueDay = params.monthlyDueDay ? Math.min(31, Math.max(1, params.monthlyDueDay)) : 15;

  if (principal === 0 || termMonths === 0) {
    return {
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      schedule: [],
    };
  }

  const monthlyRate = annualRate > 0 ? annualRate / 100 / 12 : 0;
  const regularPayment = calculateMonthlyAmortizationPayment(principal, annualRate, termMonths);

  const startDate = new Date(startDateStr);
  let currentYear = startDate.getFullYear();
  let currentMonth = startDate.getMonth();

  let remainingPrincipal = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  const schedule: AmortizationScheduleRow[] = [];

  for (let i = 1; i <= termMonths; i++) {
    currentMonth += 1;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear += 1;
    }
    const maxDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const clampedDay = Math.min(dueDay, maxDaysInMonth);
    const dueDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

    const interestAmount = monthlyRate > 0 ? Number((remainingPrincipal * monthlyRate).toFixed(2)) : 0;
    let principalAmount = 0;
    let paymentAmount = 0;

    if (i === termMonths) {
      // Final month converges balance exactly to 0
      principalAmount = remainingPrincipal;
      paymentAmount = Number((principalAmount + interestAmount).toFixed(2));
      remainingPrincipal = 0;
    } else {
      principalAmount = Number((regularPayment - interestAmount).toFixed(2));
      if (principalAmount > remainingPrincipal) {
        principalAmount = remainingPrincipal;
      }
      paymentAmount = regularPayment;
      remainingPrincipal = Number((remainingPrincipal - principalAmount).toFixed(2));
    }

    cumulativeInterest = Number((cumulativeInterest + interestAmount).toFixed(2));
    cumulativePrincipal = Number((cumulativePrincipal + principalAmount).toFixed(2));

    schedule.push({
      installmentNumber: i,
      dueDate,
      paymentAmount,
      principalAmount,
      interestAmount,
      remainingBalance: Math.max(0, remainingPrincipal),
      cumulativeInterest,
      cumulativePrincipal,
    });
  }

  const totalPayment = Number((cumulativePrincipal + cumulativeInterest).toFixed(2));

  return {
    monthlyPayment: regularPayment,
    totalPayment,
    totalInterest: cumulativeInterest,
    totalPrincipal: cumulativePrincipal,
    schedule,
  };
}

/**
 * Calculate interest vs. principal split for the next upcoming payment
 */
export function calculateNextAmortizationSplit(params: {
  currentBalance: number;
  annualInterestRate: number;
  monthlyPayment: number;
}): {
  principalPortion: number;
  interestPortion: number;
  newBalance: number;
} {
  const balance = Math.max(0, Number(params.currentBalance || 0));
  const rate = Math.max(0, Number(params.annualInterestRate || 0));
  const pmt = Math.max(0, Number(params.monthlyPayment || 0));

  if (balance === 0) {
    return { principalPortion: 0, interestPortion: 0, newBalance: 0 };
  }

  const monthlyRate = rate > 0 ? rate / 100 / 12 : 0;
  const interestPortion = Number((balance * monthlyRate).toFixed(2));

  let principalPortion = Number((pmt - interestPortion).toFixed(2));
  if (principalPortion < 0) principalPortion = 0;
  if (principalPortion > balance) principalPortion = balance;

  const newBalance = Number(Math.max(0, balance - principalPortion).toFixed(2));

  return {
    principalPortion,
    interestPortion,
    newBalance,
  };
}

// ============================================================================
// ASSET VALUATION & STRAIGHT-LINE DEPRECIATION ENGINE (Task 3.2)
// ============================================================================

export interface AssetDepreciationDetails {
  costBasis: number;
  salvageValue: number;
  usefulLifeYears: number;
  elapsedMonths: number;
  monthlyDepreciation: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  percentDepreciated: number;
  isFullyDepreciated: boolean;
}

/**
 * Standard commercial straight-line depreciation formula:
 * Annual Depr = (Cost - Salvage) / Useful Life
 * Monthly Depr = Annual Depr / 12
 * Accumulated Depr = Monthly Depr * Elapsed Months (capped at Cost - Salvage)
 * Current Book Value = Cost - Accumulated Depr (floored at Salvage)
 */
export function calculateStraightLineDepreciation(params: {
  purchasePrice: number;
  purchaseDate: string | Date;
  salvageValue?: number;
  usefulLifeYears?: number;
  asOfDate?: string | Date;
}): AssetDepreciationDetails {
  const cost = Math.max(0, Number(params.purchasePrice || 0));
  const salvage =
    params.salvageValue !== undefined
      ? Math.max(0, Number(params.salvageValue))
      : Number((cost * 0.1).toFixed(2)); // Default 10% salvage value
  const lifeYears = Math.max(1, Number(params.usefulLifeYears || 5)); // Default 5 years for vehicles

  if (cost <= 0) {
    return {
      costBasis: 0,
      salvageValue: 0,
      usefulLifeYears: lifeYears,
      elapsedMonths: 0,
      monthlyDepreciation: 0,
      accumulatedDepreciation: 0,
      currentBookValue: 0,
      percentDepreciated: 0,
      isFullyDepreciated: false,
    };
  }

  const pDate = new Date(params.purchaseDate);
  const asOf = params.asOfDate ? new Date(params.asOfDate) : new Date();

  let elapsedMonths = 0;
  if (!isNaN(pDate.getTime()) && asOf >= pDate) {
    const yearDiff = asOf.getFullYear() - pDate.getFullYear();
    const monthDiff = asOf.getMonth() - pDate.getMonth();
    elapsedMonths = Math.max(0, yearDiff * 12 + monthDiff);
  }

  const totalDepreciableAmount = Math.max(0, cost - salvage);
  const totalMonths = lifeYears * 12;
  const monthlyDepreciation = Number((totalDepreciableAmount / totalMonths).toFixed(2));

  const accumulatedDepreciation = Number(
    Math.min(totalDepreciableAmount, monthlyDepreciation * elapsedMonths).toFixed(2)
  );
  const currentBookValue = Number(Math.max(salvage, cost - accumulatedDepreciation).toFixed(2));
  const percentDepreciated =
    totalDepreciableAmount > 0
      ? Math.min(100, Math.round((accumulatedDepreciation / totalDepreciableAmount) * 100))
      : 100;
  const isFullyDepreciated = currentBookValue <= salvage || elapsedMonths >= totalMonths;

  return {
    costBasis: cost,
    salvageValue: salvage,
    usefulLifeYears: lifeYears,
    elapsedMonths,
    monthlyDepreciation,
    accumulatedDepreciation,
    currentBookValue,
    percentDepreciated,
    isFullyDepreciated,
  };
}


