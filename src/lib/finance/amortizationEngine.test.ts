import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyAmortizationPayment,
  calculateMonthlyAmortization,
  calculateLiabilityAmortization,
  calculateInstallmentSummary,
  calculateAmortizationSchedule,
  generateInstallmentSchedule,
  calculateNextAmortizationSplit,
} from './amortizationEngine';

describe('amortizationEngine', () => {
  describe('calculateMonthlyAmortizationPayment', () => {
    it('calculates accurate PMT payment for standard loans', () => {
      // 1,000,000 at 6% p.a. for 120 months (10 years)
      const pmt = calculateMonthlyAmortizationPayment(1000000, 6, 120);
      expect(pmt).toBe(11102.05);
    });

    it('handles 0% annual interest rate by dividing principal by term', () => {
      const pmt = calculateMonthlyAmortizationPayment(120000, 0, 12);
      expect(pmt).toBe(10000.0);
    });

    it('returns 0 if principal or term is 0', () => {
      expect(calculateMonthlyAmortizationPayment(0, 5, 12)).toBe(0);
      expect(calculateMonthlyAmortizationPayment(100000, 5, 0)).toBe(0);
    });
  });

  describe('calculateMonthlyAmortization', () => {
    it('calculates monthly add-on rate payment accurately', () => {
      // 60,000 at 1% add-on per month for 12 months
      // (60,000 / 12) + (60,000 * 0.01) = 5,000 + 600 = 5,600
      const payment = calculateMonthlyAmortization({
        principal: 60000,
        interestRate: 1,
        termMonths: 12,
        rateType: 'monthly_addon',
      });
      expect(payment).toBe(5600.0);
    });

    it('handles 0% monthly add-on promo rate', () => {
      const payment = calculateMonthlyAmortization({
        principal: 60000,
        interestRate: 0,
        termMonths: 12,
        rateType: 'monthly_addon',
      });
      expect(payment).toBe(5000.0);
    });

    it('preserves user manual override when isAmortizationOverridden is true', () => {
      const payment = calculateMonthlyAmortization({
        principal: 60000,
        interestRate: 1,
        termMonths: 12,
        rateType: 'monthly_addon',
        isAmortizationOverridden: true,
        monthlyPayment: 5605.5,
      });
      expect(payment).toBe(5605.5);
    });
  });

  describe('calculateAmortizationSchedule', () => {
    it('generates complete schedule and converges exactly to zero without penny drift', () => {
      const summary = calculateAmortizationSchedule({
        principal: 500000,
        annualInterestRate: 8.5,
        termMonths: 36,
        startDate: '2026-01-01',
        monthlyDueDay: 15,
      });

      expect(summary.schedule.length).toBe(36);
      expect(summary.totalPrincipal).toBe(500000);
      expect(summary.monthlyPayment).toBe(15783.77);

      // Verify first installment
      const firstRow = summary.schedule[0];
      expect(firstRow.installmentNumber).toBe(1);
      expect(firstRow.interestAmount).toBe(3541.67);
      expect(firstRow.principalAmount).toBe(12242.1);
      expect(firstRow.remainingBalance).toBe(487757.9);

      // Verify final installment convergence
      const finalRow = summary.schedule[35];
      expect(finalRow.installmentNumber).toBe(36);
      expect(finalRow.remainingBalance).toBe(0); // Perfect zero convergence

      expect(summary.totalPayment).toBe(
        Number((summary.totalPrincipal + summary.totalInterest).toFixed(2))
      );
    });

    it('auto-marks past due dates as Paid on backdated schedule', () => {
      // 12-month loan starting 2026-05-10, asOfDate 2026-10-16, dueDay 25
      const summary = calculateAmortizationSchedule({
        principal: 120000,
        annualInterestRate: 0,
        rateType: 'monthly_addon',
        interestRate: 0,
        termMonths: 12,
        startDate: '2026-05-10',
        monthlyDueDay: 25,
        asOfDate: '2026-10-16',
      });

      expect(summary.paidCount).toBe(5);
      expect(summary.unpaidCount).toBe(7);
      expect(summary.paidPrincipal).toBe(50000);
      expect(summary.remainingUnpaidBalance).toBe(70000);
      expect(summary.schedule[0].isPaid).toBe(true);
      expect(summary.schedule[4].isPaid).toBe(true);
      expect(summary.schedule[5].isPaid).toBe(false);
    });

    it('respects manual paidInstallmentNumbers overrides', () => {
      const summary = calculateAmortizationSchedule({
        principal: 120000,
        annualInterestRate: 0,
        rateType: 'monthly_addon',
        interestRate: 0,
        termMonths: 12,
        startDate: '2026-05-10',
        monthlyDueDay: 25,
        asOfDate: '2026-10-16',
        paidInstallmentNumbers: [1, 2, 3, 4, 6], // Month 5 left unpaid
      });

      expect(summary.schedule[4].isPaid).toBe(false);
      expect(summary.schedule[5].isPaid).toBe(true);
      expect(summary.remainingUnpaidBalance).toBe(70000);
    });
  });

  describe('generateInstallmentSchedule', () => {
    it('generates schedule for card purchase with statement cutoff day and due day', () => {
      const schedule = generateInstallmentSchedule(
        30000,
        3,
        15,
        '2026-10-05',
        {
          cardStatementDay: 15,
          cardDueDay: 5,
        }
      );

      expect(schedule.length).toBe(3);
      expect(schedule[0].dueDate).toBe('2026-11-05');
      expect(schedule[1].dueDate).toBe('2026-12-05');
      expect(schedule[2].dueDate).toBe('2027-01-05');
    });
  });

  describe('calculateNextAmortizationSplit', () => {
    it('calculates interest vs principal split for current balance', () => {
      const split = calculateNextAmortizationSplit({
        currentBalance: 1000000,
        annualInterestRate: 6,
        monthlyPayment: 11102.05,
      });

      expect(split.interestPortion).toBe(5000.0);
      expect(split.principalPortion).toBe(6102.05);
      expect(split.newBalance).toBe(993897.95);
    });
  });
});
