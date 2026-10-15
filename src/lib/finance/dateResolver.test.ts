import { describe, it, expect } from 'vitest';
import {
  clampMonthEndDay,
  formatISODate,
  resolveFirstInstallmentDueDate,
  resolveInstallmentItemStatus,
} from './dateResolver';

describe('dateResolver', () => {
  describe('clampMonthEndDay', () => {
    it('clamps to 28 for non-leap year February', () => {
      // February is month 1 (0-indexed)
      expect(clampMonthEndDay(2026, 1, 31)).toBe(28);
      expect(clampMonthEndDay(2027, 1, 30)).toBe(28);
    });

    it('clamps to 29 for leap year February', () => {
      expect(clampMonthEndDay(2028, 1, 31)).toBe(29);
      expect(clampMonthEndDay(2024, 1, 30)).toBe(29);
    });

    it('clamps to 30 for 30-day months', () => {
      // April (3), June (5), September (8), November (10)
      expect(clampMonthEndDay(2026, 3, 31)).toBe(30);
      expect(clampMonthEndDay(2026, 8, 31)).toBe(30);
    });

    it('keeps target day for 31-day months', () => {
      expect(clampMonthEndDay(2026, 0, 31)).toBe(31); // January
      expect(clampMonthEndDay(2026, 2, 31)).toBe(31); // March
      expect(clampMonthEndDay(2026, 9, 25)).toBe(25); // October day 25
    });
  });

  describe('formatISODate', () => {
    it('formats dates to YYYY-MM-DD padded with zeros', () => {
      const d = new Date(2026, 4, 9); // May 9, 2026
      expect(formatISODate(d)).toBe('2026-05-09');
    });
  });

  describe('resolveFirstInstallmentDueDate', () => {
    it('honors explicitFirstPaymentDate clamping its day to target dueDay', () => {
      const firstDue = resolveFirstInstallmentDueDate({
        transactionDate: '2026-10-05',
        dueDay: 27,
        explicitFirstPaymentDate: '2026-12-01',
      });
      expect(firstDue).toBe('2026-12-27');
    });

    it('calculates first due date for standard loan before dueDay', () => {
      // Transaction on Oct 5, dueDay 25 -> first payment on Oct 25
      const firstDue = resolveFirstInstallmentDueDate({
        transactionDate: '2026-10-05',
        dueDay: 25,
      });
      expect(firstDue).toBe('2026-10-25');
    });

    it('calculates first due date for standard loan after dueDay (rolls to next month)', () => {
      // Transaction on Oct 26, dueDay 25 -> first payment on Nov 25
      const firstDue = resolveFirstInstallmentDueDate({
        transactionDate: '2026-10-26',
        dueDay: 25,
      });
      expect(firstDue).toBe('2026-11-25');
    });

    it('calculates first due date for credit card with statement cutoff cycle', () => {
      // Swipe Oct 5, statement cutoff 15, payment due day 5
      // Swipe <= 15: billed in Oct statement (Oct 15). Payment due on Nov 5.
      const firstDue = resolveFirstInstallmentDueDate({
        transactionDate: '2026-10-05',
        statementDay: 15,
        dueDay: 5,
      });
      expect(firstDue).toBe('2026-11-05');
    });

    it('rolls credit card statement to following month when swipe date > statementDay', () => {
      // Swipe Oct 20, statement cutoff 15, payment due day 5
      // Swipe > 15: billed in Nov statement (Nov 15). Payment due on Dec 5.
      const firstDue = resolveFirstInstallmentDueDate({
        transactionDate: '2026-10-20',
        statementDay: 15,
        dueDay: 5,
      });
      expect(firstDue).toBe('2026-12-05');
    });
  });

  describe('resolveInstallmentItemStatus', () => {
    it('returns "paid" when isPaid is true regardless of due date', () => {
      expect(resolveInstallmentItemStatus('2026-01-01', true, '2026-10-16')).toBe('paid');
      expect(resolveInstallmentItemStatus('2027-01-01', true, '2026-10-16')).toBe('paid');
    });

    it('returns "overdue" when unpaid and dueDate is in the past', () => {
      expect(resolveInstallmentItemStatus('2026-05-15', false, '2026-10-16')).toBe('overdue');
    });

    it('returns "upcoming" when unpaid and dueDate is today or in the future', () => {
      expect(resolveInstallmentItemStatus('2026-10-16', false, '2026-10-16')).toBe('upcoming');
      expect(resolveInstallmentItemStatus('2026-11-20', false, '2026-10-16')).toBe('upcoming');
    });
  });
});
