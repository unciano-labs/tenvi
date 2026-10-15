/**
 * The Core Computation Engine (Phase 1)
 * Financial mathematics, reducing-balance convergence, add-on rate formulas,
 * installment schedule generation, and status summarization.
 */

import { clampMonthEndDay } from './dateResolver';
import { calculateSplitShares } from './calculations';

export interface AmortizationScheduleRow {
  installmentNumber: number;
  dueDate: string;
  paymentAmount: number;
  principalAmount: number;
  interestAmount: number;
  remainingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
  isPaid?: boolean;
}

export interface AmortizationSummary {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  schedule: AmortizationScheduleRow[];
  paidCount: number;
  unpaidCount: number;
  paidPrincipal: number;
  unpaidPrincipal: number;
  remainingUnpaidBalance: number;
}

export interface InstallmentScheduleItem {
  installmentNumber: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  principalAmount?: number;
  interestAmount?: number;
  statementDate?: string; // YYYY-MM-DD (when card statement day is provided)
  isPaid?: boolean;
}

export interface InstallmentScheduleOptions {
  monthlyInterestRate?: number | null;
  cardStatementDay?: number | null;
  cardDueDay?: number | null;
  asOfDate?: string;
  paidInstallmentNumbers?: number[];
  paidCount?: number;
}

/**
 * Calculate fixed monthly amortization payment (standard PMT formula)
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
 * - Supports manual override pass-through
 */
export function calculateMonthlyAmortization(params: {
  principal: number;
  interestRate: number;
  termMonths: number;
  rateType?: 'annual' | 'monthly_addon';
  isAmortizationOverridden?: boolean;
  monthlyPayment?: number;
}): number {
  if (params.isAmortizationOverridden && params.monthlyPayment && params.monthlyPayment > 0) {
    return Number(Number(params.monthlyPayment).toFixed(2));
  }

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

// Backward-compatible alias for calculateMonthlyAmortization
export const calculateLiabilityAmortization = calculateMonthlyAmortization;

/**
 * Derives aggregate summary, paid/unpaid term counts, and unpaid balance
 * strictly from schedule rows.
 */
export function calculateInstallmentSummary(
  schedule: AmortizationScheduleRow[],
  totalPrincipal: number,
  totalInterest: number,
  monthlyPayment: number
): AmortizationSummary {
  let paidCount = 0;
  let unpaidCount = 0;
  let paidPrincipal = 0;
  let unpaidPrincipal = 0;

  for (const row of schedule) {
    if (row.isPaid) {
      paidCount += 1;
      paidPrincipal = Number((paidPrincipal + row.principalAmount).toFixed(2));
    } else {
      unpaidCount += 1;
      unpaidPrincipal = Number((unpaidPrincipal + row.principalAmount).toFixed(2));
    }
  }

  const remainingUnpaidBalance = Number(Math.max(0, unpaidPrincipal).toFixed(2));
  const totalPayment = Number((totalPrincipal + totalInterest).toFixed(2));

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    totalPrincipal,
    schedule,
    paidCount,
    unpaidCount,
    paidPrincipal,
    unpaidPrincipal,
    remainingUnpaidBalance,
  };
}

/**
 * Generate full reducing-balance or add-on amortization schedule.
 * Guarantees final period convergence to exactly 0.00 without penny drift.
 * Automatically marks past due dates as Paid on creation while preserving manual overrides.
 */
export function calculateAmortizationSchedule(params: {
  principal: number;
  annualInterestRate: number;
  termMonths: number;
  startDate?: string;
  monthlyDueDay?: number;
  rateType?: 'annual' | 'monthly_addon';
  interestRate?: number;
  monthlyPayment?: number;
  isAmortizationOverridden?: boolean;
  firstPaymentDate?: string | null;
  paidInstallmentNumbers?: number[] | null;
  asOfDate?: string;
}): AmortizationSummary {
  const principal = Math.max(0, Number(params.principal || 0));
  const termMonths = Math.max(0, Math.round(Number(params.termMonths || 0)));
  const annualRate = Math.max(0, Number(params.annualInterestRate || 0));
  const rateType = params.rateType || 'annual';
  const interestRate =
    params.interestRate !== undefined && params.interestRate !== null
      ? Math.max(0, Number(params.interestRate))
      : annualRate;
  const startDateStr = params.startDate || new Date().toISOString().split('T')[0];
  const dueDay = params.monthlyDueDay ? Math.min(31, Math.max(1, params.monthlyDueDay)) : 15;

  if (principal === 0 || termMonths === 0) {
    return {
      monthlyPayment: 0,
      totalPayment: 0,
      totalInterest: 0,
      totalPrincipal: 0,
      schedule: [],
      paidCount: 0,
      unpaidCount: 0,
      paidPrincipal: 0,
      unpaidPrincipal: 0,
      remainingUnpaidBalance: 0,
    };
  }

  // 1. Determine standard or user-overridden monthly payment
  const regularPayment = calculateMonthlyAmortization({
    principal,
    interestRate,
    termMonths,
    rateType,
    isAmortizationOverridden: params.isAmortizationOverridden,
    monthlyPayment: params.monthlyPayment,
  });

  // 2. Determine initial payment cycle (supporting BNPL and credit card due day inheritance)
  let startCycleYear: number;
  let startCycleMonth: number; // 0-indexed

  if (params.firstPaymentDate && params.firstPaymentDate.trim()) {
    // Buy Now, Pay Later: explicit start month / date
    const cleanFpd = params.firstPaymentDate.trim();
    const parts = cleanFpd.split('-').map(Number);
    startCycleYear = parts[0];
    startCycleMonth = parts[1] - 1; // 0-indexed
  } else {
    // Default to upcoming due date following loan approval/start date
    const [startYear, startMonth1, startDay] = startDateStr.split('-').map(Number);
    startCycleYear = startYear;
    startCycleMonth = startMonth1 - 1; // 0-indexed

    // If the loan start day is strictly after this month's due day, the payment
    // falls into the following month. Otherwise, it is due on this month's due day!
    if (startDay > dueDay) {
      startCycleMonth += 1;
      if (startCycleMonth > 11) {
        startCycleMonth = 0;
        startCycleYear += 1;
      }
    }
  }

  let remainingPrincipal = principal;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;
  const schedule: AmortizationScheduleRow[] = [];

  const todayStr = params.asOfDate || new Date().toISOString().split('T')[0];

  for (let i = 1; i <= termMonths; i++) {
    const monthOffset = i - 1;
    const cycleYear = startCycleYear + Math.floor((startCycleMonth + monthOffset) / 12);
    const cycleMonth = (startCycleMonth + monthOffset) % 12;

    const clampedDay = clampMonthEndDay(cycleYear, cycleMonth, dueDay);
    const dueDate = `${cycleYear}-${String(cycleMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;

    let interestAmount = 0;
    let principalAmount = 0;
    let paymentAmount = 0;

    if (rateType === 'monthly_addon') {
      // Monthly Add-on Rate: fixed monthly interest charge
      const monthlyRateDecimal = interestRate / 100;
      interestAmount = Number((principal * monthlyRateDecimal).toFixed(2));

      if (i === termMonths) {
        // Final period absorbs any fractional centavo variance
        principalAmount = remainingPrincipal;
        paymentAmount = Number((principalAmount + interestAmount).toFixed(2));
        remainingPrincipal = 0;
      } else {
        const standardPrincipal = Number((principal / termMonths).toFixed(2));
        principalAmount = Math.min(remainingPrincipal, standardPrincipal);
        paymentAmount = Number((principalAmount + interestAmount).toFixed(2));
        remainingPrincipal = Number((remainingPrincipal - principalAmount).toFixed(2));
      }
    } else {
      // Annual Reducing-Balance Rate
      const monthlyRate = annualRate > 0 ? annualRate / 100 / 12 : 0;
      interestAmount = monthlyRate > 0 ? Number((remainingPrincipal * monthlyRate).toFixed(2)) : 0;

      if (i === termMonths) {
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
    }

    cumulativeInterest = Number((cumulativeInterest + interestAmount).toFixed(2));
    cumulativePrincipal = Number((cumulativePrincipal + principalAmount).toFixed(2));

    const isPaid =
      params.paidInstallmentNumbers !== undefined && params.paidInstallmentNumbers !== null
        ? params.paidInstallmentNumbers.includes(i)
        : dueDate < todayStr;

    schedule.push({
      installmentNumber: i,
      dueDate,
      paymentAmount,
      principalAmount,
      interestAmount,
      remainingBalance: Math.max(0, remainingPrincipal),
      cumulativeInterest,
      cumulativePrincipal,
      isPaid,
    });
  }

  return calculateInstallmentSummary(
    schedule,
    cumulativePrincipal,
    cumulativeInterest,
    regularPayment
  );
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

      const clampedStmtDay = clampMonthEndDay(stmtYear, stmtMonth, cardStatementDay);
      const stmtDateObj = new Date(stmtYear, stmtMonth, clampedStmtDay);
      statementDateStr = `${stmtDateObj.getFullYear()}-${String(stmtDateObj.getMonth() + 1).padStart(2, '0')}-${String(stmtDateObj.getDate()).padStart(2, '0')}`;

      // Card payment due date for that statement:
      let dueMonth = stmtMonth;
      let dueYear = stmtYear;
      if (effectiveDueDay <= clampedStmtDay) {
        dueMonth += 1;
        if (dueMonth > 11) {
          dueMonth = 0;
          dueYear += 1;
        }
      }
      const clampedDue = clampMonthEndDay(dueYear, dueMonth, effectiveDueDay);
      const dueDateObj = new Date(dueYear, dueMonth, clampedDue);
      dueDateStr = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;
    } else {
      const targetMonth = startMonth + i;
      const targetYear = startYear + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;

      const clampedDay = clampMonthEndDay(targetYear, normalizedMonth, effectiveDueDay);
      const dueDateObj = new Date(targetYear, normalizedMonth, clampedDay);
      dueDateStr = `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`;
    }

    const pAmt = principalShares[i - 1] ?? 0;
    const iAmt = interestShares[i - 1] ?? 0;
    const totalInstAmt = Number((pAmt + iAmt).toFixed(2));

    const todayStr = options?.asOfDate || new Date().toISOString().split('T')[0];
    const isPaid =
      options?.paidInstallmentNumbers !== undefined
        ? options.paidInstallmentNumbers.includes(i)
        : options?.paidCount !== undefined
        ? i <= options.paidCount
        : dueDateStr < todayStr;

    schedule.push({
      installmentNumber: i,
      dueDate: dueDateStr,
      amount: totalInstAmt,
      principalAmount: pAmt,
      interestAmount: iAmt,
      statementDate: statementDateStr,
      isPaid,
    });
  }

  return schedule;
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
