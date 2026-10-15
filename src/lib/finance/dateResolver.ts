/**
 * Date Resolver & Centralized Utilities (Phase 2)
 * Handles month-end date clamping, card statement cycle calculations,
 * and relative installment status resolution.
 */

/**
 * Clamps target day to the actual number of days in the given month and year.
 * Handles February 28/29 (leap years) and 30-day months safely.
 */
export function clampMonthEndDay(year: number, month: number, targetDay: number): number {
  const maxDays = new Date(year, month + 1, 0).getDate();
  return Math.min(Math.max(1, targetDay), maxDays);
}

/**
 * Format a Date object into a standard ISO YYYY-MM-DD date string.
 */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export interface FirstInstallmentDateParams {
  transactionDate: string;
  dueDay: number;
  statementDay?: number | null;
  startMonthOffset?: number | null;
  explicitFirstPaymentDate?: string | null;
}

/**
 * Resolve the exact first installment due date taking into account:
 * - Credit card statement cutoff cycles
 * - Due date inheritance
 * - Buy Now Pay Later (BNPL) start month overrides
 * - Clamping for month ends
 */
export function resolveFirstInstallmentDueDate(params: FirstInstallmentDateParams): string {
  const { transactionDate, dueDay, statementDay, explicitFirstPaymentDate } = params;

  if (explicitFirstPaymentDate && explicitFirstPaymentDate.trim()) {
    const clean = explicitFirstPaymentDate.trim();
    const parts = clean.split('-').map(Number);
    const y = parts[0];
    const m = parts[1] - 1; // 0-indexed
    const clamped = clampMonthEndDay(y, m, dueDay);
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
  }

  const tx = new Date(transactionDate || new Date().toISOString().split('T')[0]);
  const txYear = tx.getFullYear();
  const txMonth = tx.getMonth(); // 0-indexed
  const txDay = tx.getDate();

  // If card statement day is provided (Credit Card):
  if (statementDay) {
    let stmtMonth = txMonth;
    let stmtYear = txYear;
    if (txDay > statementDay) {
      stmtMonth += 1;
      if (stmtMonth > 11) {
        stmtMonth = 0;
        stmtYear += 1;
      }
    }
    const clampedStmtDay = clampMonthEndDay(stmtYear, stmtMonth, statementDay);

    // If dueDay <= clampedStmtDay: due date is in following month
    // If dueDay > clampedStmtDay: due date is in same month
    let dueMonth = stmtMonth;
    let dueYear = stmtYear;
    if (dueDay <= clampedStmtDay) {
      dueMonth += 1;
      if (dueMonth > 11) {
        dueMonth = 0;
        dueYear += 1;
      }
    }
    const clampedDueDay = clampMonthEndDay(dueYear, dueMonth, dueDay);
    return `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(clampedDueDay).padStart(2, '0')}`;
  }

  // Standard loan
  let targetMonth = txMonth;
  let targetYear = txYear;
  if (txDay > dueDay) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  const clampedDay = clampMonthEndDay(targetYear, targetMonth, dueDay);
  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

export type InstallmentItemStatus = 'paid' | 'overdue' | 'upcoming';

/**
 * Returns the relative status of an installment item based on whether
 * it has been marked as paid and its due date relative to today / asOfDate.
 */
export function resolveInstallmentItemStatus(
  dueDate: string,
  isPaid?: boolean,
  asOfDate?: string
): InstallmentItemStatus {
  if (isPaid) return 'paid';
  const todayStr = asOfDate || new Date().toISOString().split('T')[0];
  if (dueDate < todayStr) return 'overdue';
  return 'upcoming';
}
