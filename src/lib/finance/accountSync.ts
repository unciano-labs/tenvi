/**
 * Account Balance & Limit Ledger (Phase 3)
 * State machine and synchronization utilities for credit card limits,
 * savings deductions, and atomic installment payment toggling.
 */

import { calculateAmortizationSchedule } from './amortizationEngine';

export interface CardSpendingSummary {
  directSpend: number;
  loansSpend: number;
  p2pLoansSpend: number;
  liabilitiesSpend: number;
  totalUsed: number;
  availableToSpend: number;
  utilizationPercent: number;
  activeInstallmentsCount?: number;
}

/**
 * Calculate total spending, loan balance impact, and available credit limit for a credit card.
 *
 * Rules:
 * 1. directSpend: sum of expense transactions with this card, excluding loan-linked expenses (!t.loan_id)
 *    to prevent double counting with loan balances.
 * 2. loansSpend: sum of active/unpaid loan balances (p2p loans and mortgage/debt liabilities) linked to this card.
 * 3. totalUsed = directSpend + loansSpend.
 * 4. availableToSpend = Math.max(0, creditLimit - totalUsed).
 */
export function calculateCardSpending(
  card: { id: string; credit_limit?: number | string | null },
  transactions: Array<{ credit_card_id?: string | null; kind?: string | null; amount?: number | string | null; loan_id?: string | null }> = [],
  loans: Array<{ id?: string; credit_card_id?: string | null; balance_remaining?: number | string | null; current_principal_balance?: number | string | null; status?: string | null }> = [],
  liabilities: Array<{ id?: string; credit_card_id?: string | null; current_principal_balance?: number | string | null; status?: string | null }> = []
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

  const countedIds = new Set<string>();
  let activeInstallmentsCount = 0;

  const hasAnyLoanCardId = (loans || []).some((l) => Boolean(l.credit_card_id));
  let p2pLoansSpend = 0;
  (loans || []).forEach((l) => {
    if (hasAnyLoanCardId && l.credit_card_id !== cardId) return;
    const isPaid = l.status === 'paid' || l.status === 'paid_off';
    if (!isPaid) {
      if (l.id) countedIds.add(l.id);
      const balance = Number(l.current_principal_balance ?? l.balance_remaining ?? 0);
      if (balance > 0) {
        p2pLoansSpend += balance;
        activeInstallmentsCount++;
      }
    }
  });

  const hasAnyLiabilityCardId = (liabilities || []).some((l) => Boolean(l.credit_card_id));
  let liabilitiesSpend = 0;
  (liabilities || []).forEach((lib) => {
    if (lib.id && countedIds.has(lib.id)) return;
    if (hasAnyLiabilityCardId && lib.credit_card_id !== cardId) return;
    const isPaid = lib.status === 'paid_off' || Number(lib.current_principal_balance || 0) <= 0;
    if (!isPaid) {
      const balance = Number(lib.current_principal_balance || 0);
      if (balance > 0) {
        liabilitiesSpend += balance;
        activeInstallmentsCount++;
      }
    }
  });

  const totalLoansSpend = p2pLoansSpend + liabilitiesSpend;
  const totalUsed = directSpend + totalLoansSpend;
  const availableToSpend = Math.max(0, creditLimit - totalUsed);
  const utilizationPercent =
    creditLimit > 0 ? Math.min(100, Math.round((totalUsed / creditLimit) * 100)) : 0;

  return {
    directSpend,
    loansSpend: totalLoansSpend,
    p2pLoansSpend,
    liabilitiesSpend,
    totalUsed,
    availableToSpend,
    utilizationPercent,
    activeInstallmentsCount,
  };
}

/**
 * Calculate the credit limit impact for a card.
 * Alias with semantic naming matching the architecture roadmap.
 */
export const calculateCardLimitImpact = calculateCardSpending;

export interface UpcomingPaymentScheduleItem {
  id: string;
  sourceType: 'liability' | 'loan';
  name: string;
  dueDate?: string;
  monthlyPayment: number;
  principalAmount?: number;
  interestAmount?: number;
  installmentNumber?: number;
}

export interface SavingsImpactSummary {
  savingsAccountId: string;
  savingsAccountName: string;
  currentBalance: number;
  totalUpcomingAmortization: number;
  projectedBalance: number;
  isSufficient: boolean;
  shortfallAmount: number;
  upcomingPayments: UpcomingPaymentScheduleItem[];
}

/**
 * Determine required cash outflow for upcoming installments in the current statement window
 * linked to a savings account.
 */
export function calculateSavingsImpact(
  savingsAccount: { id: string; current_balance?: number | string | null; name?: string | null },
  liabilities: Array<{
    id: string;
    name: string;
    savings_id?: string | null;
    monthly_payment?: number | string | null;
    due_day?: number | null;
    status?: string | null;
    current_principal_balance?: number | string | null;
  }> = [],
  loans: Array<{
    id: string;
    savings_id?: string | null;
    monthly_payment?: number | string | null;
    status?: string | null;
    balance_remaining?: number | string | null;
    contact?: { name?: string | null } | null;
  }> = []
): SavingsImpactSummary {
  const accountId = savingsAccount?.id || '';
  const accountName = savingsAccount?.name || 'Savings Account';
  const currentBalance = Number(savingsAccount?.current_balance || 0);

  const upcomingPayments: UpcomingPaymentScheduleItem[] = [];

  // 1. Linked liabilities
  liabilities.forEach((lib) => {
    if (lib.savings_id !== accountId) return;
    const isPaid = lib.status === 'paid_off' || Number(lib.current_principal_balance || 0) <= 0;
    if (!isPaid && Number(lib.monthly_payment || 0) > 0) {
      upcomingPayments.push({
        id: lib.id,
        sourceType: 'liability',
        name: lib.name,
        monthlyPayment: Number(lib.monthly_payment || 0),
      });
    }
  });

  // 2. Linked loans
  loans.forEach((loan) => {
    if (loan.savings_id !== accountId) return;
    const isPaid = loan.status === 'paid' || loan.status === 'paid_off' || Number(loan.balance_remaining || 0) <= 0;
    if (!isPaid && Number(loan.monthly_payment || 0) > 0) {
      upcomingPayments.push({
        id: loan.id,
        sourceType: 'loan',
        name: loan.contact?.name ? `Loan: ${loan.contact.name}` : 'Loan Repayment',
        monthlyPayment: Number(loan.monthly_payment || 0),
      });
    }
  });

  const totalUpcomingAmortization = upcomingPayments.reduce(
    (sum, item) => sum + item.monthlyPayment,
    0
  );

  const projectedBalance = currentBalance - totalUpcomingAmortization;
  const isSufficient = currentBalance >= totalUpcomingAmortization;
  const shortfallAmount = isSufficient ? 0 : totalUpcomingAmortization - currentBalance;

  return {
    savingsAccountId: accountId,
    savingsAccountName: accountName,
    currentBalance,
    totalUpcomingAmortization,
    projectedBalance,
    isSufficient,
    shortfallAmount,
    upcomingPayments,
  };
}

/**
 * Validate and formulate payment deduction for a savings account.
 */
export function formulateSavingsDeduction(
  savingsAccount: { id: string; current_balance?: number | string | null; name?: string | null },
  paymentAmount: number
): {
  success: boolean;
  newBalance: number;
  error?: string;
} {
  const current = Number(savingsAccount?.current_balance || 0);
  if (current < paymentAmount) {
    return {
      success: false,
      newBalance: current,
      error: `Insufficient balance in ${savingsAccount?.name || 'savings account'}. Required: ₱${paymentAmount.toLocaleString()}, Available: ₱${current.toLocaleString()}`,
    };
  }
  return {
    success: true,
    newBalance: Math.max(0, current - paymentAmount),
  };
}

export interface LiabilityToggleResult {
  updatedPaidNumbers: number[];
  remainingUnpaidBalance: number;
  newStatus: 'active' | 'paid_off';
  paidCount: number;
  unpaidCount: number;
  totalPrincipal: number;
}

/**
 * Compute the updated payment state and remaining principal balance
 * when an installment is marked paid or unpaid on a liability.
 */
export function applyInstallmentToggleToLiability(
  liability: {
    original_principal?: number | string | null;
    current_principal_balance?: number | string | null;
    annual_interest_rate?: number | string | null;
    interest_rate_type?: string | null;
    interest_rate?: number | string | null;
    term_months?: number | string | null;
    monthly_payment?: number | string | null;
    is_amortization_overridden?: boolean | null;
    due_day?: number | null;
    start_date?: string | null;
    first_payment_date?: string | null;
    paid_installment_numbers?: number[] | null;
  },
  installmentNumber: number,
  isPaid: boolean
): LiabilityToggleResult {
  const currentPaid: number[] = Array.isArray(liability.paid_installment_numbers)
    ? liability.paid_installment_numbers
    : [];

  let updatedPaidNumbers: number[];
  if (isPaid) {
    updatedPaidNumbers = Array.from(new Set([...currentPaid, installmentNumber])).sort((a, b) => a - b);
  } else {
    updatedPaidNumbers = currentPaid.filter((n) => n !== installmentNumber);
  }

  const principal = Number(liability.original_principal || liability.current_principal_balance || 0);
  const annualRate = Number(liability.annual_interest_rate || 0);
  const rateType: 'annual' | 'monthly_addon' =
    liability.interest_rate_type === 'monthly_addon' ? 'monthly_addon' : 'annual';
  const interestRate = Number(liability.interest_rate ?? liability.annual_interest_rate ?? 0);
  const termMonths = Number(liability.term_months || 0);

  const summary = calculateAmortizationSchedule({
    principal,
    annualInterestRate: annualRate,
    termMonths,
    startDate: liability.start_date || undefined,
    monthlyDueDay: liability.due_day || 15,
    rateType,
    interestRate,
    monthlyPayment: Number(liability.monthly_payment || 0),
    isAmortizationOverridden: Boolean(liability.is_amortization_overridden),
    firstPaymentDate: liability.first_payment_date || null,
    paidInstallmentNumbers: updatedPaidNumbers,
  });

  const newStatus: 'active' | 'paid_off' =
    summary.unpaidCount === 0 && termMonths > 0 ? 'paid_off' : 'active';

  return {
    updatedPaidNumbers,
    remainingUnpaidBalance: summary.remainingUnpaidBalance,
    newStatus,
    paidCount: summary.paidCount,
    unpaidCount: summary.unpaidCount,
    totalPrincipal: summary.totalPrincipal,
  };
}

export interface LoanToggleResult {
  unpaidAmount: number;
  paidCount: number;
  totalCount: number;
  newStatus: 'unpaid' | 'partial' | 'paid';
}

/**
 * Compute the updated loan balance and status when a loan installment is toggled.
 */
export function applyInstallmentToggleToLoan(
  installments: Array<{ id?: string; installment_number?: number; amount: number | string; is_paid: boolean }>,
  toggledInstallmentIdOrNumber: string | number,
  isPaid: boolean
): LoanToggleResult {
  const updatedInstallments = installments.map((item) => {
    const isTarget =
      item.id === toggledInstallmentIdOrNumber ||
      item.installment_number === toggledInstallmentIdOrNumber;
    if (isTarget) {
      return { ...item, is_paid: isPaid };
    }
    return item;
  });

  const unpaidAmount = updatedInstallments
    .filter((i) => !i.is_paid)
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);

  const paidCount = updatedInstallments.filter((i) => i.is_paid).length;
  const totalCount = updatedInstallments.length;

  let newStatus: 'unpaid' | 'partial' | 'paid' = 'unpaid';
  if (unpaidAmount <= 0) {
    newStatus = 'paid';
  } else if (paidCount > 0) {
    newStatus = 'partial';
  }

  return {
    unpaidAmount,
    paidCount,
    totalCount,
    newStatus,
  };
}
