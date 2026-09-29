/**
 * Pure calculation facades for Tenvi
 * Adopted from MVP_ARCHITECTURE_REF.md - Single source of truth for business math
 */

import { CURRENCY_SYMBOL } from '@/lib/constants';

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
export function calculateNextDueDate(dueDay: number, fromDate: Date = new Date()): DueDateInfo {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const todayDate = fromDate.getDate();

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
  const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const clampedDay = Math.min(dueDay, maxDaysInMonth);

  const nextDueDate = new Date(targetYear, targetMonth, clampedDay);

  // Normalize midnight for clean day subtraction
  const todayMidnight = new Date(year, month, todayDate);
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
    } else {
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

/**
 * Identify the optimal credit card to use for spending on a specific date
 * to maximize the interest-free grace period (cash float duration).
 */
export function calculateOptimalCardToSwipe(
  cards: any[],
  transactions: any[] = [],
  linkedLoans: any[] = [],
  referenceDate: Date = new Date()
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
    const cardDirectSpend = transactions
      .filter((t) => t.credit_card_id === card.id && t.kind === 'expense' && !t.loan_id)
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const cardLoans = linkedLoans.filter((l) => l.credit_card_id === card.id);
    const cardSwipedLoans = cardLoans.reduce(
      (sum, l) => sum + Number(l.balance_remaining || 0),
      0
    );

    const totalUtilized = cardDirectSpend + cardSwipedLoans;
    const creditLimit = Number(card.credit_limit || 0);
    const availablePower = Math.max(0, creditLimit - totalUtilized);
    const utilizationPercent =
      creditLimit > 0 ? Math.min(100, Math.round((totalUtilized / creditLimit) * 100)) : 0;

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
    kind: 'income' | 'expense';
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
    } else {
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
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
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
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
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
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
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
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse',
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
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
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
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
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
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
}




